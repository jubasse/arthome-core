# service-api-model — handover

What the author of the next service api (catalog's, ticketing's) would get wrong. The model is
`packages/contracts/src/http/service.ts`, the first api is `streaming-service-api/`, and the README's
"A service API" says how to write one.

## 1. The folder name is load-bearing

`<service>-service-api`, exactly. `tools/contract-types.mjs` finds module folders under any
`*-api`, and `tools/generate-openapi.py` writes one `openapi/<service>-service.yaml` per
`*-service-api` it finds. A folder named otherwise gets no `types.ts` and no document, and nothing
says so. Then, by hand:

- the two subpaths in `packages/contracts/package.json` (`./<service>-service-api`, `/docs`);
- the document in `check:openapi` and `check:vocabulary` (root `package.json`), which take a list;
- the folder in `repo-map.purposes.json`, or `arthome-generate-map` refuses to write;
- the api in the six spec lists that name every api (`routes-listed`, `deny-by-default`,
  `inline-docs`, `examples-parse`, `maturity`, `throttle-buckets`);
- `scheme: 'bearer'` in its docs needs its line in `tools/enum-literals.allow.json`.

## 2. Every route names its callers

`callerService(InternalTokenIssuer.X)` on every route, set on the block's builder. A route without
it lets either BFF in, and neither the builder nor the platform's boot notices. `service-apis.spec.ts`
finds every `*-service-api` and holds each route to it (internal, on `service`, a caller rule that
includes its public operation's BFF, never public or optional), so a new api needs no spec of its
own for that, only the folder name of §1.

## 3. The codes are the public operation's, and the spec reads them

A service route that serves a public operation keeps its codes, as a superset, and its paging.
`service-apis.spec.ts` compares them against the public route at run time, so a code added to the
BFF's operation fails until the service route declares it too. It leaves out only what the BFF answers
of its own: its identity's codes (the CSRF `403`, `api.rights_version_stale`), its rules' (the rate
limit, a re-authentication), and the transport codes its shared responses stand for where the
service model's do not (`502`, `503`, `api.upstream_timeout`, a list's `410`). Every other code
counts: the studio's `409` stands for `state.conflict`, so `resolveIncident` declares it, and a
catalog list's `api.sort_key_forbidden` or `api.period_filter_required` is the service's to declare.

## 4. The principal carries the profile and the device

`ServicePrincipalSchema` is `{ callingService, userId, profileId?, deviceId? }`, from the token's
`iss`, `sub`, `pro` and `did`. A handler reads who calls there, never from a body: a body
`profileId` or `deviceId` other than the principal's is refused `403 api.forbidden`. **The body
never picks the profile**: a route that reads it refuses `403 api.forbidden` a token without `pro`,
even when the body names one, and its docs say so (`PROFILE_FROM_THE_TOKEN`, appended through
`operationDocsOf`). A field the token does not carry is absent from the principal, never `null`
or `undefined`: under `exactOptionalPropertyTypes` the platform's `ServiceIdentity` omits it.

## 5. No `version` at the envelope's root

Catalog's and ticketing's services answer a conditional command's `version` at the envelope's root
(the platform's `SuccessEnvelope`). A service api does not: `ServiceEnvelopeMetaSchema` is
`{ servedAt, validUntil? }`, and a versioned record carries its `version` inside `data`
(`transport.md` §5.5). Moving catalog or ticketing to the model moves that field too.

## 6. The docs and examples are borrowed, not copied

`operationDocsOf(studioDocs, [...])` and `studioDocs.examples.entriesOf([...])` hand the service the
public operation's prose and examples. Only what no surface sees gets its own `docs.ts` entry and
example. A batched read is a `POST` without a key: its docs need an `idempotencyExemption`, or
`check-openapi` R11 fails.

## 7. What check-openapi wants of a service document

The component names are not free: `IdempotencyKey` (R11), `Traceparent` (R12), `EnvelopeMeta`
(R15), `ErrorEnvelope` and `Error` (R10). The `service` identity adds `traceparent` to every route
for R12; it is optional and unpatterned, because the platform never refuses a malformed one.
