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
export interface Money {
    /** The currency's smallest unit, as an integer. May be negative. */
    readonly amountMinor: number;
    /** ISO 4217, uppercase. */
    readonly currencyCode: string;
}
export declare function money(amountMinor: number, currencyCode: string): Money;
export declare function zero(currencyCode: string): Money;
export declare function isZero(value: Money): boolean;
export declare function isNegative(value: Money): boolean;
export declare function add(left: Money, right: Money): Money;
export declare function subtract(left: Money, right: Money): Money;
export declare function sum(values: readonly Money[], currencyCode: string): Money;
export declare function compare(left: Money, right: Money): number;
export declare function min(left: Money, right: Money): Money;
export declare function max(left: Money, right: Money): Money;
export declare function multiplyByCount(value: Money, count: number): Money;
//# sourceMappingURL=money.d.ts.map