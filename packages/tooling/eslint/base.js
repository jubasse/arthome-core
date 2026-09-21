// @arthome/tooling/eslint/base
//
// The ESLint floor for all seven repositories. Flat config (ESLint 9 and 10; the
// old eslintrc format no longer exists in 10).
//
// ⚠ THIS FILE CONTAINS NO FORMATTING RULE, AND MUST NEVER CONTAIN ONE.
//   Prettier owns formatting; ESLint owns code quality only. Zero overlap,
//   verified by `npx eslint-config-prettier <file>` rather than by discipline.
//   See architecture/code-conventions.md section 3.
//
// ⚠ `prettier` (eslint-config-prettier/flat) IS NOT included here: it must be the
//   LAST element of the repository's final array, after the stack presets and
//   after the local overrides. Placed earlier, it switches off nothing that comes
//   after it — and it fails SILENTLY. Each repository imports it and puts it at
//   the end. See section 3.2.
//
// ⚠ eslint-plugin-prettier is FORBIDDEN: running Prettier as an ESLint rule is
//   the very setup that CREATES the conflicts we are avoiding. Section 3.3.

import js from '@eslint/js';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX from 'eslint-plugin-import-x';
import tseslint from 'typescript-eslint';

/** TypeScript and JavaScript files under contract. */
export const SOURCE_FILES = ['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'];

/** What no repository ever lints. */
export const COMMON_IGNORES = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/generated/**',
  '**/*.min.js',
];

/**
 * The floor, as a flat-config array.
 * A repository spreads it at the head of its eslint.config.js, then adds its
 * stack, then its overrides, then `eslint-config-prettier/flat` last.
 */
export const base = tseslint.config(
  { ignores: COMMON_IGNORES },

  // ------------------------------------------------------------- recommended
  {
    files: SOURCE_FILES,
    extends: [js.configs.recommended],
  },

  // ------------------------------------------------------ TypeScript, with types
  // The type-aware rules are the reason Biome was ruled out (D-013):
  // no-floating-promises, no-misused-promises and await-thenable only exist
  // because a type checker is wired in. So `projectService` is mandatory, and a
  // repository that switches it off to save time has cancelled the decision.
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
      // `any`: forbidden. The exception is generated code, and it is declared in
      // the repository with its reason (section 4.5).
      '@typescript-eslint/no-explicit-any': 'error',

      // An unchecked assertion tells the checker to be quiet; `satisfies` asks it
      // to check AND THEN keep the precise inferred type.
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',

      // @ts-expect-error with a description, never @ts-ignore: the difference is
      // that @ts-expect-error becomes an error the day the problem is fixed.
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

      // enum forbidden: emits runtime code (unacceptable in @arthome/core), does
      // not survive isolatedModules as `const enum`, does not serialise to JSON,
      // and does not narrow like a literal union. Section 5.3.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message:
            '`enum` is forbidden: declare an `as const` literal union in @arthome/core (code-conventions.md section 5.3).',
        },
      ],
      '@typescript-eslint/no-namespace': 'error',
      '@typescript-eslint/no-require-imports': 'error',

      // Explicit type imports: a type import that survives compilation keeps a
      // whole module alive — the number one source of dead weight on Metro.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/consistent-type-exports': 'error',

      // Errors — section 5.6.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/only-throw-error': 'error',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'error',
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],

      // An "unused" constructor parameter is used by NestJS and Angular
      // injection: args after-used, and the _ prefix is ignored.
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
  // Prettier DOES NOT SORT imports, and that is deliberate: import order is
  // therefore not a shared domain — it belongs entirely to ESLint and creates no
  // conflict. That holds only as long as no sorting plugin is installed on the
  // Prettier side, hence the section 3.3 ban on prettier-plugin-organize-imports
  // and @trivago/prettier-plugin-sort-imports.
  {
    files: SOURCE_FILES,
    plugins: { 'import-x': importX },
    settings: {
      // TypeScript resolver: without it, import-x/no-cycle and
      // no-restricted-imports see through neither `paths` nor `exports` — the
      // rule runs and finds nothing, which is the worse of the two failure modes.
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
  // Neither is a formatting rule: eslint-config-prettier does not switch them off,
  // and that is correct. They only become harmful together with
  // eslint-plugin-prettier, which is forbidden here. We switch them off because
  // they arbitrate a style without catching a defect — not out of fear of a
  // conflict. Written explicitly rather than left off by omission: a rule you
  // decide not to apply must be visible, otherwise the day a preset turns it on
  // nobody will know whether that was intended. Section 3.4.
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
  // Four barriers keep @arthome/tooling out of production (section 4.7); this is
  // the only one that speaks to the author at the moment they write the import.
  {
    files: ['src/**', 'app/**'],
    rules: {
      // ⚠ `rules` fully replaces the previous value of the same rule, so the
      //   patterns from the "imports" block are REPEATED here — otherwise they
      //   would be lost for src/, which is exactly what they protect.
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
