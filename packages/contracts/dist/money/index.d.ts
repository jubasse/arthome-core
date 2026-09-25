/** Whether an amount includes the tax that applies to it. */
export type TaxBasis = 'inclusive' | 'exclusive';
declare const taxBasisBrand: unique symbol;
/**
 * An amount tagged with its tax basis, for TypeScript consumers. `Taxed<Money,
 * 'inclusive'>` and `Taxed<Money, 'exclusive'>` are mutually unassignable, so mixing a
 * price into a net calculation is a compile error rather than a wrong number.
 */
export type Taxed<T, B extends TaxBasis> = T & {
    readonly [taxBasisBrand]: B;
};
/** A price as served: tax included (D-056). */
export type TaxInclusive<T> = Taxed<T, 'inclusive'>;
/** An amount before tax — a payout base, a commission base. */
export type TaxExclusive<T> = Taxed<T, 'exclusive'>;
export {};
//# sourceMappingURL=index.d.ts.map