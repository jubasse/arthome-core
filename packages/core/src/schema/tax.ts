/**
 * The buyer's tax location and its evidence — the only genuinely irreversible shape in the tax
 * chapter (`adr-payments.md` §5.0). The model is a computation and can be redone; a billing
 * address, an IP address and a card country at the moment of a sale two years ago exist nowhere
 * if they were not captured.
 *
 * Keyed on jurisdiction, never on a billing market — a billing market is a pricing notion,
 * and conflating the two was the original fault. A country is not enough either: roughly 9,000
 * jurisdictions in the United States, where the postal code is indispensable, and in the United
 * Kingdom the rate depends on jurisdiction × nature of the supply, since Derby Quad v HMRC held
 * that the theatre-ticket exemption does not extend to a streamed live show.
 *
 * D-056 makes this load-bearing rather than archival: under TTC the displayed price is fixed
 * and the VAT comes out of it, so the net an artist receives moves with the buyer's
 * jurisdiction, and these lines are what disclose that movement.
 */

import { z } from 'zod';

import { MoneyOut, BasisPointsSchema } from './money.js';
import { InstantOut, CountryCodeSchema } from './primitives.js';
import {
  vocabularyIn,
  vocabularyOut,
  type VocabularyIn,
  type VocabularyOut,
} from './vocabulary.js';
import {
  TAX_EVIDENCE_KINDS,
  TAX_JURISDICTION_LEVELS,
  TAX_SUPPLY_KINDS,
} from '../vocabulary/commerce.js';

export const TaxEvidenceKindIn: VocabularyIn<typeof TAX_EVIDENCE_KINDS> =
  vocabularyIn(TAX_EVIDENCE_KINDS);
export const TaxEvidenceKindOut: VocabularyOut = vocabularyOut(TAX_EVIDENCE_KINDS);
export const TaxJurisdictionLevelIn: VocabularyIn<typeof TAX_JURISDICTION_LEVELS> =
  vocabularyIn(TAX_JURISDICTION_LEVELS);
export const TaxJurisdictionLevelOut: VocabularyOut = vocabularyOut(TAX_JURISDICTION_LEVELS);
export const TaxSupplyKindIn: VocabularyIn<typeof TAX_SUPPLY_KINDS> =
  vocabularyIn(TAX_SUPPLY_KINDS);
export const TaxSupplyKindOut: VocabularyOut = vocabularyOut(TAX_SUPPLY_KINDS);

/** One piece of evidence, with its provenance: `source` is what makes a line auditable later. */
export const TaxEvidenceSchema: z.ZodObject<
  {
    kind: VocabularyOut;
    country: z.ZodString;
    subdivision: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    source: z.ZodString;
    collectedAt: z.ZodString;
  },
  z.core.$loose
> = z
  .looseObject({
    kind: TaxEvidenceKindOut,
    country: CountryCodeSchema.describe(
      'What **this item** indicates — not the outcome of the arbitration.',
    ),
    subdivision: z
      .string()
      .max(8)
      .nullable()
      .optional()
      .describe('ISO 3166-2, when the item carries it.'),
    source: z
      .string()
      .min(1)
      .max(64)
      .meta({ examples: ['edge.geoip'] }),
    collectedAt: InstantOut,
  })
  .describe(
    '**One item of location evidence, with its provenance.** A B2C sale inside the Union\nrequires **two non-contradictory items** — and a tax provider generally prefers a single\naddress over comparing them, so the evidence rule cannot be delegated to it: our own\nregister carries it.\n\n`source` is not decorative: **evidence without provenance is not evidence**.',
  );

/**
 * The location adopted, with the evidence that produced it.
 *
 * `evidenceConflicting` exists because the EU requires two non-contradictory items for a B2C
 * sale and Stripe Tax favours a single address rather than comparing them, so the rule cannot be
 * delegated to it.
 */
export const BuyerTaxLocationSchema: z.ZodObject<
  {
    country: z.ZodString;
    subdivision: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    postalCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    city: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    evidence: z.ZodArray<typeof TaxEvidenceSchema>;
    evidenceConflicting: z.ZodBoolean;
    resolvedAt: z.ZodOptional<z.ZodString>;
  },
  z.core.$loose
> = z
  .looseObject({
    country: CountryCodeSchema,
    subdivision: z.string().max(8).nullable().optional(),
    postalCode: z.string().max(16).nullable().optional(),
    city: z.string().max(128).nullable().optional(),
    evidence: z.array(TaxEvidenceSchema),
    evidenceConflicting: z
      .boolean()
      .describe(
        'True when two items contradict each other. **The sale goes through anyway** and the line is\nflagged for review: refusing the purchase would punish the viewer for an ambiguity that is\nnot theirs, and hiding the conflict would produce a false and silent declaration.',
      ),
    resolvedAt: InstantOut.optional(),
  })
  .describe(
    "**The buyer's tax location, carried by the order.** Neither a market identifier nor a plain\ncountry: in the United States the rate changes from one street to the next, so the postal\ncode is indispensable; in the Union the evidence is **double** and must be retained.\n\n**Not to be confused with the identity verification of the signed-in account**, which bears\non the **artist** and has nothing to do with the **viewer's** location. The two are often\nconflated.",
  );

/** One VAT line. `rateBps` is the rate applied at the sale, never the current one: invoices
 * are kept for ten years and rates change. */
export const VatLineSchema: z.ZodObject<
  {
    jurisdictionCode: z.ZodString;
    jurisdictionLevel: VocabularyOut;
    supplyKind: VocabularyOut;
    rateBps: z.ZodInt;
    base: typeof MoneyOut;
    amount: typeof MoneyOut;
  },
  z.core.$loose
> = z.looseObject({
  jurisdictionCode: z.string().min(2).max(16),
  jurisdictionLevel: TaxJurisdictionLevelOut,
  supplyKind: TaxSupplyKindOut,
  rateBps: BasisPointsSchema,
  base: MoneyOut,
  amount: MoneyOut,
});
