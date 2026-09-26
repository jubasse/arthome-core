# BFF → service transport, and the contract for synchronous calls

> **Status**: accepted · **Date**: 21 September 2026 · **Author**: `backend-contracts`
> **Decides**: the transport of synchronous **BFF → service** calls, and the exact shape of those
> calls in the transport chosen.
> **Does not decide**: the inter-service transport — there is none, it is Kafka and nothing else
> (`events.md`). Nor the shape of the two BFF contracts, which is in `openapi/`.

---

## 0. The decision, in one line

> **HTTP/1.1 keep-alive, JSON payloads, described in OpenAPI 3.1 generated from zod.
> One OpenAPI document per service, beside the two BFF documents. No gRPC.**

And the counterpart, written in the same breath because without it the decision is incomplete:
**an explicit deadline travels in a header on every call** (§5.3), and **every service checks it**,
exactly as it would have to check `call.cancelled` under gRPC.

---

## 1. The number I decide on — and what `backend-domain`'s count really measures

`context-map.md` §10 gives an honest and complete count:

| | |
|---|---|
| distinct read methods | **60** |
| distinct write methods | **132** |
| **total** | **192** |
| internal calls **per screen** | **1 to 4, all parallel** |
| `home`, `live`, `category`, `artist`, `search` | 4 (one composed read model plus three batched overlays) |
| `player` | **1** |
| `confirm` | **0** |
| **depth of a call chain** | **1** |

**192 is a count of *methods*. It is not a count of *calls*.** And gRPC's two real advantages — the
**propagated deadline** and **multiplexing a stream** — pay off on neither of those on a count of
methods. They pay off on the **depth of a chain** and on the **volume of a single call**.

Now, the depth of a chain in this architecture is **1**, and it is so **by construction**: "no
synchronous call between services" is the project's first rule. A deadline has nobody to propagate
to. There is **not one point in the system** where a service calls another and has to pass on the
time it has left.

> **The number I decide on is therefore not 192. It is 1 — the depth — and 4 — a screen's maximum
> parallel fan-out.**

At depth 1 and fan-out 4, a `Promise.allSettled` of four HTTP requests with four
`AbortSignal.timeout` does exactly what four gRPC calls with four `deadline`s would do. A screen's
latency is that of the slowest call in both cases.

**The 4 was measured, not assumed — and it was wrong at delivery.** The adversarial review counted
`x-arthome-upstream` across both documents and found **two operations at 5**, that is, the alert
threshold crossed on the very day it was written. Both were investigated:

| Operation | What the count said | What was done |
|---|---|---|
| `getDateDetail` | 5 — `catalog, ticketing, identity, streaming, chat` | **composed, hence back down to 4.** `chat` was **both projected and called**: the chat regime already arrives in `date_detail_public` through `chat.date_chat_policy_changed`. We were paying for a call to fetch data we already held. That is the gesture the threshold prescribes — "the read model is missing" — except that here it was not missing, it was ignored |
| `listChannelJournal` | 5 — five services | **exception declared in the contract** (`x-arthome-fanout-exception`), pending an owner. The audit log is a query-time join over an artifact kept for 24 months, and **it has no owning context**: no aggregate defines it, it appears in no read-model table. This is not a transport defect, it is a hole in the model — escalated to the lead |

And a third, which I had created myself while writing the studio's invalidation feed: `listChanges`
and `listStudioChanges` declared four and six services. **They call none** — they read the Redis
resume buffer the real-time gateway already keeps per room, and they are the HTTP pull of the same
stream the channel pushes. Both now carry `x-arthome-upstream: [realtime]`. Declaring a composition
that does not happen skews the measurement in the reassuring direction, which is the worse of the
two.

**State after correction**: storefront `1:53 · 2:6 · 3:6 · 4:7`, studio
`1:71 · 2:3 · 3:4 · 4:1 · 5:1`, the single 5 carrying its written exception. **The threshold of 4
holds everywhere else, and it is now checkable in one command** — which is what
`x-arthome-upstream` existed to make possible and what nobody had run.

**What 192 really measures** is the cost of **describing** and **generating**. And there the
question is not "gRPC or HTTP", it is "where does the schema come from". It comes from zod
(a settled decision), in both cases.

---

## 2. The four criteria, weighed

### 2.1 The deadline — gRPC's main argument, and it is weaker than announced

`context-map.md` §10.3 puts it this way: *"a BFF → service call has a deadline that crosses and
propagates, which HTTP/JSON does not offer natively"*. That is correct on paper. Three facts reduce
it:

1. **It propagates nowhere**: depth 1 (§1).
2. **Under NestJS, it does not stop the callee.** The `nestjs-grpc` skill is explicit (rule 7):
   *"Nest never cancels a unary handler, so work and side effects outlive `DEADLINE_EXCEEDED`"*.
   You have to read `call.cancelled` **by hand**, in every long handler. That is exactly the same
   work as reading a deadline header by hand. gRPC's "free" is not free here.
3. **What we actually want is for the caller to give up**, and to do so with a usable code.
   `AbortSignal.timeout(ms)` closes the socket; the service sees `req.destroyed` / `'close'` in the
   same place where it would have read `call.cancelled`.

**What I keep from the idea all the same**: the deadline is not a local duration the caller decides
on its own, it is a piece of **contract information**. It travels in a header, it is written in
`openapi/`, and it is part of a service's definition of done (§5.3).

### 2.2 Typing and generation — and the E2 trap, at system scale

This is where the argument turns, and it is an argument the count does not give.

`corrections-handoff.md` E2 establishes the project's dominant failure mode: **the parallel literal
table**, committed on eight fields by five designs despite an explicit principle.
`code-conventions.md` §5.3 makes it its most important section and gives it a gate. `events.md` §5.3
draws the rule: *"zod lives at the HTTP boundary, and only there. Mixing the two would cost a second
schema to maintain for not one more guarantee — and the drift between them would be the next
parallel table."*

Let us count the **declarations** of one boundary vocabulary, say `ChatMode`:

| | today | with gRPC over the 192 methods |
|---|---|---|
| literal union in `@arthome/core` | 1 | 1 |
| zod schema in `@arthome/contracts` | **0** — `z.enum(CHAT_MODES)` **derives**, it does not declare | 0 |
| **event** `.proto` | 1 — hand-written, the duplication `events.md` accepts | 1 |
| **synchronous service** `.proto` | — | **1 more, hand-written** |
| **total declarations to keep in agreement** | **2** | **3** |

Choosing gRPC for the synchronous path takes the number of hand-written declarations of every
closed vocabulary in the system from **two to three** — and there are dozens of them. That is
**+50% of surface exposed to the project's dominant fault**, against a deadline that propagates
nowhere and does not stop the callee anyway.

And it is not only the enumerations: it is every shape. `PlaybackTicket`, `WatchVerdict`,
`CartQuote`, `PayoutLine` would exist in zod for the public boundary **and** in Protobuf for the
internal boundary, over the same data, in the same repository.

**In HTTP/JSON, the schema of the BFF → service boundary is the same zod object as the one for the
surface → BFF boundary.** A single `z.object`, two OpenAPI documents generated from it. Not one
extra declaration.

> That is the real saving, and it is invisible in a count of methods.

### 2.3 Operation by one person alone

`context-map.md` §10.3 lists honestly what gRPC costs; I take it up and put a number on what each
line demands **on top of** an HTTP stack that is necessary anyway (Traefik, the two BFFs, the seven
services that already expose a `/health`).

| gRPC cost | Verified detail | What must be written or configured on top |
|---|---|---|
| `h2c` at Traefik | cleartext HTTP/2 towards the services, or internal TLS | 7 `serversTransport` entries plus the risk of an `h2c` that silently falls back to HTTP/1 |
| no `curl` | `grpcurl`, or reflection — **and reflection is not exposed in production** (skill, rule 13) | one more binary on the workstation, and a debugging path that does not exist in production |
| probes | `grpc-health-check` + `HealthImplementation.addToServer` in `onLoadPackageDefinition`, and the skill notes that **the documentation snippet does not compile** (rule 13) | ~20 lines × 7 services, and a `NOT_SERVING` to set on shutdown |
| graceful shutdown | `gracefulShutdown: true`, **undocumented**; the default is `forceShutdown()`, which cuts in-flight calls **on every deployment** (rule 3) | a flag you only discover by reading the skill, plus `max_connection_age_ms` + `_grace_ms` (rule 4) |
| load balancing | headless Service + `grpc.service_config` `round_robin` — a ClusterIP **pins a single pod** (rule 5) | a Kubernetes configuration the HTTP path does not require |
| errors | `Grpc*Exception` + `GrpcExceptionFilter`, and **the stock filter does not log**: every unexpected error is a silent `UNKNOWN` (rules 1–2) | a bespoke filter × 7, plus the mapping table to our envelope |
| build | `.proto` files are not compiled: `"assets"` in `nest-cli.json`, otherwise **the service starts and fails on the first call** (`code-conventions.md` §6.5) | one more silent trap |
| limits | `maxReceiveMessageLength` (default 4 MiB) on the receiver | a setting not to forget on batched reads |

**Eight traps, five of them silent** — they do not break the build, they break production. For one
person alone operating seven services, that is the decisive criterion, and `context-map.md` §10.3
already names it.

Against that, the honest cost of HTTP/JSON: **there is no free client generator supplied by
`buf`**. But there is one supplied by OpenAPI, and above all: the BFF → service client is **typed
by the same `z.infer` as the rest of the repository**, with no generation at all inside
`arthome-platform`. Generation only serves the five surfaces, and they consume the two BFF
documents, not the services'.

### 2.4 The day it breaks, at 8.45 p.m., during a live show

This is the criterion the tables do not carry and the one that counts most here.

An incident mid-broadcast: the studio displays "our servers", the control room phones. The question
is "which service is refusing, and with which code". With HTTP/JSON, the answer fits on one line of
terminal:

```sh
curl -sS -H "authorization: Bearer $(arthome mint-token streaming)" \
     -H "traceparent: 00-$(openssl rand -hex 16)-$(openssl rand -hex 8)-01" \
     http://streaming.internal/v1/dates/$DATE_ID/run | jq .
```

With gRPC, the same question needs `grpcurl`, the service descriptor (since reflection is not
exposed in production), and the reconstruction of a `Metadata`. It is not impossible; it is longer
at the precise moment when time is short, and it is a path we have not rehearsed.

**`storefront-tv` stated the same requirement from the other end**: *"every response from the
system, including under overload, must carry the error envelope with its code and its trace
identifier"*. That requirement reaches all the way up to Traefik. With an internal HTTP path,
Traefik, the BFFs and the seven services speak **a single error language** — ours. With gRPC there
is Traefik's language (HTTP), the BFFs' (HTTP) and the services' (16 gRPC statuses), plus a mapping
table to keep in every BFF adapter.

---

## 3. The decision, and what it is not

**Adopted: HTTP/1.1 with keep-alive, JSON, OpenAPI 3.1 generated from zod.**

**What it is not**:

- it is **not** a rejection of Protobuf. Protobuf remains the format of **everything** that goes
  through Kafka, with `buf`, the registry and `RecordNameStrategy` — `events.md` does not move a
  line. Two boundaries, two formats, and **each has only one**;
- it is **not** REST in the "pure resources" sense. A business command is a command:
  `POST /v1/dates/{dateId}/publication/transitions` is a verb, it is owned as such, and its
  `operationId` is `moveDatePublicationState`. You do not twist a state machine into a `PATCH`;
- it is **not** "HTTP/2 forbidden". If Traefik and Node negotiate HTTP/2 one day, nothing about the
  contract changes. We do not **configure** it today because we do not need it: 4 parallel requests
  fit in an HTTP/1.1 agent's keep-alive pool at no measurable cost.

**The one place where gRPC would win** is the one `context-map.md` §10.3 names: reads batched by a
list of identifiers. They are handled in HTTP by **a `POST` used as a read** (§5.6), which is ugly
in REST vocabulary and perfectly right in ours: a batch of 200 identifiers does not fit in a query
string, and the response is a table, not a list.

---

## 4. What we lose, and how we make up for it

| Lost by setting gRPC aside | Written compensation | Where |
|---|---|---|
| native crossing deadline | `x-arthome-deadline` header, RFC 3339 instant, **checked by the service** | §5.3 |
| cancellation on the callee side | identical under gRPC (rule 7): `req.on('close')` instead of `call.cancelled` | §5.3 |
| compact binary | JSON + `content-encoding: gzip` on responses > 1 KiB. Internal payloads are read models of a few tens of KiB, not streams | §5.7 |
| typed statuses | **one** mapping table, in `@arthome/contracts`, between domain error code and HTTP status | §5.5 |
| client generation by `buf` | generation by OpenAPI for the five surfaces; `z.infer` inside `arthome-platform`, with no generation | §5.8 |
| bidirectional streaming | there is none in `backend-domain`'s count. Real time is Socket.IO (`realtime.md`), not a BFF → service path | — |

---

## 5. The contract for synchronous BFF → service calls

This section **is** the contract. It holds for all 192 methods, and a service that does not honour
it is not done (`definition-of-done.md`).

### 5.1 Addressing and path shape

```
http://<service>.internal/v<major>/<resource>[/<id>][/<sub-resource>][/<command>]
```

- `<service>` ∈ `identity · catalog · ticketing · streaming · chat · payouts · notifications`;
- **no internal TLS** at tier 1: the cluster network is the trust boundary, and authorisation is
  carried by the token (§5.2), not by the transport. The day the cluster is shared, `credentials`
  is added without touching the contract;
- `v<major>` is the **major version of the service's contract**, independent of the BFFs';
- a **read** is a `GET`, except a batched read (§5.6);
- a **command** is a `POST` on a path that names it, or `PUT`/`PATCH`/`DELETE` when the command
  *is* a put (`PUT /v1/follows/{artistId}`, and `storefront-mobile` is right: a relation is a put,
  never a toggle).

**`operationId` is stable and it is the key to client generation.** Shape:
`<verb><Object>[<Qualifier>]`, in `lowerCamelCase`, unique across the whole document. It **never**
changes without a major change, even if the TypeScript method implementing it is renamed — the
`nestjs-openapi` skill names it as client generation's trap number one. It is therefore **written
explicitly** (`operationIdFactory` pinned), never derived from a method name.

### 5.2 Request headers

| Header | Mandatory | Content | Reason |
|---|---|---|---|
| `authorization` | **yes** | `Bearer <ES256 JWT, ~60 s>`, minted by the BFF, `aud: arthome.<service>` | `adr-auth.md` §8. A token minted for `ticketing` is **refused** by `payouts` |
| `traceparent` | **yes** | W3C, created at the BFF, propagated unmodified | `events.md` §1.3; it is the one injected into `outbox_event.tracecontext` |
| `x-arthome-deadline` | **yes** | RFC 3339 UTC instant, `2026-09-21T20:45:13.400Z` | §5.3 |
| `idempotency-key` | **on every money or commitment write** | UUIDv7 generated **by the surface**, relayed as-is | §5.4 |
| `x-arthome-actor-surface` | on every human write | `storefront-web · storefront-mobile · storefront-tv · studio-web · studio-mobile · system` | the studio log names names **and places them** (`common.proto` `Surface`) |
| `accept-encoding` | recommended | `gzip` | §5.7 |

**Never `x-user-id`, nor `x-roles`, nor any identity header in the clear.** Any caller can set
them; the `nestjs-bff-gateway` skill makes it its rule 7 and `adr-auth.md` §8 repeats it. Identity
is **in the token, and nowhere else**.

**And the corollary, which is a critical rule**: a service **never skips its authorisation**
because "only the BFF calls me". Every command carries the identifier of the resource targeted, and
the service checks ownership **on the loaded instance** — not merely the role carried by the token,
because a one-off access to a date expires inside the token's lifetime (`adr-auth.md` §7).

### 5.3 The deadline — how it replaces `deadline`

```
x-arthome-deadline: 2026-09-21T20:45:13.400Z
```

**Three obligations, one per end:**

1. **The BFF computes it** from the screen's budget (§5.9) and sets it on each of the parallel
   calls. It arms the same instant locally through `AbortSignal.timeout`, so that giving up locally
   and giving up remotely are the same instant.
2. **The service reads it** and applies it at two points: **before** opening a transaction or
   launching an expensive query, and **between** the units of an iterative job. If it has passed,
   the service answers `504` with the code `api.deadline_exceeded` and **writes nothing**.
3. **The service listens for the socket closing** (`req.on('close')` before the response ends) and
   stops what it can stop. That is exactly the work `call.cancelled` demands under gRPC
   (`nestjs-grpc` skill, rule 7); the HTTP path makes it neither more nor less necessary.

**The deadline is not a suggestion and it is not renegotiated.** A service receiving a deadline
already past refuses immediately: that is cheaper than work whose result nobody is waiting for.

**Why an instant and not a duration.** A duration (`grpc-timeout: 800m`) assumes the two
clocks advance at the same rate, which is true, but it loses the time the network has already
consumed. An absolute instant is **the same value for a screen's four parallel calls**, which makes
a screen budget legible in a log. Clocks are disciplined by NTP with the same ± 30 s tolerance as
the tokens (`adr-auth.md` §9.4).

### 5.4 Idempotency — and `storefront-web`'s question (Q9), settled

**The decision: a replayed key returns the first attempt's response, verbatim. Never a duplicate
error.**

The reason is `storefront-web`'s, and it is right: **it is the difference between a safe retry and
a lost seat.** A replay that fails turns a network hiccup into a failed purchase, when the purchase
succeeded. On mobile, where a Wi-Fi → cellular handover cuts a request in the middle without the
client knowing whether the write landed, that is the **nominal** case, not the degraded one.

**The store, per service**:

```
idempotency_record
  key             text      ← the header, as received
  account_id      uuid      ← the key is scoped to the account: two accounts never collide
  fingerprint     text      ← canonical fingerprint (method + path + normalised body)
  state           in_flight | completed
  status_code     int       ← memorised at the end of the transaction
  response_body   jsonb
  created_at      timestamptz
  expires_at      timestamptz   ← created_at + 24 h
  PRIMARY KEY (account_id, key)
```

<!-- arthome-codes-source: ERROR_CODES -->

**The four cases, and there is no fifth:**

| Case | Response | Reason |
|---|---|---|
| unknown key | normal execution; the `idempotency_record` row is written **inside the business transaction** | without that, a crash between the write and the memorisation replays the effect |
| known key, `completed`, **same fingerprint** | the original response, **verbatim**, with `idempotency-replayed: true` | the response is the proof the effect took place |
| known key, `completed`, **different fingerprint** | `409` `api.idempotency_key_reused`, nothing is executed | the key promised one effect; serving another would be worse than refusing |
| known key, `in_flight` | `409` `api.idempotency_in_flight`, parameter `retryAfterMs` | never two concurrent executions of the same intention |

**Three points that make the difference:**

- **`24 h` lifetime**, aligned with `storefront-mobile`'s offline queue (Q7): a command queued in
  the evening and replayed the next morning must land on the same response;
- **a replayed response is not a fresh response.** The body is verbatim, so its `servedAt` is the
  first attempt's. The response additionally carries an `x-arthome-served-at` header **of the
  replay**, and a client that needs a perishable value reads again. A replay proves an effect took
  place; it does not promise up-to-date data;
- **the key is generated by the surface, before sending, and persisted before sending**
  (`storefront-mobile`). The BFF relays it **without rewriting it**: a key regenerated by the BFF
  protects nothing, since it is the client that replays.

**What does NOT carry an idempotency key, and it is a decision**: `recordPlaybackPosition`. It is
the most frequent write in the system; one key per 30 s slice, per viewer and per live show would
make the idempotency store the hottest table in `streaming` in order to protect a write whose loss
has no consequence. It is **last writer wins, with a server-side rank** (`data-model.md` §5.5).

### 5.5 The response envelope and the error envelope

**Every success response** carries, at the root level:

```jsonc
{
  "servedAt": "2026-09-21T20:31:04.118Z",  // ALWAYS. Every countdown refers to it
  "validUntil": "2026-09-21T20:31:34.118Z", // as soon as a perishable value is present
  "data": { }                               // or "items" + "page" for a collection
}
```

and, where applicable: `version` (on every aggregate a conditional command might target) and
`lastEventSeq` (on every read model fed by a stream).

**Every error response**, from the service, from the BFF **and from Traefik**, carries exactly
this:

```jsonc
{
  "error": {
    "code": "TRANSITION_IRREVERSIBLE",       // closed vocabulary, i18n by codes
    "nature": "refused",                     // refused | unavailable | offline_forbidden
    "params": { "from": "scheduled", "to": "reserve", "promise": "prices_engaged" },
    "traceId": "4bf92f3577b34da6a3ce929d0e0e4736"
  },
  "servedAt": "2026-09-21T20:31:04.118Z"
}
```

- **`code` is a code, never a sentence.** A zod validation failure becomes `api.schema_invalid` with
  the field paths in `params` — **never** zod's English message;
- **`traceId` is the `trace-id` part of the `traceparent`**, readable and copyable from the error
  screen. On mobile it is the only link between "my app crashed" and a server log;
- **`nature` is what `studio-mobile` requires**, and it is the decision someone on duty must make
  in ten seconds. **The server never emits `offline_forbidden`**: that is the nature of a **local**
  refusal, produced by the surface before anything is sent. It is in the vocabulary so that the
  surface has **one** error shape to render, not two.

**The status ↔ nature mapping table, single, in `@arthome/contracts`:**

**The codes below are spelled as the wire spells them**, `api.schema_invalid` and not
`SCHEMA_INVALID`. The contracts pin that shape — `pattern: '^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$'`
— so a code written in the constant's spelling is one no service can emit and no surface can match.
`ApiErrorCode.SCHEMA_INVALID` is the **TypeScript accessor**; its value is `api.schema_invalid`.
This table said the accessor for every row until `check-vocabulary` was taught to read it.

<!-- arthome-codes-source: ERROR_CODES -->

| Status | `nature` | Typical codes |
|---|---|---|
| `400` | `refused` | `api.schema_invalid`, `api.period_filter_required` |
| `401` | `refused` | `api.unauthenticated`, `api.token_expired` |
| `403` | `refused` | `api.forbidden`, `api.sort_key_forbidden`, `api.rights_version_stale`, `pairing.identity_mismatch` |
| `404` | `refused` | `api.not_found` |
| `409` | `refused` | `api.state_conflict`, `publication.transition_irreversible`, `moderation.already_settled`, `order.price_stale`, `order.sold_out`, `api.idempotency_key_reused`, `api.idempotency_in_flight`, `capacity.tier_must_widen` |
| `410` | `refused` | `api.cursor_too_old`, `pairing.expired`, `watch.replay_expired` |
| `429` | `unavailable` | `api.rate_limited`, `chat.rate_limited` (param `retryAfterMs`) |
| `500` | `unavailable` | `api.internal` — **never** the original error's message |
| `502` | `unavailable` | `api.upstream_unavailable` (the BFF, for a service that failed) |
| `503` | `unavailable` | `api.service_unavailable` (shutting down, dependency absent) |
| `504` | `unavailable` | `api.deadline_exceeded`, `api.upstream_timeout` |

**"Typical", and the word is load-bearing**: this table names the codes worth knowing per status, not
all 67 of `ERROR_CODES`. A code absent from it is not a defect — a code *in* it that the vocabulary
does not carry is, which is what the gate checks.

**The BFF never relays a service error as-is** (`nestjs-bff-gateway` skill, rule 6). It maps an
**allowlist** of domain codes, which cross with their `params`, and everything else becomes
`api.upstream_unavailable` / `api.upstream_timeout`, the original being logged with the `traceId`. The
allowlist lives in `@arthome/contracts`: a code that is not in it cannot reach a surface, which
forbids an internal message from leaking.

**Traefik is inside the perimeter.** It must serve this envelope on the 5xx it produces itself
(`errors` middleware pointing at a static service), with `nature: "unavailable"` and
`code` = `api.gateway_unavailable`. A raw HTML page would make the "your connection" / "our servers"
distinction impossible, and `storefront-tv` is right: the viewer will go and reboot their router.

**Nine of the codes this section names do not exist yet**, and each is recorded in
`tools/codes-promised.json` with the reason nobody can emit it — the BFF, pairing, idempotency and
Traefik are all unbuilt, so inventing the members now would be publishing contract for flows nobody
is writing. That file is single and keyed by code rather than kept per document: a promise is a fact
about the vocabulary, and one reason with two homes is a reason that drifts. `check-vocabulary`
retracts an entry the day a package exports the code, so the list cannot rot into a set of promises
nobody remembers making.


**TWO OF THIS TABLE'S "MISSING" CODES WERE NEVER MISSING**, and both were found by reading the
vocabulary rather than the table. `UPSTREAM_ERROR` is `api.upstream_unavailable`, exported all along.
`CAPACITY_SHRINK_FORBIDDEN` is `capacity.tier_must_widen`: one invariant, not two — `seats.ts`'s
`assertTierWidens` throws that code on a reduction, and its test is named *"refuses a shrink"*.
"The tier must widen" is what you say to someone submitting a tier that is not wider, which a
reduction is.

A stale spelling reads exactly like a gap, and it reads like one twice as easily when the name
describes the refusal from the caller's side (`shrink_forbidden`) and the code describes it from the
rule's (`tier_must_widen`). That is the second reason the comparison is worth automating: a human
counting names cannot tell a missing member from a renamed one, and both times the guess was that a
member was missing.

### 5.6 Reads — and the batched read

**A simple read is a `GET`**, cacheable, with its declared freshness (§5.9).

**A batched read is a `POST` on `/batch`**, and it is owned as such:

```http
POST /v1/viewer-overlay/batch
content-type: application/json

{ "profileId": "…", "dateIds": ["…", "…", … ] }   // up to 200
```

```jsonc
{
  "servedAt": "…",
  "validUntil": "…",
  "data": { "<dateId>": { "owned": true, "watchVerdict": { … } }, … }   // a TABLE, not a list
}
```

Three reasons, in order: 200 identifiers do not fit in a query string; the response is an **indexed
table** the BFF merges by identifier without walking it; and a `GET` with a body is not reliably
transportable. **These reads are not cacheable by HTTP** — they are cached in the BFF's Redis, per
profile, TTL 30 s, invalidated by the profile's writes (`context-map.md` §10.1).
**These are exactly the three overlays** of §10.1: `ticketing.getViewerOverlayBatch`,
`identity.getViewerRelationsBatch`, `streaming.getViewerProgressBatch`. There are no others, and
**there must never be a fourth without `context-map.md` §11(a)'s threshold being crossed**: beyond
four internal calls on a list screen, it is not an overlay that is missing, it is a read model.

**The corollary, and it is a line of `definition-of-done.md`**: a batched read **never** takes one
identifier at a time. A service exposing `getViewerOverlay(dateId)` without its batch will be
called once per card, and the BFF will grow fat.

### 5.7 Negotiation, compression, size

- `content-type: application/json; charset=utf-8`, always. No format negotiation: a single format
  is one less thing that diverges;
- **`gzip` on every response over 1 KiB.** The composed read models (`home` = 60 to 100 cards
  ≈ 50 to 90 KiB raw) come down under 15 KiB; that is the order of magnitude a television can hold
  on a 5 s cold start;
<!-- arthome-codes-source: ERROR_CODES -->

- **inbound body ceiling: 1 MiB**, except `/batch` (2 MiB). A service receiving more refuses with
  `413` `api.payload_too_large`;
- **no binary crosses this path.** A poster, a FEC export, an invoice go through a **short-lived
  signed URL** obtained by a JSON command (`data-model.md` §7.5, `studio-mobile` Q9: upload 15 min,
  export 60 min). No `multipart` from a WebView, no PDF in an API response.

### 5.8 The client, on the BFF side

**One adapter per service**, and nothing else speaks HTTP inside a BFF. Each adapter:

1. **bounds the call** — `AbortSignal.timeout` aligned on `x-arthome-deadline`, tighter for an
   optional part (`nestjs-bff-gateway` skill, rule 5);
2. **fans out in parallel** — `Promise.allSettled`, never `Promise.all`: an optional overlay that
   fails **degrades** the response and names itself in the payload (`degraded: ["viewerProgress"]`),
   it does not sink the screen (rule 4). The composed read model, by contrast, is **required**: its
   failure is the request's failure;
3. **maps the error** (§5.5), and **logs the original** — Nest never logs an `HttpException`;
4. **replays nothing.** Retry lives at **one layer only**, and that layer is the surface: it holds
   the idempotency key, it knows whether the user is still waiting, and a BFF replaying a write
   would duplicate work the service may already have finished.

**What an adapter does not do**: compute a price, a discount, a right, a row order, a threshold.
`decideWatch` in **advisory** mode is the one rule a BFF evaluates, and the contract declares it
`advisory: true` on the field (`context-map.md` §3).

**Typing.** Inside `arthome-platform`, a service's client is typed by `@arthome/contracts`'
`z.infer<typeof …>` — **no generation at all**. The five surfaces, for their part, generate their
client from `openapi/storefront.yaml` or `openapi/studio.yaml`.

### 5.9 Budgets and freshness — what the contract promises

**Latency budgets** (p95, from BFF to service, deadline included):

| Path | Budget | Reason |
|---|---|---|
| `streaming.openPlayback` | **≤ 1 s** | within a total budget of ~10 s to first frame (`storefront-tv`) |
| composed public read (`home`, `live`, `category`, `artist`) | **≤ 400 ms** | `context-map.md` §11(a)'s alert threshold |
| batched read (overlay) | ≤ 150 ms | four in parallel, under the screen's budget |
| money write | ≤ 2 s | one transaction, one capacity check, one idempotency store |
| search | **≤ 200 ms** | otherwise the TV's typing feedback falls behind (`storefront-tv`) |

**Guaranteed freshness per family** — `data-model.md` §4, repeated here because it is the BFF that
sets it as `cache-control` and the surface that maps it onto its client cache:

| Family | Freshness | `cache-control` set by the BFF |
|---|---|---|
| taxonomy, labels | immutable artifact | `public, max-age=86400, immutable` |
| `category`, `artist`, `plans`, `account` | 5 min | `private, max-age=300` |
| `home`, `tickets`, `list`, `replays` | 60 s | `private, max-age=60` |
| `live`, capacity, counters | 15 s | `private, max-age=15` |
| `PlaybackTicket`, `WatchVerdict`, stream key | **never** | **`no-store`** |

`no-store` on the stream key and the playback token is not an optimisation: it is what keeps them
out of the phone's HTTP cache and out of the application snapshot the OS takes when it goes to the
background (`data-model.md` §5.2).

### 5.10 Health and shutdown

| Entry point | What it says | Who reads it |
|---|---|---|
| `GET /health/live` | the process answers | the orchestrator (restart) |
| `GET /health/ready` | database reachable, migrations up to date, Kafka consumer in its group | the orchestrator (routing) |
| `GET /health/ready` during shutdown | **`503` immediately**, before closing anything | that is what drains Traefik's pool before the first socket is cut |

`app.enableShutdownHooks()`, and the order is: `ready` → 503, wait out the drain window, close the
HTTP server, **then** stop the Kafka consumer, **then** close the database.

That is three HTTP entry points a service exposes anyway, against `grpc-health-check` and its
`HealthImplementation.addToServer` — whose documentation snippet, the skill notes, does not
compile. It is one of §2.3's eight traps, and the most visible on every deployment.

### 5.11 Versioning and maturity — the distinction carried in the contracts

| Context | Regime | CI gate on its OpenAPI |
|---|---|---|
| `identity`, `catalog`, `ticketing` | **stable** | `oasdiff breaking` **blocking**: additions only |
| `streaming`, `chat`, `payouts`, `notifications` | **provisional** | `oasdiff` as a **warning**, `oasdiff changelog` logged |

It is the same cut as `buf.yaml` for the events, with the same exit rule: the exception line is
removed **the day the context's tier ships**, never before.

**What "stable" allows, and nothing else**: adding an entry point, adding an **optional** property
to a response, adding a value to an enumeration, adding an **optional** parameter. Everything else
is a `v2` of the service, served **beside** the `v1` until both BFFs have migrated.

**And the rule that makes an enumeration extensible without breaking a television**
(`storefront-tv` Q12, `context-map.md` §13): an unknown enumeration value is **kept raw and treated
as neutral**, never rejected. On the zod side, a bare `z.enum()` **does not do that** — it takes
`z.union([z.enum(VALUES), z.string()])` on **output** (tolerant read), and `z.enum(VALUES)` on
**input** (strict write). The two are not the same schema, and `z.toJSONSchema()`'s `io: "input"` /
`io: "output"` is exactly what separates them. Getting it wrong produces false documentation in
both directions.

---

## 6. The signal that would change my mind, written now

A transport decision with no condition for revision is a preference. Here are the three, and they
are measurable:

| Measurement | Threshold | Action |
|---|---|---|
| `bff_upstream_calls_per_request` p95 on a list screen | **> 4 sustained** | this is **not** a transport signal: it is a missing read model (`context-map.md` §11a). Create it **before** reopening this decision |
| depth of a synchronous call chain | **> 1** | the "no synchronous call between services" rule has given way. **Restore the rule**, and only if that is impossible, reopen gRPC — because that is the only case where a propagated deadline pays |
| p95 size of a composed read response, gzip applied | **> 300 KiB** | the cost of JSON serialisation is starting to weigh on the TV. Measure before concluding: it is more probably a read model that is too wide |

**What would not be a signal**: "there are 250 methods now". The count of methods was never the
argument (§1).

---

## 7. What I escalate

> **Closed.** `events.md` §6 drew the vertical flow in gRPC, anticipating a decision
> `context-map.md` §10.3 was leaving to me. `backend-domain` corrected it — the flow now reads
> `POST /v1/orders/seats · HTTP/JSON · traceparent in a header` — and recorded the decision in its
> §10.3. There is nothing left to arbitrate there, and leaving the escalation in place would keep
> someone waiting on a ruling about a defect that no longer exists.

1. **The client generator has no owner.** The five surfaces consume `openapi/storefront.yaml` or
   `openapi/studio.yaml`; nobody has been appointed to choose the tool, pin it and decide where the
   generated client is published (one more package in `arthome-core`? a `src/generated/**` folder
   per surface, already exempted from the lint by `code-conventions.md` §4.5?). My recommendation is
   the second — a generated client is not a contract, it is a surface convenience, and publishing it
   would create a third thing to keep running. To be assigned.
