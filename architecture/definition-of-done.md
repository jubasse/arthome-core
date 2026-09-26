# Definition of done

> What a service delivers to be "finished". Written by `backend-contracts`.
>
> **Scope**: the seven services of `arthome-platform`, the two BFFs, and the three published
> packages of `arthome-core`.
>
> **Boundary with the other two documents**: the imperative business rules are in
> `critical-rules.md` (under twenty lines, reread at every session); style, naming, tooling and the
> code-quality gates are in `code-conventions.md`. **This document does not copy them, it points at
> them.**

---

## 0. The two principles that govern everything below

**1. Nothing is written by hand.** For each artifact, this document says **who generates it and
when**. An artifact written by hand is an artifact that will drift from its source — that is E2,
the project's dominant fault, applied to documentation.

**2. A rule with no gate is an intention.** Every line below names the command that checks it, and
all of them run **locally**: the account's Actions quota is exhausted, and no gate in this document
assumes a remote runner.

The two meet in a single command per service:

```bash
pnpm --filter <service> run done
```

which chains, in this order — from the fastest and most explanatory to the slowest:

```jsonc
{
  "scripts": {
    "done": "pnpm run verify && pnpm run contracts:check && pnpm run test:integration && pnpm run trace:check"
  }
}
```

`verify` is the one from `code-conventions.md` §8.2 — versions, Prettier conflicts, formatting,
lint, typing, enumerations, unit tests. This document adds the other three.

---

## 1. The artifacts, and who produces them

| Artifact | Source | Generator | When | Gate |
|---|---|---|---|---|
| `openapi/<service>.yaml` | zod schemas from `@arthome/contracts` | `z.toJSONSchema()` + a `contracts:emit` script | on every `build` of the service | §2 |
| `openapi/storefront.yaml`, `openapi/studio.yaml` | the same, on the BFF side | the same | the same | §2 |
| `asyncapi/<service>.yaml` | the `proto/` catalogue + `events.md` | `asyncapi:emit` script, from the `buf` descriptors | on every `build` | §3 |
| TypeScript clients for the five surfaces | the two BFF OpenAPI documents | OpenAPI generator, output in `src/generated/**` | on every contract bump | §6 |
| internal BFF → service types | `z.infer<typeof …>` | **no generator** | — | §6 |
| `.d.ts` for `@arthome/core`, `@arthome/contracts`, `@arthome/tooling` | TypeScript | `tsc` | on every `build` | `code-conventions.md` §2.4 |
| i18n artifacts `/{surface}/{locale}/v{N}.json` | `@arthome/core`'s catalogue | CI job, immutable publication to MinIO → CDN | on every copy change | §7.5 |
| taxonomy artifacts `/taxonomy/{locale}/v{N}.json` | `@arthome/core` | the same | the same | §7.5 |
| **static JWKS document** | **four** rotations, one per issuer, plus an assembler with no secret | 30 d / 24 h grace (BFF) · 90 d / 7 d grace (playback, device) | **§7.6** |

> **The rule, stated once**: a generated artifact is **committed**, and the gate checks that
> regenerating it produces **no diff**. Committed without a gate, it drifts; generated without
> being committed, it cannot be reread in a review nor compared against the previous version.

---

## 2. One OpenAPI per service, and two for the BFFs

### 2.1 What is required

- **OpenAPI 3.1.1**, one document per service and one per BFF. The BFF documents live in
  `arthome-core`'s `openapi/` (that is the public contract); the services' live in
  `arthome-platform`, beside the service they describe.
- **Generated from zod**, never written by hand. Three traps, and they are in the generator:
  - **`z.date()` and `z.transform()` are unconvertible.** Instants are ISO `date-time` strings;
    **no boundary schema carries a transform**. A `z.transform()` found in a boundary schema makes
    generation **fail**, it does not ignore it;
  - **`io: "input"` describes a request, `io: "output"` describes a response.** Getting it wrong
    produces false documentation in both directions;
  - **a closed vocabulary does not have the same shape on input and on output.** On **input**,
    strict `z.enum(VALUES)`. On **output**, `z.union([z.enum(VALUES), z.string()])`, documented by
    `x-arthome-vocabulary` — an unknown value is **kept raw and treated as neutral**, never
    rejected. A bare `z.enum()` on output would fail a television's **entire page** the day the
    catalogue gains a 22nd discipline.
- **Stable and explicit `operationId`s.** `operationIdFactory` is pinned; the identifier is
  written, never derived from a method name. Renaming a TypeScript method must **never** rename a
  generated client function.
- **Error envelope as a shared component.** Every 4xx/5xx response references
  `#/components/responses/*` or `#/components/schemas/ErrorEnvelope`. No local error shape.
- **Examples on requests and on responses.** Every operation with a request body carries an
  example; every 2xx response carries an example. A contract without examples reads twice as slowly
  and is tested half as much.
- **Declared maturity**: `x-arthome-maturity: stable | provisional` on **every** operation.
- **Declared upstream service**: `x-arthome-upstream: [<service>…]` on every BFF operation. It is
  what makes the "at most four internal calls per screen" rule checkable.

### 2.2 The anti-drift gate

```bash
pnpm --filter <service> run contracts:emit -- --out /tmp/openapi.regen.yaml
diff -u openapi/<service>.yaml /tmp/openapi.regen.yaml    # must be empty
```

In practice, in the script:

```jsonc
{ "contracts:check": "pnpm run contracts:emit && git diff --exit-code -- openapi/ asyncapi/" }
```

**A service whose regenerated document differs from the committed one is not finished.** It is the
same discipline as `code-conventions.md`'s gate no. 8 on the `.d.ts` files.

### 2.3 The project-rules conformance gate

A Python checker, with no dependency beyond PyYAML, committed as **`tools/check-openapi.py`** in
`arthome-core` and exposed as a `bin` of `@arthome/tooling`:

```bash
python3 tools/check-openapi.py openapi/*.yaml
```

Nineteen rules, each of them because it has a consequence:

| # | Rule | What it prevents |
|---|---|---|
| R1 | `openapi` is 3.1.x | the 3.0 shapes (`nullable`, boolean `exclusiveMinimum`) that do not convert |
| R2 | no `nullable`, numeric `exclusiveMinimum` | a 3.0 document disguised as a 3.1 one |
| R3 | every `$ref` resolves, no external `$ref` | a contract that cannot be read on its own |
| R4 | `operationId` present, `lowerCamelCase`, unique | a generated client that renames itself |
| R5 | `summary` **and** `description` on every operation | a contract that has to be explained out loud |
| R6 | `x-arthome-maturity` ∈ {stable, provisional} | an unguarded break on a stable context |
| R7 | `x-arthome-upstream` non-empty | an uncounted internal call |
| R8 | example on every request body | an untestable contract |
| R9 | at least one 2xx, with an example | the same |
| R10 | every 4xx/5xx goes through the shared envelope | a second error shape |
| R11 | `Idempotency-Key` on every write, **unless the operation declares an exemption with its reason** | a double purchase on a network that hands over |
| R12 | `traceparent` on every operation | a trace that stops at the boundary |
| R13 | no `labelFr`/`labelEn`/`messageFr`/`messageEn` field | an i18n leak **in the data** (E8) |
| R14 | an **output** vocabulary is never a frozen `enum` | a television that rejects an unknown value |
| R15 | every 2xx response composes `EnvelopeMeta` | a response with no `servedAt`, hence no reference clock |
| R16 | every `enum` and `x-arthome-vocabulary` member is a string | `[open, emoji, read_only, off]` declares three modes and a `False`: YAML 1.1 reads bare `off`/`on`/`yes`/`no` as booleans |
| R17 | no mapping key that reads like prose | a comma inside an unquoted scalar in a **flow** mapping ends it, and the rest of the sentence becomes a key mapped to null |
| R18 | no prose value carrying its own quotation marks | perfect in the YAML, corrupted in every generated client |
| R19 | every prose key has a string value | a `summary` that parses to a number, a list or a mapping |

**R16 to R19 exist because fifteen green rules declared two documents conformant while four defect
classes were in them**, and two of those defects had been shipping a half-sentence since the
documents were first written. They share one property: **invisible at the line level, obvious at
the parse level**. An unquoted YAML scalar is a type decision made by the parser, and a reviewer
reading YAML never sees the value the parser produced. That is the whole reason the gate reads the
parsed document rather than the file.

**R11's exemption is read from the document, not from a list kept in the checker — and that is a
correction of this document.** The first version carried a hard-coded `SAFE_WRITE` allowlist, which
is to say a parallel literal table of the contract, kept inside the very tool that exists to forbid
parallel literal tables. It failed the way such a table always fails: the contract gained two
operations and the list did not know it. An exempted operation now carries
`x-arthome-idempotency-exemption` with its reason in plain words, the reason being the useful part
since it is what gets reread, and the checker also refuses an exemption declared **beside** an
`Idempotency-Key`, and an exemption with no reason.

**The counts are not restated here.** `python3 tools/check-openapi.py openapi/*.yaml` prints the
paths, operations and schemas of each document as it checks them: a number copied into this
document would be a constant with two owners, which is rule 15, and it would be wrong by the next
commit.
### 2.4 The no-break gate

| Context | Regime | Command |
|---|---|---|
| `identity`, `catalog`, `ticketing` | **stable** | `oasdiff breaking <base> <head>` — **a non-zero exit blocks** |
| `streaming`, `chat`, `payouts`, `notifications` | **provisional** | `oasdiff changelog <base> <head>` — logged, non-blocking |

The exception line is removed **the day the context's tier ships**, never before. It is the same
cut as `buf.yaml` for the events, with the same exit rule.

---

## 3. One AsyncAPI per service — the real public documentation

**This is the part that gets forgotten, and it is the most important one here.** Six of the seven
services expose almost no HTTP: their public surface, the one the other contexts consume, is
**event-driven**. A service documented by its OpenAPI alone is a service whose **speech** nobody
knows.

### 3.1 What the document carries

| Section | Content | Source |
|---|---|---|
| `channels` | one channel per **Kafka topic**, that is, per **aggregate type** — `arthome.catalog.date`, not `arthome.catalog.date.published` | `events.md` §3 |
| `operations` | `send` for the topics this service publishes, `receive` for those it consumes | the code, checked in §3.2 |
| `messages` | **several per channel** — that is the direct consequence of `RecordNameStrategy` | `proto/` |
| `payload` | the Protobuf schema, referenced by fully qualified name | `proto/` |
| `bindings.kafka` | `key` (the aggregate identifier, hence the partition, hence the order), `partitions`, `groupId`, `schemaIdLocation: payload` | `events.md` §1.1, §3 |
| `headers` | the five mandatory ones: `message-id`, `type`, `traceparent`, `actor-id`, `occurred-at` | `events.md` §1.3 |
| `x-arthome-compatibility` | `BACKWARD`, and the context's maturity | `events.md` §5 |
| `x-arthome-retry` | `arthome.<context>.retry` and `.dlq`, distinct from the connector's DLQ | `events.md` §1.4 |

### 3.2 The gate that makes the document true

An AsyncAPI generated from `proto/` describes the **messages**, not the **subscriptions**. Without
a check, it would promise a channel nobody consumes. Hence two controls:

```bash
# 1. the document's messages exist in the buf descriptors
buf build proto -o /tmp/image.bin && pnpm run asyncapi:check-messages

# 2. the document's `receive` entries match the @EventPattern handlers actually registered
pnpm --filter <service> run asyncapi:check-subscriptions
```

The second one runs **at execution time**, against a compiled Nest context: the application is
started in `standalone` mode, the `@EventPattern` metadata is read from the `DiscoveryService`, and
compared against the document. **It is the only honest way**: a commented-out decorator is
invisible in a `.proto` file.

**And the trap that justifies this control**: `@nestjs/microservices`' default `groupId` is shared.
The group leader assigns only its own topics, and **the other services' topics stay unconsumed,
silently**. The AsyncAPI document declares the `groupId`; the control checks that it is unique per
service **and per client module**.

### 3.3 The no-break gate, on the event side

```bash
buf lint proto                                        # blocking everywhere
buf breaking proto --against '.git#branch=main'       # blocking on identity, catalog, ticketing
```

The four provisional contexts are in `buf.yaml`'s `ignore`; the line is removed at the tier. And
the five Protobuf rules that are **never** negotiable, provisional or not, are in `events.md`
§5.2 — the first ("never reuse a field number") is the only Protobuf mistake that **corrupts data
silently**.

---

## 4. Unit tests

### 4.1 `@arthome/core`'s rules — pure, without Nest

These are what compose the values `corrections-handoff.md` found divergent everywhere. They are
tested **without a container, without Nest, without a double**: they are functions.

**Tested exhaustively on their boundaries**, because a boundary is exactly what a design never
tests:

| Function | Boundaries that must be covered |
|---|---|
| `displayStateOf` | the second the room opens, the second it switches on air, replay expiry, and **the precedence of the outcome over the other two axes** |
| `decideWatch` | the **ten** refusal codes, one by one; the preview budget at 0; the screen ceiling at N and N+1 |
| `isRoomOpen`, `replayHoursLeft`, `progressOf` | before, during, after, and the exact instant |
| `payoutOf`, `roundMinor` | rounding **on each component taken separately**, a null gross, a VAT breakdown across two markets, and the fact that **the commission is on the pre-tax amount** |
| `effectiveRightsOf` | a person with **several roles** on the same channel (the union, never a rank); `director` inviting `video`; `video` inviting nobody |
| `moderationBadgeOf` | the four values and their **precedence order** |
| `overlapsWith` | two duties that touch by one second |
| `normalizeSearchCriteria` | two equivalent criteria in a different order → **the same signature** |
| `seasonBounds` | 31 August and 1 September |
| `nextPublicationTransitions` | the two pairs with no way back, for each of the eight roles |

**No double for anything that comes from `@arthome/core`**: the domain is pure and deterministic,
and doubling it would amount to testing the double. The deterministic `fixtures/` are the
**reference** data set; a test that rebuilds by hand a datum `fixtures` can produce is a parallel
literal table.

### 4.2 The handlers, with their ports doubled

A command handler is tested with doubled **ports** (`useValue`), never with a database. What is
checked: the invariant is applied, the domain error carries the **right code**, and the integration
event is **written inside the unit of work** — not published.

**What these tests do not prove, and must not be asked to**: that the transaction holds. That is
§5's business.

---

## 5. Integration tests — three levels

> **The aim is not to have many. It is to always have the same ones**, made cheap by a shared
> harness. Seven services each rewriting their own container plumbing is the same evening lost
> seven times and seven different behaviours the day it breaks.

### 5.1 The floor — mandatory for **every** service, without exception

Four tests. A service that does not have all four is not finished.

| # | Test | The invariant it protects |
|---|---|---|
| **S1** | the migrations apply against a **real PostgreSQL 18**, from zero, in order | `synchronize: true` is forbidden everywhere, development included: the only proof that the schema is the one you think it is, is that it builds from its migrations |
| **S2** | **the business write and the outbox row in the same transaction**: a failure is forced **after** the outbox insert and **before** the commit, and we check that **neither of the two** exists | never `save()` then `emit()` — a crash between the two loses the event, a rollback after the emit invents it |
| **S3** | a consumer **replays the same event twice** (same `message-id`) and the effect is **identical** | delivery is "at least once", always. Deduplication is a `processed_message` row **inside the business transaction**, with `orIgnore().returning()` — never a Redis `SET NX` nor a check-then-write outside the transaction |
| **S4** | a read-model **projection**: an event goes in, the denormalised row comes out, and the model's **monotonic version advances while its applied-at timestamp moves** | this is what the whole event-driven architecture exists for. A projection that does not apply is a blank screen with no error |

**S2 is the most important test in the system.** It is the model's most expensive fault, and it is
the only one visible neither by reading the code, nor in a unit test, nor in production before the
first incident.

**S4 names an invariant, not two column names — and that is a correction, not a softening.** This
line used to require `last_event_seq` and `last_event_at` on every read model. **Neither column
exists anywhere in the platform.** The one projection built, `search-indexer`'s `show_projection`,
carries `version` (the event's `occurred_at` in epoch milliseconds, which is also what it writes to
OpenSearch as the external version) and `indexed_at` — and it serves every purpose those two names
served. Since §10 makes the four floor tests a condition of "finished", requiring the names would
have declared a correct projection unfinished and invited someone to rename working code to satisfy
a document. What is load-bearing is not in the schema but **on the wire**: `@arthome/contracts`
declares `lastEventSeq` on both envelope metas, so a read model served through an envelope must be
able to **answer** it. It is `.nullable().optional()` there, which is the detail that makes the
generalisation safe: a projection whose version is per-document rather than a per-model stream
position serves `null` rather than inventing a number it does not have. **Storage names are the
service's; the envelope field is the contract's.**

### 5.2 Case by case — only where the service justifies it

| Test | Services concerned | Why here and not everywhere |
|---|---|---|
| **search mapping**: a published **show** is findable by its facet — and a date, the day `arthome.catalog.date` is projected too — and a late replay **does not overwrite** a newer version (`version_type: external_gte`) | **`search-indexer`** | it is the only deployable that writes an index, and a late replay is a silent defect |
| **end-to-end money calculation**: order → VAT broken down by market → commission on the pre-tax amount → net, to the minor unit | `ticketing`, `payouts` | these are "the rules that hurt"; the original fixture computed on the tax-inclusive amount at a single rate |
| **issuing and revoking a playback token**: a token issued, a `device_revoked` consumed, the **next renewal refused**, and the **expiry of the token in hand** measured — see below | `streaming` | it is what makes "sign this device out" actually cut playback |

> **What this test must measure, and what nearly escaped it.** Its statement was "latency ≤ 60 s",
> and it would have gone green by observing that the **renewal** is refused after 45 s. That is not
> what the sentence promises. Revocation does not revoke the token **in hand**: the CDN's prefix
> signature expires with it, so the edge keeps serving perfectly valid segments for up to **120 s**.
> The test must therefore measure **the instant a segment stops being served**, not the instant a
> renewal is refused — otherwise you get a false guarantee with a green test, which is worse than
> an absent guarantee.
>
> It is rule 15 violated on a security constant: the constant had two owners and two values, and it
> is the wrong one that was copied — **because it was the one that satisfied the question the
> surface asked**. The contract now serves `playbackCutWithinSec: 120`.

### 5.3 Once only for the whole system — the golden path

**Buying a seat, from the storefront to the payout.** Under `docker compose`, **on demand**, not on
every PR.

```
POST /v1/orders/seats            → 201, seat created, seat_code issued by the server
  the capacity decremented in the SAME transaction as the seat
  two outbox rows written in that transaction
Debezium publishes               → arthome.ticketing.date_sales · arthome.ticketing.order
catalog-projector consumes       → the capacity moves on date_card_public
catalog-indexer consumes         → the facet moves in OpenSearch
streaming-entitlement consumes   → the right exists in entitlement_projection
payouts-ledger consumes          → the payout line exists, due D+14 from the END
POST /v1/playback/{id}/open      → 200, token issued against the freshly projected right
```

**A single `traceparent` links the seven steps**, and that is what we assert (§7).

**Why on demand and not on every PR**: it starts seven services, Kafka, Debezium, OpenSearch and
MinIO. Running it on every PR from one person alone means abandoning it within three
weeks. Running it before every tier means keeping it.

### 5.4 The three guard rails — without them, nothing above holds

**(a) A shared test harness**, published from `@arthome/tooling`, and **no service writes its own
container plumbing**.

```ts
// @arthome/tooling/testing
withMigratedDb(service)     // one PG container per run, one DATABASE per file, migrations applied
givenEvent(topic, message)  // produces a framed Protobuf message, with its five headers
expectOutbox(type)          // reads outbox_event and asserts the type, the aggregate key, the tracecontext
resetBetweenTests()         // TRUNCATE … RESTART IDENTITY CASCADE — never dropSchema per test
```

Three isolation rules that come from experience and not from theory: **one container per store per
run**, started in `globalSetup`, never per test; **one database per file** and one Redis index per
worker, so that files run in parallel; **`TRUNCATE` between tests**, never `dropSchema` nor
`FLUSHALL`. And `.withReuse()` is **forbidden in continuous integration** — reuse is on by default
on the Node side, and it turns a red test green the second time.

**(b) Execution per touched service**, through the Turborepo cache — the only use of Turbo in this
project, and it is there for that: `test:integration` declares `dependsOn: ["^build"]`, and a
service where nothing changed does not restart its containers.

**(c) An owned ceiling: on the order of ten integration tests per service**, and **each test names
in its title the invariant it protects**.

```
right: "the seat write and the outbox row are in the same transaction"
wrong: "testOrderService"
```

> **A test that cannot name its invariant is a unit test in disguise**, and it costs a hundred
> times its price. The ceiling is not a quality limit: it is what guarantees the suite stays
> runnable in a minute, hence that it will be run.

### 5.5 What we do **not** test in integration

| Not tested | Why |
|---|---|
| the framework | NestJS injects, routes and validates. Testing it is testing somebody else's library |
| domain rules already covered in `core` | they are pure; running them again in a container costs a thousand times more for the same assertion |
| **anything that deeply simulates Kafka** | **if it is a double, it is no longer an integration test.** A fake broker that delivers in order, exactly once, proves nothing about a system that delivers at least once, sometimes out of order. Either a real Kafka, or a unit test of the handler — never the in-between, which gives the confidence without the proof |

---

## 6. Contract tests

Three, and they protect three different things.

| # | Test | Command | What it prevents |
|---|---|---|---|
| **C1** | the **generated client compiles** against the published contract | `pnpm --filter <surface> run typecheck` after regeneration | a contract that changes shape without anyone seeing it before the surface is deployed |
| **C2** | `buf breaking` on the events | `buf breaking proto --against '.git#branch=main'` | a Protobuf break on a stable context |
| **C3** | `oasdiff` on the OpenAPI | `oasdiff breaking <base> <head>` | an HTTP break on a stable context |

**C1 compiles once, not twice — and this line said the opposite.** It required the generated client
to be compiled under TS 6.0.x **and** under TS 7.x, "because it crosses the fracture". There is no
fracture: `code-conventions.md` §1.3 investigated it and **retracted** it. React 19.3's floor is not
7.0.2 — `react-native` has no `typescript` peer and `@types/react` is happy with TS 5.1; the `7.0.2`
that was observed was a registry reading, not a constraint. The only hard floor is Angular's
**ceiling** (`<6.1`), joined by NestJS, whose `nest build` fails on TS 7.0. **All seven repositories
are under one ceiling at TS 6.0.x.**

The generated client therefore lives in repositories that are all on the same side, and **one
compilation is enough**. Making a service review verify a state that does not exist is E2 applied
to a decision: a plausible line of reasoning, retracted elsewhere, left standing here.

What remains true, and is not the same thing: `code-conventions.md` §8.1's **gates 6 and 7** compile
`@arthome/core`'s and `@arthome/contracts`' `.d.ts` under both versions. They bear on the
**published packages**, not on the surfaces' client, and they exist because the fracture **will**
come — `typescript@7.0.2` is already `latest` and a distracted `pnpm add typescript` installs it.

**And `@arthome/contracts` exposes an entry point with no barrel file** (D-012), measured at 7.7 kB
gzip against 92 kB. The gate: the package has **no `index.ts` re-exporting everything**, and imports
zod only by deep paths. A single re-export line cancels the measurement.

---

## 7. The runtime obligations

A service can pass every gate above and be unoperable. What follows is the difference between "it
works" and "it works in production".

### 7.1 The distributed trace, visible end to end

**Required, and checked.** `trace:check` runs the golden path and asserts **a single
`traceparent`** from the HTTP request through to indexing:

```
HTTP request to the BFF      traceparent created
 └─ BFF → service call       traceparent in a header
     └─ TRANSACTION
         ├─ business write
         └─ INSERT outbox_event  tracecontext = traceparent   ← injected AT WRITE TIME
     └─ COMMIT
Debezium                     → traceparent Kafka header
projection consumer          → same trace
indexing consumer            → same trace
```

**`traceparent` is injected into `outbox_event.tracecontext` at the moment of the write, not
later.** The relay runs outside the request: injected after the fact, the link is lost for good,
and it is unrecoverable. It is the one thing in this document that, done wrong, is not repaired —
it is rewritten.

**What the trace must show, and what we assert**: seven consequences, one synchronous call, no
communication between services. It is **that trace**, and not the number of services, that is the
project's technical signal.

### 7.2 Health and shutdown

| Entry point | Content | Checked by |
|---|---|---|
| `GET /health/live` | the process answers | restart probe |
| `GET /health/ready` | database reachable, **migrations up to date**, Kafka consumer **in its group** | routing probe |
| `GET /health/ready` during shutdown | **`503` immediately**, before closing anything | integration test S-ready |

`app.enableShutdownHooks()`, and the order is: `ready` → 503, wait out the drain window, close the
HTTP server, **then** stop the Kafka consumer, **then** close the database. The reverse cuts
in-flight requests on every deployment.

**Three constraints the sentence above does not contain. Each has its own failure, and the third
silently disables the other two.** (1 and 2 are `nestjs-observability` rules 6 and 5; 3 is
`nestjs-build` rule 6.)

1. **The drain window is supplied by the READINESS PROBE. `enableShutdownHooks()` alone does not
   create one.** What holds `ready` at 503 while the endpoint removal propagates is
   `TerminusModule.forRoot({ gracefulShutdownTimeoutMs })`. Its default is **0**, it applies to
   **SIGTERM only**, and it does nothing whatever without `app.enableShutdownHooks()`. Size it
   **above** the readiness probe period plus propagation and **below** Kubernetes'
   `terminationGracePeriodSeconds` (default 30 s), or the pod is killed before its own window
   closes. **The hook and the timeout are one change, not two**: the hook without the timeout
   drains for zero seconds and the sequence above runs with nothing waited out; the timeout without
   the hook never fires at all. Configured separately, each looks present in review and the pair
   does nothing.
2. **Liveness must NOT go through `HealthCheckService`.** Any `check()` — even `check([])` — answers
   **503 `shutting_down`** the moment shutdown starts. On readiness that is precisely the third row
   of the table above and it is wanted. But a **liveness** probe built on the same service flips
   with it, the orchestrator reads the process as dead, and it **restarts the pod mid-drain** —
   turning the clean shutdown this section exists to obtain into the abrupt one it exists to
   prevent, and doing it on every single deployment. So `/health/live` is a plain handler with no
   dependency and no `HealthCheckService`; `/health/ready` is the one that uses it. The same split
   answers a second failure: a liveness probe that pings the database restarts every healthy pod
   during a database outage, which is the one moment restarting them helps least.
3. **The container command is `node dist/main.js`.** `nest start`, `npm run …` or `pnpm start` as
   PID 1 **swallows SIGTERM**: the signal reaches the wrapper, the Node process never receives it,
   no shutdown hook runs, and **every constraint above becomes inert** while the probes, the
   timeout and the ordering all still read as correctly configured. Use the `exec` form of `CMD`,
   and `--init` or `tini` if a supervisor is genuinely needed.

**Migrations are a distinct deployment job**, run **once, as a single instance**, and it must
succeed **before** the new version starts. `migrationsRun: true` would have N replicas migrating at
the same time, and TypeORM has **no migration lock**. On compiled JavaScript, never under `tsx` —
which does not supply decorator metadata.

### 7.3 The error envelope, up to and including Traefik

**It is a line of this document, and it comes from `storefront-tv`**: *"every response from the
system, including under overload, must carry the error envelope with its code and its trace
identifier"*.

Traefik produces its own 5xx — service unreachable, queue full, timeout. A raw HTML page would make
the distinction between "**your** connection" and "**our** servers" impossible, and the viewer would
go and reboot their router.

**Required**: an `errors` middleware on statuses `500-599`, pointing at a static service that serves

```json
{ "error": { "code": "GATEWAY_UNAVAILABLE", "nature": "unavailable", "params": {},
             "traceId": "<X-Request-Id>" },
  "servedAt": "…" }
```

**Checked**: a test that stops a BFF and asserts that Traefik's response parses against
`ErrorEnvelope`. Without that test the configuration will exist and will be wrong — it is exactly
the kind of thing that never gets exercised.

### 7.4 What must not leak

| Obligation | Checked by |
|---|---|
| `Cache-Control: no-store` on the stream key, the playback token and every rights verdict | integration test, header assertion |
| the stream key **appears in no list payload** | integration test on `getRunConsole` |
| a field forbidden by the role is **absent**, never present and null | integration test on two roles, `expect(body).not.toHaveProperty('grossRevenue')` |
| a sort on an absent field is **refused**, never ignored | integration test, `SORT_KEY_FORBIDDEN` |
| no full IBAN in an event | unit test on the event's schema |
| **no private key in the published JWKS document** | §7.6, gate J1 |

### 7.5 Artifacts published to the CDN

The i18n and taxonomy catalogues are **immutable versioned artifacts**, published by a CI job to
MinIO and then to the CDN. Three obligations:

- **immutable**: `/{surface}/{locale}/v{N}.json` is never rewritten. A correction publishes
  `v{N+1}`;
- **every application embeds a snapshot at build time**, as a **mandatory** fallback. It is the
  only thing that guarantees no raw code will ever reach a screen — and on mobile, where a store
  review is slow, it is a **condition of operation**, not a convenience;
- the current version is served in the bootstrap payload, **never by a per-page call**, and it
  **never blocks the first paint**.

### 7.6 The JWKS document — four rotations, one assembler

**Arbitration rendered**, in agreement with `backend-domain`'s `context-map.md` §7.0, which sets the
frame and leaves me the split:

> **Four independent rotations, one per issuer, each publishing only its public key. One single
> assembler, which holds no secret. The asymmetry is the point.**

`backend-domain` leaned towards this split; I settle it, and here are the three reasons, the second
of which had not been said.

1. **A single job holding four private keys would become the most sensitive component in the
   system** — and it would be an infrastructure job, not a service. It would concentrate the
   signing of both BFFs, of the playback token (which the **CDN edge** trusts for all access to the
   media) and of the `device_token`. Today those four secrets live in four places with four blast
   radii; bringing them together **creates a target that does not yet exist**.
2. **The simplification would be illusory, because the two cadences already differ.** 30 d / 24 h
   grace for the BFFs, 90 d / 7 d grace for playback and device. A single job would carry two
   calendars and two grace windows anyway: it would not be *one* job, it would be *one job with
   four branches*. We would pay the risk without buying the simplicity.
3. **A private key never leaves its issuer** — the same discipline as the payment and media ports.
   A central generator would have to **distribute** private keys, which is exactly the gesture one
   never wants to make.

**The counter-argument — "four things to watch" — is answered without merging.** What has to be
watched is not four jobs: it is **a single number**, the age of the oldest key in the published
document, compared against its cadence. The assembler is the natural place for that check, and it
fails loudly if an issuer has stopped publishing.

**The four operating rules that make this split safe.** They are here because three of them, done
wrong, are visible only in production.

- **Publish before signing, retire after — and "after" is a maximum, not a duration.** The new
  public key enters the document **before** its issuer starts signing with it; the old one is
  retired only after **`max(token lifetime, 2 × the document's max-age)`**, plus margin. Without
  overlap, a rotation cuts **every** playback in progress.
  **This point used to say "after the longest token lifetime", and that was wrong** — the same
  wording `adr-auth` §8.1 carried before it was corrected. Taken alone, it sizes the retention on
  120 seconds when the edge is serving the old document for an hour, and therefore produces exactly
  the rejection of valid tokens the next point describes. I am leaving it written: a bullet gets
  copied out of its context, and that is how rule 15 gets violated.
- **The grace window must cover the CDN's cache, not only the token's lifetime** — and that is the
  real mechanism behind the two cadences, which I have seen written nowhere. The edge caches the
  document for hours: publishing the new key and then signing sixty seconds later achieves nothing,
  the edge is still serving the old document and **rejects perfectly valid tokens**. Hence a
  contract value: the document is served with `Cache-Control: max-age=3600`, and **every grace
  window is ≥ 2 × max-age**. The shortest one (24 h) keeps a factor of 24: that is comfortable, and
  it is deliberate.
- **A failed rotation never retires a key.** The assembler only **unions** what the issuers
  publish. Retirement is a **separate and explicit** step, conditioned on the grace window. An
  assembler that rebuilds the document "to match what it sees" deletes the key of a temporarily
  silent issuer — and invalidates all of its in-flight tokens.
- **The assembler lives in `arthome-platform`, outside the seven services.** It reads no service's
  database, consumes no topic, and exposes no entry point: it reads four object-storage prefixes
  and pushes one file.

**Three gates, and the first costs one line.**

| # | Gate | Command | What it prevents |
|---|---|---|---|
| **J1** | **no private key published** | `curl -s $JWKS_URL \| jq -e '[.keys[] \| has("d")] \| any \| not'` | the catastrophic fault: a `d` in a published JWK is the system's signature given to the world. One line, to be run after **every** publication |
| **J2** | the four issuers are present | `jq -e '[.keys[].kid] \| map(split("-")[0]) \| unique \| length == 4'` — prefixes `bff-sf`, `bff-st`, `play`, `dev` | a silent issuer whose tokens will be refused at a service's next restart |
| **J3** | no key has outlived cadence + grace | assembler check, alert | a rotation failing silently — the most likely failure mode of the three |

**And the staging gate, which is a test and not a check**: a full rotation in the staging
environment, with a token signed by the **old** key that **must still be accepted** for the whole
grace window, and refused after it. That is `adr-auth.md` §11's spike S4, and it must enter the
regression suite — not stay in the spike.

---

## 8. The review line: a BFF that grows fat

It is not a metric, and that is why it is here rather than in an alert.

> **If a BFF acquires a table it writes itself, or a cache whose invalidation becomes a business
> rule, it has crossed the line.**

A BFF that starts computing a price, a discount, a right, a row order, a scarcity threshold or a
payout has become a **distributed monolith**: all the coupling of a monolith, plus the network's
latency. It is not the load risk that counts — a stateless component replicates; it is this one.

**The only rule a BFF evaluates itself is `decideWatch` in advisory mode**, and the contract
declares it as such (`advisory: true`). Any other evaluation is a review defect.

Three measurements accompany the review, and each commands a precise action:

| Measurement | Threshold | Action |
|---|---|---|
| `bff_upstream_calls_per_request` p95 on a list screen | **> 4** | the read model is missing: create it in the majority context |
| `bff_request_duration_ms` p95 on a public read | **> 400 ms** | the same, or the overlay is not batched |
| `read_model_staleness_seconds` p99 | **> 30 s** (and **> 5 s** for `entitlement_projection`) | the projection consumer is falling behind |

---

## 9. What I escalate

**1. The JWKS document now has a split, it lacks a pair of hands.** `backend-domain` set the frame
(`context-map.md` §7.0: an infrastructure artifact, with no owning context, because `identity`
serving it would literally violate "no service calls `identity`", and a BFF serving it would invert
the dependency). **I settled the split in §7.6**: four independent rotations, an assembler with no
secret, three gates.

What is left for the lead, and it is a calendar line rather than an architecture question: **the
assembler and its three gates belong to tier 2**, with `wal_level = logical` and the seven Debezium
connectors — it is the first tier where more than one issuer exists. Before it, a single issuer
signs and the question does not arise. **Naming it now and building it at tier 2** is the right
cadence; building it earlier would be tooling for one issuer, later would be discovering it on the
day a rotation fails.

**2. The client generator for the five surfaces.** Nobody has been appointed to choose the tool, pin
it and decide where the published client lives. My recommendation: `src/generated/**` in each
surface repository — already exempted from the lint by `code-conventions.md` §4.5 — and **not** a
published package. A generated client is not a contract, it is a surface convenience; publishing it
would create a fourth thing to keep running, for one person alone.

---

## 10. The list to copy into a service review

Fourteen lines. A service that does not tick fourteen is not finished.

- [ ] `pnpm run verify` passes (`code-conventions.md` §8.2)
- [ ] `openapi/<service>.yaml` **regenerated identical** to the committed document
- [ ] `python3 tools/check-openapi.py` passes the nineteen rules
- [ ] `asyncapi/<service>.yaml` regenerated identical, and its `receive` entries match the
      `@EventPattern` handlers actually registered
- [ ] `buf lint` passes; `buf breaking` passes if the context is **stable**
- [ ] `oasdiff breaking` passes if the context is **stable**
- [ ] the service's `@arthome/core` rules are tested **on their boundaries**
- [ ] the four **floor** tests exist and pass (S1 migrations, S2 transactional outbox,
      S3 idempotent replay, S4 projection)
- [ ] the service's **case-by-case** integration tests exist, if it warrants any
- [ ] at most **ten** integration tests, each **naming its invariant**
- [ ] no integration test simulates Kafka
- [ ] `GET /health/live` and `/health/ready` exist, `ready` returns **503 from the start of
      shutdown**, `live` does **not** go through `HealthCheckService`, and the container command is
      `node dist/main.js` (§7.2)
- [ ] the migrations run in a **distinct deployment job**, once only
- [ ] the trace is **visible from the HTTP request through to indexing**, with a single
      `traceparent`

---

## 11. The tools that are not installed

`buf`, `oasdiff` and an OpenAPI linter **are not installed on this machine**, and nothing in this
document has run them. The `openapi/` documents were validated by a YAML parser and by §2.3's
checker, written for this project.

**Proposed installation commands — not executed.** The versions are deliberately not pinned here:
pinning them without having read them today would amount to writing one more parallel literal
table. `code-conventions.md` §7 governs pinning.

```bash
# buf — Protobuf schemas and compatibility
pnpm add -Dw @bufbuild/buf          # the npm package ships the binary

# oasdiff — OpenAPI breaking changes and changelog
docker run --rm -v "$PWD:/specs" tufin/oasdiff breaking \
  /specs/openapi/storefront.base.yaml /specs/openapi/storefront.yaml
# (without Docker: go install github.com/oasdiff/oasdiff@latest)

# OpenAPI linter — document style and completeness
pnpm add -Dw @redocly/cli && pnpm exec redocly lint openapi/*.yaml
```

**When the Actions quota comes back**, the workflow file will call `pnpm run done` and nothing
else. That is why everything sits behind a single command: the remote CI will not add a second
definition of what is checked, and there will therefore never be two lists to keep in agreement.
