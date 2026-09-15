export class DomainInvariantViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainInvariantViolationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class IncompatibleUomDimensionError extends DomainInvariantViolationError {
  constructor(sourceUom: string, targetUom: string) {
    super(`Incompatible UOM dimension arithmetic: cannot operate between '${sourceUom}' and '${targetUom}'`);
    this.name = 'IncompatibleUomDimensionError';
  }
}

export class NegativeQuantityError extends DomainInvariantViolationError {
  constructor(amount: string, uom: string) {
    super(`Physical quantity cannot be negative: received ${amount} ${uom}`);
    this.name = 'NegativeQuantityError';
  }
}

export class CrossTenantViolationError extends DomainInvariantViolationError {
  constructor(sourceOrg: string, targetOrg: string) {
    super(`Cross-tenant boundary violation: cannot link Organization '${sourceOrg}' to Organization '${targetOrg}'`);
    this.name = 'CrossTenantViolationError';
  }
}

export class ReservationExceedsBalanceError extends DomainInvariantViolationError {
  constructor(requested: string, onHand: string) {
    super(`Reservation invariant violation: requested reservation (${requested}) exceeds quantity on hand (${onHand})`);
    this.name = 'ReservationExceedsBalanceError';
  }
}
