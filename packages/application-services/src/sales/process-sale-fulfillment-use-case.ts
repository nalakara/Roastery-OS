import pg from 'pg';
import crypto from 'node:crypto';
import {
  CommercialOrderContract,
  CommercialOrderLineContract,
  FulfillmentAllocationContract,
  CogsRecordContract,
  StockLedgerMovementContract,
  MovementId,
  FulfillmentAllocationId,
  CogsRecordId
} from '@roastery-os/contracts';
import {
  Money,
  Quantity,
  InventoryLot,
  UnitCost,
  DecimalValue
} from '@roastery-os/domain-core';
import {
  PostgresTransactionManager,
  CommercialPostgresRepository,
  InventoryPostgresRepository,
  MasterDataPostgresRepository,
  CostingPostgresRepository
} from '@roastery-os/infrastructure-postgres';
import {
  ProcessSaleFulfillmentCommand,
  ProcessSaleFulfillmentResult,
  CreatedAllocationResult,
  EmptyCommercialOrderError,
  SkuNotFoundError,
  LotNotAvailableForSkuError,
  InsufficientFulfillmentStockError,
  LotValuationNotFoundError
} from './process-sale-fulfillment.js';

export class ProcessSaleFulfillmentUseCase {
  constructor(
    private readonly commercialRepo: CommercialPostgresRepository = new CommercialPostgresRepository(),
    private readonly inventoryRepo: InventoryPostgresRepository = new InventoryPostgresRepository(),
    private readonly masterDataRepo: MasterDataPostgresRepository = new MasterDataPostgresRepository(),
    private readonly costingRepo: CostingPostgresRepository = new CostingPostgresRepository()
  ) {}

  public async execute(
    command: ProcessSaleFulfillmentCommand,
    providedClient?: pg.PoolClient
  ): Promise<ProcessSaleFulfillmentResult> {
    if (!command.lines || command.lines.length === 0) {
      throw new EmptyCommercialOrderError();
    }

    const runWithClient = async (client: pg.PoolClient): Promise<ProcessSaleFulfillmentResult> => {
      const orderedAt = command.orderedAt ?? new Date();
      let subtotalMoney = Money.zero('IDR');
      let discountTotalMoney = Money.zero('IDR');
      let taxTotalMoney = Money.zero('IDR');
      let grandTotalMoney = Money.zero('IDR');
      let totalCogsMoney = Money.zero('IDR');

      const createdAllocations: CreatedAllocationResult[] = [];
      const orderLinesToInsert: CommercialOrderLineContract[] = [];
      const allocationsToInsert: FulfillmentAllocationContract[] = [];
      const cogsRecordsToInsert: CogsRecordContract[] = [];

      for (const lineParam of command.lines) {
        // 1. Verify SKU Master exists and matches tenant
        const sku = await this.masterDataRepo.findSkuById(
          client,
          command.organizationId,
          lineParam.skuId
        );
        if (!sku) {
          throw new SkuNotFoundError(lineParam.skuId, command.organizationId);
        }

        // Calculate total allocated quantity for this line
        let totalAllocatedQty = Quantity.zero(lineParam.orderedQuantity.uom);
        for (const alloc of lineParam.allocations) {
          totalAllocatedQty = totalAllocatedQty.add(alloc.allocatedQuantity);
        }

        // Check if fulfillment matches ordered quantity or insufficient
        if (totalAllocatedQty.amount.lt(lineParam.orderedQuantity.amount)) {
          throw new InsufficientFulfillmentStockError(
            lineParam.skuId,
            lineParam.orderedQuantity.amount.toString(),
            totalAllocatedQty.amount.toString(),
            lineParam.orderedQuantity.uom
          );
        }

        // Line financial calculations
        const lineUnitPrice = lineParam.unitPrice;
        const lineDiscount = lineParam.discountAmount ?? Money.zero('IDR');
        const lineTax = lineParam.taxAmount ?? Money.zero('IDR');

        // Subtotal = orderedQty * unitPrice
        const lineSubtotalMoney = lineUnitPrice.scale(lineParam.orderedQuantity.amount);
        const lineGrandMoney = lineSubtotalMoney.sub(lineDiscount).add(lineTax);

        subtotalMoney = subtotalMoney.add(lineSubtotalMoney);
        discountTotalMoney = discountTotalMoney.add(lineDiscount);
        taxTotalMoney = taxTotalMoney.add(lineTax);
        grandTotalMoney = grandTotalMoney.add(lineGrandMoney);

        const lineAllocationsContract: FulfillmentAllocationContract[] = [];

        // Process each allocation against physical InventoryLots
        for (const allocParam of lineParam.allocations) {
          if (allocParam.allocatedQuantity.amount.isZero() || allocParam.allocatedQuantity.amount.isNegative()) {
            continue;
          }

          // 2. Lock lot with SELECT ... FOR UPDATE (Concurrency Protection)
          const lot = await this.inventoryRepo.findLotByIdForUpdate(
            client,
            command.organizationId,
            allocParam.inventoryLotId
          );

          if (!lot) {
            throw new LotNotAvailableForSkuError(
              allocParam.inventoryLotId,
              lineParam.skuId,
              'Lot not found in organization'
            );
          }

          if (lot.materialId !== sku.materialId) {
            throw new LotNotAvailableForSkuError(
              allocParam.inventoryLotId,
              lineParam.skuId,
              `Lot material '${lot.materialId}' does not match SKU material '${sku.materialId}'`
            );
          }

          if (lot.lotState !== 'ACTIVE') {
            throw new LotNotAvailableForSkuError(
              allocParam.inventoryLotId,
              lineParam.skuId,
              `Lot status is '${lot.lotState}', expected 'ACTIVE'`
            );
          }

          const availableLotQty = lot.getAvailableQuantity();
          if (availableLotQty.amount.lt(allocParam.allocatedQuantity.amount)) {
            throw new InsufficientFulfillmentStockError(
              lineParam.skuId,
              allocParam.allocatedQuantity.amount.toString(),
              availableLotQty.amount.toString(),
              allocParam.allocatedQuantity.uom
            );
          }

          // 3. Physical Depletion: decrease quantity on domain entity & update DB
          const newOnHand = lot.quantityOnHand.sub(allocParam.allocatedQuantity);
          const updatedLot = new InventoryLot({
            organizationId: lot.organizationId,
            inventoryLotId: lot.inventoryLotId,
            lotNumber: lot.lotNumber,
            materialId: lot.materialId,
            quantityOnHand: newOnHand,
            reservedQuantity: lot.reservedQuantity,
            storageLocationId: lot.storageLocationId,
            lotState: newOnHand.isZero() ? 'DEPLETED' : lot.lotState,
            receivedAt: lot.receivedAt,
            expiresAt: lot.expiresAt,
            createdAt: lot.createdAt,
            updatedAt: orderedAt
          });
          await this.inventoryRepo.updateLotBalance(client, updatedLot);

          // 4. Create Stock Ledger Movement (COMMERCIAL_DISPATCH)
          const movementId = crypto.randomUUID() as MovementId;
          const movementContract: StockLedgerMovementContract = {
            organizationId: command.organizationId,
            movementId,
            movementNumber: `MOV-DISPATCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            inventoryLotId: lot.inventoryLotId,
            movementType: 'COMMERCIAL_DISPATCH',
            quantityDelta: {
              amount: DecimalValue.from(`-${allocParam.allocatedQuantity.amount.toString()}`),
              uom: allocParam.allocatedQuantity.uom
            },
            sourceLocationId: lot.storageLocationId,
            referenceEntityType: 'COMMERCIAL_ORDER',
            referenceEntityId: command.orderId,
            occurredAt: orderedAt,
            notes: `Commercial fulfillment allocation for SKU ${sku.skuCode}`
          };
          await this.inventoryRepo.insertMovement(client, movementContract);

          // 5. Look up Lot Valuation (HPP) - Costing Engine owns unit valuation
          const valuation = await this.costingRepo.findLotValuation(
            client,
            command.organizationId,
            lot.inventoryLotId
          );
          if (!valuation) {
            throw new LotValuationNotFoundError(lot.inventoryLotId, command.organizationId);
          }

          const unitCostVo = UnitCost.of(
            valuation.unitCost.unitPrice,
            valuation.unitCost.currency,
            valuation.unitCost.perUom
          );
          const cogsForAlloc = unitCostVo.totalCostFor(allocParam.allocatedQuantity);
          totalCogsMoney = totalCogsMoney.add(cogsForAlloc);

          // 6. Record Fulfillment Allocation contract
          const allocationId = crypto.randomUUID() as FulfillmentAllocationId;
          const allocationContract: FulfillmentAllocationContract = {
            organizationId: command.organizationId,
            allocationId,
            orderLineId: lineParam.orderLineId,
            inventoryLotId: lot.inventoryLotId,
            allocatedQuantity: {
              amount: allocParam.allocatedQuantity.amount,
              uom: allocParam.allocatedQuantity.uom
            },
            movementId,
            allocatedAt: orderedAt
          };
          allocationsToInsert.push(allocationContract);
          lineAllocationsContract.push(allocationContract);

          // 7. Record COGS Record contract
          const cogsRecordId = crypto.randomUUID() as CogsRecordId;
          const cogsContract: CogsRecordContract = {
            organizationId: command.organizationId,
            cogsRecordId,
            fulfillmentAllocationId: allocationId,
            inventoryLotId: lot.inventoryLotId,
            dispatchedQuantity: {
              amount: allocParam.allocatedQuantity.amount,
              uom: allocParam.allocatedQuantity.uom
            },
            unitCostSnapshot: {
              unitPrice: valuation.unitCost.unitPrice,
              currency: valuation.unitCost.currency,
              perUom: valuation.unitCost.perUom
            },
            totalCogsAmount: {
              amount: cogsForAlloc.amount,
              currency: cogsForAlloc.currency
            },
            realizedAt: orderedAt
          };
          cogsRecordsToInsert.push(cogsContract);

          createdAllocations.push({
            allocationId,
            orderLineId: lineParam.orderLineId,
            inventoryLotId: lot.inventoryLotId,
            allocatedQuantity: {
              amount: allocParam.allocatedQuantity.amount.toString(),
              uom: allocParam.allocatedQuantity.uom
            },
            movementId,
            cogsRecordId,
            unitCostSnapshot: {
              unitPrice: valuation.unitCost.unitPrice.toString(),
              currency: valuation.unitCost.currency,
              perUom: valuation.unitCost.perUom
            },
            totalCogsAmount: {
              amount: cogsForAlloc.amount.toString(),
              currency: cogsForAlloc.currency
            }
          });
        }

        // Build Order Line Contract
        const orderLineContract: CommercialOrderLineContract = {
          organizationId: command.organizationId,
          orderLineId: lineParam.orderLineId,
          orderId: command.orderId,
          skuId: sku.skuId,
          materialId: sku.materialId,
          orderedQuantity: {
            amount: lineParam.orderedQuantity.amount,
            uom: lineParam.orderedQuantity.uom
          },
          fulfilledQuantity: {
            amount: totalAllocatedQty.amount,
            uom: lineParam.orderedQuantity.uom
          },
          unitPrice: {
            amount: lineUnitPrice.amount,
            currency: lineUnitPrice.currency
          },
          discountAmount: {
            amount: lineDiscount.amount,
            currency: lineDiscount.currency
          },
          taxAmount: {
            amount: lineTax.amount,
            currency: lineTax.currency
          },
          lineSubtotal: {
            amount: lineSubtotalMoney.amount,
            currency: lineSubtotalMoney.currency
          },
          lineStatus: 'FULFILLED',
          allocations: lineAllocationsContract
        };

        orderLinesToInsert.push(orderLineContract);
      }

      // Build & Insert Commercial Order
      const commercialOrder: CommercialOrderContract = {
        organizationId: command.organizationId,
        orderId: command.orderId,
        orderNumber: command.orderNumber,
        channel: command.channel,
        customerId: command.customerId,
        status: 'FULFILLED',
        lines: orderLinesToInsert,
        subtotal: {
          amount: subtotalMoney.amount,
          currency: subtotalMoney.currency
        },
        discountTotal: {
          amount: discountTotalMoney.amount,
          currency: discountTotalMoney.currency
        },
        taxTotal: {
          amount: taxTotalMoney.amount,
          currency: taxTotalMoney.currency
        },
        grandTotal: {
          amount: grandTotalMoney.amount,
          currency: grandTotalMoney.currency
        },
        orderedAt,
        dispatchedAt: orderedAt,
        completedAt: orderedAt,
        createdAt: orderedAt,
        updatedAt: orderedAt
      };

      // 1. Insert Order first (Foreign Key parent for lines)
      await this.commercialRepo.insertOrder(client, commercialOrder);

      // 2. Insert Order Lines (Foreign Key parent for fulfillment allocations)
      for (const line of orderLinesToInsert) {
        await this.commercialRepo.insertOrderLine(client, line);
      }

      // 3. Insert Fulfillment Allocations
      for (const allocation of allocationsToInsert) {
        await this.commercialRepo.insertFulfillmentAllocation(client, allocation);
      }

      // 4. Insert COGS Records (Foreign Key child of fulfillment allocations)
      for (const cogs of cogsRecordsToInsert) {
        await this.costingRepo.insertCogsRecord(client, cogs);
      }

      // Calculate Gross Margin = Revenue (GrandTotal) - COGS
      const grossMarginMoney = grandTotalMoney.sub(totalCogsMoney);
      const marginPercentage = grandTotalMoney.amount.isPositive()
        ? parseFloat(grossMarginMoney.amount.div(grandTotalMoney.amount).mul(DecimalValue.from(100)).toFixed(2))
        : 0;

      return {
        organizationId: command.organizationId,
        orderId: command.orderId,
        orderNumber: command.orderNumber,
        channel: command.channel,
        status: 'FULFILLED',
        subtotal: {
          amount: subtotalMoney.amount.toString(),
          currency: subtotalMoney.currency
        },
        discountTotal: {
          amount: discountTotalMoney.amount.toString(),
          currency: discountTotalMoney.currency
        },
        taxTotal: {
          amount: taxTotalMoney.amount.toString(),
          currency: taxTotalMoney.currency
        },
        grandTotal: {
          amount: grandTotalMoney.amount.toString(),
          currency: grandTotalMoney.currency
        },
        totalCogs: {
          amount: totalCogsMoney.amount.toString(),
          currency: totalCogsMoney.currency
        },
        grossMargin: {
          amount: grossMarginMoney.amount.toString(),
          currency: grandTotalMoney.currency,
          percentage: marginPercentage
        },
        allocations: createdAllocations
      };
    };

    if (providedClient) {
      return runWithClient(providedClient);
    } else {
      return PostgresTransactionManager.withTransaction((client) => runWithClient(client));
    }
  }
}
