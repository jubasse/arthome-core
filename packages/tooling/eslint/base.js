// @arthome/tooling/eslint/base
//
// Socle ESLint des sept depots. Configuration a plat (ESLint 9 et 10 ; l'ancien
// format eslintrc n'existe plus en 10).
//
// ⚠ CE FICHIER NE CONTIENT AUCUNE REGLE DE FORMATAGE, ET NE DOIT JAMAIS EN CONTENIR.
//   Prettier possede le formatage, ESLint ne possede que la qualite de code.
//   Recouvrement zero, verifie par `npx eslint-config-prettier <fichier>` et non
//   par la discipline. Voir architecture/code-conventions.md section 3.
//
// ⚠ `prettier` (eslint-config-prettier/flat) N'EST PAS inclus ici : il doit etre le
//   DERNIER element du tableau final du depot, apres les prereglages de pile et
//   apres les surcharges locales. Place avant, il ne desactive rien de ce qui suit.
//   Chaque depot l'importe lui-meme et le met en queue. Voir section 3.2.
//
// ⚠ eslint-plugin-prettier est PROSCRIT : faire tourner Prettier comme une regle
//   ESLint est le montage qui CREE les conflits qu'on veut eviter. Section 3.3.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';

/** Fichiers TypeScript et JavaScript sous contrat. */
export const SOURCE_FILES = ['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'];

/** Ce qu'aucun depot ne lint, jamais. */
export const COMMON_IGNORES = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/generated/**',
  '**/*.min.js',
];

/**
 * Le socle, sous forme de tableau a plat.
 * Un depot l'etale en tete de son eslint.config.js, puis ajoute sa pile, puis ses
 * surcharges, puis `eslint-config-prettier/flat` en dernier.
 */
export const base = tseslint.config(
  { ignores: COMMON_IGNORES },

  // ---------------------------------------------------------------- recommandations
  {
    files: SOURCE_FILES,
    extends: [js.configs.recommended],
  },

  // ------------------------------------------------------- TypeScript, avec les types
  // Les regles typees sont la raison pour laquelle Biome a ete ecarte (D-013) :
  // no-floating-promises, no-misused-promises et await-thenable n'existent que
  // parce qu'un verificateur de types est branche. `projectService` est donc
  // obligatoire, et un depot qui l'eteint pour gagner du temps annule la decision.
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },

  // -------------------------------------------------------- TypeScript non negociable
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      // `any` : interdit. L'exception est le code genere, et elle se declare
      // dans le depot avec sa raison (section 4.5).
      '@typescript-eslint/no-explicit-any': 'error',

      // Une assertion non verifiee fait taire le verificateur ; `satisfies` lui
      // demande de verifier PUIS de conserver le type precis infere.
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',

      // @ts-expect-error avec description, jamais @ts-ignore : la difference est
      // que @ts-expect-error devient une erreur le jour ou le probleme est resolu.
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

      // enum interdit : emet du code a l'execution (inacceptable dans @arthome/core),
      // ne survit pas a isolatedModules en `const enum`, ne se serialise pas en JSON,
      // et ne se retrecit pas comme une union litterale. Section 5.3.
      '@typescript-eslint/no-restricted-types': 'off',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message:
            "`enum` est interdit : declarer une union litterale `as const` dans @arthome/core (code-conventions.md section 5.3).",
        },
      ],
      '@typescript-eslint/no-namespace': 'error',
      '@typescript-eslint/no-require-imports': 'error',

      // Imports de type explicites : un import de type qui survit a la compilation
      // retient un module entier — la cause de poids mort numero un sur Metro.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/consistent-type-exports': 'error',

      // Erreurs — section 5.6.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/only-throw-error': 'error',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'error',
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],

      // Un parametre de constructeur << inutilise >> est utilise par l'injection
      // NestJS et Angular : args after-used, et on ignore le prefixe _.
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

  // ------------------------------------------------------------- imports et leur ordre
  // Prettier NE TRIE PAS les imports, et c'est delibere : l'ordre des imports
  // n'est donc pas un domaine partage, il appartient entierement a ESLint et ne
  // cree aucun conflit. Ce n'est vrai que tant qu'aucun greffon de tri n'est
  // installe cote Prettier — d'ou l'interdiction en section 3.3 de
  // prettier-plugin-organize-imports et @trivago/prettier-plugin-sort-imports.
  {
    files: SOURCE_FILES,
    plugins: { 'import-x': importX },
    settings: {
      // Resolveur TypeScript : sans lui, import-x/no-cycle et no-restricted-imports
      // ne voient pas a travers les `paths` ni les `exports`.
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
      // Sur NestJS en ESM, un cycle est un TDZ au demarrage ou un TS1272, et le
      // message ne designe pas le cycle.
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
                "Importer par le nom du paquet, jamais par un chemin interne : passer par `exports`, c'est passer par le contrat.",
            },
          ],
        },
      ],
    },
  },

  // ------------------------------------------------- deux regles nommees, et eteintes
  // Ni l'une ni l'autre n'est une regle de formatage : eslint-config-prettier ne
  // les eteint pas, et c'est normal. Elles ne deviennent nuisibles qu'avec
  // eslint-plugin-prettier, qui est proscrit ici. On les eteint parce qu'elles
  // arbitrent un style sans attraper de defaut — pas par crainte d'un conflit.
  // Ecrites explicitement, et non laissees eteintes par omission : une regle
  // qu'on decide de ne pas appliquer doit etre visible, sinon le jour ou un
  // prereglage l'allume personne ne saura si c'etait voulu. Section 3.4.
  {
    files: SOURCE_FILES,
    rules: {
      'arrow-body-style': 'off',
      'prefer-arrow-callback': 'off',
    },
  },

  // ------------------------------------------------------- qualite, hors formatage
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

  // -------------------------------------------- l'outillage n'entre pas dans src/
  // Trois barrieres protegent @arthome/tooling d'une dependance de production
  // (section 4.7) ; celle-ci est la seule qui parle a l'auteur au moment ou il
  // ecrit l'import.
  {
    files: ['src/**', 'app/**'],
    rules: {
      // ⚠ `rules` ecrase entierement la valeur precedente d'une meme regle : les
      //   motifs du bloc << imports >> sont donc REPETES ici, sans quoi ils
      //   seraient perdus pour src/ — exactement les fichiers qu'ils protegent.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/dist/**', '@arthome/*/dist/**', '@arthome/*/src/**'],
              message:
                "Importer par le nom du paquet, jamais par un chemin interne : passer par `exports`, c'est passer par le contrat.",
            },
            {
              group: ['@arthome/tooling', '@arthome/tooling/*'],
              message: "@arthome/tooling est de l'outillage : jamais dans src/.",
            },
          ],
        },
      ],
    },
  },

  // ------------------------------------------------------------------- fichiers de test
  {
    files: ['**/*.spec.{ts,tsx}', '**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
    },
  },

  // ------------------------------------------ configurations JS a la racine d'un depot
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
