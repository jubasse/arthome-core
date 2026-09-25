/**
 * The PAYOUT — commission, VAT by jurisdiction, net, withholding.
 *
 * ⚠ `fixtures.js:1297-1324` reads like a proven business rule and is not one:
 * VAT as a SINGLE rate on the GROSS is a plausible mockup number that answers
 * none of who owes the VAT, on what base, and who is liable.
 *
 * The model is COMMISSIONNAIRE (D-015): the VAT base is the whole ticket at the
 * viewer's country's rate, and the commission is taken on the net-of-tax amount
 * — on the tax-inclusive amount the 12 % announced to artists would vary with
 * the buyer's country. Legal validation is not done; `adr-payments.md` warns.
 */

import type { Instant } from '../kernel/clock.js';
import { money, subtract, sum, type Money } from '../money/money.js';
import { applyRate, basisPoints, taxIncludedIn, type BasisPoints } from '../money/rounding.js';
import { DAY_MS, fromEpochMs, toEpochMs } from '../time/instant.js';
import type { DateOutcome } from '../vocabulary/catalog.js';
import { DateOutcome as Outcome } from '../vocabulary/catalog.js';
import type { TaxJurisdictionLevel, TaxSupplyKind } from '../vocabulary/commerce.js';
import { PayoutState } from '../vocabulary/commerce.js';

/** `commissionRate: 0.12` from `catalogue.json`, in basis points. */
export const COMMISSION_RATE_BPS: BasisPoints = basisPoints(1_200);
/** `payoutDelayDays: 14`. */
export const PAYOUT_DELAY_DAYS = 14;

/**
 * One VAT line, PER JURISDICTION — and not per billing market. That is a
 * PRICING notion, and a country is no more sufficient: some 9,000 US
 * jurisdictions, and a UK rate depending on jurisdiction × supply (Derby Quad:
 * no theatre-ticket exemption for a streamed live show).
 */
export interface VatLine {
  readonly jurisdictionCode: string;
  readonly jurisdictionLevel: TaxJurisdictionLevel;
  readonly supplyKind: TaxSupplyKind;
  /** The rate applied at the sale, kept — never the current rate. */
  readonly rateBps: BasisPoints;
  /** The base: the net-of-tax amount. */
  readonly base: Money;
  readonly amount: Money;
}

/**
 * Extracts a VAT line from a tax-inclusive amount. A consumer price is
 * tax-inclusive (B2C convention): VAT is extracted from it, not added to it.
 */
export function vatLineFor(
  grossTtc: Money,
  jurisdictionCode: string,
  jurisdictionLevel: TaxJurisdictionLevel,
  rateBps: BasisPoints,
  supplyKind: TaxSupplyKind,
): VatLine {
  const amount = taxIncludedIn(grossTtc, rateBps);
  return {
    jurisdictionCode,
    jurisdictionLevel,
    supplyKind,
    rateBps,
    base: subtract(grossTtc, amount),
    amount,
  };
}

export interface PayoutInput {
  readonly grossTtc: Money;
  readonly vatLines: readonly VatLine[];
  readonly commissionRateBps: BasisPoints;
}

export interface PayoutBreakdown {
  readonly grossTtc: Money;
  readonly vatLines: readonly VatLine[];
  readonly vatTotal: Money;
  readonly grossHt: Money;
  readonly commissionRateBps: BasisPoints;
  readonly commission: Money;
  readonly net: Money;
}

/**
 * The computation, in the order that matters. Each component is rounded
 * SEPARATELY and the net-of-tax amount comes by SUBTRACTION: `applyRate(ttc,
 * 10000 − rate)` drifts a cent when the rounding lands on a half.
 */
export function payoutOf(input: PayoutInput): PayoutBreakdown {
  const currency = input.grossTtc.currencyCode;
  const vatTotal = sum(
    input.vatLines.map((line) => line.amount),
    currency,
  );
  const grossHt = subtract(input.grossTtc, vatTotal);
  const commission = applyRate(grossHt, input.commissionRateBps);
  return {
    grossTtc: input.grossTtc,
    vatLines: input.vatLines,
    vatTotal,
    grossHt,
    commissionRateBps: input.commissionRateBps,
    commission,
    net: subtract(grossHt, commission),
  };
}

/**
 * The due date: end of the live show + 14 days.
 *
 * ⚠ From the END OF THE LIVE SHOW, not the payment — a ticket bought three
 * months ahead must not pay the artist three months early.
 */
export function dueAtFor(runEndedAt: Instant): Instant {
  return fromEpochMs(toEpochMs(runEndedAt) + PAYOUT_DELAY_DAYS * DAY_MS);
}

/**
 * A payout's state. The order of the tests is the precedence: a banking
 * suspension outranks everything, because it protects against a transfer to an
 * account we have doubts about.
 */
export function payoutStateFor(
  outcome: DateOutcome | null,
  alreadyPaid: boolean,
  bankChangePending: boolean,
): PayoutState {
  if (bankChangePending) return PayoutState.SUSPENDED;
  if (outcome === Outcome.CANCELLED) return PayoutState.REFUNDED;
  if (outcome !== null) return PayoutState.HELD;
  return alreadyPaid ? PayoutState.PAID : PayoutState.SCHEDULED;
}

/**
 * How long a credit note stays valid.
 *
 * ⚠ Paying with a credit leaves Stripe receiving less while the artist of the
 * date bought must still be paid IN FULL, out of the platform's own money —
 * hence D-017's same-channel scope, where the withholding already covers it.
 */
export const CREDIT_VALIDITY_MONTHS = 12;

export function creditAmountFor(paidAmount: Money): Money {
  return money(paidAmount.amountMinor, paidAmount.currencyCode);
}
