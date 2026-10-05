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
| `./openapi` | the OpenAPI document an api emits, `components/schemas` included, and the registries of its docs and examples — no schema |
| `./storefront-api` | `storefrontApi`: every operation of the storefront contract, declared once, and the source of `openapi/storefront.yaml` |
| `./studio-api` | `studioApi`: the same for the studio, and the source of `openapi/studio.yaml` |
| `./storefront-api/docs`, `./studio-api/docs` | **server only, never imported by a surface**: each api's introduction (`info`, `servers`, security schemes), its modules' docs and examples, and `storefrontDocsOf(route)` / `studioDocsOf(route)`, an operation's prose and doc-only `x-arthome-*`, for a server's own docs (Swagger). `check:contract-docs` proves no surface subpath reaches them |

**Fourteen subpaths of schemas, 106 schemas, and together with `@arthome/core` they are all 111 schemas of both
contracts.** The documents are generated from them (next section), and `pnpm run check:openapi-generated`
is part of `pnpm run verify`.

## Adding or changing an operation

Every operation of both contracts is declared once, in `src/storefront-api/` or `src/studio-api/`:
a module folder per URL block (`studio-api/dates/`, "Writing a module" below), the shared
parameters, headers and responses in `components.ts`, the api itself and its component names in
`index.ts`, and the document's introduction (`info`, `servers`, `tags`, the security schemes) in
`docs.ts`, which also gathers what each module documents (below).
`openapi/storefront.yaml` and `openapi/studio.yaml` are **generated** from those declarations (D-120),
and committed for readers and tools.

1. Edit the route in its module's `routes.ts`, through the block's builder, built from the schemas
   of the subpaths above; its prose goes in the module's `docs.ts`. A new operation is also listed
   under `routes` in the api's `index.ts`.
2. Regenerate: `pnpm run generate:openapi`. It builds the packages, then writes both documents.
3. Commit the declaration **and** both documents. `pnpm run check:openapi-generated`, which `verify`
   runs, fails when a committed document is not byte for byte what the declarations generate, paths,
   components and top-level keys included.

Never edit a document by hand: the next generation overwrites it, and the gate refuses it before.
What only the maintainers need is a TypeScript comment; what the document says goes in the module's
`docs.ts`.

### Docs and examples: registered beside the routes, never bundled

A surface imports an api to call it, and the operations' prose and examples are dead weight there.
What only the document reads is registered per module, beside the routes:

- `<module>/docs.ts`: `export const datesDocs: ModuleDocs = { publishDate: { description, upstream } }`,
  the operation's prose and the services it calls (`x-arthome-upstream`), owning service first. The
  one-line `summary` stays on the route.
- `<module>/examples.ts`: typed example constants (`const dateSheet: DateSheet = { ... }`) and
  `export const datesExamples: ModuleExamples = [[DateSheetSchema, [dateSheet]]]`.
- The api's `docs.ts` gathers them: `apiDocs({ info, servers, tags, securitySchemes, modules,
  examples })`. Only the emitter and the tests import it, and `pnpm run check:contract-docs` (in
  `verify`) fails when a subpath a surface imports reaches a docs or examples module, or `./openapi`.

`openApiDocumentOf(api, docs)` reads both:

- **The registry is the only source** of an operation's prose and doc-only `x-arthome-*`
  (`x-arthome-maturity`, `-upstream`, `-freshness`, `-idempotency-exemption`): the emitter,
  `storefrontDocsOf` and `studioDocsOf` refuse a route that carries its own.
- **The maturity is derived** from the upstream: the regime of the owning service, the first one the
  operation calls (`maturityOf`, `MATURITY_BY_SERVICE`, `transport.md` §5.11). A module states
  `maturity` only where an operation differs, always with its `maturityReason` in one phrase, and the
  emitter refuses one that repeats the derived value; an operation that calls no service
  (`realtime`) states it; `maturity.spec.ts` holds every operation to the rule.
- **A media type's example** is its schema's registered example, or else the one derived from the
  record it wraps: a resource member's answer shows its item's registered example in the api's
  envelope (`itemExample`, `pageExample`); a shared error response shows its code's example from
  `ERRORS`. The emitter refuses an example a route or a media type writes itself.
- **Every registered example parses with its schema** (ADR §9.6, `examples-parse.spec.ts`), and so
  does every example a schema writes in its `.meta`.

`pnpm run measure:surface-bundle` prints what a surface ships for `createClient(api)`, minified and
gzipped, part by part. Measured on 2026-10-05, before any module moved its docs: storefront 126.9 KB
gzip, studio 140.7 KB; with the two introductions moved out, 123.2 KB and 137.5 KB; with every
module's docs and examples registered beside its routes (11fa4af), 100.7 KB and 117.4 KB.

### The route builder

A group of routes shares its version, tag, common headers and often its errors and security. A
builder holds them once, and is **immutable**: every call returns a new builder, so a base derives
without touching the others, and the generic types accumulate what was set, so a route's parameters,
query, headers, body and responses stay fully inferred for the server binding and the typed client.

```ts
export const storefrontV1 = routeBuilder(storefrontErrors).version(1);

const pairingRoutes = storefrontV1
  .identity(viewerOrDevice)
  .tags(StorefrontTag.PAIRING)
  .headers(SurfaceParameter, TraceparentParameter);
const pairingWrites = pairingRoutes.headers(IdempotencyKeyParameter);

export const createPairing: Route<{ method: 'post'; version: 1; path: '/pairings'; /* ... */ }> =
  pairingWrites.defineRoute({ method: 'post', path: '/pairings', operationId: 'createPairing', /* ... */ });
```

| Call | Sets | A route can override it |
|---|---|---|
| `.version(n)` | the API version, required before `defineRoute` | no |
| `.identity(...)`, `.public()` | who may call, required before `defineRoute`, `resource` and `single`; the security is derived from it | no |
| `.tags(...)` | the operation's tags | yes, with its own `tags` |
| `.headers(...)` | header parameters, appended **after** the route's own `parameters` | no |
| `.errors([...])` | the codes every route of the group answers, each with its status | it adds its own; a status it writes whole in `responses` wins |

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
studioV1.identity(operator).requires(roles(MemberRole.PRODUCTION).on('channelId'), recentAuth({ intent: ReauthIntent.DELETE_CHANNEL }))
```

- **The route's `security` is derived** from its identity and its method (a write by cookie adds
  the CSRF token): a route that writes `security` by hand is a compile error, and refused when the
  module loads.
- **`requires(rule)`** takes rules in the order the server applies them after the identity. A rule is
  a declaration, a name with its parameters and its errors: `roles(...)` (with `.on('channelId')` for
  the path parameter it reads), `recentAuth({ intent })` (the proof is the body field
  `reauthToken`, a token minted for that intent alone: the surface binds its intents once with
  `recentAuthOver`, so a route that names none, or one outside them, does not compile),
  `throttle('auth')`, or `requirement(name, { params, errors })`. The contract holds no server code:
  the server maps each name to a guard, and a name with no guard fails at boot. The rules are
  documented as `x-arthome-requires`.
- **A write may be exempt from the CSRF token**: `identity(viewer, { csrfExempt: 'reason' })` gives
  the write the schemes of a read and none of the identity's write codes or write parameters, and
  the reason is documented as `x-arthome-csrf-exempt`. The server's guard for the identity must
  honour it. Only `signOut` and `signOutStudio` use it.
- **An optional route may count a refused credential as none**:
  `.optionalAuth({ refusedCredentialIsAnonymous: 'reason' })` derives no `401`, and the reason is
  documented as `x-arthome-refused-credential-is-anonymous`. The server's guard for the identity must
  honour it. Only `signOut` uses it (signing out is idempotent), and `access-exceptions.spec.ts`
  holds both exceptions to `signOut`.
- **The identity may add parameters and headers** to every route or to a write only (the studio's
  `If-Rights-Version`, its `X-Arthome-Rights-Version` on every success), and an `internal` identity
  (a service's) marks its routes internal: `defineApi` keeps them out of a surface document.
- **The route carries what the server needs**, runtime-readable: `access` (the identity, optional or
  not), `requires`, `budgetMs`, `cache`, `bodyLimit`, `paging`, `sortable`, `expand`, `degradable`,
  `owner`, `internal`. `sensitive(schema)` and `restricted(schema, right)` mark fields, and
  `sensitivePathsOf` and `restrictedFieldsOf` say where.

**What is derived.** A builder defines a route only once it has an identity or `.public()`:
`defineRoute`, `resource` and `single` on a bare builder are compile errors, and throw when the module
loads. So every route derives, and nothing the server can answer is undocumented:

| The route declares | Added |
|---|---|
| a path or query parameter, a required header, or a body | `400 api.schema_invalid` |
| a body | `413 api.payload_too_large`, `415 api.unsupported_media_type`, and a `bodyLimit` (1 MiB; 2 MiB on a batch) |
| an `Idempotency-Key` | `409` with the two idempotency codes, and the `Idempotency-Replayed` header on its successes |
| an identity | `401` (unless a refused credential counts as none), the identity's codes, and on a write its write codes (the CSRF `403`, a stale rights version) |
| a rule | the rule's codes (`403 api.reauthentication_required`, `429 api.rate_limited`) |
| the surface | `500 api.internal`; on a BFF `502 api.upstream_unavailable`, `503 api.service_unavailable` (its own, never relayed), `504 api.upstream_timeout` and `api.deadline_exceeded` |
| a `cache` with an `etag` | `If-None-Match`, `ETag` and the `304` |
| a response that carries a `sensitive` field | `Cache-Control: no-store` on it |

A response the route writes whole in `responses`, or the identity's own (the CSRF refusal), is kept
over the derived one. The derived errors are
**not** in the route's annotation: the annotation lists the route's own statuses, and the server and
the typed client read `route.responses` at run time. The codes the route declares are: its type
carries them in `errorCodes`, grouped by status.

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
  also carry what the route says beyond the convention: the `x-arthome-*` a surface reads
  (`x-arthome-invalidates`), `parameters`, `responses` (a stated 2xx replaces the generated one),
  `optionalBody`, `errors`, `cache`, `requires`.

Which verb a change takes is `transport.md` §5.12: a full replacement is `PUT`, a partial change
without a business rule is `PATCH`, every business state change is an action, and a record that
disappears is a `DELETE` even when guarded.

**Errors** are declared by code in three levels (`transport.md` §5.12). A status whose codes the api
already documents keeps its shared response; a status that adds a code is a union of references to
one envelope per code, each with the `params` schema of `ERROR_PARAMS` in `@arthome/core/schema`,
which is what `check-openapi` R10 accepts. Each code's envelope is one named component
(`components/schemas/StateConflictError`) and its example one `components/examples` entry of the same
name, emitted once whatever the number of routes naming the code, and the status's `examples` map
refers to them. A storefront operation may declare only a code of
`STOREFRONT_RELAYED_CODES`. Each code has one status, `ERRORS` (and `statusOf(code)`) in `./http`, which a test holds the generated documents to; `ErrorParamsMap` in `@arthome/core` types each code's params.
`ErrorStatusMap` restates each code's status as a type, and `ERRORS` is held to it entry by entry
(`isolatedDeclarations` cannot infer the table's literals), so the codes a route lists are grouped by
status in its type: `errors: [PRICE_STALE, SOLD_OUT]` gives `errorCodes: { 409: readonly (...)[] }`.

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
  A storefront read that serves an anonymous caller (`.optionalAuth()`) declares `publicRead(Freshness.X)`,
  or `publicRead(Freshness.X, { etag: true })` (`storefront-api/components.ts`): `cache` with the
  `public` scope and the `Vary` of every credential and the surface. The scope is an anonymous
  caller's: `cacheControlOf(policy, caller)` answers an identified one `private`, always, and the
  document declares on each 200 the value every kind of caller the route lets in gets.
- **`tagged('outcome', { succeeded, declined })`** (an exported one is annotated `TaggedSchema<'outcome', { succeeded: typeof Succeeded, declined: typeof Declined }>`) is a strict union for the server, a `oneOf` with its
  `discriminator` and its mapping for the document, and `parseTolerant` for a client that keeps a
  variant it does not know. A variant may declare its own tag field to document it or to share a named component (the sessions' `mode`).
  **`accepted({ operation })`** is a `202` that names the operation to follow.
- **`restricted(schema, right)`** is a field only some callers see: optional in the type and the
  document, absent from the answer otherwise.

### What repeats is a factory

A schema or a parameter that several routes write the same way is declared once, in `./http`, and
named. **Assign each factory's result to a named const and annotate it `typeof X`**: an inline call in
a route is the repetition this removes, and `isolatedDeclarations` needs the name to annotate against.

```ts
const AuditPeriod = period({ type: 'dateTime' });
const MemberSearch = searchText({ description: 'Server-side search on the nickname.' });
const JournalNature = localVocabulary(NATURES, 'Four of the five are endpoint concerns.');

parameters: [...AuditPeriod.parameters, MemberSearch],
errors: [...AuditPeriod.errors],   // api.period_filter_required
```

| Factory | Gives | Emits the same as |
|---|---|---|
| `Deleted` | the data of a removal, `{ deleted? }`, absent or loose | `z.looseObject({ deleted: z.boolean().optional() }).optional()` |
| `Acknowledged` | the data of an action that answers only that it was done, `{ accepted? }` | the same with `accepted` |
| `perishable(schema)` | the object plus `validUntil`, nullable and optional, as the envelope declares it | `InstantOut.nullable().meta({ format: 'date-time' }).optional()` |
| `localVocabulary(values, reason)` | a request vocabulary with `source: none` and its mandatory reason | `vocabularyIn(values).meta({ 'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL, 'x-arthome-vocabulary-reason': reason })` |
| `period({ type, required?, descriptions? })` | `parameters`: `from` and `to`, as `date` or `dateTime`; `errors`: `api.period_filter_required` when required (the default) | the two inline `from` and `to` of the studio |
| `searchText({ description?, minLength? })` | the `q` query parameter | the inline `q` |

An action that only acknowledges answers `204` with no body (the resource layer's default for an action without `response`); `Acknowledged` stays for the rare route whose clients already read `accepted`. A removal keeps `Deleted` (`200`).

`Deleted` and `Acknowledged` are the `response` of a resource's `delete` and the `item` of a write,
so the route's response is the envelope around them. Each equivalence above is a test.

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
- **How a consumer reads the error codes.** `route.errorCodes[status]` (or
  `errorCodesOf(route, status)`) lists the codes a status stands for, including the shared standard
  responses; a status the route wrote whole has none listed. Its type names the codes the route
  declares, by status, which is what the platform's `refuse(route, code, params)` checks; at run time
  the list also holds the derived codes of that status. `DERIVED_ERROR_CODES` lists the derived
  statuses and their codes.
- **The typed client types the errors**: `ClientResponse<R>` is the route's declared statuses, the
  statuses of its `errorCodes`, plus 400, 401, 403, 413, 415, 429, 500, 502, 503 and 504 (those not
  declared by the route), each an `ErrorBody` of its codes: a union discriminated on `error.code`, so
  a surface narrows on a code and reads its params typed. The full derived set is added rather than the subset a route
  implies, so a surface switches on a `401` or a `429` with types on any route, and the cost is one
  union per call. A status that is neither declared nor derived throws `UndeclaredStatusError`.
- **Deny by default**: a builder defines no route without an identity or `.public()`, and
  `deny-by-default.spec.ts` holds every route of both apis to an access, one made by the plain
  `defineRoute` included.

### Writing a module

A module is the block of routes under one URL prefix: `studio-api/dates/` holds everything under
`/dates/{dateId}` and is the reference, so read it before writing one. A route under a prefix that
has a module goes in that module.

| File | Holds | Written by |
|---|---|---|
| `schemas.ts` | named schemas (`DateTechPaneSchema`), named parameters (`ChapterIdParameter`), local vocabularies, and the types `X` (`z.output`) and `XIn` (`z.input`, only where it differs) of each `XSchema` | hand; `pnpm run generate:contract-types` adds the explicit types |
| `examples.ts` | one typed example per schema the module accepts or answers, and `export const datesExamples: ModuleExamples = [[XSchema, [x]], ...]` | hand |
| `docs.ts` | `export const datesDocs: ModuleDocs = { operationId: { description, upstream, ... } }` | hand |
| `routes.ts` | the routes and nothing else | hand; the tool adds each annotation |
| `types.ts` | each route's annotation, `GetDateSheetRoute` | `pnpm run generate:contract-types`, never edited; `check:contract-types` fails when stale |

`routes.ts` never imports `examples.ts` or `docs.ts`: only the api's `docs.ts` does
(`check:contract-docs`).

1. **Docs.** In `docs.ts`, each operation's description, its upstream services (owning service
   first) and, on a write that takes no key (`idempotent: false`), its `idempotencyExemption`; a
   `maturity` only where it differs from its owning service's, with its `maturityReason`.
2. **Schemas.** Every schema the routes take or answer is named in `schemas.ts`, never inline:
   - a request body is `<OperationId>BodySchema`; on `update`, `replace` and `subresource().replace()`
     of a shared record, without `expectedVersion`, which the convention adds; on an `action`, with it;
   - the data of an answer has a domain name when it is a record (`DateCrewPaneSchema`), else the
     name of what happened (`CapacityTierOpeningSchema`); never redeclare what a subpath exports;
   - a path or query parameter is an exported `XParameter` with its explicit type;
   - a local vocabulary is a const tuple: `localVocabulary(values, reason)` on a request,
     `vocabularyOutLocal(values, reason)` on an answer; a narrowing of a core vocabulary is a tuple
     of its accessor members, typed member by member;
   - a field only some callers see is `restricted(schema, right, meta)`, its own meta given there;
   - a body carrying a re-authentication proof extends `ReauthProof`, and the route
     `requires: [recentAuth({ intent: ReauthIntent.X })]`, naming the command the token was minted for.
3. **Examples.** One example per schema the module accepts or answers, on the schema it shows: a
   request's on its body, an answer's on the data's schema. Type it (`const x: DateTechPane`, or
   `z.output<typeof RunConsoleSchema>` for a subpath's schema) and register it once: the registry
   refuses a schema registered twice in one api. Write in the current vocabulary
   (`Surface.STUDIO_MOBILE`, never `'studio-mobile'`). Never write what is derived: the envelope
   (`servedAt`, `rightsVersion`), a versioned write's `expectedVersion`, an error's example (the
   registry `ERRORS` gives it), a page (the convention wraps the item's example). A schema more than
   one module answers (a factory such as `Deleted`, a subpath's record such as `DateCardSchema`) is
   registered once, in the api's own `examples.ts` (`sharedExamples`); the module's `examples.ts`
   holds only what the module alone shows.
4. **Routes.** One builder for the block, its identity, headers and the errors every route answers
   (`studioV1.identity(operator).headers(...).errors([ApiErrorCode.FORBIDDEN, ApiErrorCode.NOT_FOUND])`),
   then a resource per tag (`.tags(StudioTag.RUN).resource('dates', { id: DateIdParameter })`). Each
   route is a member, `single`, nested `resource` or `path` of it, and says only:
   - `operationId` (the published name), `summary`, and `answer` (the success's description);
   - `item`, `response` or `body`, each a named schema; `parameters`, each a named parameter;
   - `errors`: every code the route refuses with beyond the derived ones, as a list; a status that
     adds a code becomes a union of references to each code's envelope and example components;
   - `paging`, `sortable`, `filters`, `expand`, `cache(Freshness.X)` (never `x-arthome-freshness`),
     `status` (201 on an action that creates, 202 on a write only accepted, with `follow: 'getExport'`
     when an operation follows its outcome, for `Location` and `Retry-After`), `idempotent: false`
     (its reason in `docs.ts` as `idempotencyExemption`), and `x-arthome-invalidates`, which stays on
     the route because a surface reads it;
   - `requires`: a rule, on the route or on the builder, adds its codes (`throttle('export')` its
     `429`, `recentAuth({ intent })` its `403`); a rate limit is always a `throttle` rule, named by the key of core's `AuthRateLimit` when one exists
     (`throttle('SIGN_IN_PER_ADDRESS')`; `throttle-buckets.spec.ts` lists the buckets that have none yet);
   - a secret in an answer is `sensitive(schema)`, which derives `Cache-Control: no-store`: never a
     hand header;
   - a list is `findAll` with its `item`: the convention answers `items` and `page`
     (`transport.md` §5.5). A list with no route to one record is `single(name).findAll(...)`;
   - an action that only acknowledges answers 204 (no `response`); a removal answers `Deleted`;
     `Acknowledged` only where clients already read `accepted`; a union with a discriminator is
     `tagged(key, variants)`.

   Never: a description, `x-arthome-upstream` or `x-arthome-maturity` (they are in `docs.ts`), an
   inline schema, parameter or example, `security`, a hand error response. A success is stated in
   `responses` only where no member gives its shape (a field beside a page such as `unreadCount`, a
   list without a page, a POST on a collection that creates nothing), with a named schema and the
   reason in the commit.
5. **List them.** List the module's routes in the api's `index.ts` by name (the document keeps
   that order), add the module to `routes-listed.spec.ts`, and its docs and examples to the api's
   `docs.ts` (`modules`, `examples`). A path segment that spells a core vocabulary member
   (`'chat'`, `'crew'`, `'tickets'`) is written as it is: `check-enums` skips the segment given to
   the builder, never an import of the vocabulary.
   `deny-by-default.spec.ts` and `inline-docs.spec.ts` hold every route to an identity and to no
   description, doc-only `x-arthome-*` or example of its own.
6. **Generate and check.** `pnpm run generate:contract-types`, `pnpm run fix`, `pnpm -r run build`,
   `pnpm run generate:openapi`, `pnpm exec arthome-generate-map`, `pnpm run verify`.
7. **Read what moved.** A change to an existing operation keeps its path, method, statuses and
   parameters unless it means to change them. Examples, the order of `required`, the coded error
   unions and what is derived (security, errors, headers) may move until the first client ships
   (`transport.md` §5.11); the commit lists them per operation. A change of wire shape (a field
   renamed, a page's envelope) is a ruling: ask first.

```ts
const dates = studioV1
  .identity(operator)
  .headers(SurfaceParameter, TraceparentParameter)
  .errors([ApiErrorCode.FORBIDDEN, ApiErrorCode.NOT_FOUND]);
const runDate = dates.tags(StudioTag.RUN).resource('dates', { id: DateIdParameter });

export const rehearseRun: RehearseRunRoute = runDate.single('run').action('rehearse', {
  operationId: 'rehearseRun',
  summary: 'Starts the rehearsal.',
  body: RunTransitionBodySchema,
  response: RunConsoleSchema,
  answer: 'The console up to date.',
  errors: [CatalogErrorCode.TECHNICAL_CHECK_REQUIRED, DomainErrorCode.STATE_CONFLICT],
});
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
