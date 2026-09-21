// @arthome/tooling/prettier
//
// Prettier possede le formatage. ESLint ne possede que la qualite de code.
// Recouvrement zero, verifie par `npx eslint-config-prettier <fichier>`.
//
// Un depot consomme cette configuration par une ligne de son package.json :
//     { "prettier": "@arthome/tooling/prettier" }
//
// ⚠ AUCUN GREFFON. En particulier pas prettier-plugin-organize-imports ni
//   @trivago/prettier-plugin-sort-imports : ils feraient trier les imports a
//   Prettier, en concurrence directe avec import-x/order — deux outils, deux
//   ordres, une guerre de --fix. Prettier NE TRIE PAS les imports, et c'est
//   delibere : c'est ce qui fait que l'ordre des imports n'est PAS un domaine
//   partage. Un greffon de tri reintroduirait le recouvrement la ou il n'y en a
//   pas. Voir architecture/code-conventions.md section 3.3.

/** @type {import("prettier").Config} */
export const config = {
  // printWidth 100 : 80 fait retourner a la ligne des signatures TypeScript
  // parfaitement lisibles et des chaines de methodes RxJS ; 120 rend les diffs
  // cote a cote illisibles sur un portable. Le meme partout, pour que deplacer
  // du code entre depots ne reformate rien.
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  arrowParens: 'always',
  bracketSameLine: false,
  bracketSpacing: true,
  quoteProps: 'as-needed',

  // Seul poste ou un defaut different produirait un diff de fichier entier.
  // Double d'un .gitattributes `* text=auto eol=lf` sur les sept depots :
  // Prettier corrige le fichier, git l'empeche d'arriver.
  endOfLine: 'lf',

  overrides: [
    { files: '*.md', options: { proseWrap: 'always' } },
    { files: ['*.json', '*.jsonc'], options: { trailingComma: 'none' } },
    { files: ['*.yaml', '*.yml'], options: { singleQuote: false } },
  ],
};

export default config;
