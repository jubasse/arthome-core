/**
 * `@arthome/core` — the Arthome domain.
 *
 * No import from here may reach zod, at any depth: 93 KB compressed for a
 * single `z.string()` (D-012). The boundary schemas live in
 * `@arthome/core/schema`; `tools/check-core-entry.mjs` refuses any path back.
 */

export * from './kernel/index.js';
export * from './vocabulary/index.js';
export * from './money/index.js';
export * from './time/index.js';

export * from './taxonomy/index.js';
export * from './media/index.js';
export * from './format/index.js';
export * from './i18n/index.js';

export * from './catalog/index.js';
export * from './replay/index.js';
export * from './permissions/index.js';

export * from './ticketing/index.js';
export * from './pairing/index.js';
export * from './moderation/index.js';
export * from './notification/index.js';
export * from './search/index.js';

export * from './entitlement/index.js';
export * from './payout/index.js';

export * from './fixtures/index.js';
