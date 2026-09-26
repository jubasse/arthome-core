// @arthome/tooling/eslint/browser
//
// The floor plus browser globals, for the five applications.
//
// Contains NO stack preset. Each repository adds its own in the order floor ->
//   stack -> local overrides -> `eslint-config-prettier/flat` LAST, which is the
//   part that is not negotiable and which `npx eslint-config-prettier <file>`
//   verifies. Sections 3.2, 4.2 and 4.3.

import globals from 'globals';
import tseslint from 'typescript-eslint';

import { base, SOURCE_FILES } from './base.js';

export const browser = tseslint.config(...base, {
  files: SOURCE_FILES,
  languageOptions: {
    globals: { ...globals.browser },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Production output goes through the logging layer, which knows what to redact.
    'no-console': ['error', { allow: ['warn', 'error'] }],
  },
});

export default browser;
