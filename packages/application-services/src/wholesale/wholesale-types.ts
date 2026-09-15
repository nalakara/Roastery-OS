import {
  OrganizationId,
  CommercialOrderId,
  CommercialOrderLineId,
  CustomerId,
  SkuId,
  InventoryLotId,
  MoneyContract,
  QuantityContract
} from '@roastery-os/contracts';

export interface CreateWholesaleOrderLineCommand {
  readonly orderLineId?: CommercialOrderLineId;
  readonly skuId: SkuId;
  readonly orderedQuantity: QuantityContract;
  readonly unitPrice: MoneyContract;
  readonly discountAmount?: MoneyContract;
  readonly taxAmount?: MoneyContract;
}

export interface CreateWholesaleOrderCommand {
  readonly organizationId: OrganizationId;
  readonly orderId?: CommercialOrderId;
  readonly orderNumber?: string;
  readonly customerId: CustomerId;
  readonly lines: readonly CreateWholesaleOrderLineCommand[];
  readonly status?: 'DRAFT' | 'CONFIRMED';
  readonly orderedAt?: Date;
}

export interface ReserveWholesaleStockLineItem {
  readonly orderLineId: CommercialOrderLineId;
  readonly inventoryLotId: InventoryLotId;
  readonly quantityToReserve: QuantityContract;
}

export interface ReserveWholesaleStockCommand {
  readonly organizationId: OrganizationId;
  readonly orderId: CommercialOrderId;
  readonly reservations: readonly ReserveWholesaleStockLineItem[];
}

export interface FulfillWholesaleOrderLineItem {
  readonly orderLineId: CommercialOrderLineId;
  readonly inventoryLotId: InventoryLotId;
  readonly quantityToFulfill: QuantityContract;
}

export interface FulfillWholesaleOrderCommand {
  readonly organizationId: OrganizationId;
  readonly orderId: CommercialOrderId;
  readonly fulfillments: readonly FulfillWholesaleOrderLineItem[];
}

// Domain Errors for Wholesale Workflows
export class WholesaleOrderNotFoundError extends Error {
  constructor(orderId: string, orgId: string) {
    super(`Wholesale commercial order '${orderId}' not found for organization '${orgId}'`);
    this.name = 'WholesaleOrderNotFoundError';
  }
}

export class WholesaleCustomerNotFoundError extends Error {
  constructor(customerId: string, orgId: string) {
    super(`Customer '${customerId}' not found for organization '${orgId}'`);
    this.name = 'WholesaleCustomerNotFoundError';
  }
}

export class InvalidWholesaleOrderStateTransitionError extends Error {
  constructor(orderId: string, currentStatus: string, action: string) {
    super(`Cannot perform '${action}' on wholesale order '${orderId}' in status '${currentStatus}'`);
    this.name = 'InvalidWholesaleOrderStateTransitionError';
  }
}

export class InsufficientReservableStockError extends Error {
  constructor(lotId: string, requested: string, available: string, uom: string) {
    super(`Cannot reserve ${requested} ${uom} from lot '${lotId}': only ${available} ${uom} available`);
    this.name = 'InsufficientReservableStockError';
  }
}
