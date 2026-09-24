/**
 * Money, in whole minor units.
 *
 * Project decision: "one canonical unit (whole cents + currency code) in the
 * database and in the contracts. Never a formatted string stored or
 * transported, except inside a document." Formatting is presentation and lives
 * in `format/`, with an explicit locale.
 *
 * ⚠ `fixtures.js` carries prices in WHOLE EUROS (`price: 26`). That is a mockup
 * convenience: it cannot express €26.50. The port multiplies by a hundred.
 */
import { DomainError } from '../kernel/errors.js';
const CURRENCY_SHAPE = /^[A-Z]{3}$/;
export function money(amountMinor, currencyCode) {
    if (!Number.isSafeInteger(amountMinor)) {
        throw new DomainError({
            code: 'money.amount_not_integer',
            params: { amount: String(amountMinor) },
        });
    }
    if (!CURRENCY_SHAPE.test(currencyCode)) {
        throw new DomainError({ code: 'money.currency_invalid', params: { currency: currencyCode } });
    }
    return { amountMinor, currencyCode };
}
export function zero(currencyCode) {
    return money(0, currencyCode);
}
export function isZero(value) {
    return value.amountMinor === 0;
}
export function isNegative(value) {
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
function assertSameCurrency(left, right) {
    if (left.currencyCode !== right.currencyCode) {
        throw new DomainError({
            code: 'money.currency_mismatch',
            params: { left: left.currencyCode, right: right.currencyCode },
        });
    }
}
export function add(left, right) {
    assertSameCurrency(left, right);
    return money(left.amountMinor + right.amountMinor, left.currencyCode);
}
export function subtract(left, right) {
    assertSameCurrency(left, right);
    return money(left.amountMinor - right.amountMinor, left.currencyCode);
}
export function sum(values, currencyCode) {
    return values.reduce((total, value) => add(total, value), zero(currencyCode));
}
export function compare(left, right) {
    assertSameCurrency(left, right);
    return left.amountMinor - right.amountMinor;
}
export function min(left, right) {
    return compare(left, right) <= 0 ? left : right;
}
export function max(left, right) {
    return compare(left, right) >= 0 ? left : right;
}
export function multiplyByCount(value, count) {
    if (!Number.isSafeInteger(count) || count < 0) {
        throw new DomainError({ code: 'money.count_invalid', params: { count: String(count) } });
    }
    return money(value.amountMinor * count, value.currencyCode);
}
//# sourceMappingURL=money.js.map