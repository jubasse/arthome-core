// @arthome/tooling/eslint/browser
//
// The floor plus browser globals. For the five applications: storefront web,
// storefront mobile, storefront TV, studio web, studio mobile.
//
// ⚠ Contains NO stack preset — no angular-eslint, no eslint-config-next, no
//   eslint-plugin-react-hooks, no eslint-config-expo. Each repository adds its
//   own, between this floor and `eslint-config-prettier/flat`:
//
//     export default defineConfig([
//       globalIgnores([...]),
//       ...base,        // 1. the common floor
//       ...stack,       // 2. the stack, which may turn things back on
//       { rules: {} },  // 3. local overrides, each with its reason
//       prettier,       // 4. LAST: switches off what 2 and 3 turned on
//     ]);
//
//   The order 1 -> 2 -> 3 -> 4 is the one thing that is not negotiable, and
//   `npx eslint-config-prettier <file>` verifies it.
//   See architecture/code-conventions.md sections 3.2, 4.2 and 4.3.

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
    // An application does not write to the console in production: it goes
    // through its logging layer, which knows where to send and what to redact.
    'no-console': ['error', { allow: ['warn', 'error'] }],
  },
});

export default browser;
