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

1. Edit the route in its module, through the group's builder (`pairingWrites.defineRoute({ ... })`:
   method, path, parameters, body, responses, prose and `x-arthome-*` metadata), built from the schemas
   of the subpaths above. A new operation is also listed under `routes` in the api's `index.ts`.
2. Regenerate: `pnpm run generate:openapi`. It builds the packages, then writes both documents.
3. Commit the declaration **and** both documents. `pnpm run check:openapi-generated`, which `verify`
   runs, fails when a committed document is not byte for byte what the declarations generate, paths,
   components and top-level keys included.

Never edit a document by hand: the next generation overwrites it, and the gate refuses it before.
Prose that belongs to the operation stays in the declaration, as `description` where the document
should say it and as a TypeScript comment where only the maintainers need it.

### The route builder

A group of routes shares its version, tag, common headers and often its errors and security. A
builder holds them once, and is **immutable**: every call returns a new builder, so a base derives
without touching the others, and the generic types accumulate what was set, so a route's parameters,
query, headers, body and responses stay fully inferred for the server binding and the typed client.

```ts
export const storefrontV1 = routeBuilder().version(1);

const pairingRoutes = storefrontV1
  .tags(StorefrontTag.PAIRING)
  .headers(SurfaceParameter, TraceparentParameter);
const pairingWrites = pairingRoutes.headers(IdempotencyKeyParameter);

export const createPairing: Route<{ method: 'post'; version: 1; path: '/pairings'; /* ... */ }> =
  pairingWrites.defineRoute({ method: 'post', path: '/pairings', operationId: 'createPairing', /* ... */ });
```

| Call | Sets | A route can override it |
|---|---|---|
| `.version(n)` | the API version, required before `defineRoute` | no |
| `.tags(...)` | the operation's tags | yes, with its own `tags` |
| `.headers(...)` | header parameters, appended **after** the route's own `parameters` | no |
| `.errors({ 400: ... })` | responses every route of the group answers | yes, a status the route writes wins |
| `.security(...)` | the security requirements | yes, with its own `security` |

The explicit annotation on each exported route (`isolatedDeclarations` demands one) spells the
merged type in full: the route's own parameters, then the builder's headers. A builder that
disagrees with it is a compile error. A route that shares nothing with its group still goes
through the group's builder, and says what is its own. The plain `defineRoute` from `./http` stays
the primitive the builder calls, and takes `version` itself.

The order of an operation's `parameters` has no meaning: OpenAPI identifies a parameter by name and
location, the typed client takes named parameters, no positional-SDK generator consumes these
documents, and no client has shipped (`transport.md` §5.11). The product owner accepted on that
ground that the semantic comparison treats the list as a set, so the builder's headers come
last in the document; the same goes for the keys of an operation, which the emitter writes in
a fixed order (identity, prose, `x-*`, `security`, `parameters`, `requestBody`, `responses`).

### Who may call: identity and rules

A surface declares its identified state once (`identity('viewer', { schemes, principal, errors })`
in its `components.ts`), and a builder opts in:

```ts
const me = storefrontV1.identity(viewer).tags(StorefrontTag.ACCOUNT).headers(SurfaceParameter, TraceparentParameter);
storefrontV1.public()          // no identity: sign-in, public links
storefrontV1.identity(viewer).optionalAuth()   // anonymous allowed, the principal may be null
studioV1.identity(operator).requires(roles(MemberRole.PRODUCTION).on('channelId'), recentAuth())
```

- **The route's `security` is derived** from its identity and its method (a write by cookie adds
  the CSRF token), so a route that also writes `security` by hand is refused when the module loads.
- **`requires(rule)`** takes rules in the order the server applies them after the identity. A rule is
  a declaration, a name with its parameters and its errors: `roles(...)` (with `.on('channelId')` for
  the path parameter it reads), `recentAuth()` (the proof is the body field `reauthToken`),
  `throttle('auth')`, or `requirement(name, { params, errors })`. The contract holds no server code:
  the server maps each name to a guard, and a name with no guard fails at boot. The rules are
  documented as `x-arthome-requires`.
- **The identity may add parameters and headers** to every route or to a write only (the studio's
  `If-Rights-Version`, its `X-Arthome-Rights-Version` on every success), and an `internal` identity
  (a service's) marks its routes internal: `defineApi` keeps them out of a surface document.
- **The route carries what the server needs**, runtime-readable: `access` (the identity, optional or
  not), `requires`, `budgetMs`, `cache`, `bodyLimit`, `paging`, `sortable`, `expand`, `degradable`,
  `owner`, `internal`. `sensitive(schema)` and `restricted(schema, right)` mark fields, and
  `sensitivePathsOf` and `restrictedFieldsOf` say where.

**What is derived.** Only a builder that declares an identity (or `.public()`) derives, so a route
still on a bare builder is unchanged. Nothing the server can answer is undocumented:

| The route declares | Added |
|---|---|
| a path or query parameter, or a body | `400 api.schema_invalid` |
| a body | `413 api.payload_too_large`, `415 api.unsupported_media_type`, and a `bodyLimit` (1 MiB; 2 MiB on a batch) |
| an `Idempotency-Key` | `409` with the two idempotency codes, and the `Idempotency-Replayed` header on its successes |
| an identity | `401`, the identity's codes, and on a write its write codes (the CSRF `403`, a stale rights version) |
| a rule | the rule's codes (`403 api.reauthentication_required`, `429 api.rate_limited`) |
| the surface | `500 api.internal`; on a BFF `502 api.upstream_unavailable`, `504 api.upstream_timeout` and `api.deadline_exceeded` |
| a `cache` with an `etag` | `If-None-Match`, `ETag` and the `304` |
| a response that carries a `sensitive` field | `Cache-Control` on it |

A response the group or the route writes whole is kept over the derived one. The derived errors are
**not** in the route's annotation: the annotation lists the route's own statuses, and the server and
the typed client read `route.responses` at run time.

### Resources

A route that follows the conventions is declared through its resource rather than spelled whole.
`builder.resource(name, { id, owner? }, closure?)` needs the api's conventions (`.conventions(...)`:
the envelope of a record and of a page, the paging it serves, the idempotency key, the type of
`expectedVersion`) and exposes each operation individually; `single(name, { owner? })` is the same
for what exists once in its context (`/me/preferences`, a date's `run`), with no id in its URL:

| Member | Operation | Derived `operationId` |
|---|---|---|
| `find` | `GET /{res}/{id}`; `ETag` only when its `cache` says so | `findX` |
| `findAll` | `GET /{res}`, paged, with `sortable`, `filters` | `findAllXs` |
| `create` | `POST /{res}`, `Idempotency-Key` (`idempotent: false` leaves it off) | `createX` |
| `update` | `PATCH`, partial, `expectedVersion` | `updateX` |
| `replace` | `PUT`, complete, idempotent, `expectedVersion` | `replaceX` |
| `delete` | `DELETE`; 204, or 200 with `response`; `expectedVersion` in the query | `deleteX` |
| `upsert` | `PUT` on an id the client chose | `upsertX` |
| `action(name, ...)` | `/{res}/{id}/{name}` (`/{name}/{action}` on a single), `POST` unless said | `{name}X` |
| `collectionAction(name, ...)` | `/{res}/{name}` | `{name}Xs` |
| `batch({ item })` | `POST /{res}/batch`: many by id, a table keyed by id | `batchXs` |
| `subresource(name).replace()` | `PUT /{res}/{id}/{name}` | `replaceX{Name}` |

- **`owner: 'caller'`**: only the caller writes this data, so there is no `expectedVersion` and no
  `state.conflict`, the route says `owner`, and another caller's id is a `404`, never a `403`.
- **A shared record's item carries `version`**: a write that takes `expectedVersion` refuses, at
  compile time, an item without it (unless the route states its `responses` itself).
- **Nesting**: a resource's closure, or `resource.resource(...)`, `.single(...)`, `.path(...)`,
  declares what sits under one record; `path('channels/{channelId}', ChannelIdParameter)` declares a
  prefix and its parameters once, and the compiler checks every `{placeholder}` has its parameter.
- **`crud({ item, create, update, ... })`** composes `find`, `findAll`, `create`, `update` and
  `delete` (on a single, `find` and `update`) and returns its routes **keyed by operation id**, so
  the record spreads into a closure; `replace` and `upsert` join it when their options are given;
  `omit` or `pick` narrows it, never both. `collect(...blocks)` flattens such records into the
  `routes` record `defineApi` takes, and a test checks that every route a module exports is listed.
- **A fixed `operationId` always wins** over the derived one: say it in the member's options, which
  also carry what the document says beyond the convention: prose, `x-arthome-*`, `parameters`,
  `responses` (a stated 2xx replaces the generated one), `example` and `optionalBody`, `errors`,
  `cache`, `requires`.

Which verb a change takes is `transport.md` §5.12: a full replacement is `PUT`, a partial change
without a business rule is `PATCH`, every business state change is an action, and a record that
disappears is a `DELETE` even when guarded.

**Errors** are declared by code in three levels (`transport.md` §5.12). A status whose codes the api
already documents keeps its shared response; a status that adds a code gets a `oneOf` of one envelope
per code, each with the `params` schema of `ERROR_PARAMS` in `@arthome/core/schema`, which is what
`check-openapi` R10 accepts. A storefront operation may declare only a code of
`STOREFRONT_RELAYED_CODES`. Each code has one status, `ERROR_STATUS` (and `statusOf(code)`) in `./http`, which a test holds the generated documents to; `ErrorParamsMap` in `@arthome/core` types each code's params.

### Reads and responses

- **Paging** is data on the route: `paging: cursor({ maxLimit })`, `pages({ maxPageSize })` or
  `changesSince()`. The api's conventions say which parameters and which page envelope each kind has,
  and which is the default (cursor on the storefront, pages on the studio).
- **`sortable: ['startsAt', { key: 'revenue', right: 'canRevenue' }]`** types `sortBy` from the keys,
  and a restricted key adds `403 api.sort_key_forbidden`. **`filters`** takes an object schema.
- **`expand: { author: AuthorSchema }`** adds the `include` parameter, makes each relation optional and
  marks it `x-arthome-expanded-by`; the typed client narrows on `include` (a relation is in the type
  only when it was asked for).
- **`cache(Freshness.FIVE_MINUTES, { etag, scope, vary })`** is the freshness family of
  `transport.md` §5.9. `budgetMs`, `bodyLimit` and `degradable` are the other values the server reads.
- **`tagged('outcome', { succeeded, declined })`** is a strict union for the server, a `oneOf` with its
  `discriminator` and its mapping for the document, and `parseTolerant` for a client that keeps a
  variant it does not know. **`accepted({ operation })`** is a `202` that names the operation to follow.
- **`restricted(schema, right)`** is a field only some callers see: optional in the type and the
  document, absent from the answer otherwise.

### What a handler implements

`HandlerInput<R>` (a type alias, so a hover shows `{ params, query, headers, body, principal }`
resolved), `HandlerOutput<R>`, `RoutePrincipal<R>` and `Endpoints<Block>` (one method per operation
id) are derived from the declaration: a route declared and not implemented, and a wrong return, are
compile errors that name the operation. Measured on the 32 routes under a date, `Endpoints<>` costs
0.2% of the type instantiations, and the published `.d.ts` compiles clean under TypeScript 7.

- **A handler returns the data**, not the envelope: `HandlerOutput` is the declared body without the
  meta the server stamps (`servedAt`, `rightsVersion`); `validUntil` stays the handler's on a
  perishable route. One success status gives the body, several give `{ status, body }`.
- **Strict on emit.** The response schemas are loose objects so a client reads tolerantly, but
  `HandlerOutput` has no index signature, so an undeclared field is a compile error, and
  `strippingBodiesOf(route)` gives the schema of each success response with every loose object turned
  into one that strips what it does not declare, for the platform's serializer. A schema annotated
  only as `z.ZodObject<z.ZodRawShape, ...>` has no known fields: the handler's type is then `{}`.
- **The `service` identity** (`./http`, the internal token: the calling service and the end user) marks
  its routes internal, takes `x-arthome-deadline` on every call and answers `504 api.deadline_exceeded`.
- **How a consumer reads the error codes at run time.** `route.errorCodes[status]` (or
  `errorCodesOf(route, status)`) lists the codes a status stands for, including the shared standard
  responses; a status the route wrote whole has none listed. `DERIVED_ERROR_CODES` lists the derived
  statuses and their codes.
- **The typed client types the derived errors**: `ClientResponse<R>` is the route's declared statuses
  plus 400, 401, 403, 413, 415, 429, 500, 502 and 504 (those not declared by the route), each an
  `ErrorBody` of the api's codes. The full derived set is added rather than the subset a route
  implies, so a surface switches on a `401` or a `429` with types on any route, and the cost is one
  union per call. A status that is neither declared nor derived throws `UndeclaredStatusError`.
- **Deny by default is a ratchet**: `deny-by-default.spec.ts` lists the routes not yet declared through
  an identity or `.public()`; the list only shrinks, and the fan-out ends with it empty.

### Converting a route

1. Put the route under its scope: `studioV1.identity(operator).tags(...).headers(...).errors(...)`,
   then `.resource('dates', { id })`, `.single('prices')`, `.path('panes')`.
2. Replace `builder.defineRoute({ method, path, ... })` by the member (`date.single('prices').replace({
   ... })`), drop the parameters the scope and the convention now add, drop `security`, and turn
   `requestBody` into `body` and `example`.
3. Keep the route's `Route<{ ... }>` annotation, and run
   `node tools/sync-route-annotations.mjs <module.ts>`: it rewrites the four members a conversion
   changes (`method`, `path`, `parameters`, `access`), drops a status the route no longer answers, and
   adds the imports; `--check` fails when one is out of line. Then `pnpm run fix`.
4. `pnpm run generate:openapi`, and read what moved. The documents grow by the derived errors and the
   derived security, and are allowed to until the first client ships (`transport.md` §5.11).

```ts
const date = publicationRoutes.resource('dates', { id: DateIdParameter });

export const setDateReplayPolicy: Route<{ /* the annotation, synced */ }> = date
  .single('replay-policy')
  .replace({ operationId: 'setDateReplayPolicy', body: SetReplayPolicyBody, item: PublicationSchema });
```

### Versions

The API version is a property of the route, never of its path: `version: 1` and `path:
'/dates/{dateId}'`. The emitter composes the published path from one strategy, the URI one:
`/v{version}{path}`, and `versionedPath(route)` gives the same string to a server binding and the
client. A breaking change is a **second declaration** with `version: 2`, served beside v1
(`transport.md` §5.11):

- its `operationId` is the v1 name suffixed `V2` (`getDateDetailV2`), because the document's operation
  ids and the client's method names are unique across versions; version 1 keeps the bare name;
- `defineRoute` refuses an id that does not follow the rule, and `defineApi` refuses two routes with
  the same method and published path;
- the v2 route lives beside the v1 one, in the same module, and both are listed under `routes`.

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
