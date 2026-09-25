// The tax basis of a monetary amount on the wire.
//
// D-056 settles that a price field is tax-inclusive, and `Money` is a bare
// `{ amountMinor, currencyCode }`, so two amounts with the same shape mean different
// things by where they sit — a reader who takes a price for a bare amount is wrong by
// a VAT rate.
//
// ⚠ THE BRAND IS NECESSARY AND NOT SUFFICIENT. It is erased at runtime and absent from
//   the payload, so it reaches TypeScript consumers only — never a generated client in
//   another language, a webhook recipient or a partner reading the OpenAPI document
//   (5.3.1: a guarantee is only as wide as its mechanism). The wire form must carry the
//   basis IN THE DATA, which is `backend-contracts`' decision.

/** Whether an amount includes the tax that applies to it. */
export type TaxBasis = 'inclusive' | 'exclusive';

declare const taxBasisBrand: unique symbol;

/**
 * An amount tagged with its tax basis, for TypeScript consumers. `Taxed<Money,
 * 'inclusive'>` and `Taxed<Money, 'exclusive'>` are mutually unassignable, so mixing a
 * price into a net calculation is a compile error rather than a wrong number.
 */
export type Taxed<T, B extends TaxBasis> = T & { readonly [taxBasisBrand]: B };

/** A price as served: tax included (D-056). */
export type TaxInclusive<T> = Taxed<T, 'inclusive'>;

/** An amount before tax — a payout base, a commission base. */
export type TaxExclusive<T> = Taxed<T, 'exclusive'>;
