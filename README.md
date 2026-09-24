# arthome-core

**The domain, the contracts and the reasoning for Arthome** — a platform for ticketed live
performance: seats, live streaming, moderated chat, replays, merchandise, artist payouts.

This repository holds what the other six must agree on. It publishes three packages, carries the two
API contracts every surface reads, and records why each irreversible decision was taken the way it
was.

> **Status: the foundation is built, the applications are not.** The domain, the contracts, the
> tooling and ten gates exist and are verified. **Every schema in both contracts is generated from a
> zod source and checked against the document it publishes.** No application code has been written
> yet. What is
> here is the part that is expensive to change later.

---

## Where things are

| Directory | What lives there | Authored by |
|---|---|---|
| `packages/core/` | `@arthome/core` — the domain. **Zero framework dependencies.** Two entry points: `.` has no dependency at all, `./schema` is the only one that may import zod | the domain |
| `packages/contracts/` | `@arthome/contracts` — the boundary schemas, which **extend** core's base schemas rather than redeclaring them | the contracts |
| `packages/tooling/` | `@arthome/tooling` — ESLint, Prettier, TypeScript and Vitest configuration shared by all seven repositories, plus five of the gates |
| `openapi/` | The two API contracts — one per product. **Hand-written and reviewed as prose**; `components/schemas` is being moved to generation from zod | the contracts |
| `proto/` | Kafka event schemas. 109 types, **zero `service` declarations** — Protobuf serves the event log, never a synchronous call | the domain |
| `architecture/` | 15 documents, ~11,600 lines: the context map, the data model, the ADRs, the conventions, and the sceptic's adversarial review | the whole team |
| `needs/` | What each of the five surfaces asked the contract for, and what it contested when it got the answer. One file per surface, each its sole author | the surfaces |
| `docs/` | The design handoff as corrected — the brief this project started from | imported |
| `prototypes/` | The five design mockups, byte-identical to their source, plus 175 screen extractions | the designer |
| `tools/` | The gates that are specific to this repository, as opposed to the seven-repository ones in `@arthome/tooling` |

**A note on `prototypes/`**: those five files are a **verbatim copy** of a read-only source and are
verified identical with `cmp`. Their French is the product's own interface copy, not untranslated
text. Everything else in this repository is written in English, and a gate enforces it.

---

## What to read first

**[`DECISIONS.md`](DECISIONS.md) — 65 arbitrations, each with its reason.** This is the document to
open if you want to know *why* rather than *what*. It is also the honest one: several entries are
corrections of earlier entries, and a few record a decision that turned out to be wrong and says so.

> *Almost every rule in it is a mistake with its evidence attached rather than a principle.*

Then, depending on what you are doing:

- **the shape of the system** → `architecture/context-map.md`
- **what a service may assume** → `architecture/critical-rules.md`, deliberately under twenty lines
- **how the code is written and why** → `architecture/code-conventions.md`
- **what was found wrong and never fixed** → `architecture/skeptic.md`, an adversarial review kept
  verbatim with its outcomes appended rather than folded in

---

## The two contracts

| | paths | schemas |
|---|---|---|
| `openapi/storefront.yaml` | 75 | 65 — **all sourced** |
| `openapi/studio.yaml` | 79 | 46 — **all sourced** |

Two products, two contracts, one domain. The storefront is what a viewer sees; the studio is what an
artist and their crew operate. They share `@arthome/core`'s vocabulary and nothing else.

---

## Running the checks

```bash
pnpm install
pnpm run verify           # everything: the gates, types, lint, format, tests
pnpm run verify:offline   # the subset that needs no install — it prints what it did not run
pnpm run fix              # prettier, eslint, prettier — in that order, and the order matters
```

**Ten gates, and each says what it looked at — including where it stops looking.** They check that
no enumeration value is copied, that the domain and the contracts share one vocabulary, that the `.`
entry point reaches neither zod nor a Node API, that every version is pinned, that ESLint and
Prettier do not overlap, that the two contracts conform to twenty rules, that everything committed
is written in English, that the repository map still matches the installed declarations, and that
**every schema emits exactly what the contract publishes.**

That last one compares trees rather than text and prints every equivalence it grants, because an
equivalence nobody can see is an exemption nobody audits. It found fourteen disagreements on its
first run, out of fourteen schemas that then had a source — nothing had been agreeing, and no gate
had ever compared the two artefacts. **All 111 agree now**, and `verify` refuses a commit where one
of them stops.

**A gate here reports; it never fixes.** A gate that fixes cannot fail honestly — it either reports
a defect it has already removed, or it fails on a tree that was correct before it touched it.

---

## Conventions that will surprise you

Each of these exists because something went wrong without it. The reason is in `DECISIONS.md` under
the entry named.

- **A value displayed twice comes from `@arthome/core`.** Two *calls* are allowed; two
  *implementations* never. Three silent equality failures this week came from breaking it.
- **Dates travel as ISO 8601 UTC strings**, because `z.date()` is inconvertible to JSON Schema.
  Inside a JWT, `exp`/`iat`/`nbf` stay numeric seconds — that is RFC 7519 and not a mistake.
- **Amounts are integer minor units plus a currency code**, and **a price is tax-inclusive** and says
  so where it is declared. A reader on the wrong side of a rate is wrong by exactly that rate.
- **An unknown enum value is kept raw and treated as neutral**, never rejected. Strictness belongs to
  a shape's required fields, never to its extensibility.
- **No synchronous call between services.** A BFF calls a service; a service speaks to Kafka.

---

## Repository map

**[`REPOSITORY_MAP.md`](REPOSITORY_MAP.md)** is the map: what each directory is for, and every name
`@arthome/core` and `@arthome/contracts` export, organised by the import specifier under which it is
reachable. It is **generated** from the packages' published declarations (through their `exports` maps)
and **committed**, so it can be read without running anything.

Do not edit it. `pnpm run check:map` fails when it differs from what regenerating would produce, and
exits 3 — not 0 — when it could not compare (a package not installed, declarations not built).
Regenerate with `pnpm exec arthome-generate-map`. The one hand-written input is
[`repo-map.purposes.json`](repo-map.purposes.json): the purpose of each directory.

*A generated map is a projection with a checker; a written one is a claim with nobody behind it.*
The checker's reach stops where the declarations do: it proves the map matches the published
`.d.ts`, never the runtime, and for the 41 directory purposes it proves only that every directory
has an entry and every entry has a directory. **It cannot tell you a purpose is true.**

A consuming repository runs the same two bins against its own `node_modules`, so its map describes the
version of `@arthome/*` actually installed there. `check:map` is not in `verify` yet.

---

## Licence

Not yet chosen. The repository is public so the work can be read.
