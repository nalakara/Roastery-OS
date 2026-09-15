import {
  OrganizationId,
  CommercialOrderId,
  CommercialOrderLineId,
  CommercialSalesChannel,
  CommercialOrderStatus,
  CustomerId,
  SkuId,
  InventoryLotId,
  FulfillmentAllocationId,
  MovementId,
  CogsRecordId
} from '@roastery-os/contracts';
import { Quantity, Money } from '@roastery-os/domain-core';

export interface FulfillmentAllocationParam {
  readonly inventoryLotId: InventoryLotId;
  readonly allocatedQuantity: Quantity;
}

export interface SaleOrderLineParam {
  readonly orderLineId: CommercialOrderLineId;
  readonly skuId: SkuId;
  readonly orderedQuantity: Quantity;
  readonly unitPrice: Money;
  readonly discountAmount?: Money;
  readonly taxAmount?: Money;
  readonly allocations: readonly FulfillmentAllocationParam[];
}

export interface ProcessSaleFulfillmentCommand {
  readonly organizationId: OrganizationId;
  readonly orderId: CommercialOrderId;
  readonly orderNumber: string;
  readonly channel: CommercialSalesChannel;
  readonly customerId?: CustomerId;
  readonly lines: readonly SaleOrderLineParam[];
  readonly orderedAt?: Date;
}

export interface CreatedAllocationResult {
  readonly allocationId: FulfillmentAllocationId;
  readonly orderLineId: CommercialOrderLineId;
  readonly inventoryLotId: InventoryLotId;
  readonly allocatedQuantity: { amount: string; uom: string };
  readonly movementId: MovementId;
  readonly cogsRecordId: CogsRecordId;
  readonly unitCostSnapshot: { unitPrice: string; currency: string; perUom: string };
  readonly totalCogsAmount: { amount: string; currency: string };
}

export interface ProcessSaleFulfillmentResult {
  readonly organizationId: OrganizationId;
  readonly orderId: CommercialOrderId;
  readonly orderNumber: string;
  readonly channel: CommercialSalesChannel;
  readonly status: CommercialOrderStatus;
  readonly subtotal: { amount: string; currency: string };
  readonly discountTotal: { amount: string; currency: string };
  readonly taxTotal: { amount: string; currency: string };
  readonly grandTotal: { amount: string; currency: string };
  readonly totalCogs: { amount: string; currency: string };
  readonly grossMargin: { amount: string; currency: string; percentage: number };
  readonly allocations: readonly CreatedAllocationResult[];
}

// Error definitions
export class SkuNotFoundError extends Error {
  constructor(skuId: string, orgId: string) {
    super(`SKU '${skuId}' not found in organization '${orgId}'`);
    this.name = 'SkuNotFoundError';
  }
}

export class LotNotAvailableForSkuError extends Error {
  constructor(lotId: string, skuId: string, reason: string) {
    super(`Lot '${lotId}' cannot fulfill SKU '${skuId}': ${reason}`);
    this.name = 'LotNotAvailableForSkuError';
  }
}

export class InsufficientFulfillmentStockError extends Error {
  constructor(skuId: string, ordered: string, allocated: string, uom: string) {
    super(`Insufficient stock for SKU '${skuId}': ordered ${ordered} ${uom}, allocated ${allocated} ${uom}`);
    this.name = 'InsufficientFulfillmentStockError';
  }
}

export class LotValuationNotFoundError extends Error {
  constructor(lotId: string, orgId: string) {
    super(`Valuation record not found for InventoryLot '${lotId}' in organization '${orgId}'`);
    this.name = 'LotValuationNotFoundError';
  }
}

export class EmptyCommercialOrderError extends Error {
  constructor(message = 'Commercial order must have at least one line') {
    super(message);
    this.name = 'EmptyCommercialOrderError';
  }
}
