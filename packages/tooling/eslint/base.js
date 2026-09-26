// @arthome/tooling/eslint/base
//
// The ESLint floor for all seven repositories. Flat config (ESLint 9 and 10; the
// old eslintrc format no longer exists in 10).
//
// THIS FILE CONTAINS NO FORMATTING RULE, AND MUST NEVER CONTAIN ONE.
//   Prettier owns formatting; ESLint owns code quality only. Zero overlap,
//   verified by `npx eslint-config-prettier <file>` rather than by discipline.
//   See architecture/code-conventions.md section 3.
//
// `prettier` (eslint-config-prettier/flat) IS NOT included here: it must be the
//   LAST element of the repository's final array, after the stack presets and
//   after the local overrides. Placed earlier, it switches off nothing that comes
//   after it — and it fails SILENTLY. Each repository imports it and puts it at
//   the end. See section 3.2.
//
// eslint-plugin-prettier is FORBIDDEN: running Prettier as an ESLint rule is
//   the very setup that CREATES the conflicts we are avoiding. Section 3.3.

import js from '@eslint/js';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX from 'eslint-plugin-import-x';
import tseslint from 'typescript-eslint';

export const SOURCE_FILES = ['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'];

export const COMMON_IGNORES = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/generated/**',
  '**/*.min.js',
];

/** The floor, as a flat-config array. */
export const base = tseslint.config(
  { ignores: COMMON_IGNORES },

  // ------------------------------------------------------------- recommended
  {
    files: SOURCE_FILES,
    extends: [js.configs.recommended],
  },

  // ------------------------------------------------------ TypeScript, with types
  // The type-aware rules are why Biome was ruled out (D-013), so `projectService`
  //   is mandatory: a repository that switches it off has cancelled the decision.
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    extends: [...tseslint.configs.recommendedTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },

  // ------------------------------------------------- TypeScript, non-negotiable
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',

      // @ts-expect-error, never @ts-ignore: it becomes an error the day the problem is fixed.
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          'ts-expect-error': 'allow-with-description',
          minimumDescriptionLength: 10,
        },
      ],

      // enum forbidden (section 5.3), and the two reasons that bite are measured
      // under --strict. A TypeScript enum is NOMINAL, so `const a: WatchScopeEnum =
      // fromWire` is TS2322 for the very string JSON.parse hands you — every boundary
      // would need an `as`, forbidden two rows above. And `Object.values(Enum)` is not
      // the ORDERED TUPLE that `z.enum()` and `arthome-check-enums` read, so an enum
      // manufactures the parallel literal table this repository is organised against.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message:
            '`enum` is forbidden: declare an `as const` literal union in @arthome/core (code-conventions.md section 5.3).',
        },
        {
          // Measured: with @arthome/tooling's vitest types replaced by
          //   `{ deliberatelyWrong: number }`, a consumer carrying such a declaration
          //   still type-checked clean. It SHADOWS rather than fills, so it never expires.
          selector:
            'TSModuleDeclaration > Literal[value=/^@arthome\\//], TSModuleDeclaration > StringLiteral[value=/^@arthome\\//]',
          message:
            "Never `declare module '@arthome/…'`: an ambient declaration SHADOWS the package's own types rather than filling a gap, so it silently outlives the reason for it. Add the types to the package instead (code-conventions.md section 4.2).",
        },
      ],
      '@typescript-eslint/no-namespace': 'error',
      '@typescript-eslint/no-require-imports': 'error',

      // A type import that survives compilation keeps a whole module alive — the
      // number one source of dead weight on Metro.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/consistent-type-exports': 'error',

      // Section 5.6.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/only-throw-error': 'error',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'error',
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],

      // An "unused" constructor parameter is used by NestJS and Angular injection.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  // ------------------------------------------------------- imports and their order
  // Import order belongs entirely to ESLint only while no sorting plugin sits on
  //   the Prettier side — hence section 3.3's ban on prettier-plugin-organize-imports
  //   and @trivago/prettier-plugin-sort-imports.
  {
    files: SOURCE_FILES,
    plugins: { 'import-x': importX },
    settings: {
      // Without the resolver, import-x/no-cycle and no-restricted-imports see
      //   through neither `paths` nor `exports`: the rule runs and finds nothing.
      'import-x/resolver-next': [createTypeScriptImportResolver({ alwaysTryTypes: true })],
    },
    rules: {
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [{ pattern: '@arthome/**', group: 'internal', position: 'before' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      // On NestJS under ESM a cycle is a TDZ at boot or a TS1272, and the message
      // does not name the cycle.
      'import-x/no-cycle': ['error', { maxDepth: Infinity, ignoreExternal: true }],
      'import-x/no-self-import': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/dist/**', '@arthome/*/dist/**', '@arthome/*/src/**'],
              message:
                'Import by package name, never by an internal path: going through `exports` is going through the contract.',
            },
          ],
        },
      ],
    },
  },

  // ------------------------------------------------ two named rules, switched off
  // Off because they arbitrate a style without catching a defect, and written out
  // rather than left to omission so that a preset turning one on is visible. Section 3.4.
  {
    files: SOURCE_FILES,
    rules: {
      'arrow-body-style': 'off',
      'prefer-arrow-callback': 'off',
    },
  },

  // ------------------------------------------------------ quality, not formatting
  {
    files: SOURCE_FILES,
    rules: {
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-param-reassign': ['error', { props: true }],
      'no-var': 'error',
      'prefer-const': 'error',
      'object-shorthand': ['error', 'properties'],
      'no-implicit-coercion': 'error',
      'no-return-assign': 'error',
      'no-unneeded-ternary': 'error',
    },
  },

  // ------------------------------------------------- tooling does not enter src/
  // The one of section 4.7's four barriers that speaks at the moment of the import.
  {
    files: ['src/**', 'app/**'],
    rules: {
      // `rules` fully REPLACES the same rule, so the "imports" block's patterns are
      //   repeated here or they are lost for src/, which is what they protect.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/dist/**', '@arthome/*/dist/**', '@arthome/*/src/**'],
              message:
                'Import by package name, never by an internal path: going through `exports` is going through the contract.',
            },
            {
              group: ['@arthome/tooling', '@arthome/tooling/*'],
              message: '@arthome/tooling is tooling: never in src/.',
            },
          ],
        },
      ],
    },
  },

  // ------------------------------------------------------------------ test files
  {
    files: ['**/*.spec.{ts,tsx}', '**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
    },
  },

  // --------------------------------------- JS configuration at a repository root
  {
    files: ['*.{js,mjs,cjs}', 'tools/**/*.{js,mjs,cjs}', 'bin/**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);

export default base;
