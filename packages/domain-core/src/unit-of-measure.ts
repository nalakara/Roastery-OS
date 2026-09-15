import { Uom, UomDimension } from '@roastery-os/contracts';
import { IncompatibleUomDimensionError } from './errors.js';
import { DecimalValue } from './decimal-value.js';

export class UnitOfMeasure {
  public static getDimension(uom: Uom): UomDimension {
    switch (uom) {
      case 'KG':
      case 'G':
        return 'MASS';
      case 'L':
      case 'ML':
        return 'VOLUME';
      case 'UNIT':
      case 'PACK':
      case 'BOX':
      case 'BOTTLE':
      case 'BAG':
        return 'COUNT';
      default: {
        const _exhaustive: never = uom;
        throw new Error(`Unhandled UOM: ${_exhaustive}`);
      }
    }
  }

  public static isCompatible(uom1: Uom, uom2: Uom): boolean {
    return this.getDimension(uom1) === this.getDimension(uom2);
  }

  /**
   * Returns conversion factor to base dimension unit (KG for mass, L for volume, UNIT for count).
   */
  public static getBaseFactor(uom: Uom): DecimalValue {
    switch (uom) {
      case 'KG':
        return DecimalValue.from(1);
      case 'G':
        return DecimalValue.from('0.001');
      case 'L':
        return DecimalValue.from(1);
      case 'ML':
        return DecimalValue.from('0.001');
      case 'UNIT':
      case 'PACK':
      case 'BOX':
      case 'BOTTLE':
      case 'BAG':
        return DecimalValue.from(1);
    }
  }

  /**
   * Converts an amount from source UOM to target UOM if within the same dimension.
   */
  public static convert(amount: DecimalValue, from: Uom, to: Uom): DecimalValue {
    if (from === to) {
      return amount;
    }
    const dimFrom = this.getDimension(from);
    const dimTo = this.getDimension(to);

    if (dimFrom !== dimTo) {
      throw new IncompatibleUomDimensionError(from, to);
    }

    if (dimFrom === 'COUNT') {
      throw new IncompatibleUomDimensionError(from, to);
    }

    const baseAmount = amount.mul(this.getBaseFactor(from));
    return baseAmount.div(this.getBaseFactor(to));
  }
}
