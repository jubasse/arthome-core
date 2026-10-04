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

### 2.1 `path(template, ...parameters)`: a prefix, and the routes under it

Most routes sit under a few prefixes:

| Surface | Prefix | Operations |
|---|---|---|
| storefront | `me` | 33 |
| storefront | `auth` | 13 |
| storefront | `dates/{dateId}` | 10 |
| studio | `dates/{dateId}` | 32 |
| studio | `channels/{channelId}` | 29 |

`path()` declares such a prefix once:
- **its path parameters are declared once**, and the compiler checks that every `{placeholder}` in
  the template has its parameter;
- **what it sets applies to everything below**, like any builder setting: `requires`, `tags`,
  `identity`;
- **a nested resource stops repeating** its parents and its full path.

```ts
const channel = studioV1
  .path('channels/{channelId}', ChannelIdParameter)
  .requires(roles(...MEMBER_ROLES).on('channelId'));

const members = channel.resource('members', { id: PersonIdParameter }, (m) => ({
  listMembers: m.findAll({ item: MemberSchema, paging: pages({ maxPageSize: 50 }) }),
  removeMember: m.delete({ requires: [roles(MemberRole.PRODUCTION).on('channelId')] }),
}));

const settings = channel.single('settings', (s) => ({
  getChannelSettings: s.find({ item: ChannelSettingsSchema }),
  updateChannelSettings: s.update({ item: ChannelSettingsSchema, fields: ChannelSettingsSchema }),
}));

export const removeMember: Route<{ /* the annotation, unchanged */ }> = members.removeMember;
export const studioApi = defineApi({ /* ... */ routes: collect(members, settings /* ... */) });
```

**The closure is optional, and it returns its routes.**
- `resource`, `single` and `path` accept a callback that returns a record of routes, keyed by
  operation id, and they return that record.
- **What it gives:** the code mirrors the URL tree, and `collect()` takes the record whole, so the
  listing is one line per block.
- **It never registers anything as a side effect.** A registration would lose each route's type, and
  bring back the hidden state that §2 rules out.
- **Rules declared at several levels add up:** removing a member requires being a member of the
  channel, and holding the production role.

**Nesting, at any depth.** Each scope offers `resource`, `single` and `path` again, so the tree
nests as deep as the URL does:
- inside a `resource`, a child sits under the item and inherits its id as a parent parameter;
- inside a `single` or a `path`, a child sits under its path;
- each level may add its own `requires` and `tags`, and they add up.

The record a closure returns may hold nested records. `collect()` flattens them by operation id,
and refuses a duplicate.

```ts
const channelRoutes = studioV1.resource('channels', { id: ChannelIdParameter }, (channel) => ({
  getChannel: channel.find({ item: ChannelSchema }),
  settings: channel.single('settings', (settings) => ({
    updateChannelSettings: settings.update({ item: ChannelSettingsSchema, fields: ChannelSettingsSchema }),
  })),
  moderation: channel.path('moderation', (moderation) => ({
    bannedWords: moderation.resource('banned-words', { id: WordParameter }, (word) => ({
      addBannedWord: word.upsert({ /* ... */ }),     // PUT    /channels/{channelId}/moderation/banned-words/{word}
      removeBannedWord: word.delete({ /* ... */ }),  // DELETE /channels/{channelId}/moderation/banned-words/{word}
    })),
  })),
}));

const channel = collect(channelRoutes);
export const removeBannedWord: Route<{ /* the annotation, unchanged */ }> = channel.removeBannedWord;
```

**The design rule stays: nest a child only when it has no meaning outside its parent.** A channel's
member, a channel's banned word and a date's chapter qualify. A seat or an order, whose id is
unique on its own, stays at the root (`/seats/{seatId}`), however deep the domain places it.
Today the deepest path has five segments and two ids
(`/channels/{channelId}/moderation/banned-words/{word}`).

**What does not change.** Each route is still exported on its own, with its annotation:
`isolatedDeclarations` requires it for the published `.d.ts`, and the annotation is what checks a
route against the published operation.

**The risk to measure.** Nested generics deepen the type instantiation, and these route types are
already heavy. The pass measures the cost on the 32 routes under `dates/{dateId}`. If the compiler
suffers, the closure goes and `path()` stays: the prefix is the real gain.

## 3. Resources

### 3.1 `single(name, options)`: what exists once in its context

`resource` declares a collection: several records, each with its id in the URL (`/members/{personId}`).
`single` declares what exists **once** in its context, so its URL has no id: **my** preferences,
**my** subscription, **a channel's** settings. The industry's name for it is a singleton resource
(Laravel, Google's API guide); `single` says the same in a word a reader does not have to look up.

A `resource` without an `id` was considered and set aside: forgetting the id would silently turn a
collection into a single record. About 25 paths are single today. Examples: `/me/preferences`, `/subscription`, `/me/deletion`, `/auth/two-factor`,
`/channels/{channelId}/settings`, `/dates/{dateId}/waitlist`.

It has the same members as `resource`: `find`, `create`, `update`, `replace`, `upsert`, `delete`
and `action`. They answer on `/{name}` and `/{name}/{action}`.

```ts
const preferences = storefrontV1.single('me/preferences', { owner: 'caller' });
export const updatePreferences = preferences.update({ operationId: 'updatePreferences', item, fields });

const settings = studioV1.single('channels/{channelId}/settings', { parents: [ChannelIdParameter] });
export const updateChannelSettings = settings.update({ operationId: 'updateChannelSettings', item, fields });
```

### 3.2 `owner: 'caller'`

An option of `resource` and `single`: **the caller is the only one who writes this data.**

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

### 3.6 `crud`, in this model

**What it is.** One call declaring several members of a resource, which share their `item`:
- by default `find`, `findAll`, `create`, `update` and `delete`;
- `replace` and `upsert` when their options are given;
- narrowed by `pick` or `omit`, never both.

**Four changes:**
- **It returns its routes keyed by operation id**, no longer by member name (`find`, `create`). The
  record spreads into a closure, and `collect()` takes it like any other. Each member keeps the id
  derived from the resource (`createSavedSearch`), or the one its options give, which is how a
  published name is kept (`listSavedSearches`).
- **It exists on `single` too.** Its default there is `find` and `update`; `create`, `replace`,
  `upsert` and `delete` come with `pick`.
- **It inherits from its scope** `owner`, `requires`, `tags` and the identity. With
  `owner: 'caller'`, its `update` and `delete` carry no version.
- **Each member takes the options of §5 and §6.** `findAll` takes `paging`, `sortable` and
  `filters`; `find` takes `expand` and `cache`; `delete` takes `response`.

```ts
const savedSearches = storefrontV1
  .path('me')
  .resource('saved-searches', { id: SavedSearchIdParameter, owner: 'caller' }, (searches) => ({
    ...searches.crud({
      item: SavedSearchSchema,
      pick: ['findAll', 'create', 'update', 'delete'],
      findAll: { operationId: 'listSavedSearches', paging: cursor({ maxLimit: 50 }) },
      create: { body: CreateSavedSearchBodySchema },
      update: { fields: SavedSearchSchema.pick({ name: true, active: true, channels: true }) },
      delete: { response: SavedSearchSchema },
    }),
  }));
```

When `crud` is all a resource declares, the closure returns it as is, or the call chains without a
closure. Both give the same record:

```ts
const searches = me.resource('saved-searches', options, (searches) => searches.crud({ /* ... */ }));
const searchesToo = me.resource('saved-searches', options).crud({ /* ... */ });
```

**What it is worth here, measured.** In the two public contracts, four collections come close to a
CRUD, and none is complete:
- the saved searches: no `find`;
- the cart lines: `create`, `update`, `delete`;
- the pairings: `create`, `find`, `delete`;
- a channel's members: `findAll`, `update`, `delete`.

The surfaces' routes are mostly reads composed per screen, and actions. So `crud` serves with `pick`
on the BFFs, and whole mainly on the internal APIs of D-121 and on the back-office screens to come.
The individual members remain the primary tool, and `crud` is the shorthand.

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

**Later, and not a lane: scaffolding from the declarations.** The declarations are values a script
can walk, so they can drive three kinds of output, each with its own rule:
- **Typed calls need no generation.** The server and the clients import the declaration, as they do
  today, so a contract change is a compile error everywhere and no generated file can drift.
- **A one-shot scaffold.** Once generated, the code belongs to whoever edits it, and nothing
  regenerates it. Examples:
  - a NestJS controller with each method bound by `@Endpoint(route)`, its typed parameters,
    principal and body, and an empty body;
  - its test skeleton, one case per declared status.

  This is a schematic in `arthome-platform/tools/schematics`. Since the binding is typed, a later
  contract change still shows in the edited code.
- **Glue nobody edits.** Data-fetching hooks for React, services for Angular, mock servers. A
  generic helper typed from the api (`createQueries(storefrontApi)`) is preferred to generated
  files wherever the types suffice.

**The interface a controller implements, without generating a file.** The product owner's proposal,
and the preferred form. A mapped type derived from a block of routes gives one method per operation
id, with its typed input and output:

```ts
export class DatesController implements Endpoints<typeof dateRoutes> {
  @Endpoint(publishDate)
  public async publishDate(@EndpointInput(publishDate) { params, principal }: HandlerInput<typeof publishDate>):
    Promise<HandlerOutput<typeof publishDate>> { /* ... */ }
}
```

What it gives:
- **a route declared and not implemented is a compile error** (the method is missing), so the gate
  "declared but unbound" comes free;
- **a wrong return type is a compile error too**;
- **one parameter decorator, `@EndpointInput(route)`, gives `{ params, query, body, headers,
  principal }`**, so the signature does not depend on the order of five decorators.

Two limits:
- TypeScript compares a class method's parameters loosely, so the input's type is guaranteed by
  `@EndpointInput`, not by `implements`.
- Later, a class decorator (`@Implements(dateRoutes)`) could apply `@Endpoint` and `@EndpointInput`
  to each method by its name, leaving only the method bodies to write.

**Derived type or generated file: measured, not assumed.** The product owner's concern is that
TypeScript tangles itself on the heavy cases, and it is founded. Derived types cost compile time,
and their errors can run to a screen of nested generics where a generated, named interface
(`PublishDateInput`) reads in one line.

Two choices keep the server's types simple:
- **A relation on demand (§5.4):** the handler returns the item with every expandable relation
  optional, and a test checks that each requested relation is there. The narrowing by `include` is
  the client's, through a const generic on the call.
- **Several statuses (§6.4):** the handler returns `{ status, body }`, a union TypeScript handles
  well.

**The spike, in pass 1.** On the heaviest block, the 32 routes under `dates/{dateId}`, with unions,
`include` and several statuses, three things are measured:
1. the typecheck time, with and without the derived type;
2. the error printed when a method is missing, and when a return is wrong: it must name the
   operation and the field;
3. the IDE hover on `HandlerInput` and `HandlerOutput`.

If one of them fails, the interfaces are generated instead: a script writes one file per api, with
named types per operation, checked byte for byte by a gate, as the OpenAPI documents are
(`check:openapi-generated`). Either way, the controller writes `implements`, and `@EndpointInput`
joins the platform part of pass 1. The class decorator waits.

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

### 9.7 The last coverage pass

Checked against the usual API design guides (request, access, reads, writes, responses, errors,
evolution, security, tooling).

**Missing, and added to pass 1:**
- **Re-authentication.** Ten routes require a recent re-authentication, in prose only: no header and
  no code declare it.
  - storefront: `enableTwoFactor`, `disableTwoFactor`;
  - studio: `listReauthFactors`, `createReauthToken`, `revealStreamKey`, `rotateStreamKey`,
    `transferChannelOwnership`, `deleteChannel`, `requestBankChange`, `countersignBankChange`.

  `requires(recentAuth())` declares the proof it takes and its `403` (a code to add), so a client
  knows before calling.
- **Sensitive fields.** `sensitive(schema)` marks a password, a token or a stream key:
  - `writeOnly` in the document, or `format: password`;
  - redacted from the server's logs and traces;
  - `no-store` on a response that carries one.
- **Another caller's record.** On an `owner: 'caller'` resource, someone else's id answers
  `404 api.not_found`, never `403`: the answer must not reveal that the record exists.
- **The degraded parts of a composed read.** The envelope's `degraded` is a bare list of strings
  today. A route declares `degradable: ['viewerProgress', ...]`, and `degraded` is typed from it
  (§5.8).

**Built with their lane:**
- **The offline policy of a write.** `offline: 'queue' | 'forbidden'`, for studio-mobile. Today it is
  prose ("taking charge is never queued offline").
- **A bulk write.** It answers a table keyed by id with each item's outcome, like the batched read,
  never a `207`. Built when a route needs it.
- **Form-encoded callbacks** (OAuth `form_post`), with the redirects of auth slice B.

**Already settled, nothing to build:**
- **Language.** There is no negotiation: the surface translates codes (§5.5), authored text carries
  its language (`./text`), and a write that needs a locale takes it as a field (`signUp.locale`).

**Ruled out:**
- field selection (`fields=`): the BFFs are shaped per screen;
- hypermedia links: the client is typed;
- `multipart`: uploads go through signed tickets;
- `207 Multi-Status`.

`HEAD`, `OPTIONS` and the CORS preflight are the server's concern. Health stays outside the
contracts (§5.10).

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
   - `Endpoints<...>`, `HandlerInput`, `HandlerOutput` and `@EndpointInput` (§8);
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
