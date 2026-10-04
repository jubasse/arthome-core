# ADR — The contract model, second pass: what a route declares, and what is derived from it

**Status**: **proposal** — written on 2026-10-04 for the product owner's review. Nothing is built.
**Date**: 4 October 2026. **Scope**: what `@arthome/contracts` lets a route declare, and what the
server and the typed client derive from it. Not in scope: the studio's rights matrix (§4.4) and
the real-time contracts (§8).

It gathers the product owner's requests of 2026-10-04:
- a resource without an id;
- data only its owner writes;
- authenticated by default, with a method to open a route;
- the identified state described once;
- custom rules such as a role check;
- the ways a response's shape varies (a relation on demand, several statuses, unions);
- the paginations and the redirects;
- the errors produced outside the handler.

It builds on:
- D-120 (routes declared in TypeScript, documents generated) and D-121 (internal APIs declared
  too);
- `transport.md` §5.5 (envelopes), §5.7 (one format), §5.11 (versions, tolerant reading) and §5.12
  (the write rule);
- `packages/contracts/README.md` (the builder, the resources).

---

## 0. The principle

**The declaration decides; the server and the client derive.** A route declares once, in the
contract, three things:
- what it requires: an identity, a role;
- what it accepts;
- what it answers: statuses, codes, shapes, fields hidden by right.

The server's guards, validation, projection and error documentation are derived from that, as the
typed client already is. Five rules follow:

1. **Deny by default.** A route requires the surface's identity unless it says otherwise.
2. **Strict on what we emit, tolerant on what we read** (§5.11). A client keeps an unknown enum value
   or union variant and treats it as neutral; a server never emits one.
3. **The contract holds no server code**, because the surfaces import it. A rule is a declaration
   (a name, parameters, errors), and the server maps the name to a guard.
4. **Nothing the server can answer is undocumented**, including what is produced before the handler
   runs.
5. **A mechanism is built when a route needs it** (pass 1) **or when its lane starts** (pass 2),
   never ahead.

## 1. What exists, measured on 2026-10-04

| | Storefront | Studio |
|---|---|---|
| Operations | 92 | 87 |
| Security | document default: session or bearer; 50 routes restate session + CSRF or bearer; 13 optional; 9 public; 4 with a device token | 84 authenticated, 3 public |
| Pagination | cursor + `limit`, 12 lists | `page` + `pageSize`, 7 lists; cursor, 2 (moderation queue, chat) |
| Routes taking input / declaring the `400` | 92 / 11 | 87 / 5 |
| Answering `202` | 8 | 7 |
| `ETag` and `If-None-Match` | 1 (`getDateDetail`) | 0 |
| Unions in a success response | 6 | 2 |

**Responses and errors in the documents.**
- Every response is JSON, and no route redirects.
- Downloads are signed URLs: an export is a job, then a `downloadUrl` valid for 60 minutes.
- No route declares a `500`, a `413` or a `415`.
- 61 idempotent writes declare no idempotency `409`.
- The 8 unions are `oneOf`, 6 of them with a `discriminator` written by hand (`z.xor` and `.meta`):
  sign-in, sign-up, two-factor, one-time token. The 937 `anyOf` are nullable fields.

**Verbs that deviate from the resource conventions.**
- 5 PATCH carry no `expectedVersion`, and all 5 are personal data.
- The 23 DELETE answer 200 with a body. The storefront ones carry no version. The studio ones carry
  `If-Rights-Version` and a `409`.

**The server disagrees with the documents.**
- The storefront BFF's `ViewerGuard` resolves a session only on routes marked `RequiresViewer`. So
  **the server defaults to anonymous while the document defaults to authenticated**.
- `@Endpoint(route)` documents the security without applying it.
- The internal services, by contrast, deny by default (`AllowAnonymous`).
- The error-envelope filter answers 500 to any error that is neither an `HttpException`, nor a
  domain error, nor a unique violation. Whether Fastify's own refusals (malformed JSON, media type,
  body size) reach it in that form is untested.

**Assembly.** Routes are values: no builder registers them. `defineApi` lists them by hand, and no
test checks that every exported route is listed.

## 2. Assembling routes

**Unchanged.** A builder is immutable and holds no route. A member returns a route, its module
exports it, and the api lists it under `routes`. This keeps three properties:
- no hidden state, so the load order does not matter;
- a surface bundles only the routes it imports;
- `@Endpoint(createSavedSearch)` imports its route directly.

**Added:**
- **A test per api.** Every route the api's modules export is listed, and every listed route is
  exported.
- **`collect(...)`, if its typing is cheap.** It builds the `routes` record keyed by `operationId`,
  so a `crud()` result spreads in one line. It needs the route type to carry its `operationId` as
  a literal. If that is costly, the listing stays by hand and the test above suffices.

## 3. Resources

### 3.1 `singleton(name, options)`

A resource without an id: one record per caller, or per parent. About 25 paths are singletons
today. Examples: `/me/preferences`, `/subscription`, `/me/deletion`, `/auth/two-factor`,
`/channels/{channelId}/settings`, `/dates/{dateId}/waitlist`.

It has the same members as `resource`: `find`, `create`, `update`, `replace`, `upsert`, `delete`
and `action`. They answer on `/{name}` and `/{name}/{action}`.

```ts
const preferences = storefrontV1.singleton('me/preferences', { owner: 'caller' });
export const updatePreferences = preferences.update({ operationId: 'updatePreferences', item, fields });

const settings = studioV1.singleton('channels/{channelId}/settings', { parents: [ChannelIdParameter] });
export const updateChannelSettings = settings.update({ operationId: 'updateChannelSettings', item, fields });
```

### 3.2 `owner: 'caller'`

An option of `resource` and `singleton`: **the caller is the only one who writes this data.**

**What it changes.** `update`, `replace` and `delete` then carry no `expectedVersion` and no
`409 state.conflict`; the idempotency codes stay. The declaration states why the version is absent,
so it is no longer a deviation.

**Where it applies, and where it does not:**
- **Applies:** preferences, saved searches, follows, the watchlist, reminders, passkeys, payment
  methods, devices.
- **Does not apply:** data a team shares, such as a channel's settings, keeps its version.
- **Two devices of the same person** writing at once: the last write wins, and that is accepted.

### 3.3 `delete({ response })`

204 by default. With `response`, the deletion answers 200 with that body. The 23 existing deletions
answer 200 with a body and keep doing so.

### 3.4 The write rule, refined for DELETE

An addition to `transport.md` §5.12:
- **The record disappears** (a later read answers 404): it is a `DELETE`, even when guarded. A guard
  is a `409` with a domain code. `deleteChannel` is refused while a payout is owed; `removeMember`
  is refused on the owner.
- **The record stays readable with a new state**: it is an action.

**Applied to the operations reviewed so far:**
- `cancelSubscription` (`DELETE /subscription`): the subscription stays, with `cancelAtPeriodEnd`.
  It becomes `POST /subscription/cancel`.
- `changePassword` (`PATCH /auth/password`) checks the current password and revokes the other
  sessions. It becomes `POST /auth/change-password`, beside `/auth/reset-password`.
- `cancelAccountDeletion`, `cancelPairing`, `deleteChannel` and `removeMember` stay `DELETE`.

**The full audit is part of pass 1.** The implementing pass checks every PUT and PATCH against the
rule; `setRunState`, `setSubscriptionPlan`, `sanctionAudienceMember` and `pinMerchDuringLive` are
the first candidates. It lists its conversions for the product owner before the PR. No client has
shipped, so the documents may move (§5.11).

### 3.5 What the "soft molds" ruling keeps

Three variants are stated by the declaration, not tolerated as deviations:
- the personal PATCH, last write wins (§3.2);
- the DELETE with a body (§3.3);
- the optional `ETag` (§5.5).

## 4. Identity and requirements

### 4.1 The identified state, declared once per surface

```ts
export const viewer = identity('viewer', {
  schemes: { read: [SessionCookie, BearerToken], write: [SessionCookieWithCsrf, BearerToken] },
  principal: ViewerPrincipalSchema,
  errors: { 401: [ApiErrorCode.UNAUTHENTICATED] },
});
export const device = identity('device', { schemes: { read: [DeviceToken], write: [DeviceToken] }, principal: DevicePrincipalSchema });
export const operator = identity('operator', { schemes: { read: [SessionCookie, BearerToken], write: [SessionCookie, BearerToken] }, principal: OperatorPrincipalSchema });
```

- **What is identified:** the principal is what the server knows once a caller is identified. Its
  fields are those the BFFs attach today (`attachViewer`), written as a schema.
- **Which credentials, and when:** the schemes say what a read and a write accept, so the CSRF
  token on a cookie write is derived rather than restated.

### 4.2 The default, and the shortcuts

```ts
export const storefrontV1 = routeBuilder().version(1).identity(viewer);   // every route requires a viewer

storefrontV1.public()          // no identity: sign-in, sign-up, public links (9 + 3 routes)
storefrontV1.optionalAuth()    // anonymous allowed, personalised when signed in (13 routes); the principal may be null
storefrontV1.identity(device)  // the television (4 routes)
```

These are shortcuts over §4.3: `.optionalAuth()` is
`requires(authenticated(viewer).optional())`. The builder writes each route's `security` from its
identity and its method, so **the 50 restated security lists disappear**.

### 4.3 `requires(rule)`: the extension point

```ts
export const roles = (...allowed: readonly MemberRole[]) =>
  requirement('roles', { params: { allowed }, errors: { 403: [ApiErrorCode.FORBIDDEN] } });

studioV1.requires(roles(MemberRole.PRODUCTION, MemberRole.COORDINATION)).defineRoute({ ... });
seats.action('refund', { requires: [roles(MemberRole.TREASURY)], ... });
```

**In the contract**, a rule is a declaration: a name, its parameters and its errors.
- Its errors merge into the route's.
- It is documented as `x-arthome-requires`.
- The identity is the first rule, and the only one that writes the OpenAPI `security`.

**In the server** (`libs/http-edge`):
- a table maps each rule name to a guard;
- `@Endpoint(route)` applies the guards, identity first, because the other rules read the
  principal;
- a rule with no guard fails at boot, so nothing passes by omission.

**Why one extension point rather than methods added to the builder.** Each method added to the
builder retypes its whole chain. A rule is a function, so adding one touches neither the builder
nor its types. A shortcut method can still be added on top when a rule is everywhere.

### 4.4 Roles

- **When:** the mechanism comes in pass 1, but applying it waits for the bff-studio lane and its
  rights matrix (which of the eight roles may call what).
- **Scope:** a role holds on a channel, or on a date through a one-off access, so the rule names the
  path parameter it reads: `roles(...).on('channelId')`.
- **Not a requirement:** what a role *sees* inside a response is §6.3.

### 4.5 The server

- `@Endpoint(route)` applies the guards of the identity and of the rules. `RequiresViewer`
  disappears, and the BFFs deny by default, as the services do.
- The handler receives the principal, typed from the route:
  `@EndpointPrincipal(route) viewer: RoutePrincipal<typeof route>`. It is `null` only on an
  `optionalAuth` route.

## 5. Reads

### 5.1 Query parameters: unchanged

Query parameters are already typed and validated end to end:
- **in the route type:** each parameter has its name, its schema and its required flag;
- **in the client:** the `query` it sends is typed;
- **in the server:** `@EndpointQuery(route)` validates it, and the handler receives coerced values.

The wire decoding happens before validation:
- numbers are converted;
- a boolean accepts only `true` and `false`;
- a lone value of a list becomes a list;
- an object parameter is exploded into flat keys;
- an undeclared parameter is refused by name (`400 api.schema_invalid`).

Everything below plugs into this.

### 5.2 Pagination: three kinds, a default per surface, overridable per list

| Kind | Parameters | Errors |
|---|---|---|
| `cursor({ maxLimit })` | `cursor`, `limit` | `400 api.schema_invalid` on a malformed cursor, `410 api.cursor_too_old` |
| `pages({ maxPageSize })` | `page`, `pageSize` | `400 api.schema_invalid` |
| `changesSince()` | the token `listChanges` takes | `410` when the token is too old |

- **The defaults:** cursor on the storefront, pages on the studio, with the two named cursor
  exceptions (D-010).
- **The envelopes** are those of `./pagination`, unchanged.

### 5.3 Sort and filters

```ts
dates.findAll({ item, sortable: ['startsAt', 'revenue'], filters: CriteriaSchema });
```

- The `sort` parameter is typed from the declared keys.
- A key restricted by a right (§6.3) is refused with `403 api.sort_key_forbidden`, never ignored.
  That is the studio's existing rule.

### 5.4 Relations on demand: `include`

```ts
books.find({ item: BookSchema, expand: { author: AuthorSchema, publisher: PublisherSchema } });
// GET /books/{id}?include=author   ->   Book & { author: Author }
```

- **One parameter:** `include`, a list of the declared names, rather than one boolean per relation.
- **The client's type narrows:** a relation is in the type only when it was requested.
- **The document** marks the field optional, with `x-arthome-expanded-by`.
- **In tests:** a requested relation is present, and an unrequested one is absent.
- **Who uses it:** mostly D-121's internal APIs, since the BFFs are shaped per screen.
- **Not built:** sparse fieldsets (`fields=`).

### 5.5 Cache and conditional reads

`cache({ maxAge, vary, etag })` on a read writes:
- `Cache-Control` and `Vary`;
- `ETag` on the 200, with `If-None-Match` and the `304`.

It is optional per read: `getDateDetail` keeps it, and another read adds it when a surface needs it.
Freshness stays §5.9's.

## 6. Responses

### 6.1 Four ways a response varies, each with its tool

| The shape depends on | Tool | Example |
|---|---|---|
| a field of the body | a tagged union (§6.2) | a payment outcome: succeeded, 3-D Secure required, declined |
| the status | one response per status (§6.4) | 200 done, 202 accepted |
| the media type | one schema per content type | ruled out by §5.7 (§8) |
| the request or the caller's rights | optional fields, with a type that narrows (§5.4, §6.3) | `include=author`, revenue for `canRevenue` |

A union for the last row would multiply the variants: two relations on demand crossed with three
levels of rights already make about a dozen shapes.

### 6.2 Tagged unions

```ts
export const PaymentOutcomeSchema = tagged('outcome', {
  succeeded: PaymentSucceededSchema,
  actionRequired: PaymentActionRequiredSchema,
  declined: PaymentDeclinedSchema,
});
```

**Measured on zod 4.6.5.** A discriminated union emits `oneOf` without the OpenAPI
`discriminator`, and parsing an unknown variant fails. So the helper produces three things:
- **for the server:** the strict union, so only declared variants are emitted;
- **for the document:** the `oneOf` with its `discriminator` (`propertyName` and `mapping`), derived
  from the variants. Today it is written by hand on 6 unions;
- **for the client:** the union plus an unknown-variant branch, so an exhaustive `switch` has to
  handle it. Adding a variant is then additive, as §5.11 requires of an enumeration.

The 8 existing unions move to the helper wherever the document does not move.

### 6.3 Fields restricted by a right: `restricted`

```ts
revenue: restricted(MoneyOutSchema, 'canRevenue'),
viewer: restricted(ViewerOverlaySchema, 'signedIn'),
```

- **The document** marks the field optional, with `x-arthome-restricted`.
- **The server** runs a projection step after the handler, read from the contract: it removes every
  restricted field the principal lacks the right for. The studio rule "a forbidden field is absent,
  never present and null" becomes mechanical: no leak by omission.
- **The client's type** has the field optional.
- **The right names** come from the principal: the studio's rights, and `signedIn` on an
  `optionalAuth` route.

### 6.4 Several statuses, and asynchronous work

- A route may declare several 2xx, and the client receives a union keyed by status.
- `accepted({ operation })` declares a `202`, with the `Location` of the operation to follow when
  there is one, and `Retry-After`.
- The 15 routes answering `202` are reviewed against it. Exports already follow the pattern: a job,
  then a signed URL (§5.7).

## 7. Errors

### 7.1 Derived from the declaration

| What the route declares | Errors added |
|---|---|
| any input: body, query, path | `400 api.schema_invalid`, with the field paths in `params` |
| a body | `413` (code promised in `tools/codes-promised.json`), `415` (code to add) |
| a write carrying `Idempotency-Key` | `409 api.idempotency_key_reused`, `api.idempotency_in_flight` (covers the 61 writes) |
| an identity | `401` with its codes |
| a write by cookie | the CSRF `403` the BFF already answers |
| a rate limit | `429 api.rate_limited` |
| a rule | its own codes |
| the surface | `500 api.internal`; on a BFF, `502 api.upstream_unavailable`, `504 api.upstream_timeout`, `504 api.deadline_exceeded` |

### 7.2 Errors produced before the handler

Fastify refuses some requests itself:
- a malformed JSON body (400);
- a wrong content type (415);
- a body over the 1 MiB ceiling of §5.7 (413);
- an unknown route (404).

Each must answer the envelope with its code. The filter's fallback answers 500 to an unknown error,
and these cases are untested. **The tests come first.** If a refusal arrives as a `FastifyError`, the
filter maps its `statusCode` to the envelope.

### 7.3 The guard in tests

In every end-to-end test, a response whose status and code the route does not declare fails the
test. That includes the responses produced by the framework.

### 7.4 Errors are JSON, always (§5.5), whatever the route answers on success.

## 8. Pass 2: built with the lane that needs it

| Mechanism | Lane | Shape |
|---|---|---|
| Redirects | auth slice B | `redirect(302 \| 303 \| 307 \| 308)`, a typed `Location`, no body |
| Deprecation | the first v2 | `deprecated({ sunset, successor })`: `deprecated: true`, `Deprecation`, `Sunset`, `Link` |
| Inbound webhooks | the Stripe adapter | `.public().requires(signature('stripe'))`, raw body |
| Real-time | chat | outside OpenAPI: AsyncAPI or the protobuf events, decided there |
| Formats | none | §5.7 rules one format and no binary; an exception is an amendment (Q1) |

**A redirect serves browser navigations only:** the OAuth callback, a link in an email, an old slug
for search engines. A call made by the application's code follows a redirect silently and cannot
read its target. An API call therefore answers the URL in JSON, as `startSocialSignIn` and
`resolvePublicLink` already do.

## 9. Also in pass 1: what the rest of `transport.md` asks of a declaration

Found on review: what the declaration must also carry so that nothing else is written by hand.

### 9.1 The internal APIs (D-121)

- **The `service` identity.** It is the internal token (§5.2): the calling service and the end user,
  verified by `InternalTokenGuard`. A service route requires it by default, as a BFF route requires
  its viewer.
- **The deadline header is required** on every internal route, and the `504 api.deadline_exceeded`
  is derived on the services too, not only on the BFFs.
- **The route is marked internal**, so the central OpenAPI lists it, and no surface document can
  include it.

### 9.2 The batched read (§5.6)

`batch({ ids, max: 200, response })` declares a `POST /{res}/batch`:
- no idempotency key, since it is a read;
- the 2 MiB body ceiling;
- a table keyed by id as its response.

The rule "never one identifier at a time" stays in `definition-of-done.md`.

### 9.3 Derived on writes

- **Every write carrying `Idempotency-Key`** declares the `Idempotency-Replayed` response header.
  Today 2 routes do.
- **A versioned record's item schema must carry `version`** (§5.5). A resource whose members take
  `expectedVersion` refuses, at compile time, an item without it.
- **The `operator` identity** adds two things to every studio route:
  - `X-Arthome-Rights-Version` on every response;
  - `If-Rights-Version` on every write, with `403 api.rights_version_stale`.

### 9.4 Budgets, freshness, size, rate

- **`budget(ms)`** declares the latency budget of §5.9. The typed client uses it as its timeout,
  under the deadline.
- **`cache(...)`** takes the freshness family of §5.9: `cache(Freshness.FIVE_MINUTES)`. The BFF
  stops writing `Cache-Control` and `Vary` by hand, as `getDateDetail` does today.
- **The body ceiling is declared per route:** 1 MiB by default, 2 MiB on a batch. The server applies
  it, and the `413` is derived.
- **A rate limit is a rule:** `requires(throttle('auth'))`. The BFF's caps are bound to it, and the
  `429` is derived.

### 9.5 Unchanged, stated for completeness

- Uploads go through signed tickets (`createUploadTicket`), and downloads through signed URLs.
- The typed client replays nothing (§5.8).

### 9.6 Tests and tools

- Every `example` in a declaration parses with its schema.
- Pass 2, with the front lanes: mock servers generated from the declarations and their examples,
  for the surfaces' tests.

## 10. Plan

**Pass 1: two agents, core first, then QA by the lead.**

1. **Core** (`contracts-core`), in this order:
   - the mechanisms that touch every route: derived errors (§7.1), identity, shortcuts and
     `requires` (§4), and what §9 adds;
   - then the resources (§3) and the audit of the write rule;
   - then reads and responses (§5, §6);
   - then the routes redeclared, the documents regenerated, and `transport.md` §5.12, the README and
     this ADR updated.
2. **Platform** (`contracts-platform`):
   - `@Endpoint` derives the guards, and the principal decorator comes with it;
   - the `restricted` projection;
   - the framework error tests (§7.2) and the undeclared-response guard (§7.3);
   - `RequiresViewer` removed.
3. **QA, by the lead:** core verify, `verify:full`, all the integration suites, the byte gate and a
   coherence review. Then one core PR and one platform PR.

**Redeclaring the existing routes is mechanical.** Once the mechanisms exist, it goes to Sonnet agents
in parallel, one per group of operations.

**The ticketing T4+T5 and streaming lanes start once the core part is merged.** Otherwise they would
write their new routes in the old model.

The generated documents grow, as errors get declared and security gets derived. That is allowed
until the first client ships (§5.11).

## 11. Open questions for the product owner

1. **Formats.** Keep §5.7: JSON only, and binaries through signed URLs (recommended). Or amend it
   for a calendar file or a CSV served by the API.
2. **Roles.** Apply them with bff-studio, once the rights matrix is settled (recommended).
3. **Conversions.** `changePassword` becomes `POST /auth/change-password` and `cancelSubscription`
   becomes `POST /subscription/cancel`. The PUT and PATCH audit is shown before the PR.

## 12. Tests to write first

- every exported route is listed, and every listed route is exported;
- a route without `.public()` answers 401 without a session, on the server;
- a rule with no guard fails at boot;
- each of these answers the envelope with the right status:
  - a malformed JSON body (400);
  - a wrong content type (415);
  - a body over 1 MiB (413);
  - an unknown route (404);
- a status or a code the route does not declare fails a test;
- a restricted field is absent for a principal without the right;
- a requested relation is present, and an unrequested one is absent;
- a client reads an unknown union variant without failing.
