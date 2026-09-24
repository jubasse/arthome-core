/**
 * `@arthome/core/schema` — the boundary schemas, and **the only entry point in
 * this package that depends on zod**.
 *
 * `tools/check-core-entry.mjs` enforces that in both directions: it fails if any
 * import path from `.` reaches zod, and it fails if this entry exists and does
 * NOT import zod. The second half is not symmetry for its own sake — it is what
 * stops this module quietly becoming a second copy of the rules.
 *
 * WHAT BELONGS HERE: only what crosses a boundary and must be checked on
 * arrival. These are the BASE schemas — `@arthome/contracts` extends them with
 * `.extend()` and `.pick()` rather than redeclaring them, which is why they are
 * `ZodObject` rather than the narrower `ZodType`: `ZodType` has neither method,
 * and a contract that cannot extend a base schema will restate it.
 *
 * WHAT DOES NOT BELONG HERE: the rules. `decideWatch` does not validate its
 * input with a schema — it receives types already checked at the boundary and
 * DECIDES. Putting zod there would charge the dependency to every evaluation of
 * an entitlement, on the hottest path in the system.
 */
export { CountryCodeSchema, CurrencyCodeSchema, IanaTimeZoneSchema, InstantSchema, LocaleSchema, PageCursorSchema, SlugSchema, } from './primitives.js';
export { BasisPointsSchema, MoneySchema } from './money.js';
export { VenueClockSchema } from './time.js';
export type { VocabularyIn, VocabularyOut, VocabularyOutNullable } from './vocabulary.js';
export { vocabularyIn, vocabularyOut, vocabularyOutNullable } from './vocabulary.js';
export { AccountIdSchema, ArtistIdSchema, ChannelIdSchema, DateIdSchema, DeviceIdSchema, OrderIdSchema, PersonIdSchema, ProfileIdSchema, PublicHandleSchema, SeatIdSchema, ShowIdSchema, VenueIdSchema, } from './identifiers.js';
export { BuyerTaxLocationSchema, TaxEvidenceKindIn, TaxEvidenceKindOut, TaxEvidenceSchema, TaxJurisdictionLevelIn, TaxJurisdictionLevelOut, TaxSupplyKindIn, TaxSupplyKindOut, VatLineSchema, } from './tax.js';
export { ErrorEnvelopeSchema, FailureNatureOut, issueToCode } from './error.js';
//# sourceMappingURL=index.d.ts.map