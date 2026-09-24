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

import { CurrencyCodeSchema, int64 } from './primitives.js';

const MONEY_DESCRIPTION =
  'An amount. **Integer minor unit** — cents for EUR and CHF — plus an ISO 4217 currency code.\nNever a formatted string: formatting is presentation and happens client-side. May be negative\n(credit, refund).\n\n**`Money` says nothing about tax, and that is deliberate.** It carries credits, refunds,\ncommissions and payouts as well as prices. **A price, however, is tax-inclusive** (D-056),\nand every field that is one says so where it is declared rather than relying on this shape —\na reader who assumes the wrong side of a VAT rate computes a total that is wrong by that\nrate, and `Money` is not the place that can warn them.';

/**
 * ⚠ TWO SCHEMAS, AND `Money` IS THE ONLY SHAPE IN THIS PACKAGE THAT NEEDS BOTH.
 *
 *   D-060 §1: an OUTPUT shape is `looseObject`, because a client generated from
 *   a closed schema **rejects a server that added a field** — the TV-fleet
 *   failure one level up from enums, on the shape instead of the member. An
 *   INPUT shape is `z.object()`, because a command that accepts an unrecognised
 *   field has accepted something no rule evaluated.
 *
 *   Nearly every schema here is served and never submitted, so one form is
 *   honest. `Money` is not: `POST /v1/orders/seats` carries `expectedTotal` as a
 *   `$ref` to this schema — **the buyer's stated total, which is the whole
 *   anti-price-drift check.** That one field is why both exist.
 *
 * ⚠ AND THERE IS NO `MoneySchema`, WHICH IS D-065 §H APPLIED BEFORE IT COSTS
 *   ANYTHING RATHER THAN AFTER.
 *
 *   `LocaleSchema` was a strict vocabulary whose name did not say so; it had no
 *   tolerant counterpart, so a response field used the only locale schema there
 *   was and would have failed a whole payload on a third content language. The
 *   lesson was not "add the missing export" — it was that **a name which does
 *   not state its direction will be used in the wrong one.**
 *
 *   So the two forms are named for their direction and the ambiguous spelling
 *   does not exist. A call site has to choose, and choosing wrongly is visible
 *   in the diff rather than three months later in a bundle.
 *
 *   The five other object schemas in this package keep their `…Schema` name,
 *   deliberately: they have exactly one form. The fault §H names is a MISSING
 *   COUNTERPART, not a suffix.
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
 * A rate in BASIS POINTS: 1200 = 12%, 550 = 5.5%.
 *
 * An integer, never a float, for the reason above — and bounded, because a
 * negative rate is not a discount and a rate above 100% is not a rate.
 */
export const BasisPointsSchema: z.ZodInt = z.int().min(0).max(10_000);
