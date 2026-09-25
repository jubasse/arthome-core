// @arthome/tooling/prettier
//
// Prettier owns formatting, ESLint owns code quality: zero overlap, verified by
// `npx eslint-config-prettier <file>`. A repository consumes it with
// `{ "prettier": "@arthome/tooling/prettier" }`.
//
// ⚠ NO PLUGINS, in particular not prettier-plugin-organize-imports nor
//   @trivago/prettier-plugin-sort-imports. Prettier not sorting imports is what
//   makes import order NOT a shared domain; a sorting plugin competes with
//   import-x/order and starts a --fix war. Section 3.3.

/** @type {import("prettier").Config} */
export const config = {
  // 80 wraps readable TypeScript signatures and RxJS chains; 120 makes side-by-side
  // diffs unreadable on a laptop.
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

  // The one setting whose default would produce a whole-file diff. Backed by
  // `* text=auto eol=lf` in every repository's .gitattributes.
  endOfLine: 'lf',

  overrides: [
    { files: '*.md', options: { proseWrap: 'always' } },
    { files: ['*.json', '*.jsonc'], options: { trailingComma: 'none' } },
    { files: ['*.yaml', '*.yml'], options: { singleQuote: false } },
  ],
};

export default config;
