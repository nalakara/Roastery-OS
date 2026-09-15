export type MassUom = 'KG' | 'G';
export type VolumeUom = 'L' | 'ML';
export type CountUom = 'UNIT' | 'PACK' | 'BOX' | 'BOTTLE' | 'BAG';

export type Uom = MassUom | VolumeUom | CountUom;

export type UomDimension = 'MASS' | 'VOLUME' | 'COUNT';

export interface UnitOfMeasureContract {
  readonly code: Uom;
  readonly dimension: UomDimension;
}

/**
 * Exact Decimal value abstraction.
 * Represents an arbitrary-precision decimal number.
 * Independent of runtime backing implementation.
 */
export interface DecimalValueContract {
  toString(): string;
  toFixed(fractionDigits: number): string;
  isZero(): boolean;
  isPositive(): boolean;
  isNegative(): boolean;
  eq(other: DecimalValueContract): boolean;
  gt(other: DecimalValueContract): boolean;
  gte(other: DecimalValueContract): boolean;
  lt(other: DecimalValueContract): boolean;
  lte(other: DecimalValueContract): boolean;
  add(other: DecimalValueContract): DecimalValueContract;
  sub(other: DecimalValueContract): DecimalValueContract;
  mul(other: DecimalValueContract): DecimalValueContract;
  div(other: DecimalValueContract): DecimalValueContract;
  abs(): DecimalValueContract;
}

/**
 * Unit-aware physical quantity value object contract.
 */
export interface QuantityContract {
  readonly amount: DecimalValueContract;
  readonly uom: Uom;
}

/**
 * Exact economic monetary value object contract.
 */
export interface MoneyContract {
  readonly amount: DecimalValueContract;
  readonly currency: string;
}

/**
 * Economic unit valuation value object contract.
 */
export interface UnitCostContract {
  readonly unitPrice: DecimalValueContract;
  readonly currency: string;
  readonly perUom: Uom;
}
