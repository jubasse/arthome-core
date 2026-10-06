# Working in arthome-core

This repository holds the **domain** (`@arthome/core`), the **published contracts** (`@arthome/contracts`,
declaring every operation of `openapi/`), and the **shared tooling** (`@arthome/tooling`). It declares no platform
dependency and names no framework router, deliberately — there is no NestJS, no Next.js, no Angular
here, and a skill for one of them would be the wrong instrument.

## Read these first, in this order

1. **`architecture/code-conventions.md`** — the conventions every repository inherits. §5.10 is the
   comment rule; `CLAUDE.md` carries its short form.
2. **`DECISIONS.md`** — every ruling with its reason. **A decision is not yours to reopen alone.**
   If one reads as current and the repository contradicts it, say so and stop — D-008's no-push clause
   was read as live months after the remotes existed, and the note recording that is why it is now
   marked superseded rather than silently edited. **`DECISIONS-INDEX.md`** is its **projection**, one
   line per decision with the documents it cites: open it first, then `DECISIONS.md` at the id.
3. **`REPOSITORY_MAP.md`** — the index of every exported name. It is a **projection**, never edited
   by hand.

## The commands

| Command | What it does |
| --- | --- |
| `pnpm run verify` | everything below, in order. Green before you commit, and the pre-commit hook enforces it |
| `pnpm run verify:offline` | the subset needing no install. Does **not** run `format:check`, `lint`, `typecheck` or `test` |
| `pnpm -r run build` | every package. There is no root `build` script — `pnpm run build` fails |
| `pnpm run generate:openapi` | writes `openapi/storefront.yaml` and `openapi/studio.yaml` from the route declarations. Run it after any change to `packages/contracts` that reaches a document, and commit both |
| `node tools/pack-release.mjs v<version> <dir>` | packs the three packages as a release would; `v<version>-rc.<n>` stamps the tarballs as a release candidate and leaves the checkout untouched; the release workflow runs the same command (README, "Releasing"). CI runs `verify` on every pull request to `develop` or `main` |
| `pnpm run fix` | Prettier, then ESLint `--fix`, then Prettier again |
| `pnpm run generate:contract-types` | writes the `types.ts` of every module folder (`<api>/<module>/`) from its `routes.ts`, and the explicit types of its `schemas.ts`. Run it after any change to a module folder, and commit what it writes |
| `node tools/prune-unused.mjs <module.ts>...` | drops the imports and top-level consts a module no longer uses once its routes moved out; `pnpm run fix` after it |
| `pnpm run measure:surface-bundle` | what a surface ships for `createClient(api)`, minified and gzipped, part by part. A report, not a gate |

**GitHub Actions are pinned by commit SHA**, with the version in a comment (`uses:
actions/checkout@<sha> # v7.0.1`). A tag can be moved to other code; a commit cannot. To bump an
action, resolve the new release's commit (`gh api repos/<owner>/<action>/commits/<tag> -q .sha`) and
update the SHA and the comment together. Python dependencies of the workflows are pinned by version.

The gates, and what each proves: `check-versions` (one version per dependency across manifests) ·
`check-tsconfig` (the compiler locks are intact) · `check-enums` (no enumeration value copied as a
literal — the project's dominant fault, E2) · `check-language` (no French *sentence* in a committed
file; an isolated French term is out of scope and the gate says so) · `check-symbols` (no warning
sign, check mark, cross or emoji outside Markdown inline code; `tools/symbols.allow.json` names the
read-only design content) · `check-core-entry` (nothing
reachable from the `.` entry point imports zod or a Node API) · `check-contract-docs` (no
subpath a surface imports reaches a docs or examples module of the contracts, and the maturity
regimes match `transport.md` §5.11) · `check-decisions-index`
(`DECISIONS-INDEX.md` matches what regenerating from `DECISIONS.md` produces) · `check-openapi` (both documents
conform) · `check-openapi-generated` (each committed document is byte for byte what the route declarations generate, D-120) · `check-contract-types` (each module folder's `types.ts` and `schemas.ts` annotations are what the tool writes) · `check-vocabulary` (the documents, the architecture prose and `@arthome/core` agree
member for member) · `check-map` (`REPOSITORY_MAP.md` matches the installed
declarations) · `check-prettier-conflict` (no ESLint rule fights Prettier).

`arthome-comment-density` reports comment density. It is a **report, not a gate**: it exits 0 and is
deliberately outside `verify`, because §5.10 makes the ratio a smell rather than a limit.

## Before you write anything

**`check-map` reads the INSTALLED declarations, so build before regenerating.**

```bash
pnpm -r run build && pnpm exec arthome-generate-map
```

Without the build the generator compares the old array against your new source and reports
differences that are not real.

**The map projects the first line of each export's doc comment**, so touching a comment on an
exported name moves `REPOSITORY_MAP.md` and `check-map` goes red until you regenerate. This blocked
two agents in one afternoon.

**`packages/*/dist/*.d.ts` are tracked and carry the JSDoc** (`removeComments: false`), so a comment
change shows up in `dist` too. That is expected; commit it.

**`@arthome/contracts` is the source, `openapi/` is generated from it (D-120).** Edit the route
declaration or the zod schema, then `pnpm run generate:openapi`, and commit the source and both
documents. Editing a document by hand makes `check-openapi-generated` red, correctly.

**Proving a comment-only change is comment-only: run each touched file through the TypeScript
parser with `removeComments` and compare to `HEAD`.** A hand-rolled token scanner is not enough — five
files here use `/` as division, a standalone scanner defaults to reading it as a regex, and a desynced
scanner silently stops filtering comments. It reported five unchanged files as changed, and the same
bug in the other direction would have passed a real code change. The check proves the **token
stream** is identical, not semantic equivalence: an edit inside a string literal would pass it. The
tests cover that, so run both.

**Branches (D-087).** Nothing is committed on `main` or `develop`. Work goes on `feature/{name}` from
`develop`, one per repository it touches, and reaches `develop` through a pull request once `verify`
is green; its description follows `code-conventions.md` §5.9. A release is `release/{version}` from
`develop`, merged into `main`, tagged `v{version}`, then merged back into `develop`, in the four
repositories at once with one shared version. A worktree branches from `develop`.

**A shared tree.** Several agents work here at once. Commit by explicit path — `git commit --only
<paths>` — never `git add -A`, or you publish someone's in-flight work under your message. And run
`prettier --write` before stepping away: an unformatted file in flight makes `prettier --check` red
for everyone.

## Conventions

- `rg` not `grep`, `fd` not `find`.
- Everything verifiable locally. No network, no `npm publish`.
- Commit messages in English, `<area>: <subject>` — §5.9, and the `commit-msg` hook accepts it.
- Comments: name it first, then comment only what a name cannot carry. §5.10, short form in
  `CLAUDE.md`.
