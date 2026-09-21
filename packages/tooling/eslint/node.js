// @arthome/tooling/eslint/node
//
// Socle + globales Node. Pour arthome-platform (les sept services NestJS) et pour
// l'outillage en JavaScript des autres depots.
//
// Trois entrees ESLint et pas une : une seule obligerait a embarquer les globales
// navigateur dans les services et inversement, et les globales sont exactement ce
// qui produit les faux positifs qui font desactiver une regle — puis oublier de
// la rallumer.
//
// ⚠ Ne contient AUCUN greffon de pile. @nestjs/* n'apparait nulle part ici : la
//   version d'un greffon de pile doit suivre le majeur du framework installe dans
//   le depot, et le loger ici forcerait les sept depots a monter ensemble.
//   Voir architecture/code-conventions.md section 4.2.

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
    // Le prefixe `node:` est obligatoire : il distingue sans ambiguite un module
    // interne d'un paquet homonyme du registre, ce qui est une surface d'attaque
    // reelle sur une chaine d'approvisionnement.
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
            message: "Prefixer les modules internes : `node:fs`, `node:path`, etc.",
          },
          {
            group: ['**/dist/**', '@arthome/*/dist/**', '@arthome/*/src/**'],
            message:
              "Importer par le nom du paquet, jamais par un chemin interne : passer par `exports`, c'est passer par le contrat.",
          },
        ],
      },
    ],
  },
});

export default node;
