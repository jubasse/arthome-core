/**
 * `@arthome/core/schema` — the boundary schemas, and **the only entry point in
 * this package that depends on zod**.
 *
 * ⚠ `tools/check-core-entry.mjs` enforces that in both directions: it fails if any
 * import path from `.` reaches zod, and it fails if this entry exists and does NOT
 * import zod. The second half is not symmetry for its own sake — it is what stops
 * this module quietly becoming a second copy of the rules. The cost it contains is
 * fixed and tied to the import: 93 KB gzipped for a single `z.string()` on the
 * classic entry point, so one stray `import { z }` in a rules module hands the
 * whole bill to the TV and to mobile with nothing reporting it (D-012).
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
 *
 * TWO RULES EVERY SCHEMA HERE FOLLOWS, and a third in `vocabulary.ts` (an input
 * and an output are two schemas, never one read twice):
 *
 * 1. NO `z.transform()` AT A BOUNDARY. A transform is inconvertible to JSON
 *    Schema, so the generated OpenAPI would describe a shape the API does not
 *    accept. A boundary validates; reshaping is the domain's job and happens
 *    after the value is known good.
 * 2. A FAILURE BECOMES A CODE, NEVER A ZOD MESSAGE. zod's messages are English
 *    prose, surfacing one is an i18n leak, and the first place it leaks is a
 *    payment form. `issueToCode` is the only sanctioned way out.
 *
 * ⚠ AND EVERY EXPORTED SCHEMA CARRIES AN EXPLICIT TYPE ANNOTATION —
 * `z.ZodString`, `z.ZodEnum<…>`, `z.ZodObject<…>`. `isolatedDeclarations` refuses
 * an export whose type it cannot write without inferring through zod's builder
 * chain, so without them the published `.d.ts` cannot be emitted at all. The
 * upside is that the shape a consumer sees is written down rather than inferred,
 * so it cannot drift when a builder call is added mid-chain.
 */
export { CountryCodeSchema, CurrencyCodeSchema, IanaTimeZoneSchema, InstantIn, InstantOut, int64, uuidOut, LocaleIn, LocaleOut, PageCursorSchema, SlugSchema, } from './primitives.js';
export { BasisPointsSchema, MoneyIn, MoneyOut } from './money.js';
export { VenueClockSchema } from './time.js';
export type { VocabularyIn, VocabularyOut, VocabularyOutNullable } from './vocabulary.js';
export { VOCABULARY_SOURCE_LOCAL, sourceNameOf, vocabularyIn, vocabularyOut, vocabularyOutLocal, vocabularyOutLocalNullable, vocabularyOutNullable, } from './vocabulary.js';
export { AccountIdSchema, ArtistIdSchema, ChannelIdSchema, DateIdSchema, DeviceIdSchema, OrderIdSchema, PersonIdSchema, ProfileIdSchema, PublicHandleSchema, SeatIdSchema, ShowIdSchema, VenueIdSchema, } from './identifiers.js';
export { BuyerTaxLocationSchema, TaxEvidenceKindIn, TaxEvidenceKindOut, TaxEvidenceSchema, TaxJurisdictionLevelIn, TaxJurisdictionLevelOut, TaxSupplyKindIn, TaxSupplyKindOut, VatLineSchema, } from './tax.js';
export { ErrorSchema, FailureNatureOut, issueToCode } from './error.js';
//# sourceMappingURL=index.d.ts.map