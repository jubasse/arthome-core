# `@arthome/core`

The Arthome domain. **Zero framework dependencies**: no React, no Angular, no Nest, no browser
API, nothing Node-specific. The package runs under Node, Next, **Metro** and Angular.

> The full plan is in `architecture/core-port-plan.md`. This file says how to use the package
> and what must not be done to it.

---

## Two entry points, and that is the structuring decision

```ts
import { displayStateOf, roundMinor, PlanOpening } from '@arthome/core';        // the rules
import { MoneySchema } from '@arthome/core/schema';                            // the schemas
```

| Entry point | Contents | Dependency |
|---|---|---|
| `.` | the rules, the vocabularies, time, money | **none** |
| `./schema` | the base zod schemas, which `@arthome/contracts` extends | `zod` (peer, **optional**) |

**The `.` entry point imports zod at no depth**, and `tools/check-core-entry.mjs` verifies it on
every run of `verify`. The reason is measured (D-012): zod's cost is **fixed and tied to the
import** — 93 KB compressed for a single `z.string()` through the classic entry point. One
`import { z }` slipped in at the bottom of a rules module would hand the whole bill to the TV and
to mobile **with nothing to flag it**: the code compiles, the tests pass, the bundle grows.

A surface that needs only the rules does not install zod.

---

## Three writing rules, and they are not negotiable

### 1. No global state

`shared/helpers.js` carries three mutable states — `locale`, `viewerCountry`, an implicit clock —
plus a global index over the fixture set. Convenient in one file loaded by a mockup. **In a
package imported by seven services it is a defect**: two concurrent requests of one NestJS
service would share the same language and the same country.

> Every function receives its context as an argument. The clock is a **port** (`Clock`), never a
> `Date.now()` at the bottom of a rule.

A test that passes at 23:59 and fails at 00:01 has found a forgotten `Date.now()`.

### 2. Never a string literal from a vocabulary

The closed vocabularies are declared in `src/vocabulary/`, once. The rules import the **named
members**:

```ts
import { DateOutcome } from '@arthome/core';

if (outcome === DateOutcome.CANCELLED) { … }   // ✓
if (outcome === 'cancelled') { … }              // ✗ arthome-check-enums fails
```

E2 — the parallel literal table — is the project's dominant fault: committed on eight fields by
five mockups, **despite an explicit principle forbidding it**. The lesson is that a principle is
not enough; you need a gate. It has been active since this package existed.

### 3. The public surface is annotated

`isolatedDeclarations` is on: every exported function annotates its return type, and no anonymous
type is exported. A happy constraint — a named type can be quoted in a review, an anonymous one
gets copied.

---

## What is written

| Module | State |
|---|---|
| `kernel` · `vocabulary` · `money` · `time` | **wave 1 — written** |
| `taxonomy` · `media` · `format` · `i18n` | **wave 2 — written** |
| `catalog` · `replay` · `permissions` | **wave 3 — written** |
| `ticketing` · `moderation` · `notification` · `search` | **wave 4 — written** |
| `entitlement` · `payout` | **wave 5 — written** (the most exposed, hence the last of the rules) |
| `schema` | wave 6 — the only one that adds zod |
| `fixtures` | **wave 7 — written** |

---

## Running the gates

Two of them read the **sources** and work with nothing installed:

```bash
node packages/tooling/bin/check-enums.mjs   # the anti-E2 gate
node tools/check-core-entry.mjs             # the two entry points
```

The rest (`typecheck`, `test`, `build`) waits for `pnpm install`.
