import pg from 'pg';
import crypto from 'node:crypto';
import {
  CommercialOrderContract,
  CommercialOrderLineContract,
  FulfillmentAllocationContract,
  CogsRecordContract,
  StockLedgerMovementContract,
  CommercialOrderId,
  CommercialOrderLineId,
  FulfillmentAllocationId,
  CogsRecordId,
  MovementId
} from '@roastery-os/contracts';
import {
  Money,
  Quantity,
  InventoryLot,
  UnitCost
} from '@roastery-os/domain-core';
import {
  CommercialPostgresRepository,
  InventoryPostgresRepository,
  MasterDataPostgresRepository,
  CostingPostgresRepository,
  CustomerPostgresRepository
} from '@roastery-os/infrastructure-postgres';
import {
  CreateWholesaleOrderCommand,
  ReserveWholesaleStockCommand,
  FulfillWholesaleOrderCommand,
  WholesaleOrderNotFoundError,
  WholesaleCustomerNotFoundError,
  InvalidWholesaleOrderStateTransitionError,
  InsufficientReservableStockError
} from './wholesale-types.js';
import {
  EmptyCommercialOrderError,
  SkuNotFoundError,
  LotNotAvailableForSkuError,
  LotValuationNotFoundError
} from '../sales/process-sale-fulfillment.js';

export class WholesaleOrderUseCase {
  constructor(
    private readonly commercialRepo: CommercialPostgresRepository = new CommercialPostgresRepository(),
    private readonly inventoryRepo: InventoryPostgresRepository = new InventoryPostgresRepository(),
    private readonly masterDataRepo: MasterDataPostgresRepository = new MasterDataPostgresRepository(),
    private readonly costingRepo: CostingPostgresRepository = new CostingPostgresRepository(),
    private readonly customerRepo: CustomerPostgresRepository = new CustomerPostgresRepository()
  ) {}

  /**
   * 1. Creates a Wholesale Commercial Order (DRAFT or CONFIRMED)
   */
  public async createOrder(
    command: CreateWholesaleOrderCommand,
    client: pg.PoolClient
  ): Promise<CommercialOrderContract> {
    if (!command.lines || command.lines.length === 0) {
      throw new EmptyCommercialOrderError();
    }

    // Verify customer exists
    const customer = await this.customerRepo.findCustomerById(
      client,
      command.organizationId,
      command.customerId
    );
    if (!customer) {
      throw new WholesaleCustomerNotFoundError(command.customerId, command.organizationId);
    }

    const orderId = (command.orderId ?? crypto.randomUUID()) as CommercialOrderId;
    const orderNumber = command.orderNumber ?? `WS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const status = command.status ?? 'DRAFT';
    const orderedAt = command.orderedAt ?? new Date();

    let subtotalMoney = Money.zero('IDR');
    let discountTotalMoney = Money.zero('IDR');
    let taxTotalMoney = Money.zero('IDR');
    let grandTotalMoney = Money.zero('IDR');

    const linesToInsert: CommercialOrderLineContract[] = [];

    for (const l of command.lines) {
      const sku = await this.masterDataRepo.findSkuById(
        client,
        command.organizationId,
        l.skuId
      );
      if (!sku) {
        throw new SkuNotFoundError(l.skuId, command.organizationId);
      }

      const lineId = (l.orderLineId ?? crypto.randomUUID()) as CommercialOrderLineId;
      const unitPrice = Money.of(l.unitPrice.amount.toString(), l.unitPrice.currency);
      const discount = l.discountAmount ? Money.of(l.discountAmount.amount.toString(), l.discountAmount.currency) : Money.zero(unitPrice.currency);
      const tax = l.taxAmount ? Money.of(l.taxAmount.amount.toString(), l.taxAmount.currency) : Money.zero(unitPrice.currency);

      const lineSubtotal = unitPrice.scale(l.orderedQuantity.amount.toString());
      const lineTotal = lineSubtotal.sub(discount).add(tax);

      subtotalMoney = subtotalMoney.add(lineSubtotal);
      discountTotalMoney = discountTotalMoney.add(discount);
      taxTotalMoney = taxTotalMoney.add(tax);
      grandTotalMoney = grandTotalMoney.add(lineTotal);

      linesToInsert.push({
        organizationId: command.organizationId,
        orderLineId: lineId,
        orderId,
        skuId: l.skuId,
        materialId: sku.materialId,
        orderedQuantity: l.orderedQuantity,
        fulfilledQuantity: Quantity.zero(l.orderedQuantity.uom),
        unitPrice,
        discountAmount: discount,
        taxAmount: tax,
        lineSubtotal: lineTotal,
        lineStatus: 'PENDING',
        allocations: []
      });
    }

    const order: CommercialOrderContract = {
      organizationId: command.organizationId,
      orderId,
      orderNumber,
      channel: 'WHOLESALE_CONTRACT',
      customerId: customer.customerId,
      status,
      lines: linesToInsert,
      subtotal: subtotalMoney,
      discountTotal: discountTotalMoney,
      taxTotal: taxTotalMoney,
      grandTotal: grandTotalMoney,
      orderedAt,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.commercialRepo.insertOrder(client, order);
    for (const line of linesToInsert) {
      await this.commercialRepo.insertOrderLine(client, line);
    }

    return (await this.commercialRepo.findOrderById(client, command.organizationId, orderId))!;
  }

  /**
   * 2. Confirms a DRAFT Wholesale Order -> CONFIRMED
   */
  public async confirmOrder(
    organizationId: string,
    orderId: string,
    client: pg.PoolClient
  ): Promise<CommercialOrderContract> {
    const order = await this.commercialRepo.findOrderById(client, organizationId as any, orderId);
    if (!order) {
      throw new WholesaleOrderNotFoundError(orderId, organizationId);
    }

    if (order.status !== 'DRAFT') {
      throw new InvalidWholesaleOrderStateTransitionError(orderId, order.status, 'CONFIRM');
    }

    await this.commercialRepo.updateOrderStatus(client, organizationId as any, orderId, 'CONFIRMED');
    return (await this.commercialRepo.findOrderById(client, organizationId as any, orderId))!;
  }

  /**
   * 3. Reserves Physical Stock for Confirmed Order -> RESERVED
   * Modifies InventoryLot.reservedQuantity without creating StockLedgerMovement or COGS.
   */
  public async reserveStock(
    command: ReserveWholesaleStockCommand,
    client: pg.PoolClient
  ): Promise<CommercialOrderContract> {
    const order = await this.commercialRepo.findOrderById(client, command.organizationId, command.orderId);
    if (!order) {
      throw new WholesaleOrderNotFoundError(command.orderId, command.organizationId);
    }

    if (order.status !== 'CONFIRMED' && order.status !== 'RESERVED') {
      throw new InvalidWholesaleOrderStateTransitionError(command.orderId, order.status, 'RESERVE_STOCK');
    }

    for (const resItem of command.reservations) {
      const lot = await this.inventoryRepo.findLotByIdForUpdate(
        client,
        command.organizationId,
        resItem.inventoryLotId
      );

      if (!lot) {
        throw new LotNotAvailableForSkuError(resItem.inventoryLotId, 'UNKNOWN', 'Lot not found in organization');
      }

      if (lot.lotState !== 'ACTIVE') {
        throw new LotNotAvailableForSkuError(resItem.inventoryLotId, 'UNKNOWN', `Lot status is '${lot.lotState}', expected 'ACTIVE'`);
      }

      const available = lot.getAvailableQuantity();
      const reqQty = Quantity.of(resItem.quantityToReserve.amount, resItem.quantityToReserve.uom);

      // Invariant check: Available quantity must cover reservation request
      if (available.compare(reqQty) < 0) {
        throw new InsufficientReservableStockError(
          lot.lotNumber,
          reqQty.amount.toString(),
          available.amount.toString(),
          available.uom
        );
      }

      // Domain entity reserve: reservedQuantity increases, availableQuantity decreases, quantityOnHand unchanged
      const updatedLot = lot.reserve(reqQty);
      await this.inventoryRepo.updateLotBalance(client, updatedLot);
    }

    await this.commercialRepo.updateOrderStatus(client, command.organizationId, command.orderId, 'RESERVED');
    return (await this.commercialRepo.findOrderById(client, command.organizationId, command.orderId))!;
  }

  /**
   * 4. Fulfills & Dispatches Wholesale Order -> FULFILLED / DISPATCHED / COMPLETED
   * Decrements quantityOnHand, releases reservedQuantity, creates COMMERCIAL_DISPATCH movements and COGS records.
   */
  public async fulfillOrder(
    command: FulfillWholesaleOrderCommand,
    client: pg.PoolClient
  ): Promise<{
    order: CommercialOrderContract;
    allocations: FulfillmentAllocationContract[];
    cogsRecords: CogsRecordContract[];
    totalCogs: Money;
    grossMargin: Money;
  }> {
    const order = await this.commercialRepo.findOrderById(client, command.organizationId, command.orderId);
    if (!order) {
      throw new WholesaleOrderNotFoundError(command.orderId, command.organizationId);
    }

    if (order.status !== 'CONFIRMED' && order.status !== 'RESERVED' && order.status !== 'PARTIALLY_FULFILLED') {
      throw new InvalidWholesaleOrderStateTransitionError(command.orderId, order.status, 'FULFILL');
    }

    let totalCogsMoney = Money.zero('IDR');
    const allocationsCreated: FulfillmentAllocationContract[] = [];
    const cogsRecordsCreated: CogsRecordContract[] = [];

    // Map order lines by id
    const lineMap = new Map(order.lines.map(l => [l.orderLineId, l]));

    // Track total fulfilled quantity per line
    const fulfilledPerLine = new Map<string, Quantity>();
    order.lines.forEach(l => {
      fulfilledPerLine.set(l.orderLineId, Quantity.of(l.fulfilledQuantity.amount, l.fulfilledQuantity.uom));
    });

    for (const fItem of command.fulfillments) {
      let line = fItem.orderLineId ? lineMap.get(fItem.orderLineId) : undefined;
      if (!line && order.lines.length === 1) {
        line = order.lines[0];
      }
      if (!line) continue;

      const fulfillQty = Quantity.of(fItem.quantityToFulfill.amount, fItem.quantityToFulfill.uom);
      if (fulfillQty.amount.isZero() || fulfillQty.amount.isNegative()) continue;

      const lot = await this.inventoryRepo.findLotByIdForUpdate(
        client,
        command.organizationId,
        fItem.inventoryLotId
      );

      if (!lot) {
        throw new LotNotAvailableForSkuError(fItem.inventoryLotId, line.skuId, 'Lot not found in organization');
      }

      if (lot.lotState !== 'ACTIVE') {
        throw new LotNotAvailableForSkuError(fItem.inventoryLotId, line.skuId, `Lot status is '${lot.lotState}', expected 'ACTIVE'`);
      }

      if (lot.quantityOnHand.compare(fulfillQty) < 0) {
        throw new InsufficientReservableStockError(
          lot.lotNumber,
          fulfillQty.amount.toString(),
          lot.quantityOnHand.amount.toString(),
          lot.quantityOnHand.uom
        );
      }

      // Lookup lot valuation snapshot for COGS
      const valuation = await this.costingRepo.findLotValuation(
        client,
        command.organizationId,
        lot.inventoryLotId
      );

      if (!valuation) {
        throw new LotValuationNotFoundError(lot.inventoryLotId, lot.lotNumber);
      }

      // Physical depletion: Decrement on-hand, and release reserved if lot had reservation
      const releaseReservedAmt = lot.reservedQuantity.compare(fulfillQty) >= 0
        ? fulfillQty
        : lot.reservedQuantity;

      const newReserved = lot.reservedQuantity.sub(releaseReservedAmt);
      const newOnHand = lot.quantityOnHand.sub(fulfillQty);
      const newLotState = newOnHand.amount.isZero() ? 'DEPLETED' : 'ACTIVE';

      const updatedLot = new InventoryLot({
        organizationId: lot.organizationId,
        inventoryLotId: lot.inventoryLotId,
        lotNumber: lot.lotNumber,
        materialId: lot.materialId,
        quantityOnHand: newOnHand,
        reservedQuantity: newReserved,
        storageLocationId: lot.storageLocationId,
        lotState: newLotState,
        receivedAt: lot.receivedAt,
        expiresAt: lot.expiresAt,
        createdAt: lot.createdAt,
        updatedAt: new Date()
      });

      await this.inventoryRepo.updateLotBalance(client, updatedLot);

      // Create physical StockLedgerMovement
      const movementId = crypto.randomUUID() as MovementId;
      const movement: StockLedgerMovementContract = {
        organizationId: command.organizationId,
        movementId,
        movementNumber: `MOV-DISPATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
        inventoryLotId: lot.inventoryLotId,
        movementType: 'COMMERCIAL_DISPATCH',
        quantityDelta: Quantity.delta(`-${fulfillQty.amount.toString()}`, fulfillQty.uom),
        sourceLocationId: lot.storageLocationId,
        referenceEntityType: 'COMMERCIAL_ORDER',
        referenceEntityId: command.orderId,
        occurredAt: new Date(),
        notes: `Wholesale Dispatch for Order ${order.orderNumber}`
      };

      await this.inventoryRepo.insertMovement(client, movement);

      // Create FulfillmentAllocation
      const allocationId = crypto.randomUUID() as FulfillmentAllocationId;
      const allocation: FulfillmentAllocationContract = {
        organizationId: command.organizationId,
        allocationId,
        orderLineId: line.orderLineId,
        inventoryLotId: lot.inventoryLotId,
        allocatedQuantity: fulfillQty,
        movementId,
        allocatedAt: new Date()
      };

      await this.commercialRepo.insertFulfillmentAllocation(client, allocation);
      allocationsCreated.push(allocation);

      // Recognize COGS from snapshot valuation
      const lotUnitCostVo = UnitCost.of(valuation.unitCost.unitPrice.toString(), valuation.unitCost.currency, valuation.unitCost.perUom);
      const lineCogsMoney = lotUnitCostVo.totalCostFor(fulfillQty);
      totalCogsMoney = totalCogsMoney.add(lineCogsMoney);

      const cogsRecord: CogsRecordContract = {
        organizationId: command.organizationId,
        cogsRecordId: crypto.randomUUID() as CogsRecordId,
        fulfillmentAllocationId: allocationId,
        inventoryLotId: lot.inventoryLotId,
        dispatchedQuantity: fulfillQty,
        unitCostSnapshot: valuation.unitCost,
        totalCogsAmount: lineCogsMoney,
        realizedAt: new Date()
      };

      await this.costingRepo.insertCogsRecord(client, cogsRecord);
      cogsRecordsCreated.push(cogsRecord);

      // Update line fulfilled quantity
      const currentFulfilled = fulfilledPerLine.get(line.orderLineId)!;
      const nextFulfilled = currentFulfilled.add(fulfillQty);
      fulfilledPerLine.set(line.orderLineId, nextFulfilled);
    }

    // Determine final status across lines
    let allLinesFullyFulfilled = true;
    let anyLineFulfilled = false;

    for (const line of order.lines) {
      const fulfilled = fulfilledPerLine.get(line.orderLineId)!;
      const ordered = Quantity.of(line.orderedQuantity.amount.toString(), line.orderedQuantity.uom);

      let lineStatus: any = 'PENDING';
      if (fulfilled.amount.isZero()) {
        allLinesFullyFulfilled = false;
      } else if (fulfilled.compare(ordered) >= 0) {
        lineStatus = 'FULFILLED';
        anyLineFulfilled = true;
      } else {
        lineStatus = 'PARTIALLY_FULFILLED';
        allLinesFullyFulfilled = false;
        anyLineFulfilled = true;
      }

      await this.commercialRepo.updateOrderLineFulfilledQuantity(
        client,
        command.organizationId,
        line.orderLineId,
        fulfilled.amount.toString(),
        lineStatus
      );
    }

    const nextOrderStatus = allLinesFullyFulfilled
      ? 'COMPLETED'
      : (anyLineFulfilled ? 'PARTIALLY_FULFILLED' : order.status);

    const now = new Date();
    await this.commercialRepo.updateOrderStatus(
      client,
      command.organizationId,
      command.orderId,
      nextOrderStatus,
      now, // dispatchedAt
      allLinesFullyFulfilled ? now : undefined // completedAt if fully done
    );

    const updatedOrder = (await this.commercialRepo.findOrderById(client, command.organizationId, command.orderId))!;
    const grandRevenue = Money.of(updatedOrder.grandTotal.amount.toString(), updatedOrder.grandTotal.currency);
    const grossMargin = grandRevenue.sub(totalCogsMoney);

    return {
      order: updatedOrder,
      allocations: allocationsCreated,
      cogsRecords: cogsRecordsCreated,
      totalCogs: totalCogsMoney,
      grossMargin
    };
  }
}
