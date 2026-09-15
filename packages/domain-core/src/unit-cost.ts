import { UnitCostContract, Uom, DecimalValueContract } from '@roastery-os/contracts';
import { DecimalValue } from './decimal-value.js';
import { Money } from './money.js';
import { Quantity } from './quantity.js';
import { UnitOfMeasure } from './unit-of-measure.js';
import { IncompatibleUomDimensionError } from './errors.js';

/**
 * Economic unit valuation value object (U_lot).
 * Expresses exact cost per specific physical UOM basis.
 */
export class UnitCost implements UnitCostContract {
  public readonly unitPrice: DecimalValue;
  public readonly currency: string;
  public readonly perUom: Uom;

  constructor(
    unitPrice: DecimalValueContract | string | number,
    currency = 'IDR',
    perUom: Uom = 'KG'
  ) {
    this.unitPrice = unitPrice instanceof DecimalValue 
      ? unitPrice 
      : (typeof unitPrice === 'object' && 'toString' in unitPrice ? DecimalValue.from(unitPrice.toString()) : DecimalValue.from(unitPrice));
    this.currency = currency.toUpperCase();
    this.perUom = perUom;
  }

  public static of(
    unitPrice: DecimalValueContract | string | number,
    currency = 'IDR',
    perUom: Uom = 'KG'
  ): UnitCost {
    return new UnitCost(unitPrice, currency, perUom);
  }

  public static zero(currency = 'IDR', perUom: Uom = 'KG'): UnitCost {
    return new UnitCost(DecimalValue.zero(), currency, perUom);
  }

  public totalCostFor(quantity: Quantity): Money {
    if (quantity.uom === this.perUom) {
      return new Money(quantity.amount.mul(this.unitPrice), this.currency);
    }
    if (!UnitOfMeasure.isCompatible(quantity.uom, this.perUom)) {
      throw new IncompatibleUomDimensionError(quantity.uom, this.perUom);
    }
    const convertedAmount = UnitOfMeasure.convert(quantity.amount, quantity.uom, this.perUom);
    return new Money(convertedAmount.mul(this.unitPrice), this.currency);
  }

  public toString(): string {
    return `${this.currency} ${this.unitPrice.toFixed(4)} / ${this.perUom}`;
  }
}
