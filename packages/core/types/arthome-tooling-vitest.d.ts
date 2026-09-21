// STOPGAP — `@arthome/tooling` ships `vitest.js` with no type declaration.
//
// WHY THIS FILE EXISTS. `vitest.config.ts` is TypeScript this package owns, so it
// belongs in the package's tsconfig `include`: typescript-eslint's project service
// refuses to lint a file no tsconfig claims ("not found by the project service").
// Including it surfaces TS7016 on `import base from '@arthome/tooling/vitest'`,
// because that entry point is plain JavaScript and the tooling package declares no
// types for it.
//
// ⚠ THIS IS A SHAPE THIS PACKAGE DOES NOT OWN, AND THAT IS THE DEFECT. The real
// fix is a `vitest.d.ts` in `@arthome/tooling`, beside `vitest.js`, owned by whoever
// owns that package. Until then this declaration is deliberately MINIMAL: it claims
// only what `vitest.config.ts` actually spreads, so that if the tooling object grows
// a field, nothing here silently contradicts it.
//
// EXIT CONDITION: delete this file the day `@arthome/tooling` exports types for
// `./vitest`. Nothing else in the package refers to it.
//
// It cannot import from `vitest`, for the same reason `vitest.js` cannot: Angular
// pins vitest 4 and the five other repositories are on 5, and naming one version
// here would impose it on all seven.

declare module '@arthome/tooling/vitest' {
  const base: { readonly test?: Readonly<Record<string, unknown>> } & Readonly<
    Record<string, unknown>
  >;
  export default base;
}
