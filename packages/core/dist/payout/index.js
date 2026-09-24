/**
 * The PAYOUT — commission, VAT by jurisdiction, net, withholding.
 *
 * ⚠ D5 IS THE MOST EXPENSIVE TRAP IN THE FILE, and it has to be said before
 * anything else. `fixtures.js:1297-1324` computes:
 *
 *     commission = round(gross x 0.12)
 *     vat        = round(gross x vatRate)     ← a SINGLE rate, on the GROSS
 *     net        = gross − commission − vat
 *
 * It LOOKS like a business rule that has been proven — same place, same tone,
 * same to-the-euro precision. It is not one: it produces a plausible number for
 * a mockup and answers NONE of the three tax questions — who owes the VAT, on
 * what base, who is liable for it.
 *
 * What is authoritative in `shared/` and ports as it stands:
 *   commission 12% · delay 14 days · rounding to the unit on EACH component
 *   taken separately · withholding while an outcome is open.
 *
 * The model adopted (D-015): COMMISSIONNAIRE — Arthome acts in its own name,
 * the VAT base is the whole ticket, the rate is that of the viewer's country,
 * the liable party is Arthome. **And the commission is taken on the net-of-tax
 * amount**, because on the tax-inclusive amount the 12% announced to artists
 * would vary with the buyer's country.
 *
 * ⚠ Legal validation is NOT done: see the warning at the top of
 * `adr-payments.md`. This module computes; it does not settle a question of
 * law.
 */
import { money, subtract, sum } from '../money/money.js';
import { applyRate, basisPoints, taxIncludedIn } from '../money/rounding.js';
import { DAY_MS, fromEpochMs, toEpochMs } from '../time/instant.js';
import { DateOutcome as Outcome } from '../vocabulary/catalog.js';
import { PayoutState } from '../vocabulary/commerce.js';
/** `commissionRate: 0.12` from `catalogue.json`, in basis points. */
export const COMMISSION_RATE_BPS = basisPoints(1_200);
/** `payoutDelayDays: 14`. */
export const PAYOUT_DELAY_DAYS = 14;
/**
 * Extracts a VAT line from a tax-inclusive amount.
 *
 * A price shown to a consumer is tax-inclusive (B2C convention): VAT is
 * EXTRACTED from it, it is not added to it.
 */
export function vatLineFor(grossTtc, jurisdictionCode, jurisdictionLevel, rateBps, supplyKind) {
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
/**
 * The computation, in the order that matters.
 *
 * Each component is rounded SEPARATELY, and the net-of-tax amount is obtained
 * by SUBTRACTION — never by `applyRate(ttc, 10000 − rate)`, which drifts by a
 * cent as soon as the rounding lands on a half.
 */
export function payoutOf(input) {
    const currency = input.grossTtc.currencyCode;
    const vatTotal = sum(input.vatLines.map((line) => line.amount), currency);
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
 * ⚠ From the END OF THE LIVE SHOW, not from the payment — hence `payouts`
 * consuming `streaming.run.ended.v1`. A viewer buying three months ahead does
 * not trigger a payout three months before the show.
 */
export function dueAtFor(runEndedAt) {
    return fromEpochMs(toEpochMs(runEndedAt) + PAYOUT_DELAY_DAYS * DAY_MS);
}
/**
 * A payout's state.
 *
 * The order of the tests is the precedence, and it is not arbitrary: a banking
 * suspension outranks everything, because it protects against a transfer to an
 * account we have doubts about. Then comes the outcome, which commits the
 * viewer's money.
 */
export function payoutStateFor(outcome, alreadyPaid, bankChangePending) {
    if (bankChangePending)
        return PayoutState.SUSPENDED;
    if (outcome === Outcome.CANCELLED)
        return PayoutState.REFUNDED;
    if (outcome !== null)
        return PayoutState.HELD;
    return alreadyPaid ? PayoutState.PAID : PayoutState.SCHEDULED;
}
/**
 * THE CREDIT NOTE — an internal currency, therefore a liability.
 *
 * `storefront-web` points it out: it appears in the copy — "interrupted,
 * credits issued" — and NOWHERE ELSE in the file.
 *
 * ⚠ The trap, written down before meeting it: when a viewer pays with a credit,
 * Stripe receives LESS, but the artist of the date bought must be paid IN FULL
 * — they had nothing to do with another show's incident. The platform therefore
 * funds that share out of its own money.
 *
 * Hence the scope adopted (D-017): a credit is issued for an `interrupted`
 * outcome and can only be redeployed on THE SAME CHANNEL. The payout
 * withholding already in place on that channel then covers the commitment — we
 * withhold what we will have to pay out again.
 */
export const CREDIT_VALIDITY_MONTHS = 12;
export function creditAmountFor(paidAmount) {
    return money(paidAmount.amountMinor, paidAmount.currencyCode);
}
//# sourceMappingURL=index.js.map