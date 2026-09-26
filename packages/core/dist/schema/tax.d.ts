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
import { MoneyOut } from './money.js';
import { type VocabularyIn, type VocabularyOut } from './vocabulary.js';
import { TAX_EVIDENCE_KINDS, TAX_JURISDICTION_LEVELS, TAX_SUPPLY_KINDS } from '../vocabulary/commerce.js';
export declare const TaxEvidenceKindIn: VocabularyIn<typeof TAX_EVIDENCE_KINDS>;
export declare const TaxEvidenceKindOut: VocabularyOut;
export declare const TaxJurisdictionLevelIn: VocabularyIn<typeof TAX_JURISDICTION_LEVELS>;
export declare const TaxJurisdictionLevelOut: VocabularyOut;
export declare const TaxSupplyKindIn: VocabularyIn<typeof TAX_SUPPLY_KINDS>;
export declare const TaxSupplyKindOut: VocabularyOut;
/** One piece of evidence, with its provenance: `source` is what makes a line auditable later. */
export declare const TaxEvidenceSchema: z.ZodObject<{
    kind: VocabularyOut;
    country: z.ZodString;
    subdivision: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    source: z.ZodString;
    collectedAt: z.ZodString;
}, z.core.$loose>;
/**
 * The location adopted, with the evidence that produced it.
 *
 * `evidenceConflicting` exists because the EU requires two non-contradictory items for a B2C
 * sale and Stripe Tax favours a single address rather than comparing them, so the rule cannot be
 * delegated to it.
 */
export declare const BuyerTaxLocationSchema: z.ZodObject<{
    country: z.ZodString;
    subdivision: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    postalCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    city: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    evidence: z.ZodArray<typeof TaxEvidenceSchema>;
    evidenceConflicting: z.ZodBoolean;
    resolvedAt: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
/** One VAT line. `rateBps` is the rate applied at the sale, never the current one: invoices
 * are kept for ten years and rates change. */
export declare const VatLineSchema: z.ZodObject<{
    jurisdictionCode: z.ZodString;
    jurisdictionLevel: VocabularyOut;
    supplyKind: VocabularyOut;
    rateBps: z.ZodInt;
    base: typeof MoneyOut;
    amount: typeof MoneyOut;
}, z.core.$loose>;
//# sourceMappingURL=tax.d.ts.map