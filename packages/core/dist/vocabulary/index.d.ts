/**
 * The domain's closed vocabularies, declared ONCE.
 *
 * E2 — the parallel literal table — is this project's dominant fault: committed
 * on eight fields by five mockups, despite an explicit principle forbidding it.
 * The lesson is that a principle is not enough. This module is the only place a
 * vocabulary is declared, and `arthome-check-enums` reports any copy of one of
 * its values elsewhere in the repository.
 *
 * Each vocabulary carries three things:
 *   - the LIST, as `as const` — this is what the gate discovers;
 *   - the TYPE, derived from the list;
 *   - an object of NAMED MEMBERS, so that rules never write a string literal.
 *     That is what makes the gate bearable in daily use.
 */
export * from './tolerant.js';
export * from './catalog.js';
export * from './moderation.js';
export * from './commerce.js';
export * from './people.js';
//# sourceMappingURL=index.d.ts.map