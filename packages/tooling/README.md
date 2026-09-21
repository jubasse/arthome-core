# `@arthome/tooling`

The base configuration that the **seven Arthome repositories** extend: ESLint, Prettier, TypeScript,
Vitest — and the four gates that check they have not drifted apart.

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

Plus four executables: `arthome-check-enums`, `arthome-check-versions`, `arthome-check-tsconfig`
and `arthome-check-prettier-conflict`.

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

## The four gates

All in **pure Node, zero dependencies**: they run before `pnpm install` and without a remote runner —
the account's Actions quota is exhausted.

```bash
pnpm exec arthome-check-prettier-conflict  # the ESLint/Prettier overlap is empty
pnpm exec arthome-check-enums              # no enumeration value copied (E2)
pnpm exec arthome-check-versions           # the seven repositories have not drifted
pnpm exec arthome-check-tsconfig           # the locks have not been loosened
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
