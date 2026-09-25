/**
 * Money at the boundary: whole minor units plus an ISO 4217 code.
 *
 * `amountMinor` is an integer and may be negative — refunds and credit notes are money too.
 * Never a decimal: `2633 * 0.12` is 315.95999999999998, and a rounding that tips the wrong
 * way on a reconciliation six months later is what `roundMinor` exists to prevent.
 *
 * ⚠ A price is not a bare `Money` (D-056). Under TTC the price an artist sets is what the
 * viewer pays, so the field carrying one says so where it is declared — `grossTtc`, not
 * `amount`. The VAT is computed at the sale from `BuyerTaxLocation` and never carried on the
 * catalogue, which is what keeps the catalogue publicly cacheable with no `Vary` on country.
 */

import { z } from 'zod';

import { CurrencyCodeSchema, int64 } from './primitives.js';

const MONEY_DESCRIPTION =
  'An amount. **Integer minor unit** — cents for EUR and CHF — plus an ISO 4217 currency code.\nNever a formatted string: formatting is presentation and happens client-side. May be negative\n(credit, refund).\n\n**`Money` says nothing about tax, and that is deliberate.** It carries credits, refunds,\ncommissions and payouts as well as prices. **A price, however, is tax-inclusive** (D-056),\nand every field that is one says so where it is declared rather than relying on this shape —\na reader who assumes the wrong side of a VAT rate computes a total that is wrong by that\nrate, and `Money` is not the place that can warn them.';

/**
 * An amount a server serves.
 *
 * ⚠ Two schemas, and `Money` is the only shape here needing both (D-060 §1): an output shape is
 * `looseObject`, or a generated client rejects a server that added a field, while an input shape is
 * `z.object()`, or a command accepts what no rule evaluated. `Money` is also submitted — `POST
 * /v1/orders/seats` carries `expectedTotal`, the anti-price-drift check.
 *
 * ⚠ There is no `MoneySchema` (D-065 §H): a name that does not state its direction gets used in
 * the wrong one. The five other object schemas keep `…Schema` because they have one form.
 */
export const MoneyOut: z.ZodObject<
  {
    amountMinor: z.ZodNumber;
    currencyCode: z.ZodString;
  },
  z.core.$loose
> = z
  .looseObject({
    amountMinor: int64().meta({ examples: [2400] }),
    currencyCode: CurrencyCodeSchema.meta({ examples: ['EUR'] }),
  })
  .describe(MONEY_DESCRIPTION);

/** The same shape, STRICT — for a `Money` a client sends. */
export const MoneyIn: z.ZodObject<{
  amountMinor: z.ZodNumber;
  currencyCode: z.ZodString;
}> = z
  .object({
    amountMinor: int64().meta({ examples: [2400] }),
    currencyCode: CurrencyCodeSchema.meta({ examples: ['EUR'] }),
  })
  .describe(MONEY_DESCRIPTION);

/**
 * A rate in basis points: 1200 = 12%, 550 = 5.5%.
 *
 * Bounded because a negative rate is not a discount and a rate above 100% is not a rate.
 */
export const BasisPointsSchema: z.ZodInt = z.int().min(0).max(10_000);
