/**
 * The tax basis of a monetary amount on the wire.
 *
 * WHY THIS MODULE EXISTS, AND WHY IT IS THE FIRST THING IN THIS PACKAGE.
 *
 * `@arthome/core`'s `Money` is `{ amountMinor, currencyCode }` — a bare amount with
 * no tax semantics, which is correct for the domain: rounding, summing and
 * commission arithmetic do not care. But D-056 settles that **a price field is
 * tax-inclusive**, and `Money` alone cannot say so.
 *
 * So two amounts with the SAME SHAPE mean different things depending on which field
 * they sit in, and nothing in the type distinguishes them. A reader who takes a
 * price for a bare amount is wrong by a VAT rate — silently, and in the direction
 * that under-charges or over-pays.
 *
 * That is the `reasonCode` shape a third time (D-039): one name, two meanings,
 * disambiguated only by where you are standing. It is also the E2 shape inverted —
 * the fact that a price includes tax is stated NOWHERE, and carried by convention.
 *
 * ⚠ A BRAND IS NECESSARY AND NOT SUFFICIENT, AND THAT IS THE DESIGN POINT.
 *
 *   The brand below makes the distinction a compile error for a TypeScript
 *   consumer, which is the five surfaces and seven services. It is erased at
 *   runtime and absent from the payload.
 *
 *   A CONTRACT's consumers are not all type-checked against these declarations: a
 *   generated client in another language, a webhook recipient, a partner reading the
 *   OpenAPI document. For them a branded price is an unmarked amount, and the
 *   guarantee this module provides does not reach them — a gate's guarantee is only
 *   as wide as its mechanism (code-conventions.md 5.3.1), and a brand's mechanism is
 *   the TypeScript compiler.
 *
 *   So the wire representation must carry the basis IN THE DATA. What that looks
 *   like — a discriminated field, a naming convention on the property, a documented
 *   invariant per endpoint — is a contract decision and belongs to
 *   `backend-contracts`, not here. This module provides the type-level half and
 *   states plainly that it is a half.
 *
 * NOTHING IS REDECLARED HERE. There is no `MoneySchema` in this file and there must
 * never be one: `@arthome/core/schema` owns it, and this package will `.extend()` it
 * once wave 6 lands. Redeclaring the most manipulated value in the system would be
 * E2 at its most expensive.
 */

/** Whether an amount includes the tax that applies to it. */
export type TaxBasis = 'inclusive' | 'exclusive';

declare const taxBasisBrand: unique symbol;

/**
 * An amount tagged with its tax basis, for TypeScript consumers.
 *
 * `Taxed<Money, 'inclusive'>` and `Taxed<Money, 'exclusive'>` are mutually
 * unassignable, so mixing a price into a net calculation is a compile error rather
 * than a wrong number.
 */
export type Taxed<T, B extends TaxBasis> = T & { readonly [taxBasisBrand]: B };

/** A price as served: tax included (D-056). */
export type TaxInclusive<T> = Taxed<T, 'inclusive'>;

/** An amount before tax — a payout base, a commission base. */
export type TaxExclusive<T> = Taxed<T, 'exclusive'>;
