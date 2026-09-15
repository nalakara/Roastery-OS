import pg from 'pg';
import { 
  InventoryLotId, 
  ValuationRecordId 
} from '@roastery-os/contracts';
import { 
  DecimalValue, 
  IncompatibleUomDimensionError, 
  InventoryLot, 
  NegativeQuantityError, 
  Quantity, 
  UnitCost, 
  UnitOfMeasure 
} from '@roastery-os/domain-core';
import { 
  CostingPostgresRepository, 
  InventoryPostgresRepository, 
  MasterDataPostgresRepository, 
  PostgresTransactionManager, 
  SupplierPostgresRepository 
} from '@roastery-os/infrastructure-postgres';
import { 
  CrossTenantReceivingError, 
  ExcessiveReceiptQuantityError, 
  InvalidPurchaseOrderStateError, 
  MaterialNotFoundError, 
  PurchaseOrderLineNotFoundError, 
  PurchaseOrderNotFoundError, 
  ReceivePurchaseOrderCommand, 
  ReceivePurchaseOrderResult 
} from './receive-purchase-order.js';

export class ReceivePurchaseOrderUseCase {
  constructor(
    private readonly supplierRepo: SupplierPostgresRepository = new SupplierPostgresRepository(),
    private readonly masterDataRepo: MasterDataPostgresRepository = new MasterDataPostgresRepository(),
    private readonly inventoryRepo: InventoryPostgresRepository = new InventoryPostgresRepository(),
    private readonly costingRepo: CostingPostgresRepository = new CostingPostgresRepository()
  ) {}

  public async execute(
    command: ReceivePurchaseOrderCommand,
    providedClient?: pg.PoolClient
  ): Promise<ReceivePurchaseOrderResult> {
    // Basic quantity validity check
    if (command.receivedQuantity.amount.isZero() || command.receivedQuantity.amount.isNegative()) {
      throw new NegativeQuantityError(
        command.receivedQuantity.amount.toString(),
        command.receivedQuantity.uom
      );
    }

    const runWithClient = async (client: pg.PoolClient): Promise<ReceivePurchaseOrderResult> => {
      // 1. Load and validate Purchase Order
      const po = await this.supplierRepo.findPurchaseOrder(
        client,
        command.organizationId,
        command.poId
      );
      if (!po) {
        throw new PurchaseOrderNotFoundError(command.poId, command.organizationId);
      }
      if (po.organizationId !== command.organizationId) {
        throw new CrossTenantReceivingError(`PO belongs to another organization`);
      }
      if (po.status !== 'ISSUED' && po.status !== 'PARTIALLY_RECEIVED') {
        throw new InvalidPurchaseOrderStateError(po.status);
      }

      // 2. Load and validate Purchase Order Line
      const poLine = await this.supplierRepo.findPurchaseOrderLine(
        client,
        command.organizationId,
        command.poId,
        command.poLineId
      );
      if (!poLine) {
        throw new PurchaseOrderLineNotFoundError(command.poLineId, command.poId);
      }
      if (poLine.materialId !== command.materialId) {
        throw new CrossTenantReceivingError(`Command material does not match PO Line material`);
      }

      // 3. Load and validate Material Master
      const material = await this.masterDataRepo.findMaterialById(
        client,
        command.organizationId,
        command.materialId
      );
      if (!material || !material.isActive) {
        throw new MaterialNotFoundError(command.materialId, command.organizationId);
      }

      // 4. Verify UOM compatibility
      if (!UnitOfMeasure.isCompatible(command.receivedQuantity.uom, material.baseUom)) {
        throw new IncompatibleUomDimensionError(command.receivedQuantity.uom, material.baseUom);
      }
      if (!UnitOfMeasure.isCompatible(command.receivedQuantity.uom, poLine.orderedQuantity.uom)) {
        throw new IncompatibleUomDimensionError(command.receivedQuantity.uom, poLine.orderedQuantity.uom);
      }

      // 5. Verify received quantity does not exceed outstanding quantity
      const orderedQty = Quantity.of(poLine.orderedQuantity.amount, poLine.orderedQuantity.uom);
      const prevReceivedQty = Quantity.of(poLine.receivedQuantity.amount, poLine.receivedQuantity.uom);
      const remainingQty = orderedQty.sub(prevReceivedQty);

      if (command.receivedQuantity.compare(remainingQty) > 0) {
        throw new ExcessiveReceiptQuantityError(
          command.receivedQuantity.toString(),
          remainingQty.toString()
        );
      }

      // 6. Generate UUIDs and Lot Identity
      // In production, UUIDv7 is used. For this slice, we construct a strongly typed ID.
      const lotId = (command.receiptId as string) as InventoryLotId;
      const lotNumber = `LOT-${command.receiptNumber}`;
      const receivedAt = command.receivedAt ?? new Date();

      // 7. Materialize new InventoryLot in domain
      const newLot = new InventoryLot({
        organizationId: command.organizationId,
        inventoryLotId: lotId,
        lotNumber,
        materialId: command.materialId,
        quantityOnHand: command.receivedQuantity,
        reservedQuantity: Quantity.zero(command.receivedQuantity.uom),
        lotState: 'ACTIVE',
        receivedAt
      });

      // 8. Persist InventoryLot
      await this.inventoryRepo.insertLot(client, newLot);

      // 9. Persist Authoritative StockLedgerMovement (PURCHASE_RECEIPT)
      await this.inventoryRepo.insertMovement(client, {
        organizationId: command.organizationId,
        movementId: command.movementId,
        movementNumber: `MOV-${command.receiptNumber}`,
        inventoryLotId: lotId,
        movementType: 'PURCHASE_RECEIPT',
        quantityDelta: Quantity.delta(command.receivedQuantity.amount, command.receivedQuantity.uom),
        referenceEntityType: 'PURCHASE_ORDER',
        referenceEntityId: command.poId as string,
        occurredAt: receivedAt,
        notes: `Received against PO ${po.poNumber}`
      });

      // 10. Persist Initial LotValuationRecord (Acquisition Cost)
      const unitCostObj = UnitCost.of(
        command.unitPurchasePrice.amount,
        command.unitPurchasePrice.currency,
        command.receivedQuantity.uom
      );
      const totalLotCost = unitCostObj.totalCostFor(command.receivedQuantity);

      await this.costingRepo.insertLotValuation(client, {
        organizationId: command.organizationId,
        valuationRecordId: (command.receiptId as string) as ValuationRecordId,
        inventoryLotId: lotId,
        materialCost: totalLotCost,
        conversionCost: { amount: DecimalValue.zero(), currency: totalLotCost.currency },
        totalLotCost,
        unitCost: unitCostObj,
        allocationPolicy: 'FULL_ABSORPTION',
        calculatedAt: receivedAt
      });

      // 11. Persist PurchaseReceipt
      await this.supplierRepo.insertPurchaseReceipt(client, {
        organizationId: command.organizationId,
        receiptId: command.receiptId,
        receiptNumber: command.receiptNumber,
        poId: command.poId,
        poLineId: command.poLineId,
        supplierId: command.supplierId,
        materialId: command.materialId,
        createdLotId: lotId,
        movementId: command.movementId,
        receivedQuantity: command.receivedQuantity,
        unitPurchasePrice: command.unitPurchasePrice,
        totalAmount: totalLotCost,
        originLotReference: command.originLotReference,
        receivedAt
      });

      // 12. Update PO Line and PO Status
      const updatedTotalReceived = prevReceivedQty.add(command.receivedQuantity);
      await this.supplierRepo.updatePoLineReceivedQuantity(
        client,
        command.organizationId,
        command.poLineId,
        updatedTotalReceived.amount.toString()
      );

      const isFullyReceived = updatedTotalReceived.compare(orderedQty) >= 0;
      await this.supplierRepo.updatePoStatus(
        client,
        command.organizationId,
        command.poId,
        isFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED'
      );

      return {
        receiptId: command.receiptId,
        createdLotId: lotId as string,
        movementId: command.movementId,
        lotNumber,
        quantityOnHand: command.receivedQuantity,
        unitCost: command.unitPurchasePrice
      };
    };

    if (providedClient) {
      return runWithClient(providedClient);
    }

    return PostgresTransactionManager.withTransaction(runWithClient);
  }
}
