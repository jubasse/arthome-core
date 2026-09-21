// @arthome/tooling/eslint/node
//
// The floor plus Node globals. For arthome-platform (the seven NestJS services)
// and for the JavaScript tooling of the other repositories.
//
// Three ESLint entry points and not one: a single entry would force browser
// globals into the services and vice versa, and globals are exactly what
// produces the false positives that make someone switch a rule off — and then
// forget to switch it back on.
//
// ⚠ Contains NO stack preset. @nestjs/* appears nowhere here: a stack preset's
//   version must track the framework major installed in the repository, and
//   lodging it here would force all seven repositories to upgrade together.
//   See architecture/code-conventions.md section 4.2.

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
    // The `node:` prefix is mandatory: it distinguishes a built-in module from a
    // same-named registry package without ambiguity, which is a real
    // supply-chain attack surface.
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: [
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
            ],
            message: 'Prefix built-in modules: `node:fs`, `node:path`, and so on.',
          },
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
