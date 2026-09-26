# Event catalogue

> Name, owner, payload, partition key, compatibility policy.
> The schemas are in `proto/`. **Protobuf only**, tooled with `buf`.
> Kafka is the **only** inter-service channel. A synchronous call goes only from a BFF to a service.

---

## 1. The conventions, before the list

### 1.1 One topic per **aggregate type**, not per event

That is what the Debezium outbox router imposes, and it is also what preserves order.

```
outbox column                      Kafka consequence
──────────────────────────────────────────────────────────────────
aggregatetype = "catalog.date"  →  topic   arthome.catalog.date
aggregateid   = "<uuid>"        →  KEY     (hence partition, hence order)
type          = "catalog.date.scheduled.v1"  →  `type` header
payload       = framed Protobuf bytes        →  value
tracecontext                                 →  `traceparent` header
id                                           →  `message-id` header
```

**Why one topic per aggregate and not per event.** Kafka's ordering holds only **per partition**.
`date.scheduled`, `date.rescheduled` and `date.outcome_declared` bear on the same object: splitting
them into three topics would lose their relative order, and a consumer could apply an outcome
before the publication that creates it. One topic per aggregate, key = aggregate identifier: an
object's order is guaranteed, and the number of topics stays readable (**16 topics**, not eighty).

### 1.2 Several message types in one topic — `RecordNameStrategy`

The direct consequence: one topic carries several message types. So the registry's subject strategy
is **`RecordNameStrategy`** (the registry subject = the message's fully qualified name), not
`TopicNameStrategy`. Each message evolves and is checked independently of the others.

This is a non-obvious decision and it has a CI consequence: `buf breaking` runs **per file**
(`use: FILE`), and the registry's compatibility gate is set **per message**.

### 1.3 Mandatory headers on every message

| Header | Contents | Why |
|---|---|---|
| `message-id` | the outbox row's `id` (UUIDv7) | the consumer's deduplication key. **Its absence is a permanent error**, never a default identifier |
| `type` | `<context>.<aggregate>.<event>.v<N>` | handler routing inside a multi-type topic |
| `traceparent` | W3C, **injected when the outbox row is written** | the relay runs outside the request: injected later, the link is lost for good |
| `actor-id` | the person who caused the fact, if there is one | the studio's by-name journal reads it; reconstructing it afterwards is impossible |
| `occurred-at` | the instant of the business fact | distinct from the publication instant; a replay must not move a fact |

### 1.4 Delivery

**At least once, always.** The relay can crash between publishing and marking, CDC replays, a retry
topic duplicates. **Every consumer is idempotent**: the message identifier is inserted into a
`processed_message` table **inside the business write's transaction**, with
`orIgnore().returning('id')` — no row returned, we skip. Never a Redis `SET NX` deduplication, and
never a check-then-write outside the transaction: a crash between the two loses the effect or
doubles it.

**Failure classification**, applied everywhere:

| Nature | Example | Handling |
|---|---|---|
| permanent | malformed payload, schema violation, final business rejection | **DLQ at once**, no replay |
| transient | database unavailable, lock, dependency temporarily absent | retry topic with increasing delay (5 s, 30 s, 5 min), then DLQ |

**Two distinct reject mechanisms, never conflated**: Kafka Connect's native DLQ
(`errors.deadletterqueue.topic.name`) for **connector** failures, and `arthome.<context>.retry` +
`arthome.<context>.dlq` for consumers' **business** failures. Alert on the depth of both.

> **CORRECTED AGAINST A RUNNING STACK (2026-09-25). The first mechanism does not exist on the
> outbox path.** Kafka Connect implements `errors.deadletterqueue.*` for **sink** connectors only,
> and the outbox router is a **source** connector. What makes this worth writing down rather than
> quietly dropping: Connect *accepts* the properties, and Debezium *echoes them back* in the task
> configuration at startup, so the log reads exactly as though a dead-letter queue were configured.
> Verified on Debezium 3.0 — the topic is never created and nothing is ever written to it.
>
> So a source connector has **no DLQ**, and `errors.tolerance` stays at `none`. `all` would skip a
> record the converter cannot handle, which on `outbox_event` means losing a business fact that is
> already committed — the application never reads that table back, so nothing would notice. Failing
> loudly is the recoverable posture: the connector stops, the slot retains the WAL, and the lag is
> measurable. It is also the posture that fills a disk if nobody watches §7.4's alert.

**One `groupId` per consuming service and per client module.** `@nestjs/microservices`'s default is
shared (`nestjs-group-server`): the group leader assigns only its own topics, and the other
services' topics go unconsumed — silently.

### 1.5 What does not go through Kafka

| Data | Channel | Reason |
|---|---|---|
| viewer counter, per second | **Redis** (Socket.IO broadcast) | one sample per second per live show in a durable log is waste. Only the **per-minute aggregate** enters Kafka |
| feed health metrics, 1 to 2 s | **Redis** | same; only the run's peak and average enter Kafka at the end |
| search keystroke, playback position | nothing | direct write, tolerant of loss |
| cache invalidation **internal to a service** | nothing | it is a local consequence |
| background jobs **of a service** | **BullMQ**, internal | BullMQ between two services would reopen the synchronous coupling Kafka exists to forbid |

---

## 2. The Kafka client — confirmation requested by the mission

**The decision to confirm**: `@nestjs/microservices`'s built-in transport rests on **KafkaJS 2.2.4**,
with no release since **27 February 2023** and no maintainer. The candidate proposed is
`@confluentinc/kafka-javascript` through a custom transport.

**What I verified, and my answer: we keep KafkaJS, with a written reservation.**

| Point | Finding |
|---|---|
| works on Kafka 4.x | yes, verified in a run on a single node. "Upgrade kafkajs" is no fix: 2.2.4 **is** the latest version |
| what is missing | KIP-848 (new group protocol), **static membership** (`groupInstanceId`), **cooperative rebalancing** |
| real consequence | KafkaJS rebalances **eagerly**: **every rollout pauses the group** for the duration of the rebalance |
| traps not to fall into | **never** configure `CooperativeStickyAssigner`, `groupInstanceId` or `groupProtocol`: KafkaJS does not have them, and setting them gives the illusion of a fix |

**Why I am not switching now.** A custom transport on `@confluentinc/kafka-javascript` means
writing a `Server implements CustomTransportStrategy` and a `ClientProxy` yourself: the decorators,
`KafkaContext`, the filters and the response handling do not come for free. For one person, it is a
project inside the project — and the consequence we avoid (a group pause of a few seconds on every
rollout) is, on a platform whose peak is an evening performance, a deployment nuisance, not an
outage. We tune `sessionTimeout` and `rebalanceTimeout`, and we deploy outside broadcast slots.

**The signal that would change my mind, written down now**: if a rebalance exceeds **30 s** on a
group, or if deploying during a live show becomes necessary, we switch to
`@confluentinc/kafka-javascript` **for consumers only** (the client is producer-only elsewhere). It
is a reversible decision because the schemas and the topics do not change.

**Two settings not to forget, and they are not details:**
- `run: { partitionsConsumedConcurrently: N }` — KafkaJS's default is **1** message at a time.
  This is not a Nest defect (nest#12703). Order still holds per partition.
- **partitions ≥ the maximum number of replicas**, otherwise pods sit idle and CPU-based
  autoscaling can do nothing about it.

---

## 3. The topics

**Sixteen topics, and the thirty aggregate types they carry.** An earlier version of this table
declared fourteen and left **sixteen aggregate types with no topic** — hence no key, no partition
count, no `groupId` and no AsyncAPI channel, while the definition of done generates the channels
**from this table**. The table below is exhaustive: **every message in §4 finds its topic here.**

| Topic | Owner | Key | Part. | Aggregate types carried | Maturity |
|---|---|---|---|---|---|
| `arthome.identity.account` | `identity` | `account_id` | 3 | `account`, `artist` (follows), `rights_version` | **stable** |
| `arthome.identity.device` | `identity` | `device_id` | 3 | `device`, `device_session` | **stable** |
| `arthome.identity.channel` | `identity` | `channel_id` | 3 | `channel`, `date_access` | **stable** |
| `arthome.catalog.date` | `catalog` | `date_id` | **12** | `date`, **`publication`** | **stable** |
| `arthome.catalog.show` | `catalog` | `show_id` | 3 | `show` | **stable** |
| `arthome.catalog.artist` | `catalog` | `artist_id` | 3 | `artist` | **stable** |
| `arthome.catalog.saved_search` | `catalog` | `account_id` | 3 | `saved_search` | provisional |
| `arthome.ticketing.date_sales` | `ticketing` | `date_id` | **12** | `date_sales`, **`seat`**, `waitlist` | **stable** |
| `arthome.ticketing.order` | `ticketing` | `order_id` | 6 | `order` | **stable** |
| `arthome.ticketing.account` | `ticketing` | `account_id` | 3 | `subscription`, `credit` | **stable** |
| `arthome.streaming.run` | `streaming` | `date_id` | **12** | `run`, `incident`, `replay`, `chapter`, `viewer_count` | provisional |
| `arthome.chat.date` | `chat` | `date_id` | **12** | `message`, `date_chat_policy` | provisional |
| `arthome.chat.moderation` | `chat` | `date_id` | 6 | `moderation` | provisional |
| `arthome.chat.audience` | `chat` | `channel_id` | 3 | `audience` | provisional |
| `arthome.payouts.payout` | `payouts` | `channel_id` | 3 | `payout`, `bank_change`, `reconciliation` | provisional |
| `arthome.notifications.delivery` | `notifications` | `account_id` | 3 | `delivery` | provisional |

Plus, per context: `arthome.<context>.retry` and `arthome.<context>.dlq`.

### 3.1 Why these groupings, and not one topic per aggregate

**One topic per aggregate would have broken §1.1's own rule.** Order holds only per partition, and
the key is what decides the partition. Two of these groupings are therefore **requirements**, not
conveniences:

- **`catalog.publication` shares `catalog.date`'s topic, key `date_id`.** On its own topic with
  `publication_id` as the key, `publication.engaged` **would lose its relative order** with
  `date.scheduled` — and that is exactly the counter-example §1.1 gives for refusing one topic per
  event: *"a consumer could apply an outcome before the publication that creates it"*. The rule was
  written, and then the aggregate that violates it was published;
- **`ticketing.seat` shares `ticketing.date_sales`'s topic, key `date_id`.** `seat.activated`
  creates the right to watch (`entitlement_projection`) **and** causes the capacity to move: the
  two must arrive in the order they happened, hence in the same partition.

The others follow the same logic, applied without exception: an incident, a chapter, an audience
sample and a replay asset are **facets of a run** — they go into `arthome.streaming.run`, key
`date_id`. A chat policy and a message bear on the same date, and order matters (a message posted
after a switch to `read_only`) — they go into `arthome.chat.date`.

**Two renamings this imposes**, and they cost nothing since nothing is built:
`arthome.ticketing.subscription` becomes **`arthome.ticketing.account`** (it carries everything
keyed by `account_id`: subscription **and** credit note), and `arthome.chat.message` becomes
**`arthome.chat.date`** (messages **and** chat policy).

**The four 12-partition topics** are the ones a popular performance concentrates. The number is not
magic: it is the headroom that lets us add replicas without repartitioning.
The hot spot and its measure are handled in `context-map.md` §11(b).

---

## 4. The catalogue

Payload summarised; the schema is authoritative (`proto/`). Every instant is
`google.protobuf.Timestamp` (UTC); every amount is `arthome.common.v1.Money`.

### 4.1 `identity`

| Event | Payload | Consumed by | Why |
|---|---|---|---|
| `identity.account.registered.v1` | `account_id`, `locale`, `country`, `occurred_at` | `notifications` | welcome email |
| `identity.account.deletion_requested.v1` | `account_id`, `grace_until` | `ticketing`, `payouts`, `notifications`, `chat`, `streaming` | **erasure saga** (`data-model.md` §7.5) |
| `identity.account.anonymised.v1` | `account_id` | all | dissociate nicknames, freeze invoices |
| `identity.device.revoked.v1` | `device_id`, `account_id` | **`streaming`** | invalidate this device's playback leases: that is what makes "disconnect this device" stop playback |
| **`identity.device_session.closed.v1`** | `device_id`, `account_id`, **`profile_id`**, `self_initiated` | **`streaming`** | **it was missing.** Revokes the leases of the (device, profile) pair **and of those alone** — without it, `signOutProfile` stopped no playback on a shared television, and the only way out was to revoke the device, hence all five profiles |
| `identity.artist.followed.v1` / `.unfollowed.v1` | `account_id`, `artist_id` | `catalog`, `notifications` | subscriber counter; alert subscription |
| `identity.channel.created.v1` | `channel_id`, `owner_account_id` | `catalog`, `payouts` | create the public artist; open the connected account |
| `identity.channel.membership_changed.v1` | `channel_id`, `person_id`, `roles[]`, `action` | `notifications`, `chat` | alert routing by role; right to moderate |
| `identity.channel.ownership_transferred.v1` | `channel_id`, `from`, `to` | `payouts`, `catalog` | the bank account and the public page follow |
| `identity.date_access.granted.v1` / `.revoked.v1` | `channel_id`, `date_id`, `person_id`, `crew_role`, `expires_at` | `streaming`, `chat` | access to the stream key; right to settle a queue |
| `identity.rights_version.bumped.v1` | `account_id`, `version` | **realtime** | the application learns its navigation is stale (`studio-mobile` §2c) |

### 4.2 `catalog`

| Event | Payload | Consumed by |
|---|---|---|
| `catalog.date.drafted.v1` | `date_id`, `channel_id`, `show_id`, `venue_id` | `ticketing` (open `DateSales`), `streaming` (prepare the run) |
| `catalog.date.scheduled.v1` | + `starts_at`, `venue_timezone`, `venue_city`, `venue_country`, `runtime_min`, `replay_policy`, `replay_window_hours`, `rights`, `canonical_url` | `ticketing`, `streaming`, `chat`, `notifications`, `identity` (guards) |
| **`catalog.publication.state_changed.v1`** | `date_id`, `from_state`, `to_state`, `version`, `irreversible`, `changed_by` | **studio realtime** (room `channel:{id}`), journal. **It was missing**: without it, `draft→reserve`, `scheduled↔technical` and `ended→replay-online` produced nothing, and a second operator's screen lied indefinitely |
| `catalog.publication.engaged.v1` | `date_id`, `engaged[]` (`prices`, `replay`, `chat_mode`) | **`ticketing`** locks the prices · **`chat`** locks the policy |
| `catalog.date.rescheduled.v1` | `date_id`, `new_starts_at`, `previous_starts_at` | `ticketing` (seats follow), `notifications` (**reminders follow**), `streaming` |
| `catalog.date.outcome_declared.v1` | `date_id`, `outcome`, `declared_by`, `declared_at`, `message` + `content_language` | **four consequences**: `ticketing` (refunds or credits), `payouts` (withholds), `catalog` (public copy), `notifications` (warns) |
| `catalog.date.replay_policy_set.v1` | `date_id`, `policy`, `window_hours` | `streaming` (asset expiry), `ticketing` (putting it on sale) |
| `catalog.date.rights_changed.v1` | `date_id`, `scope`, `territories[]`, `reason_code` | `streaming` (the right to watch) |
| `catalog.show.published.v1` / `.updated.v1` | `show_id`, taxonomy, languages, `title` and `synopsis` per language | `ticketing` (shop), index |
| `catalog.artist.updated.v1` | `artist_id`, `channel_id`, public face | `notifications` |
| `catalog.saved_search.matched.v1` | `account_id`, `saved_search_id`, `date_id` | **`notifications`** — raised by the *percolator* |

### 4.3 `ticketing`

| Event | Payload | Consumed by |
|---|---|---|
| `ticketing.date_sales.availability_changed.v1` | `date_id`, `seats_available`, `waitlist_count`, `lowest_price`, `fill_rate`, `sold_out` | **`catalog`** (public card, index, studio agenda), `notifications` ("almost full" at 85%) |
| `ticketing.date_sales.pricing_changed.v1` | `date_id`, `tiers[]`, `promotions[]` | `catalog` (card, checklist) |
| `ticketing.date_sales.capacity_set.v1` | `date_id`, `capacity_total`, `tiers[]` | `catalog` (checklist), `streaming` (technical provisioning) |
| `ticketing.seat.activated.v1` | `seat_id`, `date_id`, `account_id`, `tier`, `seat_code` | **`streaming`** (`entitlement_projection`), `notifications` (reminder at T−30) |
| `ticketing.seat.cancelled.v1` | `seat_id`, `date_id`, `account_id`, `reason` | `streaming`, `payouts` |
| `ticketing.order.paid.v1` | `order_id`, `kind` (`seat`\|`merch`), `channel_id`, `date_id?`, `gross`, `vat_breakdown[]`, `fees` | **`payouts`** (this is the raw material of the right to a payout) |
| `ticketing.order.refunded.v1` | `order_id`, `amount`, `reason` | `payouts` |
| `ticketing.credit.issued.v1` | `credit_id`, `account_id`, `channel_id`, `amount`, `origin_ref` | `payouts` (a credit note is a liability), `notifications` |
| `ticketing.subscription.changed.v1` | `account_id`, `plan_id`, `state`, `opens[]`, `seat_discount`, `period_end` | **`streaming`** (the right to watch), `catalog` (displayed price) |
| `ticketing.waitlist.notified.v1` | `date_id`, `account_ids[]`, `priority_until` | `notifications` |

### 4.4 `streaming`

| Event | Payload | Consumed by |
|---|---|---|
| `streaming.run.technical_check_passed.v1` | `date_id`, `passed_at`, `protocol` | **`catalog`** (checklist → unlocks publication) |
| `streaming.run.started.v1` | `date_id`, `started_at`, `protocol`, `monitor_path` | **`catalog`** (`technical → live`), `chat` (opens the chat), `notifications` ("followed artist live") |
| `streaming.run.ended.v1` | `date_id`, `ended_at`, `peak_viewers`, `avg_viewers`, `duration_sec` | **`catalog`** (`live → ended`), `chat` (closes), **`payouts`** (the 14-day due date runs from here), `identity` (`runs_called`) |
| `streaming.run.state_changed.v1` | `date_id`, `state`, `cause?` | `catalog` (public card) |
| `streaming.incident.raised.v1` / `.resolved.v1` | `date_id`, `kind`, `cause`, `message`, `content_language`, `triggered_by` (`manual`\|`auto`) | `catalog`, `notifications` (routed to the run desk) |
| `streaming.replay.asset_ready.v1` | `date_id`, `duration_sec`, `available_from`, `expires_at` | **`catalog`** (the card can say "replay"), `ticketing` (putting it on sale), `notifications` ("expires in 6 h") |
| `streaming.replay.expired.v1` | `date_id` | `catalog`, `ticketing` |
| `streaming.chapter.posted.v1` / `.removed.v1` | `date_id`, `chapter_id`, `vocab_id`, `at_media_sec` | `catalog` (sheet, replay) |
| `streaming.viewer_count.sampled.v1` | `date_id`, `minute`, `viewers` | `catalog` (card), statistics. **Once per minute, not per second** |

### 4.5 `chat`, `payouts`, `notifications`

| Event | Owner | Consumed by |
|---|---|---|
| `chat.date_chat_policy.changed.v1` | `chat` | `catalog` (the card carries `chatMode`), realtime |
| `chat.message.posted.v1` | `chat` | durable journal, replay playback, audit. **Not the broadcast** — that goes over Redis |
| `chat.message.state_changed.v1` | `chat` | realtime (a removed message must disappear from the screen), journal |
| `chat.moderation.settled.v1` | `chat` | the studio's by-name journal |
| `chat.audience.sanctioned.v1` / `.lifted.v1` | `chat` | realtime, journal |
| `payouts.payout.state_changed.v1` | `payouts` | `identity` (`channel_dues`: refuse deleting a channel), `notifications` |
| `payouts.bank_change.requested.v1` / `.countersigned.v1` | `payouts` | `notifications` (routed to `artist` **and** `treasury`) |
| `payouts.reconciliation.discrepancy_found.v1` | `payouts` | `notifications` (routed to `treasury`) |
| `notifications.delivery.failed.v1` | `notifications` | journal; cleaning up dead tokens |

---

## 5. Compatibility policy

### 5.1 The rule

| Regime | Contexts | CI gate | What is allowed |
|---|---|---|---|
| **stable** | `identity`, `catalog`, `ticketing` | `buf breaking --against '.git#branch=main'` **blocking** | adding an optional field, adding an enumeration value, adding a message. **Nothing else** |
| **provisional** | `streaming`, `chat`, `payouts`, `notifications` | `buf lint` blocking, `buf breaking` **as a warning** | anything, until the milestone arrives |

**A contract written for a feature to be built in six months has had no feedback from reality.
Saying so is more honest than freezing it.** Moving from *provisional* to *stable* is an explicit
act: we remove the exception line from the CI file, on the day that context's milestone ships.

### 5.2 The Protobuf rules that are not negotiable, even while provisional

1. **Never reuse a field number.** A deleted field becomes `reserved`. It is the one Protobuf
   fault that corrupts data in silence.
2. **Never change a field's type**, nor the name of an enumeration value. A break in shape is a
   **new versioned type beside the old one**, until the consumers have migrated.
3. **Every enumeration has a `_UNSPECIFIED` zero value**, and a consumer that receives it must
   treat it as **neutral**, never as an error. It is the same principle as the behaviour
   `storefront-tv` requires in front of an unknown value — and in Protobuf it is native: an unknown
   member arrives as its number and fails nothing.
4. **Read tolerantly**: we ignore unknown fields, we never "close" a message.
5. **The registry is in `BACKWARD` mode**: **consumers upgrade first**. That is the right choice
   here because a producer is a service I deploy, and a consumer may be a projector whose lag is
   visible.

### 5.3 What zod does not do here

**An event decoded from Kafka is never revalidated by zod.** The registry is authoritative. zod
lives at the HTTP boundary, and only there. Mixing the two would cost a second schema to maintain
for not one extra guarantee — and the gap between the two would be the next parallel table (E2).

---

## 6. The flow you must be able to follow with a finger

The vertical use case the file wants to show a reader, with `traceparent` end to end:

```
POST /orders/seats                      bff-storefront   traceparent created
  └─ POST /v1/orders/seats → ticketing  HTTP/JSON        traceparent in a header
       └─ TRANSACTION
            ├─ UPDATE date_sales SET seats_available = seats_available - 1   (invariant)
            ├─ INSERT seat (seat_code issued by the server)
            ├─ INSERT order
            ├─ INSERT processed_idempotency_key (key + fingerprint + memorised response)
            └─ INSERT outbox_event ×2   tracecontext = traceparent
       └─ COMMIT                        ← nothing is published before this
  ◄─ 201 { seat, date up to date }      the command returns the projected state, not a receipt

Debezium reads the WAL ──► arthome.ticketing.date_sales   key date_id
                      └──► arthome.ticketing.order        key order_id

catalog-projector      consumes availability_changed → date_card_public  (the capacity moves)
catalog-indexer        consumes availability_changed → OpenSearch        (the facet moves)
streaming-entitlement  consumes seat.activated       → entitlement_projection (the right exists)
payouts-ledger         consumes order.paid           → payout_ledger     (the right to a payout)
notifications          consumes seat.activated       → reminder at T−30 min

Redis pub/sub ──► room `date:{id}:state` ──► the capacity moves on open screens
```

Seven consequences, one synchronous call, no service-to-service communication, and a single trace
that links them all. It is that trace — not the number of services — that is the project's
technical signal.
