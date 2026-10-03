# `@arthome/contracts`

The boundary schemas the two BFFs serve and accept — **derived from `@arthome/core`, never
redeclared**.

> Conventions, gates and the reasoning behind them:
> [`architecture/code-conventions.md`](../../architecture/code-conventions.md). Where this README and
> that document disagree, the document is right and this package has a defect.

---

## The one rule this package exists to hold

**Extend; do not redeclare.** Every schema here is built from a `@arthome/core/schema` base with
`.extend()`, `.pick()`, `.omit()` — never written out again.

```ts
// right: the boundary shape is the domain shape, plus what the boundary adds
export const SeatDto = SeatSchema.pick({ id: true, row: true }).extend({ href: z.string() });

// wrong: a second declaration of a shape the domain already owns
export const SeatDto = z.object({ id: z.string(), row: z.number() });
```

Redeclaring `MoneyOut` would be E2 on **the most manipulated value in the system** — and E2 is this
project's dominant failure mode, committed on eight fields by five mockups despite an explicit
principle forbidding it. The two copies would agree on the day they were written and diverge on the
first rounding change.

## No `.` entry point, deliberately

`import { X } from '@arthome/contracts'` **fails to resolve**, and that is the barrel rule made
structural rather than written down.

D-012 measured it: zod's classic entry made 64 translation files reachable — **93 KB gzip against
7.5 KB** — at a cost that is *fixed and tied to the import*, not marginal and tied to the number of
schemas. **With tree shaking off, `zod/mini` measures 85 KB**, which is the classic entry's level:
the saving is not smaller there, it is nothing, and the two headline numbers must never be quoted
without that third one. What the rule below rests on is the cost being *fixed*, which holds either
way. A barrel defeats tree-shaking on any bundler without cross-module analysis, which includes
Metro by default. A rule against barrels is a rule someone breaks in a hurry; a missing export is a
resolution failure.

So: **one subpath per bounded context**, added as each lands and never before.

| Subpath | Status |
|---|---|
| `./envelope` | the response envelope and both products' `Error` — 6 |
| `./money` | the tax-basis TYPES. No schema: `MoneyOut` and `MoneyIn` belong to `@arthome/core` |
| `./text` | authored text with the language it was written in — 2 |
| `./pagination` | the cursor page and the offset page, which are deliberately different — 3 |
| `./entitlement` | the right to watch — 1. It exists to sit BELOW `catalog` and `streaming`, which both need it |
| `./catalog` | dates, artists, shows, categories, media, merchandise, prices — 22 |
| `./ticketing` | carts, quotes, orders, tickets, plans — 11 |
| `./streaming` | playback tickets, renewals, live sessions — 4 |
| `./identity` | sessions, devices, pairing, consents, the viewer's context — 13 |
| `./engagement` | chat, reactions, notifications, the change feed — 5 |
| `./studio-access` | the actor, their rights, the bootstrap a control room is handed — 11 |
| `./studio-stage` | operating a date: its sheet, its run console, its health, its uploads — 13 |
| `./studio-desk` | moderation, the audience, the inbox, the journal — 5 |
| `./studio-money` | payouts, bank changes, statistics, the dashboard — 10 |
| `./http` | `defineRoute` and `defineApi`: an operation as TypeScript, typed for a handler and a client — no schema |
| `./http-client` | `createClient(api, { baseUrl, fetch, headers })`: one typed method per operation id — no schema |
| `./openapi` | the OpenAPI document an api emits, `components/schemas` included — no schema |
| `./storefront-api` | `storefrontApi`: every operation of the storefront contract, declared once, and the source of `openapi/storefront.yaml` |
| `./studio-api` | `studioApi`: the same for the studio, and the source of `openapi/studio.yaml` |

**Fourteen subpaths of schemas, 106 schemas, and together with `@arthome/core` they are all 111 schemas of both
contracts.** The documents are generated from them (next section), and `pnpm run check:openapi-generated`
is part of `pnpm run verify`.

## Adding or changing an operation

Every operation of both contracts is declared once, in `src/storefront-api/` or `src/studio-api/`:
one module per tag (`discovery.ts`, `payouts.ts`), the shared parameters, headers and responses in
`components.ts`, and the api itself, with the document's prose and its component names, in `index.ts`.
`openapi/storefront.yaml` and `openapi/studio.yaml` are **generated** from those declarations (D-120),
and committed for readers and tools.

1. Edit the route in its module (`defineRoute`: method, path, parameters, body, responses, prose and
   `x-arthome-*` metadata), built from the schemas of the subpaths above. A new operation is also
   listed under `routes` in the api's `index.ts`.
2. Regenerate: `pnpm run generate:openapi`. It builds the packages, then writes both documents.
3. Commit the declaration **and** both documents. `pnpm run check:openapi-generated`, which `verify`
   runs, fails when a committed document is not byte for byte what the declarations generate, paths,
   components and top-level keys included.

Never edit a document by hand: the next generation overwrites it, and the gate refuses it before.
Prose that belongs to the operation stays in the declaration, as `description` where the document
should say it and as a TypeScript comment where only the maintainers need it.

A BFF controller binds to its route (`@Endpoint(storefrontApi.routes.search)` in `arthome-platform`),
and a surface calls it through `createClient(storefrontApi, ...)` from `./http-client`. Both read the
same declaration, so a change of path, parameter or answer is a compile error on every side.

**THE IMPORT GRAPH IS A DAG, AND IT IS NOT AN ACCIDENT.** A zod schema is built at MODULE LOAD, so
a cycle between two modules is a load-order hazard: it holds until a declaration moves, then fails
with an error naming a symbol unrelated to whatever was just edited. Two of them formed while these
modules were being written, and both were broken by moving a shape rather than by `z.lazy` — which
emits an identical schema and defers the cost to whoever moves a declaration next. **There is no
`z.lazy` in this package.**

```
entitlement  <-  catalog  <-  ticketing, streaming, identity
studio-access  <-  studio-desk, studio-money, studio-stage
```

*`./chat`, `./payouts` and `./notifications` were in this list as plans and never existed.* What
the domain calls chat and notifications is served to a viewer, so it is in `./engagement`; payouts
are operated, so they are in `./studio-money`. The list is a record of what exists, which is what
the paragraph below promises and what it had stopped being.

A subpath in `exports` pointing at a file that does not exist is unreachable with a laconic error; a
subpath missing from `exports` is unreachable too. Both are silent, so the list stays a record of what
exists rather than a plan.

## `./money` — the tax basis, and what a brand cannot do

D-056 settles that **a price field is tax-inclusive**. `@arthome/core`'s `Money` is
`{ amountMinor, currencyCode }` with no tax semantics — correct for the domain, insufficient at the
boundary, because two amounts of the *same shape* then mean different things according to which field
they sit in. A reader who takes a price for a bare amount is wrong by a VAT rate.

`Taxed<T, B>` makes that a compile error:

```ts
declare const price: TaxInclusive<Money>;
wantsNetAmount(price);   // TS2345: 'inclusive' is not assignable to 'exclusive'
```

**And a brand is necessary but not sufficient.** It is erased at runtime and absent from the payload,
so it reaches TypeScript consumers only — not a generated client in another language, not a webhook
recipient, not a partner reading the OpenAPI document. *A guarantee is only as wide as its mechanism*,
and a brand's mechanism is the compiler. The wire representation must carry the basis **in the data**;
what that looks like is a contract decision and belongs to `backend-contracts`.

## Dependencies: both peers, exactly pinned

The test is §4.2's — *does the consuming repository name this package itself?* — and then regime A's:
*if two copies exist at once, does something break at runtime, hard to diagnose?*

| | Why a peer |
|---|---|
| `zod` | Two copies is two schema registries and unintelligible validation errors. Regime A. |
| `@arthome/core` | **Easy to miss.** Two copies means two sets of `as const` vocabulary constants, so `mode === ChatMode.OPEN` is false against the other copy's constant — the silent equality failure of D-033 and D-038, arriving through the dependency graph instead of through a spelling. |

Both are also pinned in `devDependencies`, which is not redundant: a package that declares a peer
without pinning it for itself gets an auto-installed peer at the **lowest** member of the range. That
is how `@arthome/tooling` came to resolve eslint 9.39.5 while the root had 10.11.0 — two copies, both
working, differently, nothing red.

## Gates

This package **inherits** the seven-repository gates rather than carrying its own: it is a consumer of
`@arthome/tooling` like any other, and `check-versions`, `check-tsconfig`, `check-prettier-conflict`,
`check-language` and `check-enums` all apply to it unchanged.

The **generated-document gate** — `tools/generate-openapi.py --check`, run as
`pnpm run check:openapi-generated` — is a **one-repository** rule and therefore lives in `tools/`, not
in the shared package: only `arthome-core` holds both the declarations and the documents they generate.
Same test that kept `check-vocabulary.py` in `tools/` and moved `check-language` into the package.

```bash
pnpm --filter "@arthome/contracts" run build       # tsc -p tsconfig.build.json
pnpm --filter "@arthome/contracts" run typecheck
pnpm run verify                                    # the whole chain, from the root
```
