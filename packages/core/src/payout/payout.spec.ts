import { describe, expect, it } from 'vitest';

import {
  COMMISSION_RATE_BPS,
  PAYOUT_DELAY_DAYS,
  dueAtFor,
  payoutOf,
  payoutStateFor,
  vatLineFor,
} from './index.js';
import { money } from '../money/money.js';
import { DateOutcome } from '../vocabulary/catalog.js';
import { PayoutState, TaxJurisdictionLevel, TaxSupplyKind } from '../vocabulary/commerce.js';

const eur = (amountMinor: number) => money(amountMinor, 'EUR');
const chf = (amountMinor: number) => money(amountMinor, 'CHF');

/**
 * PROTECTED INVARIANT
 *   The commission is taken on the net-of-tax amount. For the SAME net, it is
 *   IDENTICAL whatever the buyer's jurisdiction.
 *
 * WHY THIS TEST EXISTS
 *   D5: `fixtures.js` computes `net = gross − 12% − VAT(gross)` with a single
 *   rate, and the result is plausible TO THE EURO. It is the "shape against
 *   rule" trap in its most expensive form: the naive port consists of copying
 *   exactly three lines that look right.
 *
 *   On the tax-inclusive amount, the 12% announced to artists would VARY with
 *   the buyer's country. A commission is the price of a service; it has no
 *   reason to follow a foreign VAT rate.
 *
 *   Written BEFORE the rule.
 */
describe('the commission is taken on the net-of-tax amount', () => {
  it('is identical in France and Switzerland for the same net', () => {
    // An artist earning €24.64 net of tax earns the same whatever the buyer's
    // country. THAT is what "12%" promises.
    const htAmount = 2464;

    const france = payoutOf({
      grossTtc: eur(htAmount + 136),
      vatLines: [
        vatLineFor(
          eur(htAmount + 136),
          'FR',
          TaxJurisdictionLevel.COUNTRY,
          550,
          TaxSupplyKind.LIVE_STREAM_ACCESS,
        ),
      ],
      commissionRateBps: COMMISSION_RATE_BPS,
    });
    const switzerland = payoutOf({
      grossTtc: chf(htAmount + 64),
      vatLines: [
        vatLineFor(
          chf(htAmount + 64),
          'CH',
          TaxJurisdictionLevel.COUNTRY,
          260,
          TaxSupplyKind.LIVE_STREAM_ACCESS,
        ),
      ],
      commissionRateBps: COMMISSION_RATE_BPS,
    });

    expect(france.grossHt.amountMinor).toBe(htAmount);
    expect(switzerland.grossHt.amountMinor).toBe(htAmount);
    expect(france.commission.amountMinor).toBe(switzerland.commission.amountMinor);
    expect(france.net.amountMinor).toBe(switzerland.net.amountMinor);
  });

  it('would NOT be identical if the commission were taken on the gross', () => {
    // The demonstration of what we avoid: at equal gross, the net-of-tax amount
    // differs with the rate, so 12% of the gross would give the same commission
    // but a different NET — and the artist would not know why.
    const ttc = 2600;
    const france = payoutOf({
      grossTtc: eur(ttc),
      vatLines: [
        vatLineFor(
          eur(ttc),
          'FR',
          TaxJurisdictionLevel.COUNTRY,
          550,
          TaxSupplyKind.LIVE_STREAM_ACCESS,
        ),
      ],
      commissionRateBps: COMMISSION_RATE_BPS,
    });
    const switzerland = payoutOf({
      grossTtc: chf(ttc),
      vatLines: [
        vatLineFor(
          chf(ttc),
          'CH',
          TaxJurisdictionLevel.COUNTRY,
          260,
          TaxSupplyKind.LIVE_STREAM_ACCESS,
        ),
      ],
      commissionRateBps: COMMISSION_RATE_BPS,
    });

    // At fixed gross, the net-of-tax amounts differ — so do the commissions.
    expect(france.grossHt.amountMinor).not.toBe(switzerland.grossHt.amountMinor);
    expect(france.commission.amountMinor).not.toBe(switzerland.commission.amountMinor);
  });

  it('extracts the VAT from the gross, never adds it to it', () => {
    // The classic error — `gross x rate / 10000` — overstates the tax by
    // `rate / (10000 + rate)`, that is 5% on a 5.5% rate.
    const line = vatLineFor(
      eur(2600),
      'FR',
      TaxJurisdictionLevel.COUNTRY,
      550,
      TaxSupplyKind.LIVE_STREAM_ACCESS,
    );
    expect(line.amount.amountMinor).toBe(136); // 2600 x 550 / 10550
    expect(line.base.amountMinor).toBe(2464); // the net of tax, which is the real base
  });
});

/**
 * PROTECTED INVARIANT
 *   The breakdown is PER JURISDICTION, and the total closes exactly.
 *
 * WHY
 *   Roughly 9,000 jurisdictions in the United States. One order can carry
 *   several lines; their sum must be EXACTLY the VAT removed from the gross,
 *   otherwise the net drifts by a cent per order.
 */
describe('the breakdown by jurisdiction', () => {
  it('closes exactly: net + VAT = gross', () => {
    const grossTtc = eur(2600);
    const breakdown = payoutOf({
      grossTtc,
      vatLines: [
        vatLineFor(
          grossTtc,
          'FR',
          TaxJurisdictionLevel.COUNTRY,
          550,
          TaxSupplyKind.LIVE_STREAM_ACCESS,
        ),
      ],
      commissionRateBps: COMMISSION_RATE_BPS,
    });

    expect(breakdown.grossHt.amountMinor + breakdown.vatTotal.amountMinor).toBe(
      grossTtc.amountMinor,
    );
  });

  it('accepts several jurisdictions on one order', () => {
    // State + county + city: several lines, one single base.
    const grossTtc = money(10_000, 'USD');
    const breakdown = payoutOf({
      grossTtc,
      vatLines: [
        vatLineFor(
          grossTtc,
          'US-CA',
          TaxJurisdictionLevel.STATE,
          600,
          TaxSupplyKind.LIVE_STREAM_ACCESS,
        ),
        vatLineFor(
          grossTtc,
          'US-CA-SF',
          TaxJurisdictionLevel.CITY,
          125,
          TaxSupplyKind.LIVE_STREAM_ACCESS,
        ),
      ],
      commissionRateBps: COMMISSION_RATE_BPS,
    });

    expect(breakdown.vatLines).toHaveLength(2);
    expect(breakdown.grossHt.amountMinor + breakdown.vatTotal.amountMinor).toBe(10_000);
  });

  it('never creates money: net-of-tax − commission = payable', () => {
    for (const amount of [2600, 1, 99, 12_345, 7]) {
      const grossTtc = eur(amount);
      const breakdown = payoutOf({
        grossTtc,
        vatLines: [
          vatLineFor(
            grossTtc,
            'FR',
            TaxJurisdictionLevel.COUNTRY,
            550,
            TaxSupplyKind.LIVE_STREAM_ACCESS,
          ),
        ],
        commissionRateBps: COMMISSION_RATE_BPS,
      });
      expect(breakdown.net.amountMinor + breakdown.commission.amountMinor).toBe(
        breakdown.grossHt.amountMinor,
      );
    }
  });
});

/**
 * PROTECTED INVARIANT
 *   A payout is WITHHELD while an outcome is open, and REFUNDED if the date is
 *   cancelled. The due date runs from the END OF THE LIVE SHOW.
 *
 * WHY
 *   What `shared/` carries and what has authority: commission 12%, delay
 *   14 days, withholding while an outcome is open. It is the only part of the
 *   fixtures' formula that is a real rule.
 */
describe("a payout's state", () => {
  it('withholds while an outcome is open', () => {
    expect(payoutStateFor(DateOutcome.POSTPONED, false, false)).toBe(PayoutState.HELD);
    expect(payoutStateFor(DateOutcome.INTERRUPTED, false, false)).toBe(PayoutState.HELD);
  });

  it('refunds when the date is cancelled', () => {
    expect(payoutStateFor(DateOutcome.CANCELLED, false, false)).toBe(PayoutState.REFUNDED);
  });

  it('suspends when a bank change awaits its counter-signature', () => {
    // It SUSPENDS the transfer in progress: a single write cannot carry that,
    // it is a two-stage aggregate.
    expect(payoutStateFor(null, false, true)).toBe(PayoutState.SUSPENDED);
    // And the suspension outranks the normal schedule.
    expect(payoutStateFor(null, true, true)).toBe(PayoutState.SUSPENDED);
  });

  it('runs from the end of the live show, not from the payment', () => {
    expect(dueAtFor('2026-09-21T21:00:00.000Z')).toBe('2026-10-05T21:00:00.000Z');
    expect(PAYOUT_DELAY_DAYS).toBe(14);
  });
});
