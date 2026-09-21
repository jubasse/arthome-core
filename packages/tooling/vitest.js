// @arthome/tooling/vitest
//
// ⚠ THIS MODULE IMPORTS NOTHING FROM `vitest`, AND MUST NEVER DO SO.
//
// It exports a BARE OBJECT, which the repository passes to ITS OWN defineConfig:
//
//     import { defineConfig } from 'vitest/config';   // the repository's version
//     import base from '@arthome/tooling/vitest';
//     export default defineConfig({ ...base, test: { ...base.test, /* local */ } });
//
// The reason is the version split: Angular 22 pins `vitest ^4.0.8`, the five
// other repositories are on `5.0.1`. If this file imported `defineConfig` from
// `vitest`, it would impose ONE version of Vitest on all seven repositories and
// break the two Angular ones. A bare object imposes nothing: `vitest` appears
// neither in dependencies nor in peerDependencies of @arthome/tooling.
// The package describes the configuration; it does not supply the tool.
//
// See architecture/code-conventions.md sections 4.2 and 4.3.

/**
 * Vitest configuration fragment shared by all seven repositories.
 * Works on Vitest 4 and 5: no key specific to either.
 */
export const base = {
  test: {
    // The test sits NEXT TO the file it tests. No __tests__ directory, no
    // parallel test/ tree: a parallel tree always ends up diverging from the one
    // it mirrors — that is E2 wearing another face.
    include: ['src/**/*.spec.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],

    // `.spec.ts` rather than `.test.ts`: it is what Angular imposes, and aligning
    // the other five costs nothing.
    globals: false,
    clearMocks: true,
    restoreMocks: true,

    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // No numeric threshold: on a solo project a global threshold produces tests
      // written for the number. What is required is targeted — the boundaries of
      // the @arthome/core/domain modules — and definition-of-done.md has the last
      // word. See code-conventions.md section 5.8.
      exclude: ['**/*.spec.{ts,tsx}', '**/generated/**', '**/dist/**'],
    },
  },
};

export default base;
