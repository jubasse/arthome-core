// arthome-core — the repository's ESLint configuration.
//
// The shape is the same in all seven repositories, and the order is the one
// thing that is not negotiable:
//   1. the common floor (@arthome/tooling)
//   2. the stack, which may turn things back on  <- none here: arthome-core is
//      pure TypeScript, no framework (README section 3)
//   3. local overrides, each with its reason
//   4. eslint-config-prettier/flat, LAST
//
// `npx eslint-config-prettier <file>` verifies that 4 really did switch
// everything off. See architecture/code-conventions.md sections 3.2 and 4.3.

import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';

import node from '@arthome/tooling/eslint/node';

export default defineConfig([
  globalIgnores([
    'packages/*/dist/**',
    'prototypes/**', // the five mockups: taken as they are, not rewritten
    'docs/**',
  ]),

  // 1. the floor. arthome-core runs under Node (build, tooling, fixtures), so
  //    this is the `node` entry point and not `browser`.
  ...node,

  // 3. local overrides
  {
    // The @arthome/tooling gates are standalone Node scripts: they have no
    // TypeScript project, and they write to standard output — that is their job.
    files: [
      'packages/tooling/bin/**/*.mjs',
      'packages/tooling/*.js',
      'packages/tooling/eslint/*.js',
    ],
    rules: {
      'no-console': 'off',
    },
  },

  // 4. LAST
  prettier,
]);
