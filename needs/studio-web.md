# Needs — studio web (Angular)

> This document states **what the contract must carry and guarantee** for the web control room.
> It describes no interface. Identifiers are English, and so is the prose from now on.
>
> Sources read: `streaming.md` (in full), `shared/helpers.js`, `shared/studio-data.js`,
> `shared/catalogue.json`, the studio sections of `shared/fixtures.js`, `shared/i18n/studio.json`,
> `shared/i18n/index.json`, and `mockups/Studio.dc.html` in fragments located with `rg`.
> Errata taken into account: `architecture/corrections-handoff.md`, family **D** in particular.

---

## Screen inventory

### Navigation — fifteen entries, filtered by role

The order is fixed (`ORDER`); presence depends on the role. The entries are:

`agenda` · `dashboard` · `moderation` · `crew` · `events` · `stream` · `stats` · `tickets` ·
`store` · `replays` · `team` · `payouts` · `journal` · `settings` · `help`

**`team` is open to none of the six personas**: no line of the access table contains it, and the
rule "the coordination console absorbs the Crew page" removes it a second time whenever `crew` is
present. The page nevertheless exists in the mockup. See "Inconsistencies found".

### Outside navigation

| Screen | What it introduces |
|---|---|
| `regie` | running the live show: seven tabs, themselves filtered by role |
| `event` | a date record: six panes + an overview, each opened according to the role |
| `wizard` | creating a date: four decisions, one of them irreversible |
| `inbox` | invitations received and alerts routed by role — open to **everyone** |

### Sub-tabs, screen by screen

| Screen | Sub-tabs | Filtering |
|---|---|---|
| `regie` | `ov` · `feed` · `mod` · `store` · `sales` · `chap` · `log` | `feed`/`chap` technical, `store`/`sales` financial, the rest open |
| `event` | `all` (overview) · `public` · `tickets` · `chat` · `tech` · `crew` · `replay` | one pane per set of roles; `all` appears only beyond three open panes |
| `moderation` | `chat` · `queue` · `filter` · `sanct` | no internal filtering — the whole page is reserved to `mod` |
| `crew` | `members` · `matrix` · `guests` · `log` | no internal filtering, but the actions are filtered |
| `stats` | `audience` · `series` | `series` compares the dates of one show |
| `journal` | filter by nature: `air` · `mod` · `event` · `access` · `money` | a filter, not a tab |

### Screens that introduce nothing new to the contract

`dashboard`, `agenda`, `store`, `replays`, `help`, `settings` and `team` use shapes already
described elsewhere (a channel's agenda, the merchandise catalogue, replay windows, channel
identity, the directory). They are listed for coverage, not detailed. Three exceptions are treated
below because they carry a command or a rule of their own: the capacity threshold of `tickets`, the
dual signature of `payouts`, and the danger zone of `settings`.

---

## Roles, and what they open

### The central fact: two role vocabularies, and a reduction that loses information

`shared/catalogue.json` declares **eight** `memberRoles`:

```
artist · production · coordination · director · video · sound · moderation · treasury
```

`studio-data.js` reduces them to **six** personas for the two control rooms:

```
artist → artist   production → prod   coordination → coord
director → regie  video → regie  sound → regie
moderation → mod  treasury → tres
```

**This reduction is not reversible, and it erases a right.** The `grants` table draws exactly the
distinction the reduction collapses: `director` may invite `video` and `sound`; `video` and `sound`
may invite nobody. Once the three posts are folded into `regie`, the application can no longer tell
whether the member it displays has the right to invite.

**What the contract must therefore serve: both, with distinct roles.**

1. **The raw material, in the eight-value vocabulary.** A channel member carries their canonical
   role (`director`, not `regie`), because that is what determines the rights, and because that is
   what the i18n carries (`enums.memberRole.director`). The fold to six is a **presentation
   convenience** and has no business on the wire.
2. **Effective rights, computed once, in the domain.** Otherwise studio web, studio mobile and
   every service's guards would each read the same table — which the "no value computed twice"
   decision forbids.

### What "effective rights" must contain, exactly

For the current channel, and for every channel the person works on:

- **the open navigation entries** — the union of the accesses of every role held on that channel.
  The observed table:

| Entry | `artist` | `prod` | `regie` | `mod` | `coord` | `tres` |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `agenda` | | | ● | ● | | |
| `dashboard` | ● | ● | | | | ● |
| `moderation` | | | | ● | | |
| `crew` | ● | ● | | | ● | |
| `events` | ● | ● | ● | | | |
| `stream` | ● | ● | ● | | | |
| `stats` | ● | ● | | | | ● |
| `tickets` | ● | ● | | | | ● |
| `store` | ● | ● | | | | |
| `replays` | ● | ● | ● | | | |
| `team` | — | — | — | — | — | — |
| `payouts` | ● | | | | | ● |
| `journal` | ● | ● | | | ● | ● |
| `settings` | ● | | | | | |
| `help` | ● | ● | ● | ● | ● | ● |

- **the open date-record panes**: `public` and `replay` → `artist`, `prod`;
  `tickets` → `artist`, `prod`, `tres`; `chat` → `artist`, `prod`, `mod`;
  `tech` → `artist`, `prod`, `regie`, `coord`; `crew` → `artist`, `prod`, `coord`.
- **three cross-cutting capabilities** that govern whole columns and counters rather than whole
  screens: `canRevenue` (`artist`, `prod`, `tres`), `canOps` (`artist`, `prod`, `regie`),
  `canTech` (`artist`, `prod`, `regie`).
- **the capability to decide a date's outcome** (postpone, cancel, compensate): reserved to the
  owner and to production. The others can only **report**.
- **the assignable roles** — the projection of `grants` onto the roles held, already materialised
  in the fixtures as `member.canInviteRoles`. Serve that materialised list, not the `grants` table
  to be recomposed.

### The corollary, and it is structural

`canRevenue` does not hide a column: **it must decide what the response contains.** A control room
that receives the gross ticket revenue in its payload and does not display it is a **leak**, not a
rule. So a **server-side projection by role** is required: a channel's agenda served to a `regie`
has no `gross` field; the one served to a `tres` has no stream key.

In the same way, a `mod` must be able to load a date's `chat` pane **without** loading the whole
record, otherwise the ticketing figures travel for nothing. The date record must be **served pane
by pane**, not served whole and cut up at render time.

### Multiplicity — three points the mockup exercises and the fixtures do not

1. **A person holds several roles on the same channel.** The mockup carries a second-role selector
   and a plural `roleKeys`, with navigation being the **union**. The fixtures place only one `role`
   per member row. The contract must carry a **set** of roles per (person, channel) pair.
2. **A person works on several channels, with a different role on each.** That is exactly what
   `chanSets` builds, and it is the normal case for a freelancer (`people[].channels`,
   `runsCalled`). The "current channel" context is therefore part of every studio request, and the
   list of accessible channels is part of start-up.
3. **Two scales of access, not interchangeable.**
   - *channel member* — permanent, channel scope, revocable, with an owner who can never be removed
     (`owner: true`, `removable: false`);
   - *reinforcement assigned to a date* — temporary, scoped to **one date**, with an explicit
     expiry ("expires at curtain call + 1 h", "expires when the curtain falls").
   These are two different objects with two different life cycles. Confusing them would turn
   revoking a stand-in into expelling them from the channel. The contract must separate them, and a
   one-off assignment must carry **its instant of expiry**, not a sentence.

### What the studio does with roles beyond navigation

- **Alert routing.** Each alert addresses the role that can act: unstable bitrate → `regie`;
  moderation queue saturated beyond ten messages → `mod`; post unassigned at D−1 → `coord`; date at
  90 % of capacity → `prod`; banking dispute within 24 h → `tres`; ownership transfer → `artist`
  alone. The owner additionally receives **everything** concerning their channel.
  → a notification's destination is a **role**, not a person, and it is decided server side. The
  application must not filter a common feed.
- **Assigning a post.** Assigning someone to the control or moderation post of a date is permitted
  only if the role is among the assignable roles; otherwise the action must be refused with a
  reason naming who can do it.
- **The stream key.** It is delegated only by the owner or production, and rotating it invalidates
  the previous one immediately.

---

## Data shapes

> `shared/` is authoritative on vocabulary, **not** on shapes. What follows states what the
> contract must carry, flagging where the fixture is a mockup convenience.

### The aggregates the studio handles

| Aggregate | What the studio expects from it |
|---|---|
| `channel` | the unit of work: public identity, members and their roles, shows, dates, followers and 30-day gain, verification, timezone of the reference venue |
| `member` | person (or owning artist), **set** of roles, owner, removable, assignable roles, join date |
| `person` | directory: identity, freelance or not, city, channels, runs called (`runsCalled`) |
| `show` | title, synopsis, cast, discipline, genre, tags, runtime, language dependency, artwork |
| `date` | the public object: instant, venue, capacity, prices, chat policy, replay policy, territorial rights, outcome |
| `publication` | **the channel's act**: state, what is engaged, instants of engagement, locked transitions, checklist |
| `run` | the conduct: on-air state, crew held, cameras, chapters, incidents, sales during the show |
| `payout` | gross, commission, VAT, net, held, refunded, credit, state, due date, invoice |
| `moderationItem` | message targeted, reason, reports, state, who settled it, when |
| `audienceMember` | the viewer **as a person** of a channel: handle, dates attended, messages, state, seniority, subscriber |
| `merchItem` | item, show, channel, price, stock, sold, state |
| `inboxEntry` | kind, channel, date targeted, instant, read or not, text |
| `healthSample` | one measurement point of the stream: instant, bitrate, latency, dropped frames, viewers |

### Seven gaps between the fixture and what the contract must carry

1. **Instants.** `catalogue.json` says it itself: the minute offsets are relative to the moment the
   application is opened, and **nothing expires**. Unusable in a contract. On the wire:
   **ISO 8601 strings in UTC** (D7), which zod imposes anyway.
2. **Timezones.** `venue.utcOffsetMin` is a frozen offset. The studio shows **two clocks** — the
   operator's and the venue's — and a "next day" / "previous day" suffix when moving from one to
   the other changes the day. That computation is wrong with a frozen offset and a date six months
   out. The contract carries an **IANA identifier** (`Europe/Paris`) and a UTC instant; the offset
   and the abbreviation are derived (D3).
3. **Amounts.** The fixtures carry whole euros (`price: 26`, `amount`, `gross`). The contract
   carries **integer minor units + currency code**, and the studio formats. The **commission rate**
   must be served, not re-derived from `commission / gross`: the mockup already re-derives it and
   falls back to 12 % when the gross is nil.
4. **VAT.** The fixture applies `billingMarkets[0].vatRate` to **every** payout (D4), and to the
   gross ticket revenue (D5). Yet the `payouts` screen carries a "VAT by country of purchase" block
   that says the opposite: *"the applicable rate is that of the buyer's country"*. The contract
   cannot serve a single rate per channel: it must serve a **breakdown by billing market**, each
   line carrying its base, its rate and its amount, computed by the domain. The rest is a question
   of law, not of contract — see the questions to the backend.
5. **Relationship identifiers.** `studio-data.js` indexes crews, audience and chat **by channel
   name** (`roster['Channel name']`). That is a mockup convenience that breaks at the first
   homonym and the first rename. The contract references by identifier.
6. **Audit and versions.** Absent from the fixtures, and indispensable: every studio action is
   attributed, timestamped, kept for **24 months** and exportable. And the studio is
   **multi-operator simultaneously** — the console says so explicitly ("no lock: the N people
   online can act at the same time"). A **version** is therefore required on the aggregates edited
   by several people (`publication`, `date`, `moderationItem`), so that a command sent from a stale
   state is refused with the current state returned.
7. **Nullability of measurements.** An unmeasured bitrate is not a zero bitrate. `streaming.md`
   makes this a rule of honesty; the mockup already holds it (`upMbps === null` → "not measured").
   Every stream metric must be allowed to be **absent**, and the contract must distinguish "not
   measured on this protocol" from "measured at zero". Jitter and lost packets exist only on WebRTC
   ingest; over RTMP on TCP they are meaningless.

### The closed vocabularies the studio consumes

All must travel as **identifiers**, never as sentences, and be resolved client side through
`enums.<type>.<id>` (the i18n-by-codes decision):

`publicationState` · `runState` · `payoutState` · `messageState` · `moderationState` ·
`moderationReason` · `memberRole` · `crewRole` · `inboxKind` · `merchState` · `chatMode` ·
`replayPolicy` · `priceTier` · `outcome` · `audience` · `blackoutReason`

Two of them have **two or three competing sets of names** in the handoff; they are treated under
"Inconsistencies found". A third, subtler point: the events table sorts **by state**, and the sort
order is the order of the state machine, not alphabetical order. The contract must therefore carry
an **explicit rank** on `publicationState`, or every surface will reinvent `STATE_ORDER`.

---

## Commands

### The commands inventoried

**Date life cycle** — `createDraft` · `moveState` · `openSale` (a special case of `moveState`) ·
`setPrices` · `setCapacity` · `openCapacityTier` · `setReplayPolicy` · `setChatMode` ·
`runTechnicalCheck` · `rotateStreamKey` · `duplicateDate`.

**Conduct** — `goOnAir` · `cutStream` · `setQualityProfile` · `toggleRenditionInLadder` ·
`addChapter` · `removeChapter` · `raiseIncident` · `publishHoldScreen` (message included) ·
`resolveIncident` · `flagIncidentToProduction` · `decideOutcome` (postpone / cancel / continue with
compensation).

**Moderation** — `claimQueueItem` · `releaseQueueItem` · `settleQueueItem` (publish / remove / mute
/ ban) · `muteViewer` (duration) · `banViewer` · `liftSanction` · `setChatMode` ·
`setFilterSeverity` · `addBannedWord` · `removeBannedWord` · `setRetroactive` · `setSlowMode` ·
`setHoldersOnly`.

**Crew and rights** — `inviteMember` · `changeMemberRoles` · `removeMember` · `assignCrewToDate` ·
`unassignCrewFromDate` · `grantDateAccess` · `revokeDateAccess` · `acceptInvitation` ·
`declineInvitation` · `transferOwnership` · `deleteChannel`.

**Ticketing and money** — `issueComplimentary` · `refundSeat` · `authorizeTransfer` ·
`respondToChargeback` · `requestPayout` · `changeBankDetails` · `closeReconciliationPeriod` ·
`exportAccounting`.

**Merchandise and replay** — `upsertMerchItem` · `pinMerchDuringLive` · `connectMerchProvider`
(one integration at a time) · `reopenReplayWindow`.

**Miscellaneous** — `markInboxRead` · `exportJournal` · `exportSchedule`.

All carry `Idempotency-Key`. All produce an attributed, timestamped journal entry.

### A publication's state machine

**The authoritative vocabulary is that of `catalogue.json`** (D2) — `replay-online` says what
`replay` does not: the replay is **on sale**.

```
draft ──────► reserve ──────► scheduled ──────► technical ──────► live ──────► ended ──────► replay-online
  │                              ▲                   │
  └──────────────────────────────┘                   │
                                 ◄──────────────────-┘
```

| From | To | Meaning | Return? |
|---|---|---|---|
| `draft` | `reserve` | hold back | yes |
| `draft` | `scheduled` | publish | **no** |
| `reserve` | `scheduled` | open sales | **no** |
| `scheduled` | `technical` | start the technical checks | yes |
| `technical` | `scheduled` | stop the checks | — |
| `technical` | `live` | go on air | — |
| `live` | `ended` | end the broadcast | — |
| `ended` | `replay-online` | activate the replay | **no** |
| `replay-online` | — | terminal | — |

**The two one-way steps** and their reason, which must travel with the refusal:
`draft|reserve → scheduled` — *publishing engages the advertised price*;
`ended → replay-online` — *viewers have paid for the replay*.

**What the contract must guarantee, not merely offer:**

1. **The server refuses the reverse transition.** Not offering it in the interface is not a
   guarantee: it is a courtesy. The refusal carries a **code** (`TRANSITION_IRREVERSIBLE`) and the
   parameter naming the promise engaged, so the message can be translated client side.
2. **The transition is idempotent.** It engages a public price or a sale: a double submission must
   not produce two effects. `Idempotency-Key` is mandatory here, not recommended.
3. **The transition is optimistic and versioned.** Two people can be on the record at once. A
   command sent from `technical` while the current state is `live` is refused with `STATE_CONFLICT`
   and the current state.
4. **The right to transition is served with the state.** Only the owner and production move a date;
   a control room sees the record and does not move it. The list of transitions offered **to this
   operator** is part of the response — otherwise every surface recomputes the table.
5. **The publication gate is served, not recomputed.** Publication is possible only once seven
   items are in place: title and discipline, artwork, description, at least one active price,
   capacity, technical checks passed at least once, chat policy. The contract serves the list of
   what is missing with an identifier per item (for i18n) — not a percentage, which the client
   computes.
6. **The lock is on the transition, not on the state.** The fixtures encode
   `lockedTransitions: ['scheduled', 'replay-online']`, a list of **states**, and test membership of
   the current state. The mockup encodes `from>to` pairs. These are two different semantics; the
   second is correct, and it is the one that must be carried.

### The other irreversibilities — they are not in the state machine

- **The replay policy** is chosen **at creation**, because the public price depends on it. `off`
  ("no replay") is final for that date: impossible to activate afterwards. The others lock when
  ticket sales open.
- **Capacity** is widened **in tiers**, never reduced once on sale.
- **Beyond 10 000 seats**, infrastructure is provisioned in advance: a forecast far above reality
  incurs a penalty. Revisable until **72 h** before the show, then on request to support.
  → the contract must carry the threshold, the provision, the revision deadline and the penalty
  exposure **as data**, not as constants copied into five surfaces.
- **Opening a capacity tier notifies the waiting list in the same gesture**, with a priority window
  before public opening. That is **one** transactional command, not two: otherwise scarcity
  dissipates between the two calls.
- **Changing bank details requires dual validation** — owner *and* treasury. So it is not a write:
  it is a **request pending a second approval**, with its own life cycle and its own trace.
- **Ownership transfer** requires the recipient to already be a member and to have two-factor
  authentication. **Deleting a channel** is refused while dates remain on sale or payouts are
  pending. Both are domain rules, not interface guards: the refusal must be served with its reason.
- **A reconciliation period does not close with an unexplained discrepancy.**

### Moderation commands — a case apart

The moderation queue is **shared between several moderators at once**. The mockup already
implements the arbitration:

- an item can be **claimed**, and released;
- if two moderators settle it, **the server is authoritative**: the second decision is **refused**
  and the row closes on the first one's decision, with who settled it and which verdict.

The contract must therefore carry: the claim as a **short lease** (otherwise a moderator who closes
their browser freezes the row), the verdict as a command **conditional on the expected state**, and
a refusal that **carries the winning decision** — author and verdict — so the application shows the
truth instead of a failure.

Verdicts offered on a message: publish · remove · mute · ban. The last two bear **on the person**,
not on the message: they compose with the channel sanction. See "Inconsistencies found" (D6).

Sanctions on a person: mute **with no limit**, 1 min, 10 min, 1 h, **or a free duration in
minutes**, and lifting. → a sanction carries an **instant of expiry** (nullable for "no limit"), not
a label.

The banned-word dictionary applies **retroactively** when a word is added live, and the option is
toggleable. → adding a word can **reclassify already published messages**: it is a command that
produces effects on existing objects, and the real-time feed must carry them.

---

## Real time — running the live show

### What must be pushed, and at what rate

| What travels | Expected rate | Why |
|---|---|---|
| **the stage return video** | **sub-second** | monitoring the stage; this is the media plane (WHEP), not the control plane |
| **on-air state** (`on-air` / `idle` / interrupted) | immediate | it commands the whole screen |
| **incident raised / resolved**, hold-screen message | immediate | the viewers' client-side veil depends on it |
| **bitrate, dropped frames, latency, viewers** | **every 1 to 2 s** | these are the three figures on which one decides to lower the profile |
| **peak viewers and its time** | same feed | derived from the series, served with it |
| **chat messages** | immediate, as a stream | the moderation queue depends on it |
| **moderation queue**: entry, claim, verdict | immediate | several moderators in parallel |
| **crew presence in the console** | a few seconds | "cut" reminds you who else is online |
| **chapters posted** | immediate | several people can post |
| seat and merchandise sales during the show | 10 to 30 s | conduct information, not a decision |
| navigation counters (queue, preflight, inbox) | 30 s, or on event | badges |
| revenue, payouts, statistics | on demand | nothing there is real time |

### Five requirements the mockup imposes on the channel

1. **The subscription is per person, over a set of channels — not per page.** A show caller or a
   freelance moderator may be on duty for **several simultaneous live shows**; the mockup displays a
   bar of every stream of the evening, flags the overlap and announces "a distinct audible alert per
   channel". A channel opened only on the displayed channel would miss the other one's incident.
2. **"The venue is no longer sending" must be distinguished from "my machine lost the network".**
   These are opposite screens: in the first you switch to the hold screen, in the second **you must
   above all not cut** — the broadcast continues for the viewers. The application cannot tell the
   difference on its own: the absence of messages is identical in both cases. A **heartbeat on the
   channel itself**, distinct from the stream measurements, is therefore required, so the studio
   knows whether it is the deaf one.
3. **Every pushed message must be applicable as an idempotent patch**: a stable entity identifier,
   the nature of the change, and a sequence number per stream. A "refresh everything" on each tick
   is unusable on a console holding a queue mid-arbitration.
4. **Chat is anchored on media time, not on send time** (`streaming.md`). Chapters posted in the
   control room are too: they are reused in the replay. A chapter and a message must therefore carry
   their **position in the media**, in addition to their instant. It is free now and unrecoverable
   later.
5. **Kafka is the log, Redis the fan-out.** The studio reads the fan-out for the present moment and
   the log for history, resume and audit. A console reopened at 21:40 must be able to **replay**
   what happened since 20:30: the show's journal, the queue, the chapters and the incidents are
   durable reads, not leftovers of a buffer.

### What the channel must carry about technical state

- The **ingest protocol** (`rtmps`, `srt`, `whip`) and the measurements **actually available for
  that protocol** — `streaming.md` is explicit: hide what is not measured rather than display zero.
- The **control-room return path actually open**: WHEP sub-second on WHIP ingest, LL-HLS at a few
  seconds on RTMP ingest. `streaming.md` refuses to create a media branch merely to make a schema
  uniform. The studio must therefore **know** which one it has, and the latency announced to the
  operator must be the real one.
- The **quality ladder** served to viewers and its distribution, with the ability to disable a
  rendition.
- **End-to-end latency** is a **dedicated** measurement, never a native figure presented as such. If
  it is not measured, it is absent.
- **Infrastructure incidents** raised as domain incidents — `streaming.md` names
  `COMPATIBILITY_WORKER_FAILED`. The control room must display an explicit cause, not a player that
  never starts.
- **The grace period on going offline**: a two-second network blip at the venue must not produce an
  incident in the control room nor an HLS manifest restarted from scratch. The state pushed to the
  studio is therefore the state **after** damping, and the studio must be able to distinguish
  "damped blip" from "publisher gone".

### The hold screen

It is **not** a stream switch: it is an **incident state published on the control plane**, which
the player overlays on intact video. The message written by the control room **travels with the
state**, in the language it was written in, and the catalogue supplies templates per incident kind
(`hold-screen`, `postponed`, `cancelled`, `interrupted`). Contract consequence: the message is
**content** (authoring language, optional translation), not an i18n key.

---

## Offline and resume

The studio is a control-room tool: it stays open for two hours at a stretch, on a machine that can
lose the network at the worst moment. Three distinct needs.

### 1. Knowing you are offline, and saying so without being wrong

Treated above: without a heartbeat on the control channel, the application cannot distinguish its
own deafness from silence at the venue, and the operator cuts a healthy broadcast. It is the only
point in this chapter that is **blocking**.

### 2. Resuming without losing anything and without replaying wrongly

On reconnection the studio must not replay a buffer of stale metrics. It must **re-request** what
has a long life and **resume** what does not:

- **to re-request**: on-air state, current incident, moderation queue **with its claims**, active
  sanctions, chapters posted, the show's journal since curtain-up;
- **to resume from the last sequence number received**: chat and the journal, which are ordered
  streams — so the contract must carry a **resume point** per stream;
- **to discard**: every stream measurement from before the reconnection. A bitrate curve is
  re-requested, not replayed.

### 3. Two classes of command, and they are not recovered the same way

| Class | Examples | Expected behaviour |
|---|---|---|
| **replayable** | posting a chapter, adding a word to the dictionary, writing a note, saving a draft | may be sent late **with its original instant** — a chapter posted at 21:06 stays at 21:06 |
| **perishable** | moderation verdict, cutting the stream, state transition, outcome decision | must **never** be replayed blind. It is re-sent with the expected state, and the server refuses if the world has changed |

An undifferentiated local queue would be dangerous: a ban applied three minutes later, on a queue
already arbitrated by a colleague, is damage, not recovery.

### 4. The creation draft

The `wizard` announces "draft saved" before any server round trip. A date under construction must
therefore exist **before** it has a server identifier, or the application must be able to propose
one. This is point (C5) on the identifier policy: if the identifier is generated by the domain
rather than by a database default, the studio can create, save locally and synchronise with no
reconciliation. Otherwise it needs a correlation key.

---

## Pagination and volumes

### The decision, and where it applies

**Studio = page + total**, deterministic sort with an identifier tie-break. The mockup confirms it
twice: it displays "1–8 OF N" and enumerates the page numbers. It therefore needs the **total** and
the **page count**, not merely "there are more".

**But that decision does not apply to everything.** Two feeds are chronological, growing
continuously during a live show, and have no "page 3" that means anything:

- **the live chat** — you read the tail and scroll back;
- **the show's journal** and **the channel's journal** — the same shape, newest first, over 24
  months of retention.

For those two, a **descending cursor** is needed. Counting a show's messages to display a total is a
pointless cost, and the total changes between the call and the display.

### Volumes to expect, and where they bite

| Collection | Realistic volume | Consequence |
|---|---|---|
| a channel's dates | dozens to a few hundred | page + total, with server-side filters and sorts |
| directory of contributors | thousands, freelancers included | **server-side** search mandatory |
| a channel's audience | thousands of handles | server-side search: the mockup already looks up a viewer **who has not written** |
| messages of one show | thousands per hour | cursor, never page + total |
| moderation queue | dozens to hundreds at once | page + total, but refreshed by the feed |
| journal | 24 months | cursor + filter by nature + export |
| payouts | one line per date sold | page + total |
| merchandise items | dozens | not paginated |

### Sorts and filters to serve

- **Events table**: sort by date, title, price, **state**, fill rate, revenue — ascending and
  descending; **multi-state** filter; free-text search on title and meta.
  Sorting by state follows the state-machine order: see the explicit rank requested above.
- **Crew**: search on name, email, note and role; filter by role with a **count per role** — so a
  served aggregate, not a count over the current page.
- **Moderation**: filter `all` / `held` / `removed`, search on handle and text.
- **Journal**: filter by nature (`air`, `mod`, `event`, `access`, `money`), and a period.
- **Statistics**: periods `7d`, `30d`, `90d`, `season`, **and a custom range**. "Season" is a
  business notion: the contract must carry its bounds, not leave five surfaces guessing when a
  performing-arts season begins.

### Exports

`payouts` offers a sales journal CSV, a **general ledger (FEC)**, Sage entries, Cegid entries,
grouped PDF invoices. `tickets`, `stats` and `journal` offer their own, and `agenda` a calendar
export. Over 24 months these are **asynchronous jobs**: the command creates an export, the studio
follows its progress and retrieves a link. A synchronous download is not viable, and the "BullMQ
internal to a service" decision already says where that work lives.

---

## Error and loading states

### Start-up

The mockup has an explicit boot state: while the data has not arrived the control room shows a
waiting screen **rather than frozen tables**, and retains the error. The contract must therefore
offer a **short, fast bootstrap payload** — identity, accessible channels, roles and effective
rights per channel, navigation counters — served separately from the page content. Without it the
sidebar waits for the slowest page.

### The three refusals to distinguish

The studio must be able to say three different things, and the single error envelope (code,
parameters, trace identifier) must allow it:

1. **"You do not manage this channel's access"** — missing right. The action is visible but inert,
   with a reason naming who can do it. The mockup already carries these sentences.
2. **"This resource does not exist"** — not found.
3. **"There is nothing"** — a legitimate empty, with its own message: "the window opens at curtain
   call", "chat will open at curtain-up", "no dispute in progress · every seat is honoured". These
   are **positive** states, not failures.

### Errors specific to the studio

| Situation | What the error must carry |
|---|---|
| one-way transition attempted | code, transition targeted, promise engaged |
| stale state | code, **current state**, current version |
| duplicated moderation verdict | code, **who settled it**, **which verdict** |
| non-assignable role | code, roles assignable from this level, whom to ask |
| channel deletion refused | code, what blocks it (dates on sale, payouts pending) |
| period close refused | code, unexplained discrepancy |
| publication refused | code + **list of identifiers** of the missing items |
| ingest refused | code distinguishing token, quota, owner, expiry |

All as **codes and parameters**, never as sentences: the studio is bilingual and loads `studio`,
`taxonomy`, `system` **and** `storefront` for its shared labels.

### Loading during a live show

A live show does not pause because a request is slow. Two requirements: lost metrics are not caught
up (the last measurement is displayed with its age), and a control-room command must never be left
in an indeterminate state — idempotence allows it to be replayed, provided the response says
whether it took effect.

---

## Constraints specific to the studio

Only those that constrain the contract.

- **Angular 22, zoneless.** Change detection is triggered by writing to a signal. A pushed message
  arriving outside Angular's knowledge refreshes nothing unless it lands in a signal. The contract
  consequence is real: every message must be **applicable as a targeted patch** on an identified
  entity, so it can be written into an entity store. A feed that says "something changed, reload"
  condemns the console to reload everything every two seconds, in the middle of queue arbitration.
- **Multi-operator without locking, by design.** This is an explicit design choice of the mockup. It
  moves arbitration **to the server**: versions, conditional commands, refusals that carry the
  winning decision. There is no edit lock to plan for; there is optimistic concurrency to put in
  the contract.
- **Everything is attributed and kept for 24 months.** The journal is not a comfort: it is the
  product of an outcome decision worth several thousand euros. Every command carries its actor, and
  the corresponding journal entry is a **served read**, not a client-side reconstruction.
- **Two clocks, always.** The operator's time and the venue's, with the day shift when there is one.
  That requires the venue's IANA identifier in almost every shape carrying a date.
- **Bilingual by codes.** The API returns enumeration identifiers and their parameters. Two
  legitimate exceptions, which are **content** and not interface: the hold-screen message written by
  the control room, and the inbox texts. They carry their authoring language.
- **One BFF per product.** The studio composes views that cross several contexts — a date record
  mixes catalogue, ticketing, streaming, moderation and crew. That composition belongs to the studio
  BFF; synchronous calls go only from the BFF to a service.
- **Nothing is computed twice.** The commission rate, a state's rank, a season's bounds, the
  remaining replay window, the amount of a credit note, effective rights: all of that is domain. The
  studio formats and displays.

---

## Inconsistencies found

Beyond D2, D5 and D6, which the errata already names, the reading surfaced the following.

1. **`team` is a dead page.** None of the six personas opens it: it appears in no line of the access
   table, and a rule removes it a second time when `crew` is present. Yet a shortcut from the record
   points at it. Either the page merges into `crew` for good, or a role must open it — to be settled
   before the navigation contract is written.

2. **Three vocabularies for the chat policy.**
   `catalogue`/`helpers`: `open · emoji · read-only · off`.
   Control-room console: `free · emoji · read · off`.
   Moderation page: the same four as the console.
   The i18n resolves only the first set. It is the same gap as D2, on another enum.

3. **Two vocabularies for the replay policy.**
   `helpers`/i18n: `included · none · subscription · unit`.
   Creation wizard: `included · sub · unit · off`.
   `helpers.stateOf` literally tests `policy !== 'none'`: a date created with `off` would never be
   recognised as having no replay.

4. **Two vocabularies for filter severity, in the same file.**
   Channel settings: `souple · normale · haute`. Moderation page: `basse · moyenne · haute`.
   The help text is indexed only on the first. Neither is in `shared/`.

5. **Two checklists before publication.** The fixtures carry
   `checklist { technicalCheck, chaptersPlanned, moderationStaffed, replayPolicySet }`, four items.
   The record displays **seven**, three of them absent from the fixtures (artwork, description,
   capacity) and one absent from the record (chapters planned). Both answer the same question: "can
   we publish?". Only one may survive the port.

6. **State lock versus transition lock.** The fixtures encode a list of locked **states**; the
   mockup a list of `from>to` **pairs**. The second is right; the first is what a quick reading of
   the domain would pick up.

7. **Four sanction scales, not two.** The errata (D6) names three — message (`messageStates`),
   person (`audience[].state`), and the `ok/held` reduction in `studio-data.js`. A fourth exists:
   `enums.moderationState` adds `reported` and renames `ok` to `published`, giving
   `published · reported · removed · muted · banned`, and it is **that one** the moderation journal
   and the sanctions display. The console queue, meanwhile, displays `messageState`. Two adjacent
   screens therefore read two different enums for the same object.

8. **Three state axes on one date, with no written hierarchy.** `publicationState` (seven values),
   `runState` (`idle · rehearsal · on-air · interrupted · postponed · cancelled`) and `outcome`
   (`postponed · cancelled · interrupted`, nullable) coexist, and the agenda derives a fourth
   four-value reduction. It is `outcome` that decides a payout's state (held, refunded), and
   `runState` that decides the air. The contract must say which is authoritative for what, or every
   screen will choose.

9. **The mockup's VAT contradicts the fixtures' VAT.** The fixtures apply a single rate to the
   gross; the payouts screen displays a breakdown "by country of purchase", asserting that the rate
   is the buyer's. It is the same trap as D5 from another angle: the fixture produces a plausible
   number, the screen states a rule. Neither has been researched.

10. **Two mockup defects, without contractual reach but useful for the port.** The `identityOf`
    method is defined twice in the same class — the first, dead, version calls `A.subcategory(...)`,
    which does not exist, and `A.genre(id)` with one argument instead of two (the taxonomy has no
    subcategory: it has discipline, genre, tag).

None of these inconsistencies has been applied: they are reported, not settled.

---

## What I cannot obtain alone — questions to the backend

### Roles and rights

1. **Does the contract serve effective rights, or raw material?** My position: **both, with the raw
   material in the eight-role vocabulary.** The fold to six loses `director`'s invitation right. Do
   you confirm that computing effective rights lives in `@arthome/core`, served by the studio BFF,
   and that the fold to six is only a label?
2. **Is role filtering a server projection or client masking?** Should a control room receive a
   date's gross ticket revenue? My position: no — `canRevenue` decides the **content** of the
   response, not its display. That implies different shapes for the same screen depending on the
   role: is that acceptable in the contract, or is a single shape with optional fields required?
3. **Where does one-off access to a date live?** A freelance reinforcement assigned to a date,
   expiring when the curtain falls — does that belong to `identity`, to `catalog`, or to a `channels`
   context of its own? This is point C9, left open, and the studio cannot proceed without it.
4. **An accepted invitation crosses two contexts.** It is born in a channel and it changes rights.
   Which service owns it, and which event publishes it?

### State machine and publication

5. **One single set of names**: that of `catalogue.json` (D2), confirmed? And does **the rank** of
   each state travel with it, for sorting by state?
6. **Is `publication` an entity served separately from `date`, or merged?** The fixtures separate
   them and the date points at the publication. The studio works on the publication; the storefront
   reads the date. Are two distinct read models required?
7. **Which checklist is authoritative before publication?** Four items or seven?
8. **What degree of guarantee is expected on one-way transitions?** A plain server refusal, or a
   refusal plus an audit trace of the attempt? An attempt to reverse an engaged price is itself
   information.

### Money

9. **Who owes the VAT, on what base, and who is liable?** (D5.) The fixtures apply it to the gross
   ticket revenue and deduct it from the artist's net; the payouts screen asserts that the rate is
   that of the buyer's country. These two statements are incompatible. `adr-payments.md` must settle
   it before the studio displays a net.
10. **Multi-currency: honoured or deferred?** (D4.) Three markets are declared, one is exercised. If
    the studio must display a cross-border payout, it needs to know in which currency a channel's
    balance is presented, and what happens when a channel sells in two currencies.
11. **Is dual validation of bank details an aggregate state, or a separate approval flow?** It
    requires two actors and two distinct roles, it has a delay, and it must be audited.
12. **What bounds for the "season"?** The period selector offers it beside 7, 30 and 90 days. It is
    a domain notion, and I refuse to hard-code it in the studio.
13. **Do the accounting exports — FEC, Sage, Cegid — belong to `payouts`?** And the reconciliation
    that blocks a period close: which service holds that state?

### Live and real time

14. **Which channel, and what guarantees?** Fan-out to connected clients through the Socket.IO
    adapter, with a resume point per stream — is that the retained shape? The studio needs a
    **sequence number** to resume, and both chat and journal are durable feeds (Kafka), not
    leftovers of a buffer (Redis).
15. **Does the control-channel heartbeat exist?** It is the only way for the studio to distinguish
    "the venue is no longer sending" from "I lost the network", and that is the difference between
    switching to a hold screen and cutting a healthy broadcast. I consider it blocking.
16. **Which metrics are actually available per ingest protocol, and at what rate should they be
    pushed?** `streaming.md` says jitter and lost packets are meaningless over RTMP, and that an
    unmeasured metric must be absent, never zero. The contract must carry that absence — how?
17. **Is end-to-end latency measured server side or client side?** If client side, it is not a
    contract field, and the studio must measure it itself.
18. **Is the control-room return path available for a show served in its state?** WHEP sub-second or
    LL-HLS at a few seconds: the studio must know, so as not to promise the operator a latency it
    does not have.
19. **Does the hold-screen message travel with the incident state**, as `streaming.md` prescribes,
    and in what shape — content with its authoring language, or an identified template?

### Moderation

20. **How do the message sanction and the person sanction compose?** (D6.) And **only one badge is
    displayed**: which prevails? A related but decisive question: does a person banned from a channel
    belong to `chat` or to `identity`?
21. **Is claiming a queue item a lease with an expiry?** Without one, a moderator who closes their
    browser freezes a row for the whole show.
22. **Does the refusal of a duplicated verdict carry the winning decision?** The mockup requires it:
    it displays "X has already removed this message". A bare refusal would force a second round trip
    in the middle of a live show.
23. **Does adding a word to the dictionary live reclassify already published messages?** The
    "retroactive" option exists in the mockup. If so, those reclassifications must arrive through the
    feed, and the journal must distinguish them from a human decision.
24. **Does audience search cover every viewer present**, including those who never wrote? The mockup
    does it, and displays "present, has not written". That presupposes served presence, not merely
    the authors of messages.

### Capacity and infrastructure

25. **Are the 10 000 threshold, the provision and the penalty domain data?** And the 72 h revision
    deadline? If they are constants, they will be copied into five surfaces, which principle no. 1 of
    the handoff forbids.
26. **Opening a capacity tier and notifying the waiting list: one command?** With the priority
    window as a domain parameter?

### Cross-cutting

27. **Where are identifiers generated?** (C5.) The studio needs to save a draft before any round
    trip. A domain-generated identifier allows it; a database default requires a correlation key.
28. **Does the dynamic label catalogue** (C6) serve the studio too, or only the store surfaces? The
    studio loads four themes (`studio`, `taxonomy`, `system`, `storefront`) and its number of
    enumeration keys is high.
29. **What granularity for reading a date record?** One call per pane, or one call with a projection
    dictated by the rights? The whole shape of the studio's reads depends on that answer.

---

# Confrontation

> Round 3. Read: `answers-to-surfaces.md`, `context-map.md`, `data-model.md`, `events.md`,
> `realtime.md`, `adr-payments.md`, `adr-stream-entitlement.md`, `transport.md`,
> `critical-rules.md`, `DECISIONS.md`, and `openapi/studio.yaml` in full.
> Every reference below is verifiable line by line.

## The heartbeat exists

`realtime.md` §4: `ws:pulse` every 5 s on both namespaces, with exactly the discrimination I asked
for — **no pulse for 15 s = I am the deaf one; a pulse with no health sample for 30 s = the venue is
no longer sending**. Two states, two screens, no inference. It is served at bootstrap
(`StudioBootstrap.realtime.pulseIntervalSec`), it carries `serverTime` as the reference clock and
`seq` as the resume point, and it has a named operational threshold (`ws_pulse_gap_seconds` p99 >
15 s, with the right comment: "both studios will wrongly display *I no longer know*, which is the
worst possible outcome").

Added to it is an answer I had not asked for and which is better than my question: the automatic
hold screen after 15 s of lost stream is a **server rule**, carried as a channel default, and its
firing produces an incident on the same footing as a manual one (`IncidentTrigger.AUTO`). That is
the right answer to the case I had failed to put: the unreachable show caller — or the show caller
who is precisely the one who lost the network.

**This point is closed. There is nothing to contest on it.**

---

## What is satisfied

Briefly, because it is the bulk of the document and contesting it would be dishonest.

| Need | Where | Verdict |
|---|---|---|
| eight roles, never six | `studio.yaml` preamble, `EffectiveRights.roles` | held, word for word |
| `canRevenue` decides the **content** | preamble, `EventsRow.grossRevenue`, `RunConsole.grossRevenue`, `channel:{id}:revenue` room | held, **and extended to the channel** — which I had not thought to ask for |
| sort on an absent field **refused** | `SORT_KEY_FORBIDDEN` | added by the offer; it is the hole my wording left |
| two access scales separated | `ChannelMembership` / `DateAccessGrant`, expiry **as an instant** | held (but see H) |
| `order_rank` with the state | `Publication.orderRank` | held |
| lock on the `from > to` pair | `PublicationTransition` | held, inconsistency 6 corrected |
| refusal carrying the promise engaged | `TRANSITION_IRREVERSIBLE` + `promiseCode` | held |
| reversal attempt journalled | `listChannelJournal`, description | held — I asked, the answer is yes |
| conditional + versioned | `expectedVersion` everywhere, `STATE_CONFLICT` | held |
| publication gate served as identifiers | `PublicationChecklistItem`, nine ids, `blocking` | held, and better: seven blocking + two warnings |
| claim lease | `claimExpiresAt` | held |
| second verdict refused **with the winner** | `MODERATION_ALREADY_SETTLED` + `settledBy` + `verdict` | held |
| retroactive reclassification, async and distinguishable | `reprocessing`, `origin: retroactive_filter` | held |
| a sanction is an **instant**, never a label | `muteUntil`, `sanctionExpiresAt` | held |
| audience search including the silent | `searchAudience`, `present` | held |
| nullable metrics, meaningful absence | `HealthSample`, `jitterMs`/`lostPackets` omitted on RTMP, `measuredAt` at ingest | held, and the comment "a zero reads as *perfect*" is the right one |
| return path served | `RunConsole.monitorPath` | held |
| "damped blip" ≠ "publisher gone" | `afterGracePeriod`, two fields | held |
| hold screen as content, not an i18n key | `LocalizedText` | held |
| chapters at media position | `atMediaSec` | held |
| idempotent patch, `seq` per stream | `realtime.md` §3.1 | held — and motivated by zoneless Angular, explicitly |
| channel **per person**, multi-channel | `realtime.md` §3 | held |
| `resume:too_old` | `realtime.md` §5 | held; `studio-mobile` obtained it, it serves me just as much |
| 10 000 threshold, provision, 72 h, penalty | `DateSalesPane.technicalProvision` + `constants` | held, as **data** |
| tier + waiting list in one command | `openCapacityTier` | held |
| season bounds served | `constants.seasonBounds` | held |
| dual bank signature as an aggregate | `BankChangeRequest`, suspends the transfer | held |
| VAT broken down by market, commission on the net-of-VAT base | `PayoutLine.vat[]`, `grossHt`, `commissionRateBps` | **better than what I asked for** |
| one balance per currency | `balances[]` | held |
| asynchronous exports, signed URL | `requestChannelExport` / `getChannelExport` | held |
| identifiers in the domain | UUIDv7, `createDateDraft` | held; the `wizard` draft works |
| queue and chat on a cursor | `listModerationQueue`, `listStudioChatMessages` | held (D-010) |
| `pendingCount` separate from the page | `CursorPageInfo.pendingCount` | held — the badge is not counted over the loaded page |

---

## What is not

### A — Five navigation entries are declarable and **served by no operation**

`EffectiveRights.navigation` has a closed vocabulary of fourteen values (`studio.yaml:3999`). Five
of them appear **nowhere else** in the document than there:

| Entry | Roles that open it | What is missing | What it costs |
|---|---|---|---|
| `dashboard` | `artist`, `production`, `treasury` | everything: the six measures and their series, the reminders, the countdown to the next date | **it is the landing page of three personas out of six** |
| `stats` | `artist`, `production`, `treasury` | everything: fill rate per date, audience per date, provenance, and the "compare the dates of a run" tab | the `stats_csv` export exists: one can **export a statistic one cannot read** |
| `stream` | `artist`, `production`, `director`/`video`/`sound` | the page: ingest server, measured upstream bitrate, recommended profile, preflight list, test history | **one of only five entries a control room has**, and the `preflightBadge` has no source in `StudioCounters` |
| `replays` | `artist`, `production`, control room | the list: online / archived, views, revenue, remaining window | `reopenReplayWindow` lets you **reopen a window you cannot see** |
| `tickets` (channel level) | `artist`, `production`, `treasury` | the aggregated page: tier split across all dates, waiting list per date, complimentary tickets per category, **requests in progress** (refund, seat transfer, chargeback) | the commands exist (`refundSeat`, `issueComplimentary`), the collection they act on does not |

This is not an oversight of detail: it is **a third of the navigation**. The contract authorises the
BFF to serve `dashboard` to an artist, and the application has nothing to call. Two precise
corollaries:

- **`stream` is a `director`'s only working page besides `events` and `replays`.** Removing two of
  the three leaves them an events table.
- **`replays` is open to the control room** and to nobody else on the technical side: it is where
  one sees that a window closes in twenty-four hours, which `inboxPool` already announces
  (`replay-expiring`).

Two more entries are **half served**: `settings` has a `PATCH /channels/{id}/identity` and **no
GET** — the screen has nothing to read before writing — and the "broadcast defaults, applied to new
dates" block has no owner; `store` has its catalogue but not the "merchant integration, one at a
time" block.

### B — Five of the six date-record panes do not exist

`DateSheet.openPanes` has the vocabulary `[public, tickets, chat, tech, crew, replay]`. Exactly one
pane operation is written: `GET /v1/dates/{dateId}/panes/tickets`.

The reason is stated twice, and it is **my own argument that is quoted**: *"a moderator must be able
to load the `chat` pane without loading the whole record, otherwise the ticketing figures travel for
nothing"*. The `chat` pane does not exist. Concretely:

- a `moderation` opens a record, receives `openPanes: [chat]`, and **can call no pane at all**;
- a `coordination` receives `openPanes: [tech, crew]` — **neither of them exists**;
- a `director` receives `openPanes: [tech]` — non-existent. Yet answer 29 names all four owners:
  `tickets → ticketing`, `chat → chat`, `tech → streaming`, `crew → identity`.

The rule is written, the mechanism is described, one of the four paths is laid.

### C — Crew presence is **pushed without ever being served**

Three documents promise it and none delivers it:

- `realtime.md` §8: "crew presence | studio | ~10 s | **pushed**";
- `realtime.md` §3: the `channel:{id}` room carries "crew presence";
- `context-map.md` §10.1: the `regie` screen counts **three** internal calls, including
  `identity.GetChannelPresence`.

**No BFF operation exposes it**, `RunConsole` does not carry it, and the "to re-request" list in
`realtime.md` §5.1 does not mention it. A delta with no snapshot is not a contract: a console opened
at 21:40 shows zero people online and will keep doing so until somebody joins or leaves.

This is not cosmetic. The cut confirmation reads literally *"cutting ends the broadcast for N
viewers · **M other people online**"* — it is the guard rail on the most destructive gesture in the
control room, in a studio that is explicitly **lock-free**, and it is empty.

### D — The health curve "is re-requested" and can be requested nowhere

`realtime.md` §5.1, "to discard" column: *"every stream measurement from before the reconnection. A
bitrate curve **is re-requested**, not replayed."*

`/v1/dates/{dateId}/run/health-samples` is **POST only** (`submitHealthSample`), and
`RunConsole.lastSample` is **one** sample. There is no read of the series.

Consequence, on three paths that occur every evening: after a `resume:too_old`, after a
reconnection, or simply by opening the console in the middle of a show, the bitrate curve and the
**peak viewers with its time** are unobtainable. Two documents of the same offer contradict each
other, and the one that promises is the one with no operation.

### E — `displayState` is served to the storefront and **not** to the studio

`context-map.md` §5 (E4): *"the contract serves a fourth, derived and unique value: `displayState` …
It is the only value the cards display, and **nobody recomposes it**."*

Count: **13 occurrences in `storefront.yaml`, 0 in `studio.yaml`.**

Yet it is the studio that has three axes to reconcile, not the storefront. The events table, the
agenda, the duties and the dashboard all display the composite — including the outcome labels that
**replace** the state (`CANCELLED & REFUNDED`, `POSTPONED · TICKETS VALID`, `INTERRUPTED · CREDITS
ISSUED`). `EventsRow` serves `state` + `orderRank` + `outcome` and leaves the client to compose
them.

That is exactly the second implementation critical rule no. 2 forbids — and it is left to the
surface where a mistake is not a mislabelled card but a control room on the wrong screen.

### F — An event during a transition: **safe, and the screen still lies**

This is my question, and the answer is half there.

**The half that is there — safety — is complete.** `expectedVersion` on every transition,
`STATE_CONFLICT` with the current state **and** version, `TRANSITION_IRREVERSIBLE` with the promise,
`acknowledgedPromiseCode` mandatory on a one-way step, `Idempotency-Key` mandatory, and the attempt
journalled. Nothing is ever corrupted. I have no reservation there.

**The half that is missing — freshness — is entirely absent, and four facts establish it:**

1. `events.md` §4.2 contains **no** `catalog.publication.state_changed.v1`. There is
   `date.drafted`, `date.scheduled` and `publication.engaged`. So `draft → reserve`,
   `scheduled → technical`, `technical → scheduled` and `ended → replay-online` **produce no event
   at all**;
2. the `channel:{id}` room carries "on-air state, incidents, crew presence, sales, chapters" —
   **not the publication state**;
3. neither `DateSheet` nor `EventsRow` carries a `validUntil` — critical rule no. 9 therefore does
   not apply to them;
4. the `GET /changes?since=` of `realtime.md` §5.2 is written for **storefront mobile** and does not
   exist in `studio.yaml`.

The scenario, precisely. 18:04. A and B are both on the record of "Nuit blanche", version 7, state
`draft`. A publishes: version 8, `scheduled`, prices engaged, **one-way**.

> **B's screen keeps displaying DRAFT, with its two offered transitions — "Hold back" and
> "Publish" — indefinitely.**

B clicks "Publish", believing they are first through an irreversible door, and learns otherwise from
an error message. Nothing is broken. But B has just attempted to engage a public price, the attempt
goes to the journal under their name, and they find out afterwards that it was already engaged. And
B's `listChannelEvents` table still counts that date under `DRAFT` in the state filter, for everyone
who does not reload.

**What I am asking for is small, and the machinery already exists.** A
`catalog.publication.state_changed.v1` (`from`, `to`, `version`, `actor`) routed to `channel:{id}`
as an ordinary patch `{ entity: "publication", id, op: "upsert", seq, patch }` — the shape is
already specified in `realtime.md` §3.1, only the entity is missing from the list.

With **one refinement** the offer makes necessary: `offeredTransitions` is "computed for this
operator". A patch carrying the new state without recomputing the transitions **for the recipient**
would leave a stale button — the same defect, moved one notch. The patch must therefore either carry
the recipient's transitions, or be a "re-read this entity" marker for that one entity.

### G — The moderation reasons are a **parallel table** — the very thing the contract reproaches the mockups for

| `shared/catalogue.json` `moderationReasons` (authored, and the only set the i18n resolves) | `studio.yaml`, `settleModerationItem` and `sanctionAudienceMember` |
|---|---|
| `spam` | `spam` |
| `insult` | — |
| `spoiler` | — |
| `off-topic` | `off_topic` |
| `harassment` | `harassment` |
| — | `hate` |
| — | `filter` |

Two authored reasons disappear, two invented ones appear. **`spoiler` — "gives away the show" — is
the only reason specific to live performance**, it is translated in `shared/i18n/studio.json`
(`enums.moderationReason.spoiler`), and it now has no emitter. `insult` is used by the fixtures.

And `filter` is not a reason: it is an **origin**. The contract already carries the origin elsewhere
and correctly (`origin: human_verdict | retroactive_filter`); putting it in `reason` as well gives
two axes to one field — precisely the reproach the offer addresses to `reported` in the sanctions
and to `postponed` in `run.state`.

Critical rule no. 10 ("an unknown enumeration value is kept raw and treated as neutral") saves
nothing here: the problem is not receiving `spoiler` without understanding it, it is that **nobody
will ever be able to emit it again**.

The `studio.yaml` preamble says: *"the parallel tables of the two studio mockups are never taken
up"*. Here it is the contract that holds a parallel table against `shared/`, on the one enum
`shared/` is unambiguously authoritative about — it had no competitor.

### H — `crew` has no read of assignments, and the two access scales are reconflated on write

Three defects compounding on the same page, that of the `coordination` persona — whose entire
navigation is `crew · journal · help`.

1. **`/v1/dates/{dateId}/crew` is POST only.** No GET. The **matrix** tab (dates × posts, "posts
   covered", "missing CONTROL and MODERATION") and the "TONIGHT — preflight to run on each stream"
   list have no read path. `listDuties` gives **my** duties; `EffectiveRights.dateGrants` gives
   **my** grants. Neither gives the channel's coverage. Without it, `coordination` has one working
   page out of three.
2. **No list of a channel's one-off grants.** `revokeDateAccess` revokes by `grantId` — an
   identifier no read provides. The "one-off access" tab has no source.
3. **`expiresAt` is required on `grantDateAccess`.** The preamble says the two scales must never be
   confused; the sole write endpoint imposes the **one-off** scale on both. Assigning a permanent
   channel member to the `sound` post of a date therefore requires inventing an expiry instant for
   somebody who is not leaving.

And it is not isolated: `moderator_assigned` is one of the nine checklist items, `datesToCover` is a
served counter. **Both are computed from a coverage the studio can never read.**

### I — An off-air moderator has no write surface

`filterSeverity`, `slowModeSec`, `holdersOnly` and `retroactiveFilter` all four live on
`PUT /v1/dates/{dateId}/chat-policy` — **per date**, with a date's `expectedVersion`.

Off air there is no date to point at. And the mockup says exactly the opposite, in so many words:
*"the dictionary, the severity and the sanctions remain editable off air — they will apply to the
next show"*. The dictionary is correctly at channel level
(`/v1/channels/{id}/moderation/banned-words`); severity, slow mode and holders-only are not.

A **channel-default chat policy** is missing, along with the inheritance rule saying what a new date
takes from it. It is also the natural owner of the "broadcast defaults" block of `settings`, which
has none.

### J — `agenda` and `inbox` are **person** screens filed in a **channel** array

`EffectiveRights.navigation` is per channel. But `agenda` is served by `GET /v1/me/duties`, which is
**per person** and explicitly "across all channels"; `inbox` by `GET /v1/inbox`, likewise — and its
description says "open to everyone, whatever the role".

A person on three channels therefore receives the same entry three times — or zero times. **It is
zero in the contract's own example** (`studio.yaml:2445`):

```
roles: [video]
navigation: [events, stream, replays, help]
```

`agenda` is absent, whereas the six-persona table gives `regie` exactly
`agenda · events · stream · replays · help`. For a `moderation`, the same omission leaves
`moderation · help`. **The landing page of the two field personas is either duplicated or lost,
depending on the reading — and nothing says which.** The `dutiesTonight` counter is nevertheless
served, which presupposes that duties count.

The fix is small: a person-level `navigation` beside the channel-level one.

---

## How many round trips

The count is good overall, and I say so before criticising: bootstrap in **one** call, carrying
identity, every channel with its effective rights, the domain constants, the label catalogue and the
counters, is exactly what was needed. Nothing is painted before it, and it is small. Three
reservations.

**1. The date record: 1 + 1 per open pane, so seven calls for an artist.** I asked for per-pane
serving and I stand by it — a `moderation` makes 2 calls instead of 7, and ticketing never travels
for nothing. But the frequent case is the artist, and it is the worst: seven round trips for one
screen, against the "1 to 3 per screen" `context-map.md` §10.1 announces for the studio. What I
would accept while losing nothing: `GET /dates/{id}/sheet?panes=public,tickets`, composed at the BFF
for **the requested panes only**. The number then follows the role instead of following the maximum,
and the "a closed pane is never fetched" guarantee is intact.

**2. The control room: four calls before painting, on the screen where time matters most.**
`context-map.md` counts three **internal** calls; from the application it is
`GET /run` + `GET /moderation/queue` + `GET /chat/messages` + presence (which does not exist).
`RunConsole` already aggregates the protocol, the quality ladder, the incident, the chapters and the
chat throughput: adding presence and the last N health samples — both missing, see C and D — would
bring the console down to **two**.

**3. The studio has no `/changes`.** The storefront gets a list of invalidations in one call on
foregrounding. The studio, which is the application left open for two hours while another person
edits the same objects, has nothing. It is the same need, on the surface where it is most acute.

---

## What is satisfied differently, and whether that suits me

**`live` and `ended` removed from the transition command — better than what I asked for, and I adopt
it.** *"Publication does not command the air, it learns it"*: only `streaming` knows whether the
stream is arriving, and `Publication` remains a single-context aggregate. One consequence to write
down somewhere, because it is nowhere: the date record offers "Go on air" and "End broadcast" as
buttons, and they now go to `PUT /run/state`, not to `/publication/transitions`.
`offeredTransitions` will **never** contain them. The record must know that, or two buttons vanish
and nobody understands why.

**The journal stays on page + total with a mandatory period — I was wrong, and the argument is
better than mine.** The period filter is the real affordance; a cursor would have cost me the page
numbers I was demanding elsewhere. Nothing to add.

**`run.state` loses `postponed` and `cancelled`** — correct, and the sentence is the right one: a
control room has no "cancelled" state, it has a stage sending nothing.

**Filter severity as `low | medium | high`** is a fifth vocabulary relative to the two I found — but
it is single, canonical and English, and mine were both local to the mockup. Accepted without
reservation.

**`team` has disappeared from the navigation vocabulary.** That is the right decision and it follows
my inconsistency no. 1. But it is written nowhere: not in `answers-to-surfaces.md`, not in
`DECISIONS.md`. `studio-mobile` may still carry a `team` screen. **One line would do.**

**VAT, payouts and currency** are more rigorous than what I asked for:
`grossTtc → vat[] per market → grossHt → commission on the net-of-VAT base → net`, one balance per
currency, never aggregated, and the warning at the head of the ADR. I have nothing to add, except
this: `PayoutLine` carries the breakdown, but the screen also carries a **reconciliation** ("seats
collected", "reconciled with the statement", "discrepancy to explain") and a **disputes** block.
`closeReconciliationPeriod` is a POST with no GET, and nothing lists the disputes: one closes a
period whose discrepancy cannot be read, while the offer itself says an unexplained discrepancy
blocks the close.

---

## The questions left unanswered

1. **Will `catalog.publication.state_changed.v1` exist, and will it reach `channel:{id}`?** And does
   its patch carry `offeredTransitions` recomputed **for the recipient**?
2. **Which read for the health series**, and over what window? `realtime.md` §5.1 says it "is
   re-requested"; no operation serves it.
3. **Which operation exposes `identity.GetChannelPresence`?** `context-map.md` §10.1 counts it,
   `studio.yaml` does not publish it.
4. **Five navigation entries, five missing operations** — `dashboard`, `stats`, `stream`, `replays`,
   `tickets` at channel level. Are they to be written, or to be **removed from the vocabulary**
   until they exist? Serving an entry that no call follows is worse than not serving it.
5. **The five missing panes** — `public`, `chat`, `tech`, `crew`, `replay`.
6. **`displayState` for the studio: served, or is the studio authorised to recompose it?**
   Critical rule no. 2 says no.
7. **`moderationReason`: do `spoiler` and `insult` come back, and does `filter` leave `reason` for
   `origin`?**
8. **A channel-default chat policy**, and the inheritance rule for a new date.
9. **A read of crew coverage per date**, a list of a channel's one-off grants, and can `expiresAt`
   be null for a permanent member assigned to a post?
10. **A person-level `navigation`** for `agenda` and `inbox` — or the rule saying how to read them
    inside a per-channel array.
11. **Will the WebSocket contract be machine-readable?** zod validates everything, the OpenAPI is
    generated, and the surface with the tightest latency budget has only prose. An AsyncAPI, or
    Protobuf messages, would stop five surfaces retyping `{ entity, id, op, seq, patch }` by hand.
12. **A read of the reconciliation and of the disputes**, without which `closeReconciliationPeriod`
    closes blind.
13. **Is `GET /changes?since=` open to the studio BFF?**
14. **A GET of the channel settings**, and the owner of the "broadcast defaults" block.

---

# Dashboard and stats — survey for the contract

> A survey of the mockup, not a design. What `Studio.dc.html` actually carries, and **"absent"**
> wherever it says nothing. Read with `rg` then `sed`, never in full.
> Intended for `backend-contracts` to write the two missing paths.

## 1. The six dashboard measures

A single template: **label · value · unit · variation · one bar per series point**. The variation is
**not** a field: it is derived from the series (`trendOf`) — the mean of the first half against the
second, **nothing shown below 4 points** nor below a 0.1 % difference, expressed as a percentage
except for fill rate, which is in **points**. The sparkline takes the **last 14 points**.

| # | Label | What it measures, in the mockup | Series carried | Role scope |
|---|---|---|---|---|
| 1 | `MERCHANDISE SALES` | sum of `sold × price` over every item of the channel's shows | **per item**, not temporal — a mockup convenience | `canRevenue` |
| 2 | `FOLLOWERS GAINED` | `channel.followersGained30d` — a counter **frozen at 30 days** | **absent** (empty array) | everyone |
| 3 | `REPLAY VIEWS` | sum of `replayViews` over the channel's dates | **one value per date**, chronological | everyone |
| 4 | `FILL RATE` | mean of `(capacity − available) / capacity` over the dates | one value per date, as a percentage | `canOps` |
| 5 | `MESSAGES MODERATED` | number of queue entries over the channel's dates | one value per date | `roleOf === 'mod'` |
| 6 | `AVERAGE SIGNAL` | mean `100 − dropped%`, as a percentage | derived from the health series of **the first date only** | `roleOf === 'regie'` |

**Period.** A selector shared by `dashboard` and `stats`: `7 D · 30 D · 90 D · SEASON · CUSTOM`, the
last opening two `FROM`/`TO` fields and a summary "94 days · 7 dates" — so for a free range the
contract must return **the number of days and the number of dates covered**. Four of the six
measures are **cumulative** and follow the period (1, 2, 3, 5); two are **averages** (4, 6). The
mockup applies a per-period coefficient (`7d: 0.22 · 30d: 1 · 90d: 2.7 · season: 4.4`): that is a
fixture convenience, but it establishes that the values are **bounded by the period**.

**Three mockup inconsistencies, to settle rather than copy:**

- measure 2 multiplies by the period coefficient a counter **already frozen at 30 days**;
- measure 5 carries the literal unit **"over 30 d"** although a period selector exists;
- series 1 and 6 are not temporal (per item, and a single date). **The real granularity of a series,
  in the mockup, is "one value per date".** A per-day granularity appears nowhere in it: if the
  contract wants one, that is a decision, not a survey.

### The role changes **the list**, not the content

It is clear-cut, and it is the same mechanism as everywhere else in the studio: the tile is
**removed** from the grid, not emptied. A direct consequence of the access table:

| Persona | Tiles actually displayed |
|---|---|
| `artist`, `production` | 1, 2, 3, 4 — **four** |
| `treasury` | 1, 2, 3 — **three** (no `canOps`) |

**Tiles 5 and 6 are never displayed.** They test `roleOf === 'mod'` and `roleOf === 'regie'` — the
**primary** role, not the union with the second role — and neither `mod` nor `regie` opens
`dashboard`. Two tiles out of six are dead as things stand. To settle: either `dashboard` opens to
those two roles, or the two tiles go. **The mockup does not say.**

### A seventh block, distinct from the tiles

`REVENUE PER DATE`: the **last six dates**, a proportional bar and the gross per date, with a total
in the header. Displayed under `canRevenue`. The gross per date is the payout's (`payout.gross`).
**The total is hard-coded in the mockup** (`140,496 €` × coefficient) and does not derive from the
six lines: the mockup therefore does not say whether it is the sum of the displayed lines or the
channel's total over the period. **absent.**

## 2. The reminders and the next-date countdown

### The countdown — the "NEXT DATE" / "ON AIR" card

A single card, which flips on the state of the first date in the agenda:

- **off air**: artwork, title, `day · venue time (your time) · runtime`, state badge, countdown
  `D d HH:MM` or `HH:MM:SS` under the label `BEFORE CURTAIN-UP`, and a `SEATS SOLD — N / M seats`
  block with the fill percentage (alert threshold at **90 %**);
- **on air**: the same block, a pulsing red badge, countdown `HH:MM:SS` **since** curtain-up, under
  `SINCE CURTAIN-UP`.

Actions: `Open the control room` under `canTech`, `View the date` under `canOpenRecord`. The seats
block is under `canOps || canRevenue`.

The countdown is computed against the date's start instant. *(The mockup targets a hard-coded 20:30
with a 130-minute runtime; that is a fixture convenience — the card's other fields do come from the
date.)*

### The reminders — the "TO HANDLE" block

Three to five rows, each: **text · meta · severity dot · destination screen · role scope**. The row
is clickable **only if the destination screen is open to the person**. Their exact composition:

| Origin | Text | Meta | Goes to | Scope |
|---|---|---|---|---|
| incomplete draft or held-back date | "*Title* — the price and the technical check are missing: the date stays held back" | `EVENT · <state>` | `event` | `canOps` |
| technical check not passed | "Technical check not passed for *Title* · *day*" | `CONTROL · <countdown>` | `regie` | `canOps` |
| no moderator assigned | "No moderator assigned to *Title* · *day*" | `CREW · <countdown>` | `crew` | `canOps` |
| date close to sold out | "*Title* on *day* at N % of capacity" | `TICKETING` | `events` | `canRevenue` |
| moderation queue | "N messages held by the filter await a decision" | `MODERATION · <on-air title>` | `regie` | everyone |

The first two are mutually exclusive (the second appears only if the check has passed), and the loop
is capped at **two** rows from the checklists. The meta carries a **countdown** to curtain-up, hence
an instant, not a sentence.

**What I note**: this is a **routed** list, exactly like the inbox — kind, severity, target and role
scope decided somewhere other than in the application. The mockup states neither its sort order nor
its overall cap. **absent.**

### The rest of `dashboard`, already served

`NEXT DATES`: the **six** upcoming dates — day, month, title, time, state badge, fill percentage —
a "see all" link to `events`, and "+ Create a date" under `roleOf ∈ {artist, production}`. Nothing
new: see §4.

## 3. The stats axes

Two tabs. A variable title: "Audience and revenue" under `canRevenue`, "**Audience**" otherwise. A
`CSV` export on both.

### `audience` tab

**Header strip, four figures** — `UNIQUE VIEWERS` · `AVERAGE FILL RATE` (%) · `DATES OPEN` ·
`NET REVENUE` (removed without `canRevenue`).

Two survey caveats:
- `UNIQUE VIEWERS` is, in the mockup, a sum over the dates of
  `max(live viewers, seats sold) + replay views`. It is **not** a count of unique individuals,
  despite the label. **The definition of a unique viewer is absent**;
- `DATES OPEN` counts **every** date of the channel, with no state filter, despite the label.

**Three blocks:**

1. `FILL RATE PER DATE` — bar chart, **six** dates, value = percentage of capacity reached, subtitle
   = seats sold or "not yet on sale". Visual threshold at 100 %.
2. `AUDIENCE PER DATE` — six dates, title, day + state, fill bar, and a value labelled "N viewers"
   which is in fact **the number of seats sold**. Label and data diverge in the mockup; that is to
   be settled, not copied.
3. `VIEWER PROVENANCE` — a donut with **five named segments**: *Arthome home page · Internal search ·
   Social sharing · Company's direct link · Paid promotion*, with the viewer total at the centre.
   **The five labels are the only thing the mockup supplies: the values there are hard-coded
   (38 / 24 / 21 / 12 / 5) and no attribution source exists in `shared/`, `fixtures.js` or
   `catalogue.json`.** It is the only stats measure that requires data the system produces nowhere
   today — and that is why writing this field would be **writing an intention, not a survey**.

### `series` tab — "compare the dates of a run"

The exact shape, which is the least guessable part:

**Grouping.** Dates are grouped by **show title**, and the states `draft` and `technical` are
**excluded** from grouping. Only groups of **more than one date** are runs. *(Grouping by title is a
mockup convenience: the domain has a `show`, and `showId` is the correct key.)* If no run exists,
the block says so and invites duplicating a date — so "no run" is a served state, not an emptiness.

**Reference.** It is **not** the group's first date: it is **the first one that sold at least one
seat**, failing that the first. The whole comparison is relative to it.

**Header strip, four figures** — `RUNS TRACKED` (number of shows with more than one date) ·
`BEST FILL RATE` (% + show title) · `AVERAGE GAP` (in **points**, between the reference and the
following dates, across all runs; "not yet measurable" if no subsequent date has sold) ·
`DECISION PENDING` (number of dates **held back**).

**Two blocks:**

1. a run selector (one chip per title);
2. `GAP TO THE FIRST DATE` — one row per date in the group, carrying: day + time, percentage of
   capacity, revenue under `canRevenue`, **the fill-rate gap in points** and **the revenue gap as a
   percentage** relative to the reference, the bar tinted by sign, the state badge, and an open
   action.
   **Explicit special case**: a date with no sales at all shows **no gap** — "there is no gap to
   measure, it is a decision to take, not a decline". It then shows its capacity and, if it is held
   back and the person is `artist` or `production`, the "Open sales" action.

What the contract must therefore carry for this tab: **the grouping, the reference chosen, and the
two gaps — computed**, not the ingredients. The choice of reference ("the first one that sold") is a
domain rule, and two surfaces would reimplement it differently.

## 4. What is already served — do not ask for it again

This is critical rule no. 2, and the list is long. **Most of `dashboard` is a recomposition of
collections already served since lot 2.**

| What the screen shows | Already served by | Is anything left? |
|---|---|---|
| `NEXT DATES` (6 rows) | `getChannelAgenda` / `listChannelEvents` → `EventsRow`: `title`, `startsAt`, `displayState` (+ `validUntil`), `fillRateBps`, `seatsSold`, `orderRank` | **nothing**, except below |
| "next date" card: title, time, state, seats sold, % of capacity | the same `EventsRow` | **`capacityTotal`** is missing: the card displays "N / M seats", and `EventsRow` carries only `seatsSold` and `fillRateBps`. **One field, not a path** |
| countdown before / since curtain-up | `EventsRow.startsAt` + `displayStateValidUntil` + `ws:pulse.serverTime` | **nothing** — it is computed locally, as the contract already prescribes |
| `REVENUE PER DATE` | `listPayouts` → `PayoutLine.grossTtc` per date | only the **definition of the header total** (see §1) |
| `REPLAY VIEWS` measure | `listChannelReplays` → `views` per replay | the aggregate over the period, and the series |
| "technical check not passed" reminder | `Publication.checklist` (`technical_check_passed`) and `getChannelStreamSettings.recentChecks` / `preflightPending` | the **aggregation into a routed list** at channel level |
| "no moderator assigned" reminder | `getDateCrewPane.missingRoles` and `StudioCounters.datesToCover` | same |
| "messages held" reminder | `StudioCounters.moderationPending` | same |
| "the price is missing" reminder | `Publication.checklist` (`at_least_one_active_price`) | same |
| `DECISION PENDING` (dates held back) | `listChannelEvents?state=reserve` → `page.totalItems` | **nothing** |
| `FILL RATE PER DATE` and `AUDIENCE PER DATE` | `EventsRow.fillRateBps` + `seatsSold`, six dates | **nothing, as things stand**: the mockup feeds "N viewers" with seats sold. A real viewer count would be new data, not a rearrangement |
| tier split | `getChannelTicketing.byTier` | **nothing** — and it is on `tickets`, not on `stats` |
| waiting lists, complimentary tickets, requests in progress | `getChannelTicketing` | **nothing** |
| preflight badge | `getChannelStreamSettings.preflightPending` | **nothing** |
| invalidation on a period change | `/v1/changes` | **nothing** |

### So what actually remains to be written

1. **The six measures aggregated over a period**, each with its series (granularity **per date** in
   the mockup) — the variation being **derived** from the series and therefore never served.
2. **The "to handle" list**, routed and capped, with kind, severity, target and role scope. All its
   ingredients exist; it is the channel-level aggregation that has no owner.
3. **The run comparison aggregates** — grouping, reference chosen, gap in points and gap as a
   percentage — because the reference rule belongs to the domain.
4. **Viewer provenance**: five named categories, and **no source**. It is the only point of the two
   screens that requires data existing nowhere. Whoever writes this field writes an **intention, not
   a survey** — the mockup supplies the labels and hard-coded values, nothing else.
5. **`capacityTotal` on `EventsRow`** — one field.
6. **The bounds of a custom range**: number of days and number of dates covered.

### The five places where the mockup says nothing — "absent"

- the temporal granularity of a series (it is **per date**, never per day);
- the definition of a "unique viewer";
- the total of `REVENUE PER DATE`: sum of the displayed lines, or the channel's total;
- the sort order and the cap of the "to handle" list;
- whether `dashboard` should open to `mod` and `regie`, failing which two of the six tiles are dead.
