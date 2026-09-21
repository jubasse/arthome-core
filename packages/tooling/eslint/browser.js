// @arthome/tooling/eslint/browser
//
// Socle + globales navigateur. Pour les cinq applications : storefront web,
// storefront mobile, storefront TV, studio web, studio mobile.
//
// ⚠ Ne contient AUCUN greffon de pile — ni angular-eslint, ni eslint-config-next,
//   ni eslint-plugin-react-hooks, ni eslint-config-expo. Chaque depot les ajoute
//   lui-meme, entre ce socle et `eslint-config-prettier/flat` :
//
//     export default defineConfig([
//       globalIgnores([...]),
//       ...base,        // 1. le socle commun
//       ...pile,        // 2. la pile, qui peut rallumer des choses
//       { rules: {} },  // 3. surcharges locales, chacune avec sa raison
//       prettier,       // 4. DERNIER : il eteint ce que 2 et 3 ont rallume
//     ]);
//
//   L'ordre 1 → 2 → 3 → 4 est la seule chose qui ne se negocie pas, et
//   `npx eslint-config-prettier <fichier>` le verifie.
//   Voir architecture/code-conventions.md sections 3.2, 4.2 et 4.3.

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
    // Une application n'ecrit pas dans la console en production : elle passe par
    // sa couche de journalisation, qui sait ou envoyer et quoi rediger.
    'no-console': ['error', { allow: ['warn', 'error'] }],
  },
});

export default browser;
