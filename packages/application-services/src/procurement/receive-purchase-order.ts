import { 
  MaterialId, 
  MovementId, 
  OrganizationId, 
  PurchaseOrderId, 
  PurchaseOrderLineId, 
  PurchaseReceiptId, 
  SupplierId 
} from '@roastery-os/contracts';
import { Money, Quantity } from '@roastery-os/domain-core';

export interface ReceivePurchaseOrderCommand {
  readonly organizationId: OrganizationId;
  readonly receiptId: PurchaseReceiptId;
  readonly receiptNumber: string;
  readonly poId: PurchaseOrderId;
  readonly poLineId: PurchaseOrderLineId;
  readonly supplierId: SupplierId;
  readonly materialId: MaterialId;
  readonly movementId: MovementId;
  readonly receivedQuantity: Quantity;
  readonly unitPurchasePrice: Money;
  readonly originLotReference?: string;
  readonly receivedAt?: Date;
}

export interface ReceivePurchaseOrderResult {
  readonly receiptId: PurchaseReceiptId;
  readonly createdLotId: string;
  readonly movementId: MovementId;
  readonly lotNumber: string;
  readonly quantityOnHand: Quantity;
  readonly unitCost: Money;
}

export class PurchaseOrderNotFoundError extends Error {
  constructor(poId: string, orgId: string) {
    super(`Purchase order '${poId}' not found for organization '${orgId}'`);
    this.name = 'PurchaseOrderNotFoundError';
  }
}

export class PurchaseOrderLineNotFoundError extends Error {
  constructor(poLineId: string, poId: string) {
    super(`Purchase order line '${poLineId}' not found for PO '${poId}'`);
    this.name = 'PurchaseOrderLineNotFoundError';
  }
}

export class MaterialNotFoundError extends Error {
  constructor(materialId: string, orgId: string) {
    super(`Material '${materialId}' not found or inactive for organization '${orgId}'`);
    this.name = 'MaterialNotFoundError';
  }
}

export class InvalidPurchaseOrderStateError extends Error {
  constructor(status: string) {
    super(`Purchase order cannot be received in status '${status}'`);
    this.name = 'InvalidPurchaseOrderStateError';
  }
}

export class ExcessiveReceiptQuantityError extends Error {
  constructor(received: string, remaining: string) {
    super(`Received quantity (${received}) exceeds remaining allowable PO quantity (${remaining})`);
    this.name = 'ExcessiveReceiptQuantityError';
  }
}

export class CrossTenantReceivingError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'CrossTenantReceivingError';
  }
}
