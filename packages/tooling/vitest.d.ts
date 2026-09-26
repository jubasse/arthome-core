// Types for `@arthome/tooling/vitest`.
//
// THIS FILE IMPORTS NOTHING FROM `vitest`, FOR THE SAME REASON `vitest.js` DOES NOT.
//
//   Angular 22 pins `vitest ^4.0.8`; the five other repositories are on `5.0.1`.
//   Writing `import type { ViteUserConfig } from 'vitest/config'` here would put a
//   vitest version in the dependency graph of every consumer — the exact thing the
//   bare-object design exists to avoid — and it would do it in a file that looks
//   inert. A declaration is not exempt from the rule the implementation follows.
//
// So the shape is STRUCTURAL: it describes what the object is, not which library
// would accept it. A consumer spreads it into its own `defineConfig`, and its own
// vitest types check the result at that point, which is where the version is known.
//
// Written because `@arthome/core` had to carry a local `declare module` stopgap for
// this entry point: `vitest.config.ts` belongs in that package's tsconfig `include`
// (typescript-eslint's project service refuses to lint a file no tsconfig claims),
// and including it surfaced TS7016. A consumer declaring a shape this package owns
// is a parallel table with a `.d.ts` costume — it disagrees silently the day the
// object grows a field. The fix belongs here.
//
// See architecture/code-conventions.md sections 4.2 and 4.3.

// MUTABLE ARRAYS, deliberately. `readonly string[]` was the first attempt and it
//   broke the only thing this file exists to enable: vitest's own `InlineConfig`
//   declares `include: string[]`, and a ReadonlyArray is not assignable to it, so
//   spreading `base.test` into `defineConfig` failed with TS2769. A declaration
//   stricter than its consumers can use is as broken as a missing one — and this was
//   only caught by type-checking the real consumer rather than the declaration.
/** Coverage settings. Every key is common to Vitest 4 and 5. */
export interface ArthomeVitestCoverage {
  provider: 'v8';
  reporter: string[];
  exclude: string[];
}

/** The `test` block: the floor shared by all seven repositories. */
export interface ArthomeVitestTest {
  include: string[];
  exclude: string[];
  globals: boolean;
  clearMocks: boolean;
  restoreMocks: boolean;
  coverage: ArthomeVitestCoverage;
}

/**
 * The bare configuration fragment. Pass it to the repository's own `defineConfig`:
 *
 *     import { defineConfig } from 'vitest/config';
 *     import base from '@arthome/tooling/vitest';
 *     export default defineConfig({ ...base, test: { ...base.test } });
 */
export interface ArthomeVitestConfig {
  test: ArthomeVitestTest;
}

export declare const base: ArthomeVitestConfig;
export default base;
