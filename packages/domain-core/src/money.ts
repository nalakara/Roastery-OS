import { MoneyContract } from '@roastery-os/contracts';
import { DecimalValue } from './decimal-value.js';
import { DomainInvariantViolationError } from './errors.js';

/**
 * Exact economic monetary value object.
 */
export class Money implements MoneyContract {
  public readonly amount: DecimalValue;
  public readonly currency: string;

  constructor(amount: DecimalValue | string | number, currency = 'IDR') {
    this.amount = amount instanceof DecimalValue ? amount : DecimalValue.from(amount);
    this.currency = currency.toUpperCase();
  }

  public static of(amount: DecimalValue | string | number, currency = 'IDR'): Money {
    return new Money(amount, currency);
  }

  public static zero(currency = 'IDR'): Money {
    return new Money(DecimalValue.zero(), currency);
  }

  public add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new DomainInvariantViolationError(
        `Cannot add Money with different currencies: '${this.currency}' and '${other.currency}'`
      );
    }
    return new Money(this.amount.add(other.amount), this.currency);
  }

  public sub(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new DomainInvariantViolationError(
        `Cannot subtract Money with different currencies: '${this.currency}' and '${other.currency}'`
      );
    }
    return new Money(this.amount.sub(other.amount), this.currency);
  }

  public scale(factor: DecimalValue | number | string): Money {
    const factorDec = factor instanceof DecimalValue ? factor : DecimalValue.from(factor);
    return new Money(this.amount.mul(factorDec), this.currency);
  }

  public compare(other: Money): number {
    if (this.currency !== other.currency) {
      throw new DomainInvariantViolationError(
        `Cannot compare Money with different currencies: '${this.currency}' and '${other.currency}'`
      );
    }
    if (this.amount.gt(other.amount)) return 1;
    if (this.amount.lt(other.amount)) return -1;
    return 0;
  }

  public toString(): string {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }
}
