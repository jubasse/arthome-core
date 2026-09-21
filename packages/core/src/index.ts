/**
 * `@arthome/core` — the Arthome domain.
 *
 * ⚠ THIS ENTRY POINT DOES NOT IMPORT ZOD, AT ANY DEPTH.
 *
 * That is the package's structuring decision, and it is verified:
 * `tools/check-core-entry.mjs` refuses any import path leading to zod from
 * here. The boundary schemas live in `@arthome/core/schema`, and that is the
 * only entry point that depends on it.
 *
 * The reason is measured (D-012): zod's cost is FIXED and tied to the import,
 * not marginal and tied to the number of schemas — 93 KB compressed for a
 * single `z.string()` through the classic entry point. If this entry point
 * imported zod, no barrel-free entry point of `@arthome/contracts` could ever
 * claw the bill back on the most constrained surface in the project.
 */

// Wave 1 — the foundation.
export * from './kernel/index.js';
export * from './vocabulary/index.js';
export * from './money/index.js';
export * from './time/index.js';

// Wave 2 — what is read and what is displayed.
export * from './taxonomy/index.js';
export * from './media/index.js';
export * from './format/index.js';
export * from './i18n/index.js';

// Wave 3 — what is published, what is replayed, what is permitted.
export * from './catalog/index.js';
export * from './replay/index.js';
export * from './permissions/index.js';

// Wave 4 — what is bought, what is said, what is alerted, what is searched.
export * from './ticketing/index.js';
export * from './moderation/index.js';
export * from './notification/index.js';
export * from './search/index.js';

// Wave 5 — the two that compose the most, hence the last of the rules.
export * from './entitlement/index.js';
export * from './payout/index.js';

// Wave 7 — the deterministic data set. Depends on everything, depended on by nothing.
export * from './fixtures/index.js';
