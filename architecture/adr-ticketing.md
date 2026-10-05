# ADR — Ticketing: selling a date's seats under load

**Status**: **accepted** — arbitrated by the product owner on 2026-09-27, D-077 to D-083, and on
2026-09-29, D-089.
**Date**: 27 September 2026. **Scope**: the first slice of `ticketing`, a date's seats and its
waiting list (D-080). The shop, the cart, subscriptions and external orders come later, on the same
foundations.

It builds on what is already settled and does not restate it: `data-model.md` §3 (the aggregates),
`adr-payments.md` §4 (payment ports), §7 (webhooks), §8 (order states) and §9 (outcomes),
`events.md` §3 (topics), `context-map.md` §1.3, §11 and §12 (full CQRS), and `transport.md` §5.9
(budgets). The VAT computation stays with `payouts`, and the tax model still awaits counsel
(`adr-payments.md` §5.5).

---

## 1. A seat is an access right, not a place (D-077)

Everyone who buys a date watches the same broadcast from the same point of view. A seat has no
location. It is the right to watch, created **when the order is paid**, from the hold that reserved
its capacity (`adr-payments.md` §8 rule 2). Before payment there is a `SeatHold` and a `SeatOrder`,
and no seat.

- The seat keeps its server-issued `seat_code`: it is the proof of access every surface shows
  identically (`data-model.md` §3.3).
- `Seat.state` loses `held`: a hold is a `SeatHold`, never a seat. `SeatCancelReason.PAYMENT_FAILED`
  is no longer produced, since no seat exists before payment. The enum value stays, because a proto
  number is never reused.

## 2. The purchase path, and why it stays short

```
purchaseSeat
  [admission]  a valid admission token when the date's waiting room is armed (§4)
  [late entry] past the start, the buyer's acknowledgement of the delay in a header (D-089),
               checked before the key is claimed: 409 without it; a replayed key answers its
               original response
  tx A         idempotency record (in flight) · price verified (order.price_stale)
               UPDATE date_sales SET seats_available = seats_available - q
                WHERE date_id = $1 AND on_sale AND seats_available >= q
                  AND (sales_end_at IS NULL OR sales_end_at > now)
                                        0 rows: order.sold_out; past the cutoff, order.sales_closed
               INSERT seat_hold (active, expires_at = the purchase intent's expiry)
               INSERT seat_order (pending, the quote frozen, the tax evidence of D-021)
  outside      PaymentPort.createIntent, idempotency key = the order id
  tx B         the intent recorded; if the adapter confirmed it synchronously: order paid,
               hold consumed, seat created active, outbox order.paid + seat.activated
  answer       201 with the tickets when paid; else 202 with the PaymentHandoff
```

- **Nothing external runs while the date's row is locked.** Tx A is the only transaction that
  touches the hot row, and it holds the lock for its own commit only. Stripe is called between two
  transactions, never inside one.
- **The idempotency key is bound to the order** (a unique `seat_order.idempotency_key`). A replay
  after a crash between tx A and tx B resumes the order from its recorded state instead of
  answering `api.idempotency_in_flight` for ever.
- **Sales end `SEAT_SALES_CUTOFF_MINUTES_AFTER_START` (30) minutes after the start (D-089).** A seat
  covers the live only, and the cutoff sits in the decrement's own predicate, so no sale slips
  past it while a sweeper catches up. Once the live has started, the quote states how long ago,
  and `decideWatch` stops offering `buy_seat` once the cutoff has passed.
- **The handoff expires with the hold**: `PaymentHandoff.expiresAt` is the hold's `expires_at`, one
  instant (`data-model.md` §3.2). The storefront examples showing thirty minutes are wrong.
- **Budget**: p95 ≤ 2 s for the whole command (`transport.md` §5.9). Tx A and tx B are
  milliseconds; the payment provider's call is most of it.
- A TV purchase places its hold when the pairing opens: the BFF calls `identity` for the pairing and
  `ticketing` for the hold (critical rule 1), and the hold's `expires_at` is the pairing's. While the
  date's room is armed, the pairing opens only once the account is admitted (D-086): the hold is
  what the room guards, so `ticketing` checks the admission there as it does on `purchaseSeat`.

## 3. The capacity invariant at 10,000 buyers a minute (D-079)

The invariant "`seats_available` never below zero" is **one SQL statement**, the conditional
decrement of tx A. There is no read-modify-write, no application lock, and no reliance on Kafka
ordering. That is also why the order topic can be keyed by `order_id` (D-078): no consumer
protects the capacity.

**Why a single row holds.** The row serialises the holds of one date, and each tx A holds the lock
for a few milliseconds. At a 2 to 5 ms commit, one row admits 200 to 500 holds a second. The target
is about 170 a second sustained (10,000 a minute), with bursts above it at opening, which the
waiting room caps (§4).

**Measure, threshold, act** (the `context-map.md` §11 form):

| Measure | Threshold | Act |
|---|---|---|
| `ticketing_hold_tx_ms` p95 on one date | > 20 ms | lower the waiting room's admission rate for that date |
| `date_sales_row_lock_wait_ms` p95 | > 100 ms at the admission rate the load test proved | split the capacity into N rows per date (`date_sales_bucket`, N served, a hold drawing from a random bucket and falling back to the others); designed, not built |

**Owed before the slice is done**: a concurrency test on a real Postgres (many parallel holds above
the capacity: exactly the capacity held, never below zero), and a load test at 10,000 buyers a
minute on one date (p95 ≤ 2 s, no oversell, every expired hold returned). The numbers go in
`AGENTS.md`, as measured.

## 4. The waiting room (D-079)

**Correctness never depends on it.** Postgres holds the invariant; the waiting room protects the
latency of everyone else and makes the order of arrival the order of service.

- **Armed per date**: in advance for an announced opening, or automatically when purchase attempts
  on the date exceed the admission rate over a short window. It disarms when the queue has drained.
- **First come, first served** (D-081). A Redis sorted set per date keeps the arrival order, one
  entry per account (joining is idempotent), and an admitter releases K entries a second. An admitted entry gets a signed
  admission token, valid `SALES_QUEUE_ADMISSION_SECONDS` (60 s) and bound to the account and the date. `ticketing` checks it on
  `purchaseSeat` itself: a service authorises for itself (critical rule 5), never "the BFF
  checked".
- **Served, never hardcoded**: the position, an estimated wait, and the polling cadence, as for the
  pairing (2 s, then 5 s).
- **Redis down**: the room fails open and an alert fires. The invariant still holds in Postgres;
  only the latency degrades.
- **The contract gains** (provisional maturity, D-081): entering the queue, reading one's position,
  and a refusal of `purchaseSeat` naming the queue when the room is armed and no token is sent. The
  surfaces render a queue screen. In `openapi/storefront.yaml`: `enterSalesQueue`,
  `getSalesQueuePosition`, the `X-Arthome-Admission-Token` header and `403`
  `order.sales_queue_admission_required`.
- **The television queues like every surface** (D-086): a `seat` pairing carries the admission, or
  is refused the same way. There is no way around the room through the TV.

## 5. Availability is published at a bounded rate

A hold, an expiry and a refund each move `seats_available`. One `availability_changed` per move, at
170 a second, would flood `catalog`, the indexer and the realtime push for a freshness nobody is
promised: 15 s (`transport.md` §5.9), pushed in batches of 15 to 60 s (`realtime.md` §5).

- A move marks the date dirty (`availability_dirty_since`) inside its own transaction.
- A per-date publisher (a sweeper with `FOR UPDATE SKIP LOCKED`) writes one outbox row with the
  latest figures at most every `AVAILABILITY_PUBLISH_MIN_INTERVAL_SECONDS` (5 s) while the date
  keeps moving. **Selling out and coming back from
  sold out publish at once**: those two moves change what the surfaces offer.
- `refreshDateAvailability` stays the truth at command time; the event is the hint.

## 6. Holds expire in the database, not in a timer

A sweeper runs every second: the expired active holds, `FOR UPDATE SKIP LOCKED`, in batches of 500.
Each one is marked `expired`, its capacity returned, and its order `failed`. The payment intent is
then cancelled at the provider, best effort, outside the transaction.

**Why not a delayed job per hold**: the database is the truth. A lost timer would freeze a seat
until someone noticed, while the sweeper is idempotent and survives a restart. Delayed jobs are for
work that leaves the database (§8).

## 7. A payment that succeeds after its hold expired (D-082)

3-D Secure finished at minute 16, or a webhook arrived late. The hold has expired, and its capacity
may already be sold again.

- At `paid`, the seat is created from the active hold. If the hold expired, `ticketing` takes the
  capacity again with the same conditional decrement.
- **If none is left, the order is refunded at once**: never an oversold date, never money kept
  without a seat. The order ends `refunded` with a reason code the surface can explain
  (`Order.refundReasonCode`: `hold_expired_capacity_lost`), and the viewer is told.
- Cancelling the intent at expiry (§6) narrows the window; it cannot close it, because a
  confirmation may already be in flight at the provider.

## 8. Webhooks, refunds and the other asynchronous work

- **A webhook is recorded, then processed.** The signature is checked on the raw body; the event is
  inserted into `stripe_event_inbox` (unique on the provider's event id) and answered 2xx at once.
  A worker applies it: forward-only transitions, and the provider re-read when in doubt
  (`adr-payments.md` §7).
- **Work that calls the payment provider runs in BullMQ queues inside `ticketing`** (critical
  rule 1): intent cancellations and refunds. Each queue is rate-limited below the provider's API
  limit and uses provider idempotency keys (`refund:{orderId}`). Retries are bounded, with backoff
  and jitter, then a DLQ row and an alert.
- **A cancelled date** (`catalog.date.outcome_declared`): sales close, then one refund job per paid
  order. 10,000 orders drain at the rate limit in minutes, and each refund ends in `order.refunded`
  and `seat.cancelled` (`DATE_CANCELLED`).
- **An interrupted date**: one credit per paid order (`adr-payments.md` §6), written in batches of
  500 per transaction, with `credit.issued`.
- **A postponed date** (`catalog.date.rescheduled`): the seats follow, nothing is refunded, and
  `cancel_deadline` is recomputed from the new start and served as an instant. Sales go on until
  the date sells out or reaches its new cutoff (D-089): the cutoff moves with the start, and a
  sale closed by time reopens when the start moves later.

## 9. The waiting list (D-083)

**Everyone registered gets the same chance.** There is no rank among the registered; the order of
purchase decides, as in the waiting room.

- **`WaitlistEntry`**, one per date and account, with a state:
  `waiting | notified | converted | left | lapsed`. The rank is no longer disclosed:
  `joinWaitlist` answers `rankDisclosed: false`, which the contract already allows.
- **Joined only when the date is sold out**, which is when `decideWatch` offers `join_waitlist`.
  Joining and leaving are state assignments (`joinWaitlist`, `leaveWaitlist`).
- **`openCapacityTier` is one transaction**:
  - the capacity widens;
  - the new seats become a priority pool until `priority_until` (now plus
    `WAITLIST_PRIORITY_HOURS`);
  - every waiting entry is marked `notified`;
  - `waitlist.notified` is written in chunks of at most `WAITLIST_NOTIFIED_ACCOUNTS_MAX` (500)
    accounts, because one message listing ten thousand ids is a message size problem.
- **During the window**, any notified account buys from the pool, first come first served; the
  public sees the availability without the pool. An account that registers while a window is open
  is notified into it at once.
- **At `priority_until`**, a sweeper returns what is left of the pool to public sale, and every
  notified entry that did not buy becomes `lapsed`: it has left the list and registers again to be
  told next time.

## 10. Events, keys and topics (D-078)

| Topic | Key | Carries |
|---|---|---|
| `arthome.ticketing.date_sales` | `date_id` | `date_sales.*` (availability at a bounded rate, §5), `seat.*`, `waitlist.*` |
| `arthome.ticketing.order` | `order_id` | `order.paid`, `order.refunded` |
| `arthome.ticketing.account` | `account_id` | `credit.issued` (and later `subscription.changed`) |

**In the contracts**: `OrderRefunded.refund_reason` (`RefundReason`, additive), since
`SeatCancelReason` cannot say `goodwill`, `duplicate`, `dispute`, or the capacity lost of §7
(`hold_expired_capacity_lost`). The vocabulary is `REFUND_REASONS` in `@arthome/core`, served as
`refundReasonCode` on the storefront's `Order` and `TicketCard.refund`, and narrowed to the four an
operator chooses on the studio's `refundSeat`. `TicketCard.state` without `held` (§1); the
`PaymentHandoff` examples at the hold's instant (§2).

**Owed with the slice**:
- The platform's `infra/kafka/topics.json` gains the `order`, `account`, `retry` and `dlq` topics.

## 11. The CQRS shape (`context-map.md` §12)

**Aggregates**:
- `DateSales`: capacity, tiers, prices and their lock, the priority pool.
- `SeatOrder`: the order states of `adr-payments.md` §8, forward only. The seat is created in the
  order's `paid` transition.
- `SeatHold`, and `WaitlistEntry`.

**The counter moves of a hold, a payment and an expiry are the deliberate exception to load,
modify, save.** A load-modify-save under the row lock would hold the lock across application code,
at exactly the moment it matters most. So the aggregate decides the hold (the quantity, the sale
open, its end not passed), and the repository executes each counter move as one conditional
statement: the hold's decrement, the sale of held seats at payment, the seats given back at expiry
or failure, and D-082's retake of a payment whose hold expired. Each runs last in its transaction,
so the date's row is locked for the commit alone, except the retake, whose result decides between
seating and refunding. Every other `DateSales` command (prices, tiers, the technical provision)
loads the aggregate and saves it with a version-conditional update.

**Commands and queries** go through `@nestjs/cqrs`, with the conventions of the catalog refactor
(`apps/catalog/HANDOVER.md` §0f in the platform). Its generic pieces (the transaction runner that
commits domain events after the transaction, idempotency, the processed-message claim) move into
`libs/` as ticketing's first change, ticketing being their second consumer. **Integration events** are outbox rows written inside the transaction. **Domain
events** are committed after it (`context-map.md` §12).

## 12. Quality gates for the slice

- The concurrency test and the load test of §3, their numbers recorded.
- A race suite on real infrastructure, using the fake payment adapter's scenarios
  (`adr-payments.md` §4):
  - a webhook duplicated, and one out of order;
  - a success after the hold expired (§7);
  - a refund racing a payment;
  - declines, and an abandoned 3-D Secure;
  - a chargeback.
- Failure drills: the payment provider down (the purchase answers 503 and releases its hold),
  Kafka down (the outbox holds the events), Redis down (the room fails open, §4).

## 13. Ideas noted, not built

- **Several cameras, several price ranges** (the product owner, 2026-09-27). A live concert filmed
  from several vantage points, each sold at its own price. It would be a dimension of the offer, not
  a located seat: a price range per camera, perhaps a capacity per camera, and the right to watch
  naming its camera, so that `streaming` serves the matching feed. Nothing in this slice prevents
  it.
- The capacity split into buckets (§3), behind its threshold.
- Seat transfer: the state exists, with no command or event yet.
