# Handover: the streaming core (C2, 2026-10-06)

What a platform agent binding `apps/streaming`, the BFF or the catalog card to this core would get
wrong. The rules are in `@arthome/core` (`entitlement/`, `streaming/`, `catalog/date-state.ts`) and
their reasons in D-108 to D-117 and D-123 to D-125; this file holds only the traps.

## 1. `concurrentStreamsOpen` is counted after the takeover

At an opening, pass the account's other live leases on the date **once the opening has taken over
the least recently renewed one** (D-117). Passing the raw count refuses a viewer who reopens on a
second device while a lease is there to take over, which is the lockout the takeover exists to
prevent. At a renewal, pass the other leases as they are: that is how the taken-over session's next
renewal is refused `watch.concurrent_limit_reached`, with `activeSessions`.

The ceiling is `concurrentStreamsAllowedFor(planOpenings, activeSeatsOnDate)`: the seats held on the
date count (D-108), not only the plan.

## 2. A null run keeps the clock

`displayStateOf` with `runState: null` turns `live` at `startsAt` and stays there until `endsAt`, as
before. With a known run it does not: `idle` or `rehearsal` shows `room_open` until the scheduled end
(a late start), `on_air` and `interrupted` show `live` with no `validUntil` (an overrun included), and
`ended` shows `ended`.

- `streaming` always has its run: never pass null there.
- The catalog card passes null until PC1 feeds it the run. Passing `idle` from a projection that does
  not consume the run's events would show `room_open` through every live.

## 3. `watch.live_ended` replaces the replay verdict

`decideWatch` decides the live only. Once the live is over it refuses `watch.live_ended`, never a
replay verdict, and no verdict allows a replay until the replay slice brings `decideReplayAccess`
(`adr-replay.md` §10). `openPlayback` with `kind: replay` answers `watch.no_replay`. Do not rebuild a
replay branch around `decideWatch`.

## 4. The preview is spent on air only

- Charge the budget with `previewSecondsSpent(watched, onAirIntervals)`: an `interrupted` run is the
  incident veil, and a veiled second costs nothing (D-110).
- Issue a preview token with `previewTokenExpiresAt(now, secondsLeft)`, under the veil too: a veil
  lifting mid-token would otherwise open on-air seconds the budget does not cover. Its
  `renewAfterSec` is `previewRenewAfterSeconds(secondsLeft)`, so a long veil renews rather than
  stalls.
- There is no preview before on air. A non-holder in the room, a late start included, gets
  `watch.no_seat` with the seat action, and the player shows the room screen.

## 5. Smaller traps

- **The seat standing.** `streaming` passes `seatStanding: null` (it projects no sale), which gives
  the generic sold-out way out. The BFF passes `seatStandingOf(...)` from ticketing's numbers, so a
  notified account sees `buy_seat`. The verdict never depends on it, only the way out.
- **The subscription.** Pass `planOpeningsOf(subscription, now)`, never `opens` directly: a cancelled
  subscription opens until `paidThrough`, and a past_due one keeps its access (D-125). Project
  `paid_through`, the end of the last paid period, never `current_period_end`: a renewal moves that
  forward before it is paid, and a final failure would then open the unpaid period. Ticketing's
  subscription slice computes it.
- **A lost seat** (`seatExpired`) is refused `watch.seat_expired` and never gets a preview, even with
  budget left.
- **The run's moves.** `assertRunTransition` refuses by name. `interrupted` is reached through an
  incident only; resuming to `on_air` from it needs no technical check.
- **The hold screen.** Only an automatic one caused by a lost feed lifts itself when the feed returns
  (`holdScreenLiftsOnFeedReturn`, D-124).
- **`RunEnded`.** `ended_by` is `SURFACE_SYSTEM` for the automatic end (`runAutoEndsAt`, D-123). The
  audience fields are absent, never zero, until a viewer count exists.
- **The replay file.** It closes from the live's real end (`replayClosesAt`), and
  `outcomeWithdrawsReplay` deletes it for a cancelled or an interrupted date.
