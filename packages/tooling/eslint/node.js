// @arthome/tooling/eslint/node
//
// The floor plus Node globals, for arthome-platform and for the other
// repositories' JavaScript tooling.
//
// Three entry points and not one, because a single entry would force browser
// globals into the services and back — and a false positive is what makes someone
// switch a rule off and forget to switch it on.
//
// ⚠ Contains NO stack preset: a preset's version tracks the framework major
//   installed in the repository, so lodging one here would force all seven to
//   upgrade together. Section 4.2.

import globals from 'globals';
import tseslint from 'typescript-eslint';

import { base, SOURCE_FILES } from './base.js';

export const node = tseslint.config(...base, {
  files: SOURCE_FILES,
  languageOptions: {
    globals: { ...globals.node },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // The `node:` prefix separates a built-in from a same-named registry package,
    // which is a real supply-chain attack surface.
    //
    // ⚠ `paths`, NOT `patterns`: `patterns` reads its entries with GITIGNORE
    //   semantics, so an unanchored `events` matched `@arthome-platform/events` and
    //   refused it. `paths` matches the specifier exactly.
    'no-restricted-imports': [
      'error',
      {
        paths: [
          'fs',
          'path',
          'os',
          'crypto',
          'http',
          'https',
          'stream',
          'url',
          'util',
          'child_process',
          'buffer',
          'events',
          'assert',
          'zlib',
        ].map((name) => ({
          name,
          message: 'Prefix built-in modules: `node:fs`, `node:path`, and so on.',
        })),
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
});

export default node;
