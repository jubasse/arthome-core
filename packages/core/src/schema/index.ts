/**
 * `@arthome/core/schema` — the boundary schemas, and the only entry point in this package that
 * depends on zod.
 *
 * `tools/check-core-entry.mjs` enforces that in both directions: it fails if any import path
 * from `.` reaches zod, and if this entry does NOT import zod. The second half is what stops
 * this module quietly becoming a second copy of the rules. The cost it contains is 93 KB
 * gzipped for a single `z.string()`, so one stray `import { z }` in a rules module hands the
 * whole bill to the TV and to mobile with nothing reporting it (D-012).
 *
 * These are the BASE schemas, typed `ZodObject` rather than `ZodType` so `@arthome/contracts`
 * can `.extend()` and `.pick()` them: `ZodType` has neither method, and a contract that cannot
 * extend a base schema will restate it.
 *
 * Two rules every schema here follows, and a third in `vocabulary.ts`:
 *
 * 1. No `z.transform()` at a boundary — inconvertible to JSON Schema, so the generated OpenAPI
 *    would describe a shape the API does not accept.
 * 2. A failure becomes a code, never a zod message: zod's messages are English prose, and the
 *    first place that leaks is a payment form. `issueToCode` is the only way out.
 *
 * Every exported schema carries an explicit type annotation. `isolatedDeclarations` refuses
 * an export whose type it cannot write without inferring through zod's builder chain, so
 * without them the published `.d.ts` cannot be emitted at all.
 */

export {
  CountryCodeSchema,
  CurrencyCodeSchema,
  IanaTimeZoneSchema,
  InstantIn,
  InstantOut,
  int64,
  uuidOut,
  LocaleIn,
  LocaleOut,
  PageCursorSchema,
  SlugSchema,
} from './primitives.js';

export { BasisPointsSchema, MoneyIn, MoneyOut } from './money.js';
export { VenueClockSchema } from './time.js';

export type { VocabularyIn, VocabularyOut, VocabularyOutNullable } from './vocabulary.js';
export {
  VOCABULARY_SOURCE_LOCAL,
  sourceNameOf,
  vocabularyIn,
  vocabularyOut,
  vocabularyOutLocal,
  vocabularyOutLocalNullable,
  vocabularyOutNullable,
} from './vocabulary.js';

export {
  AccountIdSchema,
  ArtistIdSchema,
  ChannelIdSchema,
  DateIdSchema,
  DeviceIdSchema,
  OrderIdSchema,
  PersonIdSchema,
  ProfileIdSchema,
  PublicHandleSchema,
  SeatIdSchema,
  ShowIdSchema,
  VenueIdSchema,
} from './identifiers.js';

export {
  BuyerTaxLocationSchema,
  TaxEvidenceKindIn,
  TaxEvidenceKindOut,
  TaxEvidenceSchema,
  TaxJurisdictionLevelIn,
  TaxJurisdictionLevelOut,
  TaxSupplyKindIn,
  TaxSupplyKindOut,
  VatLineSchema,
} from './tax.js';

export { ErrorSchema, FailureNatureOut, issueToCode } from './error.js';
