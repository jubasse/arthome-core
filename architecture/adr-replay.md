# ADR — Replay: on-demand access, apart from the seat

**Status**: **accepted** — arbitrated by the product owner on 2026-09-29, D-090 to D-092, with one
question still open (§11).
**Date**: 29 September 2026. **Scope**: what a replay is, who may watch it and why, what it costs,
and what a date's outcome does to it. Not in scope: sharing subscription revenue (§7).

It starts from two statements by the product owner:
- the replay prompt agreed with the mock-ups agent (the three entities, the four policies, the two
  windows, outcomes first, one computation in `@arthome/core`);
- a remark on 2026-09-29: **a replay is not an event.** It can be watched at any hour while it is
  online, like a film in a catalogue; nothing happens at a given time.

It builds on `data-model.md` §2.2 (the date's replay policy and `replay_window_hours`), §3.1
(`replay_unit_price`) and §5.5 (`ReplayAsset`, `ResumePoint`), on `context-map.md` §1.2 to §1.4, §2
and §3, and on `docs/streaming.md` §4 ("the replay window belongs to the domain"). Nothing is built
yet: the implementation follows the first slice of `ticketing` (D-080).

---

## 1. Three entities, never confused

```
Replay         the product, one per date: the recording, its online window, its state.
               Watched on demand, not at a time.
Seat           the right to attend the LIVE of a date (D-077). Nothing more (D-089).
ReplayAccess   the right to WATCH the replay, an entity of its own, with its origin:
               the seat (mode included) or a unit purchase.
```

**A seat is not a replay right.** It may give rise to one, when the channel includes the replay. So
an account can watch a replay without a seat (a unit `ReplayAccess`, or a subscription that opens
replays), and hold a seat without a `ReplayAccess` (the replay not included, or no replay at all).

**The player never asks "does this account hold a seat?" to open a replay.** It asks "may this
profile watch this `Replay` now?", through one core function (§8).

**A replay is not a phase of the date (D-090).** Until now the replay sat inside the date's
lifecycle: `Publication` moved `ended → replay_online`, the display state went `live → replay →
ended`, and `decideWatch` answered a replay with `buy_seat`. The date is an event and ends; the
replay is catalogue content with a life of its own. It stays tied to its event: **a replay never
goes online before its event has ended.**

## 2. Who owns what

| Concern | Owner | Why |
|---|---|---|
| the access modes, set on the date and locked at publication | `catalog` (`Date`) | the promise made before purchase; one aggregate holds the lock (D-085) |
| the `Replay`: its state and its online window | `catalog` | what is offered on demand |
| the chapters | `streaming`, projected by `catalog` onto the `Replay` | posted in the control room (`context-map.md` §1.2) |
| the recording file, its readiness, its deletion | `streaming` (`ReplayAsset`) | it stores and deletes; core decides the duration (`streaming.md` §4) |
| `ReplayAccess`: create, revoke, refund | `ticketing` | a commercial right, beside seats and orders (`viewer_entitlements`) |
| the unit price | `ticketing` (`DateSales.replay_unit_price`) | set and locked with the date's prices |
| "may this profile watch now" | `streaming` (`entitlement_projection`) | it issues the playback token (`context-map.md` §1.4) |
| every rule above | `@arthome/core` | computed once, read everywhere |

## 3. The access modes: a set the channel chooses, locked at publication (D-091)

| Mode | Who may watch | How |
|---|---|---|
| `included` | every holder of a valid seat | a `ReplayAccess` created when the live ends (§5) |
| `subscription` | every active subscriber whose plan opens `replays` | derived from the subscription, never stored per date |
| `unit` | whoever buys it | a `ReplayAccess` bought on its own, at its own price, once the replay is online |
| `none` | nobody | no `Replay` |

- **The modes combine**: `included` and `unit` together mean "seat holders have it, the others may
  buy it". `none` stands alone. What a seat gives depends only on the channel's choice: under `unit`
  alone, a seat does not give the replay.
- **They live on the date and lock when the channel publishes**, like the prices: the buyer paid
  knowing it. `none` stays final (`data-model.md` §2.2). The `Replay` copies them when it is created;
  locked, they cannot drift.
- **`unit` requires a price.** `replay_unit_price` exists in the model and `replay.unitPrice` in the
  storefront contract, but nothing sets or sells it. It is set with `setDatePrices` and locked with
  them. At least one fixture date uses `unit`, so the purchase path is tested somewhere.
- **Read before buying a seat.** Every date page states what the seat gives: the replay included or
  not, and for how long. That promise is one core function (§8), served on the date's detail.

## 4. Two windows, never confused (D-092)

```
Online window    a property of the Replay
                 opens when the replay goes online, after its event ended and its file is ready
                 closes at the live's actual end + replay_window_hours
Access validity  a property of the ReplayAccess
                 exactly the online window: no viewing period of its own
```

- **One closing instant, computed once.** Core computes `closesAt` from the live's actual end (the
  run's end, as `catalog` records it from `streaming.run.ended.v1`) and the date's
  `replay_window_hours`. `catalog`'s `Replay` carries it, and `streaming`'s `ReplayAsset.expires_at`
  takes it from `catalog.replay.state_changed.v1`, so a live that overruns its runtime cannot end
  with two closings. "The closing the channel set" means its window hours, not a free instant.
- No access outlives the `Replay`'s closing. "Available for 41 more hours" is computed from this
  window in `@arthome/core` (`replayHoursLeft` today), and the surfaces only read it.
- The window belongs to the domain. The video provider stores and deletes; core decides. The replay
  policy never ends up encoded in an object-storage lifecycle.

## 5. The `Replay`'s life, and outcomes first

| State | Entered when | Triggered by |
|---|---|---|
| (none) | the date has no mode, or it is cancelled before its live ended | — |
| `pending` | the live ended, the date not interrupted | `catalog` consuming `streaming.run.ended.v1` |
| `online` | the file is ready, the date not interrupted | the guarded studio command that moved `ended → replay_online` (`data-model.md` §2.3), allowed once `streaming.replay.asset_ready.v1` arrived |
| `closed` | `closesAt` passed | `catalog`'s sweeper |
| `withdrawn` | an outcome declared after the live ended: an interruption, or a cancellation after a short live | `catalog`, with the outcome |

**When accesses are created (D-092).** `ticketing` creates the `included` accesses when it reads
`catalog.replay.state_changed.v1` → `pending`: the end of the show, as the product owner set it. They
are valid from the window's opening, so nobody watches before the replay is online. Unit accesses are
bought only while it is `online`. A `Replay` the studio never puts online closes, still `pending`, at
`closesAt`; its `included` accesses expire unused.

**Only an outcome withdraws a replay.** Pulling an online replay for another reason (rights,
quality) has no command in this ADR; it would raise §11's money question too.

Outcomes are declared by the control room, never inferred from the feed (`streaming.md`):

| Outcome | Effect on the replay |
|---|---|
| **Cancelled** | no `Replay`. Core allows a cancellation until the scheduled end, so one declared after a short live had ended withdraws the `pending` `Replay` and revokes its `included` accesses, which cost nothing. Declared once the replay is online: §11 |
| **Postponed** | nothing exists yet; the `Replay` will follow the date, which keeps its id (D-074) |
| **Interrupted** | **no replay, partial or not** (D-092). Declared after the live ended and before the replay is online, it withdraws the `pending` `Replay` and revokes its `included` accesses, which cost nothing. Declared once the replay is online: §11 |

**Invariant: a `ReplayAccess` exists only for a `Replay` that is `pending`, `online` or `closed`.** A
withdrawal and the revocation of its accesses are one decision, carried by events on the date's key.
The money of a withdrawn unit access is §11's open question.

## 6. What the interfaces show

- **"Resume"** is per profile and per `Replay` (`ResumePoint` keys on `(profile_id, date_id)`, and a
  replay is one per date). A subscriber with no seat has their progress.
- **"Replays expiring soon"** sorts by the online window's closing. Its accent is amber, never red:
  red is for the live antenna only.
- **My seats**: a past seat shows its replay **if and only if** a valid `ReplayAccess` exists.
- **The replayed chat** is anchored to media time, not to send time (`streaming.md` §5). The
  chapters are `streaming`'s, posted in the control room, projected onto the `Replay`.
- **Territory restrictions** apply to the replay too, and the screen says so with the reason.

## 7. Money

- `included`: **no revenue of its own**. Its value is in the seat's price; never count it twice.
- `unit`: revenue of its own, under the same commission and VAT, paid out to the channel by the same
  mechanism as seats, on a separate line of the statement. It needs an order kind (`OrderKind` has
  `seat | merch | subscription` today) and uses the supply kind `TAX_SUPPLY_KIND_REPLAY_ACCESS`,
  which the proto already carries.
- `subscription`: sharing subscription revenue is **out of scope**, and not invented here.
- **One effective right, one charge.** An account that already may watch a replay (through its seat
  or its subscription) is refused a unit purchase of it, so nobody pays twice for one right.

## 8. The rules in `@arthome/core`, each computed once

Proposed signatures; the names follow the existing `replay/` module, and the vocabularies follow
`code-conventions.md` §5.3 (a `const` array, its type and its object).

```ts
const REPLAY_ACCESS_MODES = ['included', 'subscription', 'unit'] as const;
type ReplayAccessMode = (typeof REPLAY_ACCESS_MODES)[number];
type ReplayModes = readonly ReplayAccessMode[];                 // empty = none

const REPLAY_STATES = ['pending', 'online', 'closed', 'withdrawn'] as const;
const REPLAY_ACCESS_REVOCATION_REASONS = ['replay_withdrawn', 'seat_refunded', 'access_refunded'] as const;

/** The closing, from the live's actual end and the date's window. */
function replayClosesAt(liveEndedAt: Instant, windowHours: number): Instant;

/** The online window once the replay is online, null before or when withdrawn. */
function replayWindowOf(replay: ReplaySnapshot): ReplayWindow | null;

/** What the date page promises before a seat is bought. */
function replayPromiseOf(modes: ReplayModes, windowHours: number,
  unitPrice: Money | null): ReplayPromise;

/** Whether this profile may watch this replay now, why (seat, unit, subscription), or why not. */
function decideReplayAccess(input: ReplayAccessInput): ReplayAccessVerdict;

/** Whether a unit purchase is open: only while online, never to an account that may already watch. */
function canBuyReplayUnit(input: ReplayAccessInput): ReplayPurchaseVerdict;

/** Whether a past seat shows its replay. */
function isReplayShownOnSeat(verdict: ReplayAccessVerdict): boolean;

/** Whether the end of the live creates the seat holders' accesses: `included`, not interrupted. */
function grantsReplayOnLiveEnd(modes: ReplayModes, outcome: DateOutcome | null): boolean;
```

## 9. Events

| Event | Topic, key | Carried | Consumed by |
|---|---|---|---|
| `catalog.replay.state_changed.v1` | `arthome.catalog.date`, `date_id` | the state, `closesAt`, the window once online | `ticketing`, `streaming`, `search-indexer` |
| `ticketing.replay_access.granted.v1` | `arthome.ticketing.date_sales`, `date_id` | access id, account, profile, origin (`seat` \| `unit`), origin reference | `streaming` (entitlement), `notifications` |
| `ticketing.replay_access.revoked.v1` | `arthome.ticketing.date_sales`, `date_id` | access id, reason (`REPLAY_ACCESS_REVOCATION_REASONS`) | `streaming`, `payouts` |

The access events sit with the seat events, on the date's key (D-078). Subscription access needs no
event of its own: `ticketing.subscription.changed.v1` already carries `opens[]`. The `included`
accesses are created in batches, as the credits of an interrupted date are (`adr-ticketing.md` §8).

## 10. What changes in core and in the contracts

In `@arthome/core`:
- `decideWatch` keeps the live; its replay branch moves to `decideReplayAccess`. That includes the
  `unit` case of `entitlement/index.ts`, which today lets any seat holder watch (against D-091).
  Once the live has ended, `decideWatch` denies with a new reason, `live_ended`, whose way out is
  the replay's own verdict. Past D-089's cutoff it no longer offers `buy_seat` during the live.
- `WatchFallbackAction` gains `buy_replay`, which replaces `buy_seat` on a replay.
  `REPLAY_EXPIRED`, `NO_REPLAY` and `REPLAY_NOT_ON_SALE` move to the replay's verdict.
- `replay/`: `replayHoursLeft` and `isReplayWindowOpen` read the `Replay`'s window;
  `hasReplayPolicy`, `isReplaySoldSeparately` and `replayUnavailabilityReason` read the modes.
- `catalog/date-state.ts`: `replayEndsAt` gives way to `replayClosesAt`, and `DisplayState.REPLAY`
  leaves the date's display state; the card shows the replay as a facet of its own.
- New vocabularies: `REPLAY_ACCESS_MODES`, `REPLAY_STATES`, `REPLAY_ACCESS_REVOCATION_REASONS`, and
  `WatchDenialReason.LIVE_ENDED`.
- The `Replay` root in `catalog` (`data-model.md` §2.2), with `live_ended_at` and `closes_at`.

In the contracts:
- `REPLAY_POLICIES` becomes the set of modes: the date's field, `DateCard`/`DateDetail`.`replay`, and
  `catalog.date.replay_policy_set`.
- `DateCard.displayState` loses `replay`, and a replay facet carries the `Replay`'s state and window.
- `OrderKind` gains a replay kind, and the storefront gains a unit-purchase operation.
- The three events of §9, and `WatchFallbackAction.buy_replay` on the wire.

## 11. What the product owner settled, and what stays open

| Question | Answer | Recorded |
|---|---|---|
| One policy, or a set of modes? | a set, `included` and `unit` combining | D-091 |
| Does a seat give a `unit` replay? | it depends only on the channel's modes | D-091 |
| A viewing period of its own for a unit purchase? | no, the online window | D-092 |
| Does the replay leave the date's lifecycle? | yes, though never online before its event ended | D-090 |
| A partial replay for an interrupted date? | no replay at all | D-092 |
| Pre-ordering a unit replay? | no, bought only once online | D-092 |
| Accesses of a postponed date? | none exist before the show ends; they are created then | D-092 |

**Open, for the product owner.** Core accepts an interruption at any time after the start
(`catalog/outcome.ts`), so a date could be declared interrupted once its replay is online and unit
accesses were sold. Either an interruption can no longer be declared once the replay is online
(a change to `assertOutcomeDeclarable`), or a withdrawn unit access is refunded, with a refund
reason of its own. *Proposed: refuse the interruption once the replay is online.*

## 12. Tests to write first

- A valid seat under `included` gets an access when the live ends; under `unit` alone, none.
- Under `none`, no `Replay` and no access.
- A unit purchase without a seat, once online, gives a valid access; before online, refused.
- A subscriber without a seat, mode `subscription`: access granted; subscription lapsed: refused.
- Access asked after the replay closed: refused, whatever its origin.
- A cancelled date: no `Replay`, no access, no unit sale possible.
- An interruption declared after the live ended: the `Replay` withdrawn, every access revoked.
- A postponed date: no access before the new show ends, then created once.
- A live that overruns: `closesAt` from its actual end, one instant in `catalog` and `streaming`.
- "Resume" kept for a subscriber's watching.
- A seat under `included` and a unit purchase attempt on one date: refused, **one** effective right,
  no double charge.
