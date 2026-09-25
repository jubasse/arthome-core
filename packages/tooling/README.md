# `@arthome/tooling`

The base configuration that the **seven Arthome repositories** extend: ESLint, Prettier, TypeScript,
Vitest — and the gates that check they have not drifted apart.

> **The reasoning lives in [`architecture/code-conventions.md`](../../architecture/code-conventions.md).**
> This README says how to use the package; that document says why it is the way it is. Where the two
> disagree, the document is right and this package has a defect.

---

## What it carries

| Entry point | Contents |
|---|---|
| `@arthome/tooling/eslint/base` | The floor: JS recommended, **type-aware** `typescript-eslint`, `import-x`, the non-negotiable TypeScript rules. **No formatting rule.** |
| `@arthome/tooling/eslint/node` | `base` + Node globals + mandatory `node:` prefix. For `arthome-platform`. |
| `@arthome/tooling/eslint/browser` | `base` + browser globals. For the five applications. |
| `@arthome/tooling/prettier` | The Prettier config. No plugins. |
| `@arthome/tooling/vitest` | A **bare object**, never a `defineConfig`. |
| `@arthome/tooling/tsconfig/base.json` | The TS 6 / TS 7 **intersection**. No path-bearing option. |
| `@arthome/tooling/tsconfig/lib.json` | Published packages. The one file TS 7 never reads. |
| `@arthome/tooling/tsconfig/app.json` | Applications and services. |

Plus the executables: the gates `arthome-check-enums`, `arthome-check-versions`,
`arthome-check-tsconfig`, `arthome-check-prettier-conflict`, `arthome-check-language` and
`arthome-check-map`; the generators `arthome-generate-map`, `arthome-generate-agent-map`,
`arthome-collect-agent-docs` and `arthome-sync-agent-docs`; and one **report**,
`arthome-comment-density`, which is not a gate and must not become one.

**There is no `"."` entry point**, deliberately: `import … from '@arthome/tooling'` fails to resolve.
That is the first of four barriers keeping it out of production, and the only one with nothing to
watch.

---

## How a repository extends it

### ESLint — the order is the one thing that is not negotiable

```js
// eslint.config.js
import { defineConfig, globalIgnores } from 'eslint/config';
import base from '@arthome/tooling/eslint/browser';
import nextVitals from 'eslint-config-next/core-web-vitals';   // the stack, owned by the repository
import prettier from 'eslint-config-prettier/flat';

export default defineConfig([
  globalIgnores(['.next/**', 'out/**', 'next-env.d.ts']),
  ...base,           // 1. the floor
  ...nextVitals,     // 2. the stack, which may turn things back on
  { rules: {} },     // 3. local overrides, each with its reason in a comment
  prettier,          // 4. LAST: switches off whatever 2 and 3 turned on
]);
```

**`eslint-config-prettier/flat` is the last element, without exception.** Placed earlier it switches
off nothing that follows — and it fails **silently**. The gate checks it:

```bash
pnpm exec arthome-check-prettier-conflict
# expected: PASS no ESLint rule conflicts with Prettier
```

### Prettier — one line of `package.json`

```json
{ "prettier": "@arthome/tooling/prettier" }
```

The two Angular repositories carry the **only permitted override**, because Prettier binds the
`angular` parser to the `.component.html` extension only — which Angular 20+ removed:

```js
// .prettierrc.mjs — Angular repositories only
import base from '@arthome/tooling/prettier';
export default {
  ...base,
  overrides: [...base.overrides, { files: 'src/app/**/*.html', options: { parser: 'angular' } }],
};
```

### TypeScript — `extends` by package name

```jsonc
{
  "extends": "@arthome/tooling/tsconfig/app.json",
  "compilerOptions": { "outDir": "dist", "paths": { "@/*": ["./src/*"] } },
  "include": ["src"]
}
```

Paths go **here**, never in the base: a path written in an extended file resolves from that file,
i.e. from `node_modules/@arthome/tooling/tsconfig/`.

### Vitest — the repository's `defineConfig`, never the package's

```ts
import { defineConfig } from 'vitest/config';   // the repository's version: 4.x on Angular, 5.x elsewhere
import base from '@arthome/tooling/vitest';

export default defineConfig({ ...base, test: { ...base.test } });
```

---

## Locked / redefinable

**Locked** — a repository that redefines these has a defect, not a need:

`strict` · `noUncheckedIndexedAccess` · `exactOptionalPropertyTypes` · `noImplicitOverride` ·
`noFallthroughCasesInSwitch` · `noImplicitReturns` · `useUnknownInCatchVariables` ·
`isolatedModules` · `verbatimModuleSyntax` · `forceConsistentCasingInFileNames` · the `typescript`
version · the position of `eslint-config-prettier/flat` last · the ban on `eslint-plugin-prettier`
and on Prettier sorting plugins.

**Forbidden**: `baseUrl`, `downlevelIteration`, `outFile`, `ignoreDeprecations`, `target: es5`,
`moduleResolution: node10`, `module: amd|umd|systemjs`, `esModuleInterop: false`. All of these are
**hard errors under TypeScript 7**.

**Redefinable with no justification** — and it has to be, otherwise the base gets bypassed instead
of extended: every path (`include`, `exclude`, `outDir`, `rootDir`, `paths`…), `types`, `lib`, `jsx`,
`module`, `moduleResolution`, `angularCompilerOptions`, the stack presets, Vitest configuration
outside the floor.

**Redefinable with a justification written in the file**: switching off a floor rule for a file
pattern. The shape is prescribed:

```js
{
  files: ['src/generated/**/*.ts'],
  rules: {
    // Generated Protobuf code: the rule is structural there, and the file is
    // rewritten on every `buf generate`. See architecture/events.md.
    '@typescript-eslint/no-explicit-any': 'off',
  },
}
```

The reference table is [`tsconfig-locks.json`](./tsconfig-locks.json) — **one table, for all seven
repositories.** Seven copies would be fault E2 applied to tooling.

---

## The gates

All in **pure Node, zero dependencies**: they run before `pnpm install` and without a remote runner —
the account's Actions quota is exhausted.

```bash
pnpm exec arthome-check-prettier-conflict  # the ESLint/Prettier overlap is empty
pnpm exec arthome-check-enums              # no enumeration value copied (E2)
pnpm exec arthome-check-versions           # the seven repositories have not drifted
pnpm exec arthome-check-tsconfig           # the locks have not been loosened
pnpm exec arthome-check-language           # everything committed is written in English
pnpm exec arthome-check-map                # REPOSITORY_MAP.md matches the declarations
```

### `arthome-check-enums` — the gate against E2

This project's dominant fault is the **parallel literal table**: eight fields, five mockups, despite
an explicit written principle forbidding it. The lesson is that a principle is not enough.

It **discovers** the `export const NAME = [...] as const` declarations in `@arthome/core`'s sources,
then reports any reappearance of those values elsewhere. It **carries no list of enumerations** — a
list would be one more parallel table. A new enumeration is covered the day it is declared.

| Option | Effect |
|---|---|
| `--source <dir>` | where the enumerations live (default: `packages/core/src`, then `../core/src`, then `node_modules/@arthome/core/{src,dist}`) |
| `--allow <file>` | the exceptions (default: `tools/enum-literals.allow.json`) |
| `--quiet` | only prints on failure |

An exception **must** carry a `reason`, or the gate rejects the file:

```json
{ "allow": [{ "file": "src/i18n/keymap.ts", "value": "open", "reason": "i18n key map: the key is the value." }] }
```

That file stays short, or the rule is wrong. Past twenty lines it is the sign that a value is
missing from `@arthome/core`.

### `arthome-check-versions`

Reads [`versions.json`](./versions.json) — regime A (shared at runtime, a major bump is a contract
change: `zod`, `typescript`), regime B (tooling), and the list of forbidden packages. It knows the
**named exceptions**: ESLint 9 on the two React Native repositories, Vitest 4 on the two Angular
ones. Pass `--repo <name>` to force which repository is evaluated.

It also checks the **`minimumReleaseAge` exceptions**: each temporary entry in
`pnpm-workspace.yaml` must carry a `remove-after: YYYY-MM-DD` marker, and the gate turns red once
that date has passed. An exception nobody removes is a lowered threshold that does not say its name.

### `arthome-check-tsconfig`

Checks the **resolved** configuration, not the files: an `extends` is bypassed by one local line.
Uses `tsc --showConfig` when `typescript` is installed, otherwise resolves the `extends` chain itself
— so that the gate exists before the install.

When the `extends` chain is broken it reports **the single cause and stops**: listing ten missing
locks would invite copying them into the repository, which is committing the very fault the base
exists to prevent.

### `arthome-check-prettier-conflict`

Enumerates the still-enabled ESLint rules that conflict with Prettier, and must return an empty list.
It wraps the upstream `eslint-config-prettier` CLI for two reasons: that binary is not on the
repository's path by design, and ESLint 10 resolves its configuration **per linted file**, so the
gate must probe one file per configuration family — which the upstream CLI cannot do in one call.

Pass the probe files as arguments, or let it use its defaults. If **no** probe file exists it exits 2
rather than 0: a gate reporting success while checking nothing would be the most dangerous file in
the repository.

### `arthome-comment-density` — a report, and never a gate

Prints how much of each file is comment, worst first, and **always exits 0**. It is deliberately
absent from `verify`.

```bash
pnpm exec arthome-comment-density                 # every tracked source file
pnpm exec arthome-comment-density --top 20        # the twenty worst
pnpm exec arthome-comment-density --all           # every file, including those under the mark
pnpm exec arthome-comment-density src/a.ts src/b.ts   # exactly these — a before/after
```

```
arthome-comment-density: 133 file(s) measured, 2 generated file(s) excluded, 95 above 25% (2112 excess line(s))
   74%    144 excess    216/290  packages/core/src/schema/vocabulary.ts
   87%    134 excess    187/215  tools/check-core-entry.mjs
```

**⚠ Wiring it into `verify` would be a defect, not an improvement.** `code-conventions.md` §5.10
sets the quarter-of-a-file mark as a **smell, not a limit**, and says in as many words: *never delete
a recorded reason to satisfy a ratio*. A gate on this number instructs the next agent to do exactly
that — and the lines it reaches for first are the measured failures, which are the most expensive
prose in the repository. The number opens the question *"is this code unclear?"*; it never answers
it, and it cannot tell a recorded defect from narration.

**What it measures.** Tracked files only (`git ls-files`), so it never descends into `node_modules`
or `dist` and behaves identically in every repository — it needs no workspace file and no
configuration, which is what makes a single-package repository work without a special case. Per
file: comment lines over **non-blank** lines; blank lines are excluded from the denominator, or a
sparsely formatted file reads as low-comment. Block comments count from `/*` through `*/`, and a
file that is entirely Markdown or holds no source at all is a silent, valid, zero-length result.

**What it deliberately does not measure**, each for a reason:

| Not measured | Why |
|---|---|
| Markdown | prose by construction; a ratio has no meaning |
| JSON | no comment syntax — this project's `_comment` arrays are prose carried as *data*, so every configuration file would read as all comment |
| `.d.ts`, `.proto`, `.yaml` | they declare rather than execute, so §5.10's question — *is the CODE unclear?* — has no answer. Their comments are usually the entire point: this repository's own `pnpm-workspace.yaml` is 85 % comment because it records why each dependency was approved |
| a tracked `dist/` | arthome-core commits `packages/*/dist/`; without the skip the report is dominated by 76 generated declaration files nobody edits |
| files carrying a generated marker | `@generated`, `Code generated by`, `DO NOT EDIT` |

**⚠ The generated marker is not near the top of the file.** protobuf-es writes `@generated` on
**line 16**, after copying the `.proto`'s own leading comment block, so a fixed byte prefix misses
it: measured, a 400-character window missed five generated files that contributed **1 461 phantom
excess lines** — more than half of a first measurement. The window is a generous *line* count read
from text. A cited marker is data, not a marker: backticked spans are stripped first, because this
tool's own header names `@generated` and the first version therefore excluded itself.

---

## `dependencies` versus `peerDependencies`

The question that settles it: **does the repository name this package itself?**

| | Why |
|---|---|
| **peer** — `eslint`, `@eslint/js`, `prettier`, `typescript`, `eslint-config-prettier` | These are the **binaries the repository runs**. Two copies of ESLint, and the plugin loaded by one is not the one the other sees; both work, differently, and the diagnosis is long. `@eslint/js` is peer because it must track **eslint's major**, which is 9 on two repositories and 10 on five. |
| **exactly pinned dependencies** — `typescript-eslint`, `eslint-plugin-import-x`, `eslint-import-resolver-typescript`, `globals` | In flat config a plugin is an **object passed by value**, no longer a name resolved from the repository: no resolution ambiguity, so they can be pinned here without the repository having to know them. |
| **nowhere** — `angular-eslint`, `eslint-config-next`, `eslint-plugin-react-hooks`, `eslint-config-expo`, `@react-native/eslint-config` | Their version must track the **framework major installed in the repository**. Lodging them here would force all seven to upgrade together. |
| **neither** — `vitest` | The entry point exports a bare object. Importing `vitest/config` would impose one version on all seven and break the two Angular repositories. |

**A package that declares a peer must also pin it in its own `devDependencies`.** Without that, pnpm
auto-installs a peer for this workspace package and picks the **lowest** member of the range — which
is how `eslint@9.39.5` ended up here while the repository root had `10.11.0`. Two copies, both
working, differently, and nothing red.

```bash
pnpm why eslint typescript prettier   # expected: one resolved version each
pnpm why -P @arthome/tooling          # expected: no dependency (never in production)
pnpm exec arthome-check-versions      # reads the pnpm store and fails on a duplicate
```

---

## Bumping this package

A configuration package is not versioned like a library:

| Change | Version |
|---|---|
| **turning a rule on**, hardening `warn` → `error`, bumping a plugin by a major | **MAJOR** |
| adding a rule as `warn`, adding an export entry | minor |
| fixing a file pattern, a comment | patch |

**Turning a rule on is a breaking change**: otherwise one `pnpm update` turns seven repositories red
the same day. Every new rule arrives as `warn` in minor `N`, then becomes `error` in major `N+1`,
once all seven are at zero. One repository in transit at a time, in this order:
`arthome-core` → `arthome-platform` → `storefront-web` → `studio-web` → `studio-mobile` →
`storefront-mobile` → `storefront-tv`.

`arthome-core` consumes the workspace version: a major that breaks something breaks it **at the
publisher first**, before it is ever published.

**And a bump pins a version that is already mature, never the day's** — see code-conventions.md
section 7.6. Pinning the day's latest guarantees `minimumReleaseAge` will refuse it, which is exactly
what happened at this repository's first install.

## Carrying the rules into a consuming repository

Every repository but this one has to follow `critical-rules.md` and `code-conventions.md`, and none
of them can read `architecture/` — it is in another repository. So this package ships them and
copies them in on install.

A third one travels with them, answering a different question. The rules say *how* to write; the
map says **what already exists and what it is for** — which helper, which contract, which
subpath. The day the contracts were written, ten modules independently wrote the same `instant()`
and four wrote the same local-vocabulary helper, because nothing told their authors those already
existed. `available-surface.md` is that telling: 543 names under 16 subpaths, in 128 lines.

Two lines in the consuming repository:

```jsonc
// package.json
"scripts": { "postinstall": "arthome-sync-agent-docs" }
```

```markdown
<!-- AGENTS.md -->
The project's rules are in `docs/arthome/`, copied from `@arthome/tooling` on install:

- `docs/arthome/critical-rules.md` — nineteen lines, re-read every session
- `docs/arthome/code-conventions.md` — how the code is written, and why
- `docs/arthome/available-surface.md` — what `@arthome/core` and `@arthome/contracts` already
  export, and what each subpath is for. **Read it before writing a helper.**
```

**The copy is COMMITTED, and that is what makes it trustworthy.** An install rewrites it, so a stale
one shows up in `git status` the first time anybody installs after a pull. *The freshness check is
the diff, and the diff already exists* — which is why there is no gate here and no generator.

**Two are collected, one is generated.** `available-surface.md` is derived from
`REPOSITORY_MAP.md` on every build, never committed at the source. That is not tidiness: the long
map already has a freshness gate (`check:map`), so a short map regenerated from it *cannot be
staler than something already guarded*. Committing it would have added a third thing to remember,
and this project's dominant fault class is exactly that — the parallel table that drifts.

**Why only those three.** The ADRs, the context map and the data model stay in arthome-core behind
a link. They are reference rather than rules, they are large, and five copies of them is the
parallel table this project spends its gates preventing.

**Packing builds, and the hook refuses an empty package.** `docs/` is build output, and `pnpm pack`
does not build — so the first tarball ever produced here carried `bin/` and no documents at all,
and the hook reported success over it. Two changes closed that: `prepack` makes building part of
packing, so a tarball cannot lack the documents; and the hook now **exits 1** when it finds none,
because a postinstall warning scrolls past inside pnpm's output and a repository would come up with
no rules while nothing anywhere failed. Being allowed to stop an install is the entire reason this
is a hook and not a line in a README.

⚠ **It overwrites.** A local edit at the destination is lost at the next install rather than
reported — which is the point of a projection, and worth knowing before someone fixes a typo there.
