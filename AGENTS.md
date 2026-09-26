# Working in arthome-core

This repository holds the **domain** (`@arthome/core`), the **published contracts** (`@arthome/contracts`,
emitted from `openapi/`), and the **shared tooling** (`@arthome/tooling`). It declares no platform
dependency and names no framework router, deliberately — there is no NestJS, no Next.js, no Angular
here, and a skill for one of them would be the wrong instrument.

## Read these first, in this order

1. **`architecture/code-conventions.md`** — the conventions every repository inherits. §5.10 is the
   comment rule; `CLAUDE.md` carries its short form.
2. **`DECISIONS.md`** — every ruling with its reason. **A decision is not yours to reopen alone.**
   If one reads as current and the repository contradicts it, say so and stop — D-008's no-push clause
   was read as live months after the remotes existed, and the note recording that is why it is now
   marked superseded rather than silently edited.
3. **`REPOSITORY_MAP.md`** — the index of all 543 exported names. It is a **projection**, never edited
   by hand.

## The commands

| Command | What it does |
| --- | --- |
| `pnpm run verify` | everything below, in order. Green before you commit, and the pre-commit hook enforces it |
| `pnpm run verify:offline` | the subset needing no install. Does **not** run `format:check`, `lint`, `typecheck` or `test` |
| `pnpm -r run build` | every package. There is no root `build` script — `pnpm run build` fails |
| `pnpm run fix` | Prettier, then ESLint `--fix`, then Prettier again |

The gates, and what each proves: `check-versions` (one version per dependency across manifests) ·
`check-tsconfig` (the compiler locks are intact) · `check-enums` (no enumeration value copied as a
literal — the project's dominant fault, E2) · `check-language` (no French *sentence* in a committed
file; an isolated French term is out of scope and the gate says so) · `check-symbols` (no warning
sign, check mark, cross or emoji outside Markdown inline code; `tools/symbols.allow.json` names the
read-only design content) · `check-core-entry` (nothing
reachable from the `.` entry point imports zod or a Node API) · `check-openapi` (both documents
conform) · `check-vocabulary` (the documents, the architecture prose and `@arthome/core` agree
member for member) · `check-emit-diff` (every emitted schema matches the document it must emit —
**the document is authoritative**, D-058) · `check-map` (`REPOSITORY_MAP.md` matches the installed
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

**`openapi/` is the source, `@arthome/contracts` is generated from it.** Change the document, run
`node tools/emit-contracts.mjs`, rebuild. Changing only the zod schema makes `check-emit-diff` red,
correctly.

**Proving a comment-only change is comment-only: run each touched file through the TypeScript
parser with `removeComments` and compare to `HEAD`.** A hand-rolled token scanner is not enough — five
files here use `/` as division, a standalone scanner defaults to reading it as a regex, and a desynced
scanner silently stops filtering comments. It reported five unchanged files as changed, and the same
bug in the other direction would have passed a real code change. The check proves the **token
stream** is identical, not semantic equivalence: an edit inside a string literal would pass it. The
tests cover that, so run both.

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
