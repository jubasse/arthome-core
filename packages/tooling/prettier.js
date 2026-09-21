// @arthome/tooling/prettier
//
// Prettier owns formatting. ESLint owns code quality only.
// Zero overlap, verified by `npx eslint-config-prettier <file>`.
//
// A repository consumes this config with one line in its package.json:
//     { "prettier": "@arthome/tooling/prettier" }
//
// ⚠ NO PLUGINS. In particular not prettier-plugin-organize-imports nor
//   @trivago/prettier-plugin-sort-imports: they would make Prettier sort
//   imports, in direct competition with import-x/order — two tools, two orders,
//   a --fix war. Prettier DOES NOT SORT imports, and that is deliberate: it is
//   what makes import order NOT a shared domain. A sorting plugin would
//   reintroduce the overlap exactly where there is none.
//   See architecture/code-conventions.md section 3.3.

/** @type {import("prettier").Config} */
export const config = {
  // printWidth 100: 80 wraps perfectly readable TypeScript signatures and RxJS
  // method chains; 120 makes side-by-side diffs unreadable on a laptop. The same
  // everywhere, so that moving code between repositories reformats nothing.
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

  // The one setting where a different default would produce a whole-file diff.
  // Backed by a `* text=auto eol=lf` .gitattributes in all seven repositories:
  // Prettier fixes the file, git stops it arriving in the first place.
  endOfLine: 'lf',

  overrides: [
    { files: '*.md', options: { proseWrap: 'always' } },
    { files: ['*.json', '*.jsonc'], options: { trailingComma: 'none' } },
    { files: ['*.yaml', '*.yml'], options: { singleQuote: false } },
  ],
};

export default config;
