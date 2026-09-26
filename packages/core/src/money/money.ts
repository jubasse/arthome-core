/**
 * Money, in whole minor units.
 *
 * Project decision: "one canonical unit (whole cents + currency code) in the
 * database and in the contracts. Never a formatted string stored or
 * transported, except inside a document." Formatting is presentation and lives
 * in `format/`, with an explicit locale.
 *
 * `fixtures.js` carries prices in WHOLE EUROS (`price: 26`). That is a mockup
 * convenience: it cannot express €26.50. The port multiplies by a hundred.
 */

import { DomainError } from '../kernel/errors.js';
import { DomainGuardCode } from '../vocabulary/error-codes.js';

export interface Money {
  /** The currency's smallest unit, as an integer. May be negative. */
  readonly amountMinor: number;
  /** ISO 4217, uppercase. */
  readonly currencyCode: string;
}

const CURRENCY_SHAPE = /^[A-Z]{3}$/;

export function money(amountMinor: number, currencyCode: string): Money {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new DomainError({
      code: DomainGuardCode.MONEY_AMOUNT_NOT_INTEGER,
      params: { amount: String(amountMinor) },
    });
  }
  if (!CURRENCY_SHAPE.test(currencyCode)) {
    throw new DomainError({
      code: DomainGuardCode.MONEY_CURRENCY_INVALID,
      params: { currency: currencyCode },
    });
  }
  return { amountMinor, currencyCode };
}

export function zero(currencyCode: string): Money {
  return money(0, currencyCode);
}

export function isZero(value: Money): boolean {
  return value.amountMinor === 0;
}

export function isNegative(value: Money): boolean {
  return value.amountMinor < 0;
}

/**
 * Adding two different currencies is a fault, never an implicit conversion.
 *
 * D4: three markets are declared, ONE is exercised — multi-currency is an
 * intention, not a proven rule. Converting here would introduce a rate, hence a
 * conversion date, hence a reconciliation gap nobody could explain. A channel
 * selling in two currencies has TWO BALANCES.
 */
function assertSameCurrency(left: Money, right: Money): void {
  if (left.currencyCode !== right.currencyCode) {
    throw new DomainError({
      code: DomainGuardCode.MONEY_CURRENCY_MISMATCH,
      params: { left: left.currencyCode, right: right.currencyCode },
    });
  }
}

export function add(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return money(left.amountMinor + right.amountMinor, left.currencyCode);
}

export function subtract(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return money(left.amountMinor - right.amountMinor, left.currencyCode);
}

export function sum(values: readonly Money[], currencyCode: string): Money {
  return values.reduce<Money>((total, value) => add(total, value), zero(currencyCode));
}

export function compare(left: Money, right: Money): number {
  assertSameCurrency(left, right);
  return left.amountMinor - right.amountMinor;
}

export function min(left: Money, right: Money): Money {
  return compare(left, right) <= 0 ? left : right;
}

export function max(left: Money, right: Money): Money {
  return compare(left, right) >= 0 ? left : right;
}

export function multiplyByCount(value: Money, count: number): Money {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new DomainError({
      code: DomainGuardCode.MONEY_COUNT_INVALID,
      params: { count: String(count) },
    });
  }
  return money(value.amountMinor * count, value.currencyCode);
}
