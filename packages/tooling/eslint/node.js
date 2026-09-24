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
    //
    // ⚠ `paths`, NOT `patterns`, AND THE DIFFERENCE IS NOT COSMETIC. These are
    //   exact module names, and `patterns` interprets its entries with GITIGNORE
    //   semantics: an unanchored `events` matches any path segment called
    //   `events`, so `@arthome-platform/events` was refused with a message about
    //   prefixing built-in modules. Every one of these names is a plausible
    //   library name — `path`, `stream`, `crypto`, `util` — so the trap was
    //   waiting for whichever repository named a package first. arthome-platform
    //   did, on its second service.
    //
    //   `paths` matches the specifier exactly, which is what "the built-in
    //   called fs" actually means.
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
