import { QuantityContract, Uom, DecimalValueContract } from '@roastery-os/contracts';
import { DecimalValue } from './decimal-value.js';
import { UnitOfMeasure } from './unit-of-measure.js';
import { IncompatibleUomDimensionError, NegativeQuantityError } from './errors.js';

/**
 * Unit-aware physical quantity value object.
 * Enforces non-negative balances and dimension-safe arithmetic.
 */
export class Quantity implements QuantityContract {
  public readonly amount: DecimalValue;
  public readonly uom: Uom;

  constructor(amount: DecimalValueContract | string | number, uom: Uom, allowNegative = false) {
    this.amount = amount instanceof DecimalValue 
      ? amount 
      : (typeof amount === 'object' && 'toString' in amount ? DecimalValue.from(amount.toString()) : DecimalValue.from(amount));
    this.uom = uom;

    if (!allowNegative && this.amount.isNegative()) {
      throw new NegativeQuantityError(this.amount.toString(), this.uom);
    }
  }

  public static of(amount: DecimalValueContract | string | number, uom: Uom): Quantity {
    return new Quantity(amount, uom);
  }

  public static zero(uom: Uom): Quantity {
    return new Quantity(DecimalValue.zero(), uom);
  }

  public static delta(amount: DecimalValue | string | number, uom: Uom): Quantity {
    return new Quantity(amount, uom, true); // Allows signed deltas for StockLedgerMovement
  }

  public add(other: Quantity): Quantity {
    if (this.uom === other.uom) {
      return new Quantity(this.amount.add(other.amount), this.uom);
    }
    if (!UnitOfMeasure.isCompatible(this.uom, other.uom)) {
      throw new IncompatibleUomDimensionError(this.uom, other.uom);
    }
    const convertedAmount = UnitOfMeasure.convert(other.amount, other.uom, this.uom);
    return new Quantity(this.amount.add(convertedAmount), this.uom);
  }

  public sub(other: Quantity): Quantity {
    if (this.uom === other.uom) {
      return new Quantity(this.amount.sub(other.amount), this.uom);
    }
    if (!UnitOfMeasure.isCompatible(this.uom, other.uom)) {
      throw new IncompatibleUomDimensionError(this.uom, other.uom);
    }
    const convertedAmount = UnitOfMeasure.convert(other.amount, other.uom, this.uom);
    return new Quantity(this.amount.sub(convertedAmount), this.uom);
  }

  public scale(factor: DecimalValue | number | string): Quantity {
    const factorDec = factor instanceof DecimalValue ? factor : DecimalValue.from(factor);
    return new Quantity(this.amount.mul(factorDec), this.uom);
  }

  public compare(other: Quantity): number {
    if (this.uom === other.uom) {
      if (this.amount.gt(other.amount)) return 1;
      if (this.amount.lt(other.amount)) return -1;
      return 0;
    }
    if (!UnitOfMeasure.isCompatible(this.uom, other.uom)) {
      throw new IncompatibleUomDimensionError(this.uom, other.uom);
    }
    const convertedAmount = UnitOfMeasure.convert(other.amount, other.uom, this.uom);
    if (this.amount.gt(convertedAmount)) return 1;
    if (this.amount.lt(convertedAmount)) return -1;
    return 0;
  }

  public isZero(): boolean {
    return this.amount.isZero();
  }

  public toString(): string {
    return `${this.amount.toString()} ${this.uom}`;
  }
}
