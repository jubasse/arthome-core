# Realtime

> WebSocket channels, the events that travel on them, scaling the Redis adapter.
> Socket.IO on the NestJS side, Redis adapter for broadcasting between nodes.
>
> **The boundary `streaming.md` sets and that we keep: Kafka is the durable journal —
> moderation, audit, replay, history. Redis handles broadcast to connected clients.
> Confusing the two is the classic error.**

---

## 1. Two gateways, two namespaces, one connection per client

```
bff-storefront  ──►  namespace /storefront
bff-studio      ──►  namespace /studio
```

**A client opens only one connection.** `storefront-tv` requires it and the reason is good: four
connections (incident, chat, counter, pairing) cost four reconnections on every hiccup of a home
Wi-Fi network and four times the buffer memory. Multiplexing is done by **room**, not by
connection.

**The two namespaces are two distinct gateways**, in the two BFFs, because they share neither the
same authentication (cookie against bearer), nor the same subscription model (per viewer against
per person across channels), nor the same redaction.

**Authentication happens at the handshake**, in a namespace middleware installed in `afterInit`,
never in a gateway guard: `handleConnection` runs no guard, no pipe, no interceptor and no filter —
a `@UseGuards` on the gateway would leave the connection open. The principal is placed on
`socket.data`, and **per-message** authorisation happens in a WS guard that reads `socket.data`.

**The middleware is installed per namespace**: a `server.use()` in a custom adapter covers only `/`.

---

## 2. `/storefront` — the rooms

| Room | Who joins it | What travels there | Latency |
|---|---|---|---|
| `date:{id}:state` | any surface showing this date | incident raised/resolved, outcome declared, **the real on-air switch** (the feed comes in or it goes) | **≤ 2 s** |
| `date:{id}:chat` | the player, chat panel open | messages, message state changes, chat policy | ≤ 2 s, **capped at the source** |
| `date:{id}:counters` | the player and the visible cards | viewer counter, capacity, waiting list, "show already started" price | 10 to 30 s |
| `viewer:{profileId}` | always | notification badge, rights recomputed after a purchase, basket changed elsewhere, revocation, **`playback:stop`** (see below) | ≤ 2 s |

**`playback:stop` is a courtesy, not a control.** When an entitlement ends — device disconnected,
profile disconnected, subscription lapsed, `interrupted` outcome — the channel pushes a signal
asking the client to stop playback **immediately**, instead of waiting for the next renewal to be
refused. It makes the visible case instant: somebody disconnects a television from their account
and watches the screen stop.

> **That signal is not a security boundary.** A modified client ignores it, and the CDN edge keeps
> serving until the token in hand expires — **the guarantee remains 120 s**
> (`adr-stream-entitlement.md` §3.3). The contract must say it that way: this document rejects "any
> bypassable heuristic" as a security answer, and it would be incoherent to then present a
> client-side signal as a protection.

**A pairing's outcome does NOT go through this channel.** I had proposed a `device:{deviceId}` room,
joinable before any session; `adr-auth.md` §5.3 refuses it and **its argument wins**: bringing a
device identity into the WebSocket namespace at `signin` time would widen its attack surface to
gain a few hundred milliseconds. So a pairing is read by **RFC 8628 polling**, with a
`pollInterval` served at 2 s for the first 60 seconds then 5 s — a served decay, hence tunable, and
thirty requests at most per pairing. **The `/storefront` namespace accepts only a session, never a
bare device identity.**

### 2.1 One subscription per **batch of identifiers**, never one per card

This is the constraint `storefront-mobile` and `storefront-web` both raise, and it is structuring.
A virtualised list shows a couple of dozen cards and buffers as many again; each carries a viewer
counter. **Twenty subscriptions means twenty CPU wake-ups and a drained battery**; a grid of twelve
cards opening twelve channels is absurd.

The protocol:

```
→ counters:subscribe   { dateIds: [...] }     replaces the batch, does not add to it
← counters:snapshot    { [dateId]: {...} }    immediately, so you can paint
← counters:tick        { [dateId]: {...} }    every 10 to 15 s, DIFFERENTIAL
```

The batch is **replaced** when the scroll window moves, **without reopening the channel**. And the
tick is differential: only identifiers whose value has moved are emitted. On a stable grid, the
channel is silent.

**What this room does NOT carry, and it is deliberate**: the **room opening** and the **expiry of a
replay**. Those are transitions whose instant is **known in advance**, hence derivable without a
request — see §2.4, which carries the argument. An earlier version of this table listed them here:
it was the one line contradicting §2.4 and §8, and it is the one a reader would have found while
looking up a room's contents.

The "on-air switch" stays, but in the strict sense: `run.state_changed` is a **technical fact**
nothing allows you to predict — the feed comes in or it does not. `displayState` then flips from
`room_open` to `live` at the client, which derives the rest.

### 2.2 The chat ceiling is enforced **at the source**

`storefront-tv` is right and its argument holds for all three storefronts: a TV cannot absorb a
high-rate stream in order to throw 95% of it away, each rejected message having cost parsing and
allocation on a device that is already decoding video.

| Surface | Ceiling served | Catch-up on entry |
|---|---|---|
| TV | **2 msg/s** | 20 messages |
| mobile | 6 msg/s | 50 messages |
| web | 10 msg/s | 50 messages |

The selection is made upstream (the most recent, and crew messages always). **No removed message
reaches a public surface**: moderation is a state on the `chat` side, and the stream served is
already filtered. The studio sees both states, the viewer sees one.

**No backward pagination on a live chat**: nobody scrolls a chat back with a remote control, and on
all three surfaces it is a sliding window, not an infinite scroll into the past. The full history is
read on the **replay**, replayed by `at_media_sec`.

### 2.3 The reaction quota travels with the response

`sendReaction` returns the remaining quota and the recharge instant. The reason `storefront-tv`
gives is right: the surface must **disable** the control rather than let it fail — an inert action
is banned by the file, but an action that fails in silence is worse. One reaction in flight at a
time.

### 2.4 What does **not** go through the channel, and why that is a requirement

A television stays on for hours on the same screen. In the meantime a date goes on air, a room
opens, a replay expires. **The temptation is to push those transitions; it must be resisted.** The
contract delivers the **instants** (room opening, start, end, replay window, promotion expiry,
cancellation deadline, end of the preview countdown) and the **constants**, and the surface
schedules the change locally, to the second, without a single call.

That is exactly what `displayStateOf` already does in `@arthome/core` — one rule, two evaluation
sites, no reimplementation. And it is why the contract carries instants and not labels: a response
that delivers "SCHEDULED" is stale in flight; a response that delivers an instant never is.

**Practical consequence**: a standby mode running for eight hours makes **no** request, and a TV
sitting on the home screen refreshes only what actually moves.

---

## 3. `/studio` — the subscription is **per person**, not per page

This is the most structuring difference from the storefront, and both studio specialists asked for
it independently.

A freelance run-desk operator or moderator may be **on duty across several live shows the same
evening**; the mockup shows a banner of all the evening's feeds, flags the overlap and announces "a
distinct alert sound per channel". **A channel open only on the displayed channel would miss the
other one's incident.** And on an already fragile mobile network, one subscription per channel
would multiply the connections.

On connection, the gateway joins:

| Room | Contents |
|---|---|
| `person:{personId}` | rights version, inbox, invitations, duties, routed alerts |
| `channel:{id}` — **one per accessible channel** | on-air state, incidents, crew presence, sales, chapters, **a date's publication state** (§3.3) |
| `channel:{id}:decide` — for `artist ∨ production` | the same publication correction, **with the offered transitions recomputed** (§3.3) |
| `channel:{id}:moderation` | the queue: entry, claim, release, verdict, sanction, retroactive reclassification |
| `channel:{id}:chat` | messages from the live show in progress, with their state |
| `channel:{id}:health` | health samples, 1 to 2 s |

**The rooms are recomputed when the rights version changes**, and the server makes you leave the
rooms of a lost channel **without waiting for a reconnection**: that is what stops a person whose
one-off access expired at curtain-down from carrying on seeing a queue.

### 3.1 Every message is an **idempotent correction**, never "reload everything"

A requirement of zoneless Angular, and it is real: change detection is triggered by writing to a
signal, so a pushed message must land in an identified entity store. A stream that says "something
changed, reload" would condemn the console to reloading everything every two seconds, **in the
middle of settling a queue**.

The shape imposed on every message of these two namespaces:

```
{ entity: "moderation_item", id: "...", op: "upsert" | "remove",
  seq: 41287, channelId: "...", patch: { ... } }
```

`seq` is **monotonic per stream and per channel**. It is the resume point.

### 3.2 Visibility of concurrency is a contract requirement

The queue screen shows "X is reviewing", "X has settled". That assumes **other people's claims and
verdicts arrive on the same channel, with the name of whoever acts**. Without it, two moderators
work blind to each other and tread on each other's toes at every row.

Three mechanisms, confirmed:

1. **Claiming is a lease** (`claim_expires_at`), renewed while the person is present, released by
   the server on expiry. A moderator who closes their browser does not freeze a row for the whole
   live show.
2. **The second verdict is refused**, and the refusal **carries the winning decision** — author and
   verdict — so the screen tells the truth instead of showing a failure.
3. **Propagation is by name.**

### 3.3 Publication state, and the stale-button trap

**The defect corrected.** The room did not carry the publication state, and no event was born of
the transitions. A second operator saw DRAFT indefinitely on a date that was already published,
with its two offered transitions — and discovered the commitment by clicking. The safety was
complete, **the freshness was entirely absent** (`needs/studio-web.md` §F).

The correction is §3.1's ordinary shape:

```
{ entity: "publication", id: "<dateId>", op: "upsert", seq, channelId,
  patch: { state, orderRank, version, irreversible, changedBy } }
```

**But a correction that carried the new state without recomputing `offeredTransitions` would leave a
stale button — the same defect, moved one notch along.** `studio-web` is right, and it is not a
detail: `offeredTransitions` is "computed **for this operator**", so it cannot travel as it stands
in a broadcast.

**The answer reuses the mechanism already in place in §3.4** — one room per rights class, filtered
at emission — because the transitions do not depend on the person but on `canDecide`
(`artist ∨ production`), so there are only **two** classes:

| Room | Who joins it | `patch.offeredTransitions` |
|---|---|---|
| `channel:{id}` | all members | **absent** — those roles have no transition button to go stale |
| `channel:{id}:decide` | `artist ∨ production` | **present**, recomputed for the recipient class |

Two emissions, no per-person computation, no stale button. And if one day the transitions depended
on something other than `canDecide`, the fallback is written: the correction becomes a **"re-read
this entity" marker** for that entity alone — never a "reload everything", which would condemn the
console in the middle of settling a queue.

### 3.4 Redaction applies to the channel too

`canRevenue` decides the **content** of pushed messages, not their display. A run desk that received
the revenue in a channel message and did not show it is a leak. So the `channel:{id}` rooms are
**filtered at emission, by role** — concretely, two rooms per channel: `channel:{id}` and
`channel:{id}:revenue`, the second joined only by the roles entitled to it.

---

## 4. The heartbeat — the need `studio-web` declares blocking

> "We must tell *the venue has stopped sending* apart from *my workstation has lost the network*.
> Those are two opposite screens: in the first you switch to the standby screen, in the second
> **you must above all cut nothing** — the broadcast continues for the viewers."

The application cannot tell the difference on its own: **the absence of a message is identical in
both cases.** `studio-mobile` says the same thing differently — a studio web is on the office
network, a studio mobile is on the 4G of a basement venue — and makes a whole block of its document
out of it.

**The answer, and it serves three needs at once:**

```
← ws:pulse  { serverTime: "2026-09-21T20:31:04.118Z", seq: 41287, lag: { health: 1.2 } }
            every 5 seconds, on both namespaces
```

1. **Silence becomes diagnosable.** No `ws:pulse` for 15 s = **I am the one who is deaf**. A
   `ws:pulse` arriving with no health sample for 30 s = **the venue has stopped sending**. Two
   states, two screens, no inference.
2. **`serverTime` is the reference clock for every surface.** The duty stopwatch, the length of a
   mute, "the replay expires in 41 h", the waiting list's priority window, the expiry of a one-off
   access, the free-preview countdown: everything is counted against `serverTime` and a measured
   offset, never against the phone's clock — which drifts in sleep, jumps on a time zone change,
   and can be set by its owner.
3. **`seq` gives the resume point** with no extra message.

**It is also the answer to the safety net `studio-mobile` asks for**: the channel setting "automatic
standby screen if the feed is lost for more than 15 s" is a **server rule**, carried by the contract
as a channel default, and its firing produces an incident just as a manual trigger does
(`IncidentTrigger.AUTO`). That is the right answer to the "the run-desk operator is unreachable"
case: it does not depend on a run-desk workstation which might be the one that lost the network.

---

## 5. Resume: three possible answers, never a silence

The system suspends a mobile application's WebView; the connection dies **with no clean close
event**. On waking, the application must **resynchronise, not replay**.

```
→ resume  { channelId?, streams: { chat: 41200, moderation: 8812, journal: 3301 } }
```

Three answers, and **the second is the one that is always missing**:

| Answer | Meaning | What the client does |
|---|---|---|
| `resume:events` | here is what you missed | applies the corrections in order |
| **`resume:too_old`** | **the gap is too large, reload the whole model** | reloads — and it KNOWS it |
| `resume:invalid` | the cursor is no longer valid: rights changed, channel left | reloads the bootstrap |

Without `resume:too_old`, "the moderator comes back to a queue missing ten messages, and nothing
tells them". That is `studio-mobile`'s phrasing, and it is exactly the defect.

**The resume window is bounded**: 30 minutes or 5,000 events per stream, whichever comes first, held
in a Redis `Stream` per room. Beyond that, `resume:too_old`. The durable journal stays in Kafka: a
console reopened at 21:40 must be able to **replay from 20:30** — the live show's journal, the
queue, the chapters and the incidents are **durable reads**, not leftovers in a memory buffer. The
WebSocket resume covers minutes; the HTTP read covers hours.

### 5.1 What is re-requested, what is resumed, what is thrown away

| | |
|---|---|
| **to re-request** (long-lived) | on-air state, current incident, the queue **with its claims**, active sanctions, chapters posted, the live show's journal since curtain-up, **publication state and offered transitions**, **crew presence** (§5.3), **health series** (§5.3) |
| **to resume from the last `seq`** | chat, journal — those are ordered streams |
| **to throw away** | any feed measurement predating the reconnection. A bitrate curve is re-requested, it is not replayed — `GET /v1/dates/{dateId}/run/health-samples` (§5.3) |

### 5.2 Mobile, returning to the foreground, and the burst

Another need, specific to the storefront mobile: on returning to the foreground, **every observed
read revalidates at the same time** — the automatic revalidation mechanisms listen for browser
events that do not exist in React Native and must be rewired by hand. An account screen shows half
a dozen; a category page as many.

**Refusing a burst on return to the foreground is refusing to open the application.**
So the contract offers, over HTTP and not on the channel:

```
GET /changes?since=<servedAt>&scope=<profile|channel>
→ { invalidated: ["date:xxx", "account:tickets", "home:rails"], servedAt, complete: bool }
```

It returns **a list of invalidations, not the data**. The client then decides what to reload, and in
one request instead of twelve. `complete: false` means "too many changes, reload everything" — the
same honesty as `resume:too_old`.

It is also the answer to `storefront-web` Q6: the storefront **is** notified of changes it did not
cause, and the path goes through the BFF, Kafka being forbidden outside inter-service use. For
Next's server rendering, the BFF additionally exposes a **stream of invalidations by tag** which the
Next server consumes to call `revalidateTag`. The tags are **named by the contract**, never invented
by a surface — otherwise mobile and the TV will invent others.

### 5.3 A differential without a snapshot is not a contract

Two of this document's promises had **no read** facing them, and `studio-web` established it on
both. The defect is the same: a differential is pushed and the initial state is never exposed. A
console opened at 21:40 then has **nothing** to paint, and stays that way until the next change.

| Promise | Where it was written | What was missing |
|---|---|---|
| **crew presence** | §8 ("pushed ~10 s"), the `channel:{id}` room, and `identity.GetChannelPresence` counted among `run desk`'s three internal calls (`context-map.md` §10.1) | no BFF operation exposed it, `RunConsole` did not carry it |
| **health series** | §5.1, the "throw away" column: *"a bitrate curve **is re-requested**"* | the series was requestable nowhere — the endpoint is write-only, and only the last sample was served |

**✔ SERVED SINCE 22 SEPTEMBER 2026.** `backend-contracts` has built both, and I verified them in
`openapi/studio.yaml` rather than taking the report: `RunConsole.presence` carries
`CrewPresence[]`, scoped to the **channel** and not to the date; and
`GET /v1/dates/{dateId}/run/health-samples` serves `HealthSeries` with a capped window
(`windowSec`, default 180 s) and **`peakViewers` / `peakViewersAt` served rather than derived
twice**. The two promises below are now promises the contract keeps.

What stays written is the rule they produced, because it is the general one and it outlived the two
cases: **any room broadcasting a differential exposes a snapshot.**

**What the contract must carry, and it is a requirement, not a preference:**

1. **Any room broadcasting a differential exposes a snapshot.** That is the general rule these two
   cases brought out, and it holds for the ones that follow.
2. **Presence is a read**: who is online on this channel, with their role and their last-activity
   instant. It is not cosmetic — the cut confirmation is literally *"cutting ends the broadcast for
   N viewers · **M other people online**"*, it is the guard rail on the most destructive act in the
   run desk, **in a studio explicitly without a lock**, and it was empty.
3. **The health series is a bounded read**: a configurable window (by default the last three minutes
   — `studio-mobile` asked for it **short**), with the **peak viewer count and its time**, which is
   derived from the series and is therefore obtainable only through it. Three paths cross it every
   evening: after a `resume:too_old`, after a reconnection, or simply opening the console in the
   middle of a live show.

**Both reads were already counted in my inventory** (`context-map.md` §10.1:
`identity.GetChannelPresence`, `streaming.GetHealthSeries`) — they were the **BFF operations** that
were missing. Reported, and now closed.

---

## 6. Scaling the Redis adapter

### 6.1 The wiring

`@socket.io/redis-adapter`, plugged into an extended `IoAdapter`, `server.adapter(createAdapter(pub,
sub))` inside `createIOServer`, and `useWebSocketAdapter()` **after the Redis clients have connected
and before `listen()`** — a later call is silently ignored.

**The adapter relays broadcasts, not polling requests.** So you need either **session affinity at
Traefik**, or clients on **`websocket` transport only**. The two native storefronts and the studio
mobile can impose `transports: ['websocket']`; the web cannot always, so affinity stays necessary.
It is one of the four arguments for the infrastructure gateway (`context-map.md` §9).

**Redis is a use in its own right**, distinct from the other three: sessions (at the BFF only),
per-service cache, **Socket.IO adapter**, BullMQ internal to a service. The adapter's instance is
**never** BullMQ's (which requires `noeviction`) nor the cache's.

### 6.2 The real risk, named

A **stateless component replicates**: all the gateways' memory is in Redis (rooms, presence) and in
Kafka (the journal). Adding a replica is enough.

**The danger is elsewhere, and it is twofold:**

1. **The fan-out of a heavily watched live show.** 20,000 viewers in `date:{id}:chat`, spread over N
   nodes: the adapter relays **every message to every node**, which then writes it to each of its
   sockets. The cost grows as N × messages, and Redis's pub/sub channel becomes the bottleneck.
2. **The gateway becoming thick.** If it acquires local state, a business cache or a rule, it stops
   replicating: that is a distributed monolith — all of a monolith's coupling, plus network latency.

### 6.3 The measures that trigger an action

| Measure | Threshold | Action |
|---|---|---|
| `socketio_broadcast_lag_ms` p99, emission → witness client | **> 500 ms over 30 s** | turn on the per-room ceilings (§2.2), then **shard** the chat room into `date:{id}:chat#0..7` — order is restored client-side by `(at_media_sec, seq)`, it is not carried by the room |
| `redis_pubsub_channel_bytes_per_sec` on the adapter's channel | **> 20 MB/s** | move to `@socket.io/redis-streams-adapter` (which additionally gives connection state recovery), or shard |
| `ws_connections_per_node` | **> 15,000** | add a replica |
| `ws_reconnects_per_minute` | **> 5% of connections** | session affinity is broken at the proxy — that is not an application problem |
| `ws_pulse_gap_seconds` p99 | **> 15 s** | the gateway is saturated: both studios are about to show "I no longer know" wrongly, which is the worst possible outcome |

**Sharding is permitted only where order is restored on read.** The chat, yes: a message carries
`at_media_sec` and `seq`. The moderation queue, **no**: the order of settlement is an invariant
there, and a saturated live show's queue is counted in hundreds, not in tens of thousands.

---

## 7. What must above all not go through the channel

| Data | Where it goes | Reason |
|---|---|---|
| a payment's outcome | **HTTP**, in the command's response | a command returns the projected state, not a receipt; and a payment confirmed by a message is a payment confirmed by the client |
| the playback token and its renewal | **HTTP**, on the critical path | it must fail with an actionable code, and its budget is ≤ 1 s |
| the playback position | **HTTP**, a loss-tolerant write | one write every 30 to 60 s does not deserve a channel |
| the stream key | **HTTP**, `Cache-Control: no-store` | a secret does not travel over a multiplexed channel shared by a room |
| per-second health measurements | **Redis → channel**, never Kafka | one sample per second per live show in a durable log is waste |
| the per-second viewer counter | **Redis → channel**; only the per-minute aggregate enters Kafka | same |

---

## 8. Latencies promised, by need

A binding summary, which `backend-contracts` can take as it stands.

| Need | Surface | Latency | Mechanism |
|---|---|---|---|
| incident raised / resolved | storefront ×3, studio | **≤ 2 s** | pushed, **non-negotiable** — the client-side veil depends on it |
| date outcome declared | storefront ×3, studio | ≤ 2 s | pushed |
| pairing outcome | TV | **≤ 2 s** | **RFC 8628 polling**, `pollInterval` served at 2 s then 5 s — **not the channel** (`adr-auth.md` §5.3) |
| chat message | storefront, studio | ≤ 2 s | pushed, capped at the source |
| a message's state (removed, author sanctioned) | storefront, studio | ≤ 2 s | pushed |
| moderation queue | studio | **≤ 1 s** | pushed, by name |
| on-air state | studio | immediate | pushed |
| health measurements | studio | 1 to 2 s | pushed, with `measured_at` |
| crew presence | studio | ~10 s | pushed, with `RunConsole.presence` as its snapshot (§5.3) |
| rights version | studio | immediate | pushed — it invalidates the navigation |
| viewer counter | storefront ×3 | 10 to 30 s | pushed in batches, differential |
| capacity, waiting list | storefront ×3 | 15 to 60 s | pushed in batches; **the truth is at command time**, not at display time |
| notification badge | storefront | 30 to 60 s | pushed on `viewer:{id}` |
| `playback:stop` after an entitlement is revoked | storefront ×3 | ≤ 2 s | pushed — **courtesy, not a security boundary**: the guarantee remains 120 s |
| sales during a live show | studio | 10 to 30 s | pushed, `:revenue` room |
| going on air, room opening, replay expiry | **all** | — | **derived, no call** |
| capacity shown on a server-rendered page | web | — | derived from `validUntil` |
