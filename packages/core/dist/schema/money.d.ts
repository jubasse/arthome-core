/**
 * Money at the boundary: whole minor units plus an ISO 4217 code.
 *
 * `amountMinor` is an INTEGER and may be negative — refunds and credit notes
 * are money too. It is never a decimal: `2633 * 0.12` is 315.95999999999998,
 * and a rounding that tips the wrong way on a reconciliation six months later
 * is the fault `roundMinor` exists to prevent.
 *
 * ⚠ A PRICE IS NOT A BARE `Money`, AND D-056 IS WHY. Under TTC the price an
 * artist sets is what the viewer pays, so a displayed price is TAX-INCLUSIVE
 * and the field that carries one must say so where it is declared —
 * `grossTtc`, not `amount`. The VAT is computed at the sale from
 * `BuyerTaxLocation` and is NEVER carried on the catalogue, which is what keeps
 * the catalogue publicly cacheable with no `Vary` on a buyer's country.
 */
import { z } from 'zod';
export declare const MoneySchema: z.ZodObject<{
    amountMinor: z.ZodInt;
    currencyCode: z.ZodString;
}>;
/**
 * A rate in BASIS POINTS: 1200 = 12%, 550 = 5.5%.
 *
 * An integer, never a float, for the reason above — and bounded, because a
 * negative rate is not a discount and a rate above 100% is not a rate.
 */
export declare const BasisPointsSchema: z.ZodInt;
//# sourceMappingURL=money.d.ts.map