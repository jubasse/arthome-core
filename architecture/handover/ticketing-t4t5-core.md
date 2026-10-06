# ticketing T4 and T5, the core side — handover

What core gives the platform for a date's outcomes, a seat's cancellation and refund, and the
waiting list, and what a platform agent would get wrong using it. The rules are in
`packages/core/src/ticketing/refunds.ts` and `waitlist.ts`; the reasons are in `adr-ticketing.md`
§8 and §9 and `data-model.md` §3.3, §3.7 and §3.9.

## 1. `seatsAvailable` is the public count, and the pool is not in it

`Gauge.priorityPoolSeats` is required: the open pool's seats neither held nor sold, 0 outside a
window. `seatsAvailable(gauge)` subtracts it, so it is what the public may buy, what
`availabilityOf` reads and what `seats_available` publishes. **A notified account's count is
`seatsAvailableTo(gauge, { inPriorityPool: true })`**, never `seatsAvailable`: read for that account,
the public count says sold out while the pool still has seats for it.

**What would be wrong**: deciding a notified buyer's purchase, or its seat standing, on
`seatsAvailable`. The BFF reads the pool's seats from `getWaitlistRegistration`
(`priorityPoolSeats`, served only while the caller is notified into an open window) and adds them
to the public count it reads from availability.

## 2. One provider key per refund, and the key is not the job id

`refundIdempotencyKey(refundId)` is `refund:{refundId}`, keyed by the refund row. Keyed by the
order, two partial refunds of one order would share a key, and the provider would answer the
second with the first. Store the key as text on the row that owes the call, and send that stored
value: a row already owed under `refund:{orderId}` keeps its key. `intentCancelIdempotencyKey` is
`cancel:{orderId}`, unchanged.

BullMQ refuses `:` in a custom job id, so these strings cannot be job ids; the job id is derived
from them platform-side. And every T4 refund passes `refundApplicationFee: true`.

## 3. A seat is `cancelled`, then `refunded`

`seatStateMayMove` allows `active` to `cancelled` and `cancelled` to `refunded`, never `active` to
`refunded`. The seat is `cancelled` in the transaction that decides the cancellation, and
`refunded` when `refund_succeeded` arrives. Moving it straight to `refunded` at the decision makes
the card claim money that may still be in the queue, or in the DLQ.

`refundableRemaining(paid, refunded)` expects `refunded` to count **every refund decided, settled
or not**: counting settled refunds alone lets two studio refunds in flight together exceed what
was paid. `PaymentEvent.amountRefunded` is the provider's cumulative figure for the payment, not
this refund's amount; `order.refunded`'s `amount` is this refund's.

## 4. A credited seat serves a null refund reason

A credited seat's card serves `state: credited`, `method: account_credit`, `delayCode: null`
(`refundDelayCodeOf(account_credit)`) and `refundReasonCode: null`. **Not
`date_cancelled`, and no new `REFUND_REASONS` member**: the cause is the date's interruption, which
the card's `date` already carries, and a credit is not a refund to the payment method.

## 5. Smaller traps

- **Only three refund reasons cancel a seat** (`refundCancelsSeat`, D-095). A `goodwill`,
  `duplicate` or `dispute` refund of the full amount still leaves the seat `active`.
- **`refundReasonOnDate` overrides the reason on a cancelled date** (D-097), a late payment's
  `hold_expired_capacity_lost` included. `refundSeat` with `date_cancelled` on a date that is not
  cancelled is `409 state.conflict`, a lead ruling.
- **`seat.not_active`, not `state.conflict`**, refuses a seat no longer active on `cancelSeat`: the
  route is caller-owned and cannot declare `state.conflict`. `assertSeatCancellable` checks the
  state before the deadline.
- **`assertWaitlistJoinable` takes a non-null `salesEndAt`**, because `order.sales_closed` carries
  it. A date with no start sells nothing, so it is never sold out and never reaches the call.
- **`closed` is not `lapsed`** (D-096): a `lapsed` entry registers again, a `closed` one does not.
- **`DateSalesPaneSchema` lives in `@arthome/contracts/studio-money`**, not in the studio dates
  module, so its `priorityPool` field is there.
