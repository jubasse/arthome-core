# ADR — Taking money, commission, VAT, payouts

**Status**: **accepted** — tax model settled by **D-015**, display currency by **D-016**,
four secondary arbitrations by **D-017**.
**Date**: 21 September 2026. **Author**: `backend-domain`.
**Scope**: `ticketing` (takes the money), `payouts` (computes the entitlement), Stripe Connect in
**test mode**.

---

> ## Warning — read before anything else
>
> **The tax model described in §5 is an architecture recommendation. It is not tax advice, and it
> must be validated by counsel before any real money is taken.**
>
> Who owes the VAT, on what base and who is liable for it are **questions of law**. They depend on
> Arthome's actual status (registered or not, thresholds, country of establishment), on the
> artists' status (registered or not, established in France or not) and on the one-stop shop for
> sales outside France. None of those facts is known as of this document's date.
>
> **The risk today is nil**: Stripe runs in test mode, no real money moves. That is precisely why
> the decision is taken now — it is **reversible in substance**. What is not reversible is the
> **shape**: see the box in §5.0.

---

## 1. The context, and what the file already fixes

`shared/catalogue.json` fixes three commercial parameters, and they are authoritative:

```
commissionRate    0.12          payoutDelayDays   14
billingMarkets    eur (VAT 5.5%) · chf (2.6%) · cad (14.975%, live: false)
```

What is also authoritative in `shared/`, and what we port as it stands:
rounding happens **to the minor unit, on each component taken separately**; a payout is
**withheld** (`held`) while an outcome is open — postponed or interrupted — and **refunded**
(`refunded`) if the date is cancelled.

**What is NOT authoritative**, and it is the most expensive trap in the file (D5): `fixtures.js`'s
`net = gross − 12% − VAT(gross)` formula. It *looks* like a proven business rule — it has the
place, the tone and the to-the-euro precision of one. It is not: it produces a plausible number
for a mockup. §5 examines it.

**No real money moves.** Stripe in test mode, free. That makes this document's decisions
**reversible in substance** and **not reversible in shape**: what gets carved now is the structure
of the data and the boundary between contexts.

---

## 2. PCI scope — avoided, and how

**No card number ever passes through Arthome.**

| Surface | Mechanism | Reason |
|---|---|---|
| storefront web | **Payment Element** (Stripe.js) | renders the price, 3-D Secure and local payment methods without the card touching our domain |
| storefront mobile | **Hosted Checkout**, opened in a system browser | no native card SDK to integrate, and 3-D Secure works |
| **storefront TV** | **never** | the TV accepts no input beyond six characters: every payment goes through **device pairing** (`context-map.md` §8), hence through the phone, hence through one of the two lines above |
| studio (payout account) | **hosted Connect Onboarding** | the beneficiary's compliance is Stripe's |

Consequence: **SAQ-A**, the narrowest scope. It is also what makes the public demonstration possible
without committing to anything.

### 2.1 Two identity checks that have nothing to do with each other — written down once and for all

They are conflated more or less systematically, and the confusion is expensive because it makes
people believe one of them is enough.

| | Bears on | Who does it | What it is for |
|---|---|---|---|
| **Connect KYB / KYC** | **the ARTIST** — identity and business of the connected account | Stripe, in its hosted onboarding flow | being able to **pay** money to somebody, and knowing to whom |
| **Tax location** | **the VIEWER** — country, subdivision, postal code, evidence | **us**, at the instant of the sale (§5.0) | knowing **which rate** to apply and being able to **justify it for ten years** |

The first is **beneficiary** compliance, delegated and outside our scope. The second is **tax**
compliance, and it is **irreversible**: nobody does it for us, and a fact not captured at the sale
no longer exists. Having one gives you nothing of the other.

---

## 3. The Stripe Connect model adopted

**Decision: `destination charges` on the platform account — without `on_behalf_of` — with
`application_fee_amount`. Connected accounts on Express.**

```
PaymentIntent
  ├─ created on the PLATFORM account             we are the merchant of record
  ├─ transfer_data.destination = acct_<channel>  the net goes to the artist
  └─ application_fee_amount   = commission + VAT owed by the platform
```

**`on_behalf_of` is removed, and that is a correction, not a setting.** It makes the artist the
**merchant of record** — it fixes settlement, currency and tax attachment on the connected account.
But the whole commissionnaire model of §5 rests on the opposite assertion: it is **Arthome** that
supplies the service to the viewer. Keeping it would have put the Stripe configuration in head-on
contradiction with the tax model it is supposed to execute — and that is the kind of contradiction
no test catches, because both halves work separately.

**The cost, written down rather than discovered**: Stripe **requires** `on_behalf_of` as soon as
the connected account leaves the platform account's region. So a **Swiss or Canadian** channel
cannot be served by this arrangement — it will have to be handled otherwise (a local platform
account, or `separate charges and transfers`) **or wait**. `catalogue.json` declares precisely those
two markets (`chf`, `cad`), and D4 showed neither has ever been exercised: the limit is therefore
theoretical today and real at the first non-European artist.

**Why this model and not the other two.**

| Model | Why it is ruled out |
|---|---|
| **Direct charges** | the artist becomes merchant of record: we lose control of refunds, of credit notes and of the cancellation policy — yet all three are written in our copy, shown on our three storefronts, and executed by our commands. And a chargeback would go to the artist, who has neither the evidence nor the screen to answer it. |
| **Separate charges & transfers** | more flexible for a multi-seller basket, but it forces us to keep a transfer ledger ourselves — exactly what the "Stripe remains the source of truth for the movement of money" rule forbids. |
| **Destination charges** (chosen) | one payment, one transfer, one commission, and Stripe keeps the book. |

**The structuring consequence, and it reaches all the way into the data model**: a
`destination charge` allows **only one destination**. So **a merchandise order is single-seller**,
and a basket containing two channels' items **splits into two orders at payment**, each with its own
shipping, commission and payout. That is the answer to `storefront-web` Q15, and it has two
independent justifications: the payment model, and the fact that a basket from two artists is two
shipments anyway.

**Express rather than Standard**: onboarding is hosted (essential to `studio-mobile`'s journey,
which leaves for an external browser and comes back by universal link), the beneficiary's dashboard
is provided, and the platform keeps control of disputes — which it must, since it is merchant of
record.

---

## 4. One port, two adapters, and the fake one by default

**A structuring decision, and it is mine**: the domain does not know Stripe.

```
@arthome/core  →  PaymentPort      authorize · capture · refund · quote
                  ConnectPort      createAccount · onboardingLink · accountStatus · transfer
                  WebhookPort      verifySignature · parse
                  LedgerPort       listBalanceTransactions   (reconciliation)

ticketing / payouts
   ├── FakePaymentAdapter     BY DEFAULT — deterministic, no network, no key
   └── StripeTestAdapter      Stripe in test mode
```

**Why the fake one is the default and not the other way round.** Milestone 0's public demonstration
and the whole test suite must run **with no key and no network**. A fake adapter by default
guarantees that a clone of the repository works on the first `docker compose up`; a Stripe adapter
by default guarantees the opposite. And the fake adapter **simulates the failures**: card declined,
3-D Secure abandoned, late webhook, out-of-order webhook, chargeback. Those are the paths nobody
ever tests otherwise.

**No Stripe-specific identifier crosses the domain.** `payment_intent_ref` is an opaque string to
`@arthome/core`; only the adapter knows how to read it. It is the same discipline as for
`streaming.md`'s media ports.

---

## 5. VAT — the question D5 left open, researched and not assumed

### 5.0 The only genuinely irreversible choice, isolated

Before entering the tax debate, we must separate what can be redone from what cannot. It is the
distinction that matters most in this document.

> **The tax model is a computation: it can be redone. The shape of the data is a structure: it
> cannot.**
>
> **The only genuinely irreversible choice in this whole chapter is whether or not to capture the
> buyer's tax location, its evidence, and the rate applied at the sale.**

```
irreversible   the buyer's TAX LOCATION, its EVIDENCE,
               and the RATE APPLIED, kept on the line          ← what gets carved
reversible     which rate, which base, which liable party      ← what gets recomputed
```

**And the shape is more demanding than I had written it.** I had carved a breakdown keyed on the
**billing market**. That is insufficient, and the reason is arithmetic rather than argumentative:

| Jurisdiction | Why a market — or even a country — is not enough |
|---|---|
| **United States** | roughly **9,000 jurisdictions** (state, county, city). A country allows **no** computation at all; the **postal code** is essential, and *marketplace facilitator* laws oblige the platform to collect in **46 states plus the District of Columbia**, whatever its contractual position |
| **European Union** | **two non-contradictory pieces of evidence** are mandatory for a B2C sale — billing address, IP address, bank country, SIM card country. And **Stripe Tax favours a single address** rather than comparing them: the evidence rule **cannot be delegated to it** |
| **United Kingdom** | the **Derby Quad v HMRC** decision held that the theatre-ticket exemption **does not extend** to a streamed live show. So the rate depends on the pair **jurisdiction × nature of the supply**, never on a per-market constant |

**A billing market is a PRICING notion** — which currency we sell in. **It is not a TAX notion**, and
conflating the two was my fault. `market_id` is removed from the VAT line (number reserved) and
replaced by `jurisdiction_code`, `jurisdiction_level` and `supply_kind`.

**What the order now carries** — and this is the shape to carve:

```
BuyerTaxLocation   country · subdivision · postal_code · city
                   evidence[]  { kind, country, subdivision, source, collected_at }
                   evidence_conflicting        ← two pieces that contradict each other: we own it
VatLine            jurisdiction_code · jurisdiction_level · supply_kind
                   rate_bps  ← THE RATE APPLIED AT THE MOMENT OF THE SALE, not the current rate
```

**Three reasons not to rely on Stripe's `Customer`**, and none is a preference: the invoice is kept
for **ten years** while the Stripe object only lives as long as we stay with Stripe; we need the
**historical** rate, not the current one; and the retention obligation covers **six items** — date,
location evidence, nature of the product, applicable rate, VAT amount, total. It is our own register
that must carry them.

**And the consequence for the word "irreversible" is harsher than what I had written.** I said that
rebuilding the base of every past line "is no longer a migration, it is an accounting
reconstruction". With the tax location, it would be **impossible**: a billing address, an IP address
and a card country at the moment of a sale two years ago **exist nowhere** if we did not capture
them. You do not reconstruct a dated fact you never recorded.

Why this is not a modelling detail:

- **The breakdown is correct under both tax models.** A single-rate model simply produces a
  **one-line** breakdown. So it presumes nothing, and it survives the tax counsel changing their
  mind — just as the buyer's location does, being a **fact** and not a consequence of the model
  adopted.
- **A single scalar `vat_amount` field would have frozen the defect.** The day we discover we must
  break it down — because a second market opens, or because the rate is the buyer's — we would have
  to **rebuild the base of every past line**, on payouts already paid and invoices kept for ten
  years. That is no longer a migration, it is an accounting reconstruction.
- **And it is exactly the field the fixture invited us to write.** `fixtures.js` produces a single
  number, at `billingMarkets[0]`'s rate, and it is plausible to the euro. It is the "shape against
  rule" trap in its most expensive form: **a fixture is authoritative on the rule, never on the
  shape**, and here the shape was the only lasting stake.

`studio-web` found the contradiction between the fixture and the payouts screen; it is that finding
that made the breakdown visible before it was too late.

### 5.1 What the two sources say, and why they cannot both be right

| Source | Assertion |
|---|---|
| `fixtures.js` | `vat = round(gross × vatRate)` with **a single rate** (`billingMarkets[0]`), applied to the **ticketing gross**, and **deducted from the artist's net** |
| the studio's payouts mockup | *"the applicable rate is that of the **buyer's country**"*, with a **breakdown by market** |

`studio-web` found the contradiction; D4 adds that multi-currency is **declared and never
exercised** — `fixtures.js` takes `billingMarkets[0]` for every date and every payout. So: **no
screen has ever displayed two currencies, and no rule has ever been tested against two rates.**
What `shared/` carries here is an intention, not a rule.

### 5.2 The three distinct questions, which must be separated to be answered

1. **Who supplies the service to the viewer** — Arthome, or the artist?
2. **What is the base** — the ticket, or the 12% commission?
3. **Who is liable** — the platform, or the artist?

They are not answered together, and the fixture's formula settles none of them.

### 5.3 Two coherent models, and only one is compatible with the design

**Model A — Arthome acts in its own name ("commissionnaire").**
The viewer contracts with Arthome, which is deemed to receive and then supply the service.
- Base: **the whole ticket**.
- Rate: that of the **viewer's country**, for a cultural service at a distance (*virtual* attendance
  at a cultural event has been taxed at the place of consumption since 1 January 2025).
- Liable party: **Arthome**.
- The artist supplies a service **to Arthome**, billed by self-billing.

**Model B — Arthome acts as a transparent intermediary.**
The viewer contracts with the artist; Arthome bills only its service.
- Base: **the 12% commission** only; the artist owes the VAT on the ticket.
- Liable for the VAT on the ticket: **the artist**.

**The design imposes model A, and imposes it clearly.** Six converging indications:
Arthome displays the price, takes the money, issues the invoice, holds the cancellation policy ("up
to 1 h before"), executes the refund and issues the credit note. The viewer never contracts with
the artist, never sees their name on a payment method, and never approaches them for a refund.
**Those are the marks of a commissionnaire, not of a transparent intermediary.**

**And the law imposes it too — so this is not a choice of convenience, it is the only coherent
reading of the facts.** Three jurisdictions, verified, and they converge:

| | What applies |
|---|---|
| **European Union** | **article 28** catches **on the facts**, not on how the contract is worded. A platform that displays the price, takes the money, invoices and refunds is deemed to receive and then supply the service, whatever it writes in its terms |
| **United States** | ***marketplace facilitator*** laws oblige the platform to **collect and remit** in **46 states plus the District of Columbia**, **whatever its contractual position**. Model B is not an option there: it is inapplicable |
| **United Kingdom** | HMRC **has not aligned** its rules with the EU's: the supplier is taxed there **by establishment**. It is the jurisdiction where the two models diverge most, and where counsel will be needed |

And the arrangement is exactly the one a comparable platform describes in a document filed with a
regulator: **Eventbrite's 10-Q** (SEC) states that *"the Company is the merchant of record…
remitting these amounts collected, less the Company's fees, to the event creator"*. That is not
legal authority, but it is evidence that the arrangement is **common and publicly owned** by a
company in the same trade.

**The warning at the top of the document stands in full.** "The only coherent reading of the facts"
is not "validated": Arthome's registration status, the artists', the thresholds and the one-stop
shop all remain to be researched by counsel. What changes is that we are no longer choosing between
two models — **we are observing which one applies**, and writing it down.

### 5.4 The recommendation, and the formula

```
gross_ttc     the price shown to the viewer — tax-inclusive, B2C convention
vat[]         ONE LINE PER JURISDICTION:
              { jurisdiction_code, jurisdiction_level, supply_kind, rate_bps, base, amount }
              rate = that of the VIEWER's jurisdiction; liable party = Arthome
gross_ht      = gross_ttc − Σ vat.amount
commission    = roundMinor(gross_ht × 0.12)        ← BASE IS NET OF TAX, not gross
net           = gross_ht − commission
```

> **Corrected while translating.** This block said "ONE LINE PER MARKET: { market, rate, base,
> amount }" — the shape §5.0 above explicitly withdraws. It was the last place in the document
> where a billing market still stood in for a jurisdiction, and it is exactly the sentence a reader
> looking for the formula would have found. The French let it pass because "marché" and
> "juridiction" read alike in a code block; English does not.

**Why the commission is taken on the net of tax and not on the gross.** On the gross, the
platform's remuneration **would vary with the buyer's country** — 12% of a ticket sold in
Switzerland would not be the same thing as 12% of the same ticket sold in France. A commission is
the price of a service; it has no reason to follow a foreign VAT rate. On the net of tax, the 12%
announced to artists is **the same everywhere**, which is the only tenable promise.

**Divergence from the fixture, owned and documented**: the fixture computes on the gross and
applies a single rate. Both are corrected at porting time (milestone 1), and the corresponding
regression test is one of those the README calls "the rules that hurt".

### 5.5 The arbitration returned, and the reservation that goes with it

**Model A is adopted by D-015**, with the commission on the net of tax, on §5.3's six converging
indications. The shape is carved and does not depend on the outcome of the legal validation — §5.0.

> **But model A remains an architecture recommendation, not tax advice.**
> Who owes the VAT, on what base and who is liable for it are questions of law, and they depend on
> Arthome's actual status (registered or not, thresholds, country of establishment), on the
> artists' status (registered or not, French or not) and on the one-stop shop for sales outside
> France. **They must be validated by counsel before any real money is taken.**

**Multi-currency (D4, `studio-web` Q10)**: a channel's balance is presented **in its connected
account's currency**, and a channel that sells in two currencies has **two balances**, never a
converted one. Reason: converting introduces an exchange rate, hence an exchange date, hence a
reconciliation gap nobody could explain. Stripe keeps one balance per currency; we mirror it, we do
not aggregate it.

### 5.6 The display currency is removed at milestone 1 (D-016)

`storefront-web` Q29 asked whether the display currency chosen by the viewer and a date's billing
currency can differ. **They can in theory, and the contract does not conflate them** — but the
preference **disappears from the screens at milestone 1**.

**Reason**: showing a converted price we cannot charge is a lie, and D4 showed that **no rule has
ever been tested against two rates** — three markets are declared, one is exercised by the
generator. So prices are shown in the **currency of the date's billing market**, formatted
client-side according to the locale.

**The removal is reversible**, and here is exactly what will have to be written to come back to it:

| To settle | Why it blocks today |
|---|---|
| **rate source** | an invented rate is an invented price |
| **exchange date** | the day of display, of the order, or of the payout? All three give three amounts |
| **rounding** | to what unit, and in which direction — the viewer's or the platform's |
| **who bears the gap** | between the converted price shown and the amount actually charged, somebody pays the difference |

Until those four lines are written, the preference can only produce an **indicative** display — and
an indicative price on a box office is the worst possible defect, the one `storefront-web` names
itself about promotions.

---

## 6. The account credit note — an internal currency, and its accounting consequence

`storefront-web` spotted it: the credit note (`credited`) appears in the copy — *"interrupted,
credits issued"* — and **nowhere else in the file**. That is not a detail: it is a **liability**.

```
Credit  { account_id, channel_id, amount, origin: interrupted_date, expires_at: +12 months }
```

**The trap, and it must be written before meeting it.** When a viewer pays with a credit, Stripe
receives **less**. But the artist of the date bought must be paid **in full**: they had nothing to
do with another show's incident. So the platform funds that share **out of its own money**.

**The recommended rule, which bounds the risk**: a credit note is **issued for an `interrupted`
outcome** and is **redeployable on the same channel only**. The payout withholding already in place
on that channel then covers the commitment: we withhold what we will have to pay out again. A credit
usable anywhere would require a cash provision a solo project will not hold.

The restriction is **reversible** (it can be widened later); ignoring it is not — we would discover
the hole at the first reconciliation.

---

## 7. Webhooks: Kafka's rules, applied to a system we do not control

A Stripe webhook is an integration event whose producer, ordering and delivery count we do not own.
So the four disciplines are the same, plus one.

### 7.1 Signature

Verification **on the raw body**, before any parsing — hence `rawBody: true` when creating the
application, and a controller that reads the buffer, never the already-deserialised object. A
reformatted body invalidates the signature. Clock tolerance of 5 minutes; beyond that, rejection.

### 7.2 Idempotence

`event.id` inserted into `processed_stripe_event` **inside the business write's transaction**, with
`orIgnore().returning('id')`: no row returned, we skip. Stripe replays for up to three days. It is
exactly the idempotent consumer's rule, and it does not change because the producer is external.

### 7.3 Out-of-order delivery

**Stripe guarantees no ordering.** `payment_intent.succeeded` can arrive after `charge.refunded`.
Two disciplines:

1. **A webhook records a fact, it never decides.** It records "Stripe says intent X is in state Y at
   instant T", and the domain reacts.
2. **A transition is applied only if it moves forward.** Each Stripe state carries a rank; an event
   whose rank is below the current state is logged and **ignored**. When doubt remains, we **re-read
   the object from Stripe** rather than believe the payload — which is also what Stripe recommends,
   and it is the only way to be right about an out-of-order delivery.

### 7.4 Replay and failures

A webhook that cannot be processed is **never acknowledged in silence**: a 2xx response (so Stripe
stops replaying) **and** a row in an application DLQ with the raw payload, plus an alert. Answering
5xx for an hour flips the endpoint into a failed state at Stripe, and we lose everything else.

### 7.5 The fifth discipline, specific to an external system

**Reconciliation is the only truth.** We never rebuild Stripe's ledger: a daily job reads
`balance_transactions` and **compares** it to `payout_ledger`. Any gap produces
`payouts.reconciliation.discrepancy_found.v1`, routed to the `treasury` role, and **a period does
not close with an unexplained gap**.

That is what makes it acceptable not to be perfect on the webhooks: a missed event shows up at the
next day's reconciliation, not six months later.

---

## 8. Our order states against Stripe's states

| Our state | Trigger | Corresponding Stripe state |
|---|---|---|
| `pending` | order created, intent created | `requires_payment_method` · `requires_confirmation` |
| `awaiting_action` | 3-D Secure in progress | `requires_action` |
| `processing` | confirmed, in progress | `processing` |
| **`paid`** | **`payment_intent.succeeded` received and verified** | `succeeded` |
| `failed` | final failure | `canceled` · last `last_payment_error` |
| `refunded` / `partially_refunded` | refund confirmed | `charge.refunded` |
| `disputed` | chargeback opened | `charge.dispute.created` |

**Three rules that are not negotiable:**

1. **Our state never advances on a browser return.** `studio-mobile` puts it perfectly, and it holds
   for the viewer too: *"a payment confirmed by a URL parameter is a payment confirmed by the
   client"*. The return says **where** to go; the backend says **what has changed**.
2. **The seat is created at `paid`, never before.** Between `pending` and `paid`, the capacity
   carries a **`SeatHold`** that decrements `seats_available`: without it, two viewers buy the last
   seat; without an expiry, an abandoned basket freezes a seat forever.
   **And the hold has no duration of its own: it expires at the exact instant the purchase intent
   that created it expires** — 15 min for a web or mobile payment, **5 min for a TV pairing**, the
   pairing's. That is what stops the capacity shown on a television being wrong for the whole time
   the phone is awaited (`data-model.md` §3.2).
3. **The price is verified at confirmation**, not only at display time. Refusal `PRICE_STALE`,
   **distinct** from a payment failure, with the current price as a parameter. With five promotion
   reasons, one of them computed pro rata of the time elapsed, the gap between the price displayed
   and the valid price is **structural**.

---

## 9. The outcome cases, and what the viewer gets back

An outcome declared in the studio (`catalog.date.outcome_declared.v1`) produces four consequences
without any service calling another.

| Outcome | Money | Payout | What the viewer sees, and where |
|---|---|---|---|
| **`cancelled`** | **full refund** to the original method | `refunded` | amount + a **period code** in "My tickets" — never the sentence "3 to 5 working days", which is a policy |
| **`postponed`** | **no movement** | `held` until the new date | "seat valid, nothing to do", the seat follows, the reminder moves |
| **`interrupted`** | **credit note** on the account (§6) | `held` then adjusted | the credit's amount, and where to use it |
| cancellation by the viewer | refund if before the served deadline | deducted from the gross | deadline served as an **instant** |
| chargeback | funds held by Stripe | `held` | nothing on the viewer's side; the studio answers from the `payouts` screen, within 24 h |

**A refund refunds the commission too.** A full refund passes `refund_application_fee: true`: we do
not keep 12% of a performance that did not happen. That is not merely decent, it is what the copy
promises.

**Deleting an account is a financial command** (`storefront-web` Q26): it cancels unused seats, so
it refunds, so it touches payouts that may already be computed, and it runs into the ten-year
accounting retention. It is **asynchronous, with a 30-day grace period**, and it **anonymises**
instead of deleting. The full sequence is in `data-model.md` §7.5.

---

## 10. What I am not building, and why

For the "what I deliberately did not build" section the README asks for:

- **no real cross-border VAT filing**: the one-stop shop, the thresholds and the returns are an
  accountant's work, not an architect's. The **shape** accommodates them;
- **no deferred payment, no instalments, no wallet**;
- **no mixed order model** for seats + merchandise (D-011): no mockup shows one, and carving it
  would be putting an untested intention into the contract;
- **no reconstruction of Stripe's ledger**: that is a choice, not a gap. We reconcile.

---

## 11. The arbitrations, returned

All settled on 21 September 2026. **Nothing remains open in this document, except the legal
validation of §5 — which is not a project arbitration.**

| Point | Decision | Reference |
|---|---|---|
| Tax model, commission on the net of tax | **commissionnaire model**, adopted — and **the only coherent reading of the facts**, not a choice of convenience (§5.3) | **D-015** |
| `on_behalf_of` | **removed**: it would make the artist merchant of record, contradicting the model (§3) | — |
| Key of the VAT breakdown | **the jurisdiction**, not the market; buyer location with its evidence (§5.0) | — |
| Display currency | **removed at milestone 1**, reversible (§5.6) | **D-016** |
| Scope of the credit note | **the issuing channel** — bounds the cash commitment | **D-017** |
| Merchandise order | **single-seller**, the basket splits at payment | **D-017** |
| Discount and promotion | **no stacking**: the one most favourable to the viewer | **D-017** |
| Third notification channel | **`in_app`**, not `sms` | **D-017** |
| Service fee | **per seat**, schedule served — never a screen constant | this document, `data-model.md` §3.1 |
