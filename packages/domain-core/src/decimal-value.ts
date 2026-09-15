import { Decimal } from 'decimal.js';
import { DecimalValueContract } from '@roastery-os/contracts';

/**
 * Exact Decimal Value implementation wrapping decimal.js.
 * Enforces arbitrary precision arithmetic across physical and economic domains.
 */
export class DecimalValue implements DecimalValueContract {
  private readonly value: Decimal;

  constructor(input: string | number | Decimal | DecimalValue) {
    if (input instanceof DecimalValue) {
      this.value = input.value;
    } else if (input instanceof Decimal) {
      this.value = input;
    } else {
      this.value = new Decimal(input);
    }
  }

  public static from(input: string | number | Decimal | DecimalValue): DecimalValue {
    return new DecimalValue(input);
  }

  public static zero(): DecimalValue {
    return new DecimalValue(0);
  }

  public toString(): string {
    return this.value.toString();
  }

  public toFixed(fractionDigits: number): string {
    return this.value.toFixed(fractionDigits);
  }

  public isZero(): boolean {
    return this.value.isZero();
  }

  public isPositive(): boolean {
    return this.value.isPositive() && !this.value.isZero();
  }

  public isNegative(): boolean {
    return this.value.isNegative();
  }

  public eq(other: DecimalValueContract): boolean {
    return this.value.eq(new Decimal(other.toString()));
  }

  public gt(other: DecimalValueContract): boolean {
    return this.value.gt(new Decimal(other.toString()));
  }

  public gte(other: DecimalValueContract): boolean {
    return this.value.gte(new Decimal(other.toString()));
  }

  public lt(other: DecimalValueContract): boolean {
    return this.value.lt(new Decimal(other.toString()));
  }

  public lte(other: DecimalValueContract): boolean {
    return this.value.lte(new Decimal(other.toString()));
  }

  public add(other: DecimalValueContract): DecimalValue {
    return new DecimalValue(this.value.plus(new Decimal(other.toString())));
  }

  public sub(other: DecimalValueContract): DecimalValue {
    return new DecimalValue(this.value.minus(new Decimal(other.toString())));
  }

  public mul(other: DecimalValueContract): DecimalValue {
    return new DecimalValue(this.value.times(new Decimal(other.toString())));
  }

  public div(other: DecimalValueContract): DecimalValue {
    return new DecimalValue(this.value.dividedBy(new Decimal(other.toString())));
  }

  public abs(): DecimalValue {
    return new DecimalValue(this.value.abs());
  }

  public toJSON(): string {
    return this.value.toString();
  }
}
