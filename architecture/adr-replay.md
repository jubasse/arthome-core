# ADR — Replay: on-demand access, apart from the seat

**Status**: **accepted** — arbitrated by the product owner on 2026-09-29, D-089 to D-092.
**Date**: 29 September 2026. **Scope**: what a replay is, who may watch it and why, what it costs,
and what a date's outcome does to it. Not in scope: sharing subscription revenue (§7).

It starts from two statements by the product owner:
- the replay prompt agreed with the mock-ups agent (the three entities, the four policies, the two
  windows, outcomes first, one computation in `@arthome/core`);
- a remark on 2026-09-29: **a replay is not an event.** It can be watched at any hour while it is
  online, like a film in a catalogue; nothing happens at a given time.

It builds on `data-model.md` §2.2 (the date's replay policy and `replay_window_hours`), §3.1
(`replay_unit_price`) and §5.5 (`ReplayAsset`, `ResumePoint`), and on `docs/streaming.md` §4 ("the
replay window belongs to the domain"). Nothing is built yet: the implementation follows the first
slice of `ticketing` (D-080).

---

## 1. Three entities, never confused

```
Replay         the product, one per date: the recording, its chapters, its online window,
               its access modes. Watched on demand, not at a time.
Seat           the right to attend the LIVE of a date (D-077, D-089). Nothing more.
ReplayAccess   the right to WATCH the replay, an entity of its own, with its own origin.
```

**A seat is not a replay right.** It may give rise to one, when the channel includes the replay. So
an account can hold a `ReplayAccess` without a seat (bought on its own, or through a subscription),
and a seat without a `ReplayAccess` (the replay not included, or no replay at all).

**The player never asks "does this account hold a seat?" to open a replay.** It asks "does it hold
a valid access to this `Replay`?", through one core function (§8).

**A replay is not a phase of the date (D-090).** Until now the replay sat inside the date's
lifecycle: `Publication` moved `ended → replay-online`, the display state went `on-air-live →
replay-available → finished`, and `decideWatch` answered a replay with `buy_seat`. The date is an
event and ends; the replay is catalogue content with a life of its own, held by a `Replay` in
`catalog`: `pending → online → closed`, or `withdrawn`. It stays tied to its event: **a replay never
goes online before its event has ended.**

## 2. Who owns what

| Concern | Owner | Why |
|---|---|---|
| `Replay`: modes, window, state, chapters as published | `catalog` | the promise made before purchase; it justifies the price difference |
| the recording file, its readiness, its deletion | `streaming` (`ReplayAsset`) | it stores and deletes; core decides the duration (`streaming.md` §4) |
| `ReplayAccess`: create, revoke, refund | `ticketing` | a commercial right, beside seats and orders (`viewer_entitlements`) |
| the unit price | `ticketing` (`DateSales.replay_unit_price`) | set and locked with the date's prices |
| "may this profile watch now" | `streaming` (`entitlement_projection`) | the only service that issues a playback token |
| every rule above, computed once | `@arthome/core` | "everything computed twice diverges" |

`ticketing` announces creations and revocations (§9); `streaming` projects them, as it projects
seats today.

## 3. The access modes: a set the channel chooses, locked at publication (D-091)

| Mode | Who gets a `ReplayAccess` | How |
|---|---|---|
| `included` | every holder of a valid seat | created when the live ends (D-092) |
| `subscription` | every active subscriber whose plan opens `replays` | derived from the subscription, never stored per date |
| `unit` | whoever buys it | a purchase of its own, at its own price, once the replay is online |
| `none` | nobody | no `Replay` |

- **The modes combine**: `included` and `unit` together mean "seat holders have it, the others may
  buy it". `none` stands alone. What a seat gives depends only on the channel's choice: under `unit`
  alone, a seat does not give the replay. Today's `REPLAY_POLICIES` is a single value, so the date's
  field, its contract and `catalog.date.replay_policy_set` change.
- **Locked when the channel publishes**, like the prices: the buyer paid knowing it. `none` stays
  final (`data-model.md` §2.2).
- **`unit` requires a price.** `replay_unit_price` exists in the model and `replay.unitPrice` in the
  storefront contract, but nothing sets or sells it. It is set with `setDatePrices` and locked with
  them. At least one fixture date uses `unit`, so the purchase path is tested somewhere.
- **Read before buying a seat.** Every date page states what the seat gives: the replay included or
  not, and for how long. That promise is one core function (§8), served on the date's detail.

## 4. Two windows, never confused (D-092)

```
Online window    a property of the Replay
                 from the end of the live (plus processing) to the closing the channel set
Access validity  a property of the ReplayAccess
                 exactly the online window: no viewing period of its own
```

- No access exists before the end of the show, and none outlives the `Replay`'s closing. "Available
  for 41 more hours" is computed from the online window in `@arthome/core` (`replayHoursLeft` today)
  and nowhere else.
- The window belongs to the domain. The video provider stores and deletes; core decides. The replay
  policy never ends up encoded in an object-storage lifecycle.

## 5. Outcomes come first

Outcomes are declared by the control room, never inferred from the feed (`streaming.md`). Since no
access exists before the show ends (D-092), none has to be carried over or refunded on the replay's
side; the seats follow their own rules (`adr-ticketing.md` §8).

| Outcome | Effect on the replay |
|---|---|
| **Cancelled** | no `Replay`: the event never takes place |
| **Postponed** | the `Replay` follows the date, which keeps its id when postponed (D-074); nothing exists to move yet |
| **Interrupted** | **no `Replay`, partial or not** (D-092); no access is created |

**Invariant: no `ReplayAccess` exists for a `Replay` that is not online or closed.** Accesses are
created only once the event has ended normally, and a withdrawal revokes any that exist.

## 6. What the interfaces show

- **"Resume"** is per profile and per `Replay` (`ResumePoint` keys on `(profile_id, date_id)`, and a
  replay is one per date). A subscriber with no seat has their progress.
- **"Replays expiring soon"** sorts by the online window's closing. Its accent is amber, never red:
  red is for the live antenna only.
- **My seats**: a past seat shows its replay **if and only if** a valid `ReplayAccess` exists.
- **The replayed chat** is anchored to media time, not to send time (`streaming.md` §5). The
  chapters set in the control room are the `Replay`'s.
- **Territory restrictions** apply to the replay too, and the screen says so with the reason.

## 7. Money

- `included`: **no revenue of its own**. Its value is in the seat's price; never count it twice.
- `unit`: revenue of its own, under the same commission and VAT, paid out to the channel by the same
  mechanism as seats, on a separate line of the statement. It needs an order kind (`OrderKind` has
  `seat | merch | subscription` today) and uses the supply kind `TAX_SUPPLY_KIND_REPLAY_ACCESS`,
  which the proto already carries.
- `subscription`: sharing subscription revenue is **out of scope**, and not invented here.
- **One effective right, one charge.** An account that already has access to a replay (through its
  seat or its subscription) is refused a unit purchase of it, so nobody pays twice for one right.

## 8. The rules in `@arthome/core`, each computed once

Proposed signatures; the names follow the existing `replay/` module.

```ts
type ReplayAccessMode = 'included' | 'subscription' | 'unit';
type ReplayModes = readonly ReplayAccessMode[];            // empty = none

interface ReplayWindow { readonly availableFrom: Instant; readonly closesAt: Instant }

/** The online window, null when the date has no replay: modes empty, cancelled or interrupted. */
function replayWindowOf(timing: DateTiming, modes: ReplayModes,
  outcome: DateOutcome | null): ReplayWindow | null;

/** What the date page promises before a seat is bought. */
function replayPromiseOf(modes: ReplayModes, windowHours: number,
  unitPrice: Money | null): ReplayPromise;

/** Whether this profile may watch this replay now, why (seat, unit, subscription), or why not. */
function decideReplayAccess(input: ReplayAccessInput): ReplayAccessVerdict;

/** Whether a unit purchase is open: only while online, never to an account that already has access. */
function canBuyReplayUnit(input: ReplayAccessInput): ReplayPurchaseVerdict;

/** Whether a past seat shows its replay. */
function isReplayShownOnSeat(verdict: ReplayAccessVerdict): boolean;

/** Which seats get an access when the live ends: the valid ones, under `included` only. */
function grantsReplayOnLiveEnd(modes: ReplayModes, outcome: DateOutcome | null): boolean;
```

- `decideWatch` keeps the live; the replay branch moves to `decideReplayAccess`. A new way out,
  `buy_replay`, replaces `buy_seat` on a replay. `REPLAY_EXPIRED`, `NO_REPLAY` and
  `REPLAY_NOT_ON_SALE` move with it.
- `replayHoursLeft` and `isReplayWindowOpen` take the `ReplayWindow` instead of the `DateTiming`.

## 9. Events

| Event | Key | Carried | Consumed by |
|---|---|---|---|
| `ticketing.replay_access.granted.v1` | `date_id` | access id, account, profile, origin (`seat` \| `unit`), origin reference | `streaming` (entitlement), `notifications` |
| `ticketing.replay_access.revoked.v1` | `date_id` | access id, reason (seat refunded, replay withdrawn, refunded) | `streaming`, `payouts` |
| `catalog.replay.state_changed.v1` | `date_id` | pending, online, closed, withdrawn, with the window | `streaming`, `ticketing`, `search-indexer` |

Subscription access needs no event of its own: `ticketing.subscription.changed.v1` already carries
`opens[]`. The `included` accesses are created in batches when the live ends, as the credits of an
interrupted date are (`adr-ticketing.md` §8).

## 10. What the product owner settled on 2026-09-29

| Question | Answer | Recorded |
|---|---|---|
| One policy, or a set of modes? | a set, `included` and `unit` combining | D-091 |
| Does a seat give a `unit` replay? | it depends only on the channel's modes | D-091 |
| A viewing period of its own for a unit purchase? | no, the online window | D-092 |
| Does the replay leave the date's lifecycle? | yes, though never online before its event ended | D-090 |
| A partial replay for an interrupted date? | no replay at all | D-092 |
| Pre-ordering a unit replay? | no, bought only once online | D-092 |
| Accesses of a postponed date? | none exist before the show ends; they are created then | D-092 |

## 11. Tests to write first

- A valid seat under `included` gets an access when the live ends; under `unit` alone, none.
- Under `none`, no `Replay` and no access.
- A unit purchase without a seat, once online, gives a valid access; before online, refused.
- A subscriber without a seat, mode `subscription`: access granted; subscription lapsed: refused.
- Access asked after the replay closed: refused, whatever its origin.
- A cancelled or interrupted date: no `Replay`, no access created, no unit sale possible.
- A postponed date: no access before the new show ends, then created once.
- "Resume" kept for an access that comes from a subscription.
- A seat under `included` and a unit purchase attempt on one date: refused, **one** effective right,
  no double charge.
