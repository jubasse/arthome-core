/**
 * The buyer's tax location and its evidence — **the only genuinely
 * irreversible shape in the whole tax chapter** (`adr-payments.md` §5.0).
 *
 * The MODEL is a computation: who is liable, on what base, at what rate. It can
 * be redone. These FACTS cannot: a billing address, an IP address and a card
 * country at the moment of a sale two years ago exist nowhere if they were not
 * captured. Reconstructing them is not expensive — it is impossible.
 *
 * ⚠ Keyed on JURISDICTION, never on a billing market. A billing market is a
 * PRICING notion — which currency we sell in. It is not a tax notion, and
 * conflating the two was the original fault. A country is not enough either:
 * roughly 9,000 jurisdictions in the United States, where the postal code is
 * indispensable; and in the United Kingdom the rate depends on the pair
 * jurisdiction × nature of the supply, since Derby Quad v HMRC held that the
 * theatre-ticket exemption does not extend to a streamed live show.
 *
 * ⚠ AND D-056 MAKES THIS LOAD-BEARING RATHER THAN ARCHIVAL. Under TTC the
 * displayed price is fixed and the VAT comes out of it, so the NET an artist
 * receives moves with the buyer's jurisdiction. These lines are what disclose
 * that movement. A net that changes for a reason the artist cannot see is a
 * default arriving by omission rather than by decision.
 */
import { z } from 'zod';
import { MoneySchema, BasisPointsSchema } from './money.js';
import { InstantSchema, CountryCodeSchema } from './primitives.js';
import { vocabularyIn, vocabularyOut, } from './vocabulary.js';
import { TAX_EVIDENCE_KINDS, TAX_JURISDICTION_LEVELS, TAX_SUPPLY_KINDS, } from '../vocabulary/commerce.js';
export const TaxEvidenceKindIn = vocabularyIn(TAX_EVIDENCE_KINDS);
export const TaxEvidenceKindOut = vocabularyOut(TAX_EVIDENCE_KINDS);
export const TaxJurisdictionLevelIn = vocabularyIn(TAX_JURISDICTION_LEVELS);
export const TaxJurisdictionLevelOut = vocabularyOut(TAX_JURISDICTION_LEVELS);
export const TaxSupplyKindIn = vocabularyIn(TAX_SUPPLY_KINDS);
export const TaxSupplyKindOut = vocabularyOut(TAX_SUPPLY_KINDS);
/**
 * One piece of evidence, WITH ITS PROVENANCE. Evidence with no source is not
 * evidence — `source` is what makes a disputed line auditable two years later.
 */
export const TaxEvidenceSchema = z.object({
    kind: TaxEvidenceKindOut,
    country: CountryCodeSchema,
    subdivision: z.string().max(8).optional(),
    source: z.string().min(1).max(64),
    collectedAt: InstantSchema,
});
/**
 * The location adopted, with the evidence that produced it.
 *
 * `evidenceConflicting` exists because the EU requires TWO non-contradictory
 * pieces for a B2C sale, and Stripe Tax favours a single address rather than
 * comparing them — so the rule cannot be delegated to it. When two pieces
 * disagree the sale still completes and the line goes to review: hiding the
 * conflict would produce a false and silent declaration, which is worse than a
 * flagged one.
 */
export const BuyerTaxLocationSchema = z.object({
    country: CountryCodeSchema,
    subdivision: z.string().max(8).optional(),
    postalCode: z.string().max(16).optional(),
    city: z.string().max(128).optional(),
    evidence: z.array(TaxEvidenceSchema),
    evidenceConflicting: z.boolean(),
    resolvedAt: InstantSchema,
});
/**
 * One VAT line. `rateBps` is THE RATE APPLIED AT THE SALE, kept on the line —
 * never the current rate. An invoice is kept for ten years and rates change.
 */
export const VatLineSchema = z.object({
    jurisdictionCode: z.string().min(2).max(16),
    jurisdictionLevel: TaxJurisdictionLevelOut,
    supplyKind: TaxSupplyKindOut,
    rateBps: BasisPointsSchema,
    base: MoneySchema,
    amount: MoneySchema,
});
//# sourceMappingURL=tax.js.map