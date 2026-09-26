// @arthome/tooling/vitest
//
// THIS MODULE IMPORTS NOTHING FROM `vitest`, AND MUST NEVER DO SO. It exports a
//   BARE OBJECT the repository passes to its own `defineConfig`, because Angular 22
//   pins `vitest ^4.0.8` and the other five repositories are on `5.0.1`. Importing
//   `defineConfig` here would impose one version on all seven. Sections 4.2 and 4.3.

/** Vitest configuration shared by all seven repositories. No key specific to 4 or 5. */
export const base = {
  test: {
    // The test sits NEXT TO the file it tests: a parallel test/ tree diverges from
    // the one it mirrors, which is E2 wearing another face.
    include: ['src/**/*.spec.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],

    // `.spec.ts` rather than `.test.ts` because Angular imposes it.
    globals: false,
    clearMocks: true,
    restoreMocks: true,

    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // No numeric threshold: on a solo project it produces tests written for the
      // number. definition-of-done.md names what is required instead (section 5.8).
      exclude: ['**/*.spec.{ts,tsx}', '**/generated/**', '**/dist/**'],
    },
  },
};

export default base;
