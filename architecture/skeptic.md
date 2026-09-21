# Adversarial review of the architecture

> **What this document is.** An adversarial review written on 21 September 2026 against the
> architecture **as it then stood**. The findings below are preserved **verbatim**, line
> references included, dead or not — their value is that they were written before the fixes.
> The outcome notes marked **↪ Outcome** were added later, after the fixes landed; everything
> else is the record of 21 September and has not been renumbered, softened or re-cited. Where
> a citation now points at a line that has moved or a document that has since been
> restructured or translated, the outcome note says so rather than updating it.

> **Author**: `skeptic`, sixth and last pass. **Date**: 21 September 2026.
> Read without the blind spots of the other seven: `architecture/*`, `openapi/*`, `proto/*`,
> `needs/*` (including the Confrontations being written as I read), `DECISIONS.md`, and
> `shared/` from the handoff folder.
>
> **What I do not redo.** The five surfaces are writing their Confrontation right now and
> already cover the screen-level gaps: `storefront-tv` C1–C4, `storefront-web` ❶–❻,
> `storefront-mobile` C1–C5, `studio-web` A–J. I do not repeat them. This document carries
> only what a surface cannot see: the boundaries between contexts, the back of the
> contracts, and the numbers that were copied.
>
> **Method.** Every attack cites the file and the line. Vendor capabilities are verified
> online today, never from memory — my internal knowledge stops in May 2026.

---

## What breaks

Ordered by severity. The test: a false invariant, lost data, or a guarantee served in the
contract that is not held.

---

### K1 — `on_behalf_of` makes the artist the merchant of record, and destroys the foundation of D-015

**The severity: this is money and law, and the proof is Stripe's own.**

`adr-payments.md` §3, lines 72–78:

```
PaymentIntent
  ├─ created on the PLATFORM account             (we are the merchant of record)
  ├─ on_behalf_of        = acct_<channel>         (settlement, currency, tax attachment)
```

The two lines contradict each other. Verified today on `docs.stripe.com/connect/charges`,
section *"Indirect charges using the on_behalf_of parameter"*, exact quote:

> **"To make the connected account the business of record for the payment, use the
> `on_behalf_of` parameter."**

And on `docs.stripe.com/connect/merchant-of-record`, section *"Define the merchant of
record"*, exact quote:

> "**Indirect charges using the `on_behalf_of` parameter:** The merchant of record is the
> **connected account**. […] **Indirect charges without using the `on_behalf_of`
> parameter:** The merchant of record is the **platform**."

The same page defines the MoR as *"the legal entity responsible for facilitating the sale
[…] that handles any applicable regulations and liabilities, **including sales taxes**"*.
And `charges.md` states that `on_behalf_of` *"Uses the connected account's statement
descriptor"* and *"Uses the connected account's address and phone number (rather than the
platform's) on the customer's statement"*.

**Three consequences, all of them inside the document itself:**

1. **Model A in §5.3 loses its evidence.** D-015 is settled on "six converging indications",
   one of which is *"the viewer […] never sees [the artist's] name on a payment method"*
   (§5.3, line 204). With `on_behalf_of`, the viewer's bank statement carries the artist's
   descriptor, address and phone number. The indication is inverted **by our own
   configuration**.
2. **`destination charges` is chosen over `direct charges` on the grounds that the latter
   would make the artist the merchant of record** (§3, line 84). With `on_behalf_of` we get
   exactly the outcome we were avoiding — while keeping the liability: the same Stripe page
   adds *"if a connected account's balance becomes negative, your platform is ultimately
   responsible for covering any losses"*.
3. **And we cannot simply drop the parameter for the declared markets.** `charges.md`:
   *"Destination charges support cross-region funds flows […] only in certain regions. For
   other regions, the platform and connected account must be in the same region **unless
   using `on_behalf_of`**"*. `shared/catalogue.json` `geography.billingMarkets` declares
   `eur`, `chf`, `cad`. A Swiss or Canadian channel therefore **forces** `on_behalf_of`,
   which makes the artist the MoR, which flips those sales into model B — while euro-zone
   sales stay in model A. **Two tax models in the same payout table, decided by the
   geography of the connected account.**

This is not an impossibility for D-015: model A remains reachable, minus `on_behalf_of`. It
is an **incompatibility between D-015 and §3 of the same document**, and it is invisible
because the two paragraphs are four pages apart.

> **↪ Outcome (added after the review).** **Closed.** `on_behalf_of` was removed after
> verification across three jurisdictions. `adr-payments.md:83` now reads *"destination
> charges on the platform account — **without `on_behalf_of`**"*, and line 93 states the
> removal as *"a correction, not a setting"*. The commissionnaire model holds, and the ADR
> now presents it as the only coherent reading of the facts rather than as a choice. The cost
> is written down instead of discovered (line 100): Stripe **requires** the parameter once the
> connected account leaves the common region, so a Swiss or Canadian channel waits or is
> handled otherwise. My cited line numbers are dead — §3 was rewritten around the removal.

---

### K2 — VAT is broken down by **billing market**, but the rate chosen is that of the **viewer's country** — and that country is recorded nowhere

**The severity: this is the one choice `adr-payments.md` §5.0 declares irreversible, and it
is made on the wrong key.**

`adr-payments.md` §5.0, lines 140–147:

> **"The only genuinely irreversible choice in this whole chapter is whether or not to carry
> a VAT breakdown by market."**

`adr-payments.md` §5.4, line 212: `rate = that of the VIEWER's country`.

The form that gets set in stone, `proto/arthome/ticketing/v1/events.proto:116-124`:

```proto
message VatLine {
  // "eur", "chf", "cad".
  string market_id = 1;
  uint32 rate_bps = 2;
  ...
}
```

`data-model.md:757`: `vat_breakdown[] { market_id, rate, base_minor, amount_minor }`.

**The key is the market — three values. The rule is the country — twenty-seven inside `eur`
alone.** A French viewer (5.5%) and a Belgian viewer both settle in the `eur` market, at two
different rates. A breakdown keyed on `market_id` cannot carry two `eur` lines without
`market_id` ceasing to be a key.

**And the fact that decides the rate is published nowhere.** `OrderPaid`
(`proto/arthome/ticketing/v1/events.proto:223-251`) is the event that carries "the raw
material of the payout entitlement" to `payouts`. It carries `gross_ttc`, `vat[]`,
`service_fee`, `discount`, `credit_applied`, `payment_intent_ref` — **and no buyer
country**. The only two `country` fields in all of `proto/` are the artist's (`catalog`) and
the account's at registration (`identity`) — and `adr-stream-entitlement.md:264` says itself
that a stored country is wrong: *"the viewer's country is resolved at every open, not
projected: it changes between two viewings"*. On the HTTP side, `countryCode` appears only
on the merchandise **shipping** address (`openapi/storefront.yaml:1280`), on the venue
(3993) and on the artist (4288).

**The document describes this exact defect, then commits it one level down.** §5.0,
lines 154–157:

> "A single scalar `vat_amount` field would have frozen the defect. The day we discover we
> have to break it down — **because the rate is the buyer's** — we have to rebuild the
> taxable base of every past line […]. That is no longer a migration, it is an accounting
> reconstruction."

Replace "single scalar" with "by market": the paragraph stays true word for word. And the
reconstruction will be **impossible**, not merely expensive, since the country was never
written down.

> **↪ Outcome (added after the review).** **Closed, and the finding was shallower than the
> defect.** `backend-domain` found the category error underneath it: a billing market is a
> **pricing** notion and never a **tax** one, so no amount of re-keying within markets would
> have worked. `VatLine` moved off the market key entirely — it now carries
> `jurisdiction_code`, `jurisdiction_level` and `supply_kind`
> (`proto/arthome/ticketing/v1/events.proto:213-216`) — and the missing fact is now recorded:
> `BuyerTaxLocation` (line 173) with `TaxEvidence[]` (line 152), an `evidence_conflicting`
> flag (line 186) and ten-year retention, carried on `OrderPaid` as `buyer_tax_location`
> (line 352). My cited line numbers for `VatLine` are dead; the message was rewritten.

---

### K3 — "signing out this device stops playback within ≤ 60 s" is false, and the 60 is served in the contract

**The severity: a security guarantee, with a number, published to all five surfaces, and
contradicted by the ADR that owns the mechanism.**

The playback token lives **120 s** and is renewed every **45 s**
(`adr-stream-entitlement.md:56,59`). The CDN prefix signature *"expires with the token"*
(§3.2, line 103). Revocation does not revoke the token: it **refuses the next renewal**
(§3.3, line 163).

So the window during which a stream keeps being served by the edge is the lifetime of the
token **already in hand**, i.e. up to **120 s** — not the renewal interval. A client that
ignores the refusal (or that simply does not stop) keeps pulling valid signed segments.

**Exactly one document gets it right.** `adr-auth.md:520`:

> "**Maximum latency = event lag + 120 s** — the case where the token was renewed at the
> very instant of revocation; in steady state, 45 to 75 s."

**Five places say 60 s**:

| Where | What is written |
|---|---|
| `adr-stream-entitlement.md:164` | "Visible effect at the next renewal, **≤ 60 s**" |
| `context-map.md:559` | "Visible effect on playback: ≤ 60 s" |
| `data-model.md:75` | "visible effect ≤ 60 s" |
| `answers-to-surfaces.md:89` (answer to `storefront-web` Q25) | "**Yes, ≤ 60 s**" |
| `definition-of-done.md:286` | "the only way to verify the **≤ 60 s** latency" |

And the contract **serves the number**: `openapi/storefront.yaml:3011`,
`data: { devices: [], playbackCutWithinSec: 60 }`, under a description promising *"An
observable effect on the targeted device, within 60 seconds at most"* (line 2976).

**Why this breaks rather than hurts.** `definition-of-done.md:286` makes someone write an
integration test whose title is "latency ≤ 60 s". That test will pass: it will observe that
the **renewal** is refused after 45 s. It will not have measured what the sentence promises,
which is playback stopping. **A false guarantee with a green test is worse than no guarantee
at all.**

This is critical rule 15 violated on a security constant: the constant has two owners and
two values, and the wrong one was copied four times — because it is the one that satisfies
`storefront-tv`'s requirement (`needs/storefront-tv.md:653`: *"Beyond a minute, you are
watching a stream you no longer have the right to. I ask for ≤ 60 s"*). **The plausible
number was chosen because it pleased the question.**

> **↪ Outcome (added after the review).** **Closed — the promise was corrected, not the
> mechanism.** The token stays at 120 s and the lease at 90 s. `adr-stream-entitlement.md`
> §3.1 now carries a two-line table separating what the **client learns** (bounded by the
> renewal interval, ≤ 45 s) from what the **edge serves** (bounded by the token lifetime, up
> to 120 s) — lines 62–68 — and a dedicated section at line 171 titled *"the real exposure
> window is 120 s, not 60 s — and I had written 60"*. The served constant became
> `playbackCutWithinSec = 120` (line 202). The definition-of-done gate now measures the stop
> of playback rather than the refusal to renew.
>
> And `backend-domain` isolated the root sentence I had not: §3.1 asserted that the window
> *is exactly the renewal interval*. That single clause is where the 60 came from, and every
> one of the five copies I listed descends from it. I found the copies; I had not found what
> they were copying.

---

### K4 — Two parallel event vocabularies, and sixteen of thirty aggregate types have no topic

**The severity: this is the routing key of the entire event architecture, and it is declared
twice, differently.**

`events.md` §1.3 establishes that the `type` header is
`<context>.<aggregate>.<event>.v<N>` and that it "routes the handler inside a multi-type
topic". `proto/` follows that form (`DateSalesAvailabilityChanged`, `SeatActivated`,
`DeviceRevoked`…).

**`context-map.md` and `data-model.md` use a second form, which exists in no schema:**

| `events.md` + `proto/` (authority) | `context-map.md` / `data-model.md` |
|---|---|
| `ticketing.date_sales.availability_changed.v1` | `ticketing.date_availability_changed` (CM:348, DM:538,543) |
| `ticketing.seat.activated.v1` | `ticketing.seat_activated` (DM:547) |
| `ticketing.order.paid.v1` | `ticketing.seat_order_paid` (DM:552) |
| `ticketing.order.refunded.v1` | `ticketing.refund_issued` (DM:552) |
| `catalog.date.outcome_declared.v1` | `catalog.date_outcome_declared.v1` (CM:498) |
| `catalog.date.replay_policy_set.v1` | `catalog.replay_policy_set` (DM:547) |
| `identity.device.revoked.v1` | `identity.device_revoked.v1` (DM:74) |
| `chat.date_chat_policy.changed.v1` | `chat.date_chat_policy_changed` (CM:348) |
| `streaming.run.state_changed.v1` | `streaming.run_state_changed` (CM:348) |
| `payouts.payout.state_changed.v1` | `payouts.payout_state_changed` (DM:551) |

Eighteen occurrences in total. This is E2 by its exact definition — a parallel literal table
— committed on the one value that decides whether a message reaches its handler.

**Worse: one of the names denotes nothing.** `data-model.md:547` feeds
`entitlement_projection` — the projection that decides the right to watch — from
`catalog.date_published`. That event **exists neither in `events.md` §4.2 nor in
`proto/arthome/catalog/v1/events.proto`**. The catalogue carries `date.drafted` and
`date.scheduled`; there is no `date.published`. The canonical example in `events.md` §1.1
(line 20) likewise uses `type = "catalog.date.published.v1"` — a type absent from its own
catalogue fifteen lines further down.

**And the topic table is short by a factor of two.** `events.md` §1.1 states the rule:
`aggregatetype` → topic, one topic **per aggregate type**, and concludes "**14 topics**, not
eighty". Applied to the §4 catalogue, the rule yields **30 aggregate types**. Sixteen have no
declared topic:

| Context | Aggregate types with no topic |
|---|---|
| `identity` | `artist`, `date_access`, `rights_version` |
| `catalog` | **`publication`** |
| `ticketing` | **`seat`**, `credit`, `waitlist` |
| `streaming` | `incident`, `replay`, `chapter`, `viewer_count` |
| `chat` | `date_chat_policy`, `audience` |
| `payouts` | `bank_change`, `reconciliation` |
| `notifications` | `delivery` — **the context has no topic at all** |

The two in bold are the expensive ones:

- **`ticketing.seat`** carries `seat.activated`, the event that creates the right to watch
  (`entitlement_projection`). No topic, therefore no key, no partition count, no `groupId`,
  and no AsyncAPI channel — while `definition-of-done.md` §3.1 generates the channels
  **from that table**.
- **`catalog.publication`** carries `publication.engaged`, which locks prices in `ticketing`
  and the chat regime in `chat`. If it lives on its own topic keyed by `publication_id`, it
  **loses its relative order** with `catalog.date.scheduled`, which is keyed by `date_id`.
  That is precisely the argument `events.md` §1.1 (lines 26–29) gives for refusing one topic
  per event: *"a consumer could apply an outcome before the publication that creates it"*.
  The rule is written, then the aggregate that violates it is published.

Finally, `context-map.md:889` measures lag on a topic named `arthome.ticketing.seat_order`,
a seventeenth name that appears in neither list.

> **↪ Outcome (added after the review).** **Closed.** 54 event names were normalised onto the
> `<context>.<aggregate>.<event>.v<N>` form, and `catalog.date_published` — the name that
> denoted nothing — was renamed. The topic table went from 14 to **16** and now accounts for
> all **30** aggregate types; `events.md:129-130` carries the retraction explicitly, noting
> that the earlier table *"left sixteen aggregate types with no topic — therefore no key, no
> partition count"*. My table of eighteen divergent names is a record of the pre-normalisation
> state and none of its citations resolve any more.

---

### K5 — `signOutProfile` stops no playback, and nothing says so

**The severity: the use case that justified splitting `Device` from `DeviceSession` is not
served.**

`context-map.md` §7.1 and `data-model.md` §1.3 distinguish two gestures:

- **revoke the device** → deletes the `Device`, all its sessions **and its playback
  leases**, publishes `identity.device.revoked.v1`, which `streaming` consumes;
- **sign out a profile** → closes a `DeviceSession`, *"the other accounts stay signed in"*.

`openapi/storefront.yaml:3014-3032`, `signOutProfile`: `x-arthome-upstream: [identity]`,
response = `ViewerContext`. **No event, no mention of playback.** The event catalogue
contains no `identity.device_session.closed`; `DeviceRevoked`
(`proto/arthome/identity/v1/events.proto:105`) carries only `device_id` and `account_id` —
**there is no profile grain**. `streaming` therefore has no way of learning that a profile
was signed out of a device.

**Consequence, on the shared television that is the very reason for the split.** Five
profiles on the living-room TV. Someone is watching under your profile. You choose "sign out
this profile" from the web. The `PlaybackSession (account, profile, device, date)` lease
keeps renewing every 45 s against `entitlement_projection`, which knows nothing about
sessions or devices. **Playback does not stop.** And since `concurrentStreamsAllowed` is 1
outside `premium` (`openapi/storefront.yaml:645`), you stay locked out of your own account —
the exact defect `storefront-mobile` Q5 and `storefront-tv` Q9c asked us to avoid. The only
way out is `revokeDevice`, which signs out all five profiles.

**And `adr-auth.md:518-519` compounds the confusion** by writing that "sign out this device"
revokes the `DeviceSession`, which publishes `session.revoked` / `device.revoked`:
`session.revoked` exists nowhere, and the two gestures are conflated in the very sentence
that claims to articulate them.

> **↪ Outcome (added after the review).** **Closed.** `DeviceSessionClosed` was added
> (`proto/arthome/identity/v1/events.proto:129`) with the `profile_id` grain that was missing
> — the grain whose absence was the whole defect, since `DeviceRevoked` could only ever speak
> about a whole device.

---

### K6 — `plan.opens[]` is written in `snake_case` in the contract and in `kebab-case` in the authoritative source

**The severity: this is the vocabulary that gates the right to watch, and `adr-auth.md` §7.1
itself calls its corruption "an authorization defect, not a display defect".**

`shared/catalogue.json`, `plans[]` (the source declared authoritative by `data-model.md` §0:
*"`shared/` is authoritative on rules and vocabulary"*):

```json
"opens": ["browse","trailers","free-dates","replays","no-ads","one-live-month"]
"opens": ["browse","trailers","free-dates","replays","no-ads","all-lives","multi-screen","archive"]
```

`data-model.md:759` faithfully reproduces the kebab: "`free-dates`, `no-ads`,
`one-live-month`, `all-lives`, `multi-screen`".

`openapi/storefront.yaml:643` and the matching closed vocabulary:

```yaml
opens: [browse, trailers, free_dates, replays, one_live_month]
x-arthome-vocabulary: [all_lives, archive, browse, free_dates, multi_screen, no_ads, one_live_month, replays, trailers]
```

`adr-stream-entitlement.md:234` writes `PLAN_OPENING_MULTI_SCREEN` on its side.

Three spellings for one value that `decideWatch` depends on. An
`opens.includes('multi-screen')` against a payload carrying `multi_screen` returns `false`
silently: **everyone falls back to one screen**, which is exactly the shape of E1 that
`adr-auth.md` §7.1 describes (`helpers.planOf()` dropping every account back to `free`). The
contract fixed the **plan** vocabulary and reintroduced the defect in the **openings** one.

Same fault, quieter, on the territorial restriction reason: `shared/catalogue.json`
`blackoutReasons` declares `co-production`; `data-model.md:212`, `proto` and `openapi` carry
`co_production`.

> `studio-web` §G found the same fault on `moderationReason` (`spoiler` and `insult`
> removed, `hate` and `filter` invented). I confirm the measurement on
> `proto/arthome/chat/v1/events.proto:64-71` and add that **this is not an isolated case**:
> it is a pattern, across at least three vocabularies, and it runs from `shared/` all the way
> into the `.proto`.

> **↪ Outcome (added after the review).** **Closed, and generalised.** `opens[]` is back to
> kebab-case in the contract (`openapi/storefront.yaml:1530`, `:6501`), and the document
> records the former snake spelling rather than quietly overwriting it (`:6491-6493`). The
> fix became a convention rather than a patch: **the wire spelling is `shared/`'s, to the
> letter.** That is the right shape — the pattern was the finding, not the one field.

---

### K7 — The studio journal has no owning context, and the BFF composes it from five services with `page + total`

**The severity: this is a query-time join, offset-paginated, over the artifact the studio
keeps for 24 months — and it crosses the line `definition-of-done.md` §8 draws for BFFs.**

`openapi/studio.yaml:3113-3128`:

```yaml
operationId: listChannelJournal
x-arthome-upstream: [identity, catalog, chat, streaming, payouts]
```

Response: `items: JournalEntry[]` + `page: OffsetPageInfo`, with `totalItems: 812,
totalPages: 41` in the example (line 3172).

**That total cannot exist.** You would have to count, by period and by nature, the entries of
five distinct services, **then** apply the role projection ("the `money` nature is absent
without `canRevenue`", line 3153), **then** sort the union, **then** extract page 3. None of
the five knows the totals of the other four, and the BFF is not allowed to hold a table
(`definition-of-done.md` §8: *"If a BFF acquires a table it writes itself […] it has crossed
the line"*).

**Nobody owns this aggregate.** `context-map.md:947` only says that *"the named 24-month
audit journal the studio requires is a table, not an event store"* — without naming the
context. `data-model.md` defines no aggregate for it; `data-model.md` §4, the read-model
table, does not contain it; `data-model.md:918` fixes its retention (24 months) without
saying where. **A 24-month table with a retention, a purge and an export, and no owner.**

And it is the one screen in the system that directly contradicts `data-model.md` §4: *"no
screen is served by a join at request time"*.

> **↪ Outcome (added after the review).** **Closed.** The journal now belongs to `identity`
> as a read model, `channel_journal` (`data-model.md:571`), fed **only** by Kafka consumption
> — through the `actor-id` header every message already carries — with the 24-month
> retention, `page + total`, the mandatory period filter and the `money` nature absent without
> `canRevenue` all stated on the model rather than assembled at request time.
> `listChannelJournal` is now `x-arthome-upstream: [identity]`
> (`openapi/studio.yaml:4574`). Its fan-out exception is gone, and **the system now declares
> no fan-out exception at all** — see G1.

---

## What hurts

---

### G1 — Maximum fan-out is 5, not 4 — and the transport decision rests on 4

`transport.md:47-48`:

> **"The number that decides is therefore not 192. It is 1 — the depth — and 4 — the maximum
> parallel fan-out of a screen."**

Counted on the delivered documents (`x-arthome-upstream`, which exists precisely to make the
rule verifiable — `definition-of-done.md` R7):

| Document | Operations | Fan-out distribution |
|---|---|---|
| `openapi/storefront.yaml` | 67 | 1:50 · 2:6 · 3:4 · 4:6 · **5:1** |
| `openapi/studio.yaml` | 63 | 1:58 · 2:2 · 3:2 · **5:1** |

The two at five:

- `getDateDetail` (`openapi/storefront.yaml:660`) — `[catalog, ticketing, identity,
  streaming, chat]`, while `context-map.md:864` counts the `title` screen at **4**, and
  `date_detail_public` is already declared to be fed by `chat.date_chat_policy_changed`
  (`data-model.md:539`). The `chat` pane is therefore both called **and** projected;
- `listChannelJournal` (K7), while `context-map.md:862` announces "studio: 1 to 3".

The threshold `bff_upstream_calls_per_request p95 > 4` (`context-map.md` §11a,
`definition-of-done.md` §8, `transport.md` §6) is therefore **crossed on delivery day**, and
its prescribed action is "the read model is missing". The HTTP-over-gRPC decision stands —
a fan-out of 5 does not overturn it — but **the sentence that justifies it is false**, and
that is the sentence someone will re-read in six months.

On depth 1, on the other hand, the attack the lead asked me to make does not land: see `R2`
below.

> **↪ Outcome (added after the review).** **Closed.** Re-measured on both documents: maximum
> fan-out is now **4**, with no operation at 5 in either. `getDateDetail` lost its `chat`
> call — the pane was already projected into `date_detail_public`, which was the point — and
> `listChannelJournal` dropped to a single upstream (K7). Distribution today, against my
> table above: storefront 1:69 · 2:6 · 3:6 · 4:7; studio 1:75 · 2:3 · 3:5 · 4:2. Both
> documents also grew substantially — the surfaces' missing endpoints were added — so the
> sentence in `transport.md` §1 is now true of a larger contract than the one I measured.

### G2 — `adr-auth.md` §8.1 announces three issuers, lists four, and promises "a single object to rotate"

`adr-auth.md:454`: *"It contains the public keys of the **three** issuers"*. The table that
immediately follows (lines 457–461) carries **four**: `bff-sf`, `bff-st`, `play`, `dev`.
`context-map.md:573` says four; `definition-of-done.md:536` (gate J2) checks `length == 4`.

And `adr-auth.md:464`: *"a single object to rotate, a single thing to watch"* — while
`definition-of-done.md` §7.6 has **settled the opposite**: "four independent rotations, one
secretless assembler", demonstrating that a single job holding four private keys "creates a
target that does not yet exist". The auth ADR still carries the argument the definition of
done refuted.

> **↪ Outcome (added after the review).** **Closed, both halves.** `adr-auth.md:501` now says
> *"the **four** issuers"*, and line 513 retracts the other half by name — *"What I had
> written and that was wrong: 'a single object to rotate'"* — rather than silently deleting
> it. My line numbers are dead: `adr-auth.md` has since been translated to English and
> renumbered.

### G3 — `realtime.md` contradicts itself on what transits `date:{id}:state`

- `realtime.md:43`: the room carries "incident raised/resolved, outcome declared, **going on
  air, room opening, replay expiry**";
- `realtime.md:105-107` (§2.4): *"a date goes on air, a room opens, a replay expires. **The
  temptation is to push those transitions; we must not.**"*;
- `realtime.md:366` (§8): "going on air, room opening, replay expiry | all | — | **derived,
  no call**".

Three sections, two answers. §2.4 carries the argument (a TV idle for eight hours must make
no request); line 43 is the outlier, and it is the only one `backend-contracts` will read if
they go looking for the contents of a room.

> **↪ Outcome (added after the review).** **Closed.** The room now carries *"going on air in
> the strict sense (the stream enters or leaves)"* only; room opening and replay expiry were
> removed from the table, with a note in §2.1 stating that the earlier row *"was the single
> line contradicting §2.4 and §8, and the one you would have read looking for the contents of
> a room"* — which is the finding, quoted back. The same pass added `playback:stop` on
> `viewer:{profileId}` as an explicit **courtesy, not a control**, with the 120 s guarantee of
> K3 restated next to it so the signal is never mistaken for a security boundary.

### G4 — `definition-of-done.md` §6 imposes a gate based on a fracture D-014 retracted

`definition-of-done.md:367-371`:

> "**C1 deserves a note, because it is the only one that crosses the TypeScript fracture.**
> The client is consumed by one repository on **TS 6.0.x** (Angular 22) **and** by
> repositories on **TS 7.x** (React 19.3). It therefore compiles **twice** […]. A generated
> client readable by only one of the two is not done."

D-014 says the opposite, explicitly: *"The conclusion inverts. There is no fracture between
repositories: there is a **single ceiling at TS 6.0.x across all seven**"*, and
`code-conventions.md:103`: *"the TypeScript 6 / 7 fracture is not a present constraint"*.
Gates 6 and 7 of `code-conventions.md` §8.1 apply to the `.d.ts` of `@arthome/core` and
`@arthome/contracts` — **not** to the surfaces' generated client, which exists only in
repositories on TS 6.0.3.

So the line turns a service review into a check on a state that does not exist. This is E2
applied to a decision: plausible reasoning, retracted elsewhere, left standing here.

> **↪ Outcome (added after the review).** **Closed.** `definition-of-done.md:380-385` now
> reads *"There is no fracture: `code-conventions.md` §1.3 investigated it and **retracted**
> it. […] All seven repositories sit under a single ceiling at TS 6.0.x"*, and keeps the
> forward-looking gates on the ground that the fracture **will** arrive rather than that it
> has. The lead's note on this one is worth recording: the gate rested on a fracture **he had
> himself retracted in D-014** without propagating the correction. E2 applied to a decision,
> committed by the lead — which is the same shape as the five copies of K3, one level up.

### G5 — `transport.md` §7 reports a defect that has already been fixed

`transport.md:264-269`: *"`events.md` §6 draws the vertical flow with
`ticketing.PurchaseSeat gRPC traceparent in Metadata`. […] **I do not touch a teammate's
file** — for the lead to arbitrate."*

`events.md:279-281` today carries `POST /orders/seats` / `HTTP/JSON` / `traceparent in
header`. The correction was made; the report stayed. An arbitration is pending on a defect
that no longer exists.

> **↪ Outcome (added after the review).** **Closed.** The stale report is gone from
> `transport.md` — no occurrence of `PurchaseSeat`, of gRPC `Metadata`, or of *"I do not touch
> a teammate's file"* remains. Nothing is pending.

### G6 — Two of the five notification thresholds have no owner

`context-map.md:289-291` names the five thresholds that "live in `@arthome/core`":
"30 minutes before", "85% of seats", "6 hours before expiry", "**queue beyond ten
messages**", "**role unassigned at D-1**".

Served: `reminderLeadMinutes`, `scarcityThresholdBps`, `replayExpiryWarningHours`
(`openapi/storefront.yaml:3712-3734`). The studio constants
(`openapi/studio.yaml:4085-4110`) carry `technicalProvisionThreshold`,
`provisionRevisionHours`, `chatBurstThresholdPerMinute`, `holdScreenAutoAfterSec`,
`seasonBounds` — **neither the queue threshold nor the assignment deadline**. Two of five
with no owning document: critical rule 15.

> `storefront-web` ❻.3 found the same thing on the free-preview **total**
> (`previewSecondsLeft` serves the remainder, nothing serves the total). I confirm: `grep -rn`
> across `architecture/`, `openapi/` and `proto/` returns no occurrence of a preview cap.
> `decideWatch` needs it as an input (`context-map.md:382`) and `definition-of-done.md:233`
> requires testing "the preview budget at 0".

> **↪ Outcome (added after the review).** **Closed.** Both missing thresholds are now served
> constants in the studio bootstrap: `moderationQueueAlertThreshold: 10` and
> `crewUnassignedAlertHoursBefore: 24` (`openapi/studio.yaml:366-367`, schema at `:5679-5686`).
> Five of five now have an owning document.

### G7 — "the only data duplication in the system" is announced three times, and there are at least eight

`context-map.md:414`: *"This is the only place in the system where I accept duplicating a
`ticketing` value"*. `data-model.md:555`: *"`entitlement_projection` is the only duplication
I accept, reluctantly"*. `adr-stream-entitlement.md:259`: *"This is **the only data
duplication I accept in the whole system**"*.

The table in `data-model.md` §4 lists seven others: `date_card_public` (`ticketing`'s
availability, prices and promotions copied into `catalog`), `date_detail_public`,
`channel_agenda` and `events_table` (`ticketing`'s revenue inside `catalog`),
`artist_counters` (`identity` and `streaming` counters inside `catalog`), `channel_dues`
(`ticketing` and `payouts` facts inside `identity`), `payout_ledger`, plus the three
projected items of the publication checklist (`data-model.md:263-266`).

The distinction being drawn is real — `entitlement_projection` is the only one that carries
**authority**, not just display — but it is written nowhere, and the sentence as it stands is
false. It will be quoted to refuse the eighth legitimate projection.

> **↪ Outcome (added after the review).** **Closed, and the distinction I asked for was
> written.** `data-model.md:578-581` now states *"what counts is not the number, it is the
> nature"* — the seven others feed a **display**, and a display five seconds stale corrects
> itself; `entitlement_projection` decides a **right**, and a stale right mints a token, which
> is why it alone carries a numbered freshness budget (≤ 5 s) and an alert. The false sentence
> is retracted by name, with my reason for objecting quoted: *"it would have served to refuse
> the eighth legitimate projection"*.

### G8 — The contract exposes the shape of a search engine

`answers-to-surfaces.md:46` (answer to `storefront-web` Q2):

> "**Yes.** `track_total_hits: 10000` on OpenSearch, and the contract declares the guarantee:
> **exact up to 10,000, 'at least 10,000' beyond**."

`track_total_hits` is the name of a Lucene parameter, and 10,000 is its default. The
guarantee served to the client (`CursorPageInfo.approximateTotal` + `totalIsLowerBound`) is
the right shape — it is the **number** and its provenance that leak. If we ever move to an
engine whose total semantics differ, the contract line saying "at least 10,000" becomes a
promise made in the name of a vendor who is no longer there. The remedy is one line: serve
the threshold as a domain constant instead of carving it into prose.

> **↪ Outcome (added after the review).** **Half closed — and the remaining half is the half
> that matters.** The answer index was fixed and retracts the leak by name:
> `answers-to-surfaces.md:46` now serves `approximateTotal` **and** `totalIsLowerBound` with
> the threshold as a served domain constant, noting that the earlier answer *"cited
> `track_total_hits: 10000`, which is the name of a Lucene parameter and its default"*. But
> **the contract itself still carries it**: `openapi/storefront.yaml:5214` reads *"Exact up to
> 10,000 (`track_total_hits`)"*, with the vendor parameter named and the number carved into
> the description. The index is not the contract. Of the two places the shape leaked, the one
> a generated client reads is still leaking.

---

## What is a preference, and I own it as one

1. **I would have added a `groupId` to the topic table in `events.md` §3.** The shared
   `groupId` trap in `@nestjs/microservices` is correctly identified (`events.md:73-75`,
   `definition-of-done.md:201-204`), and the AsyncAPI gate checks it at runtime. But the
   table that is authoritative on topics does not carry the groups, so the gate compares one
   document to another document. This is a preference: the gate is good.

2. **Keeping KafkaJS bothers me more than it bothers `backend-domain`, and I have no
   decisive argument.** Verified today on npm: `kafkajs@2.2.4`,
   `time.modified = 2023-02-27`, `dist-tags = { latest: 2.2.4, beta: 2.3.0-beta.3 }`. The
   observation in `events.md` §2 is accurate to the day. The reasoning — a group pause on
   every deployment is an operational nuisance on a platform whose peak is an evening
   performance — holds. My own preference would still go to the `confluentinc` transport for
   consumers, because the written switch signal ("rebalance > 30 s") is only measurable in
   production and nobody rewrites a custom transport on the evening of a live show. **This is
   a preference, not an objection.**

3. **`x-arthome-upstream` should be a gate, not an annotation.** Rule R7 checks that the
   field is **non-empty** (`definition-of-done.md:130`), not that it is **≤ 4**. Adding the
   bound would have caught G1 at writing time. It is one line of Python, and it is a
   preference because the threshold is already an operational alert.

---

## What holds up

I attacked these points and they hold. Saying so is worth as much as the rest: it tells you
where not to come back.

### R1 — OpenSearch: the original argument is dead, the choice survives, and for a better reason

**The attack.** `README.md:290-298` of the original handoff keeps OpenSearch on three
arguments and rules out Meilisearch on **one**: *"Meilisearch would be better on search
quality per hour invested, but has no official Kafka Connect connector."* Yet
`context-map.md:135-141` establishes that the *sink* connector **is not usable here** — the
indexed document composes three contexts, and no connector performs that join. The argument
that ruled out Meilisearch is therefore dead, and the comparison reopens.

**The verdict: it reopens, and OpenSearch still wins — on an argument nobody wrote down.**

`context-map.md:143-147` grounds saved-search alerting in an **inverted query**, "which is
exactly what an OpenSearch *percolator* does". This is the keystone of the answer to
`storefront-web` Q23 (`answers-to-surfaces.md:86`), of `saved_search_percolator`
(`data-model.md:542`), of `SavedSearchMatched`
(`proto/arthome/catalog/v1/events.proto:255`) and of the fact that ten saved searches cost
**zero** counting queries when the Account page opens.

I verified online today that the capability genuinely exists, because it is inherited from
Elasticsearch 7.10 and could have been dropped at the fork:
`docs.opensearch.org/latest/mappings/supported-field-types/percolator/` and
`docs.opensearch.org/latest/query-dsl/specialized/percolate/` — **the `percolator` field type
and the `percolate` query exist in current OpenSearch** (with one caveat:
`search.allow_expensive_queries` must stay `true`). **Meilisearch has no equivalent**: its
`facetDistribution` counts documents, and aggregation in the broader sense has been an open
request since 2020 (`github.com/meilisearch/meilisearch/issues/1083`).

And one fact postdating the handoff pushes the same way: Meilisearch has since moved to
**dual licensing**, a Community Edition under MIT and an Enterprise Edition under the
Business Source License. OpenSearch's "Apache 2.0, genuinely free" line comes out stronger,
not weaker.

**Is the reasoning honest or retrospective?** *It is retrospective in form and right in
substance.* The original handoff picked the right engine for a reason that turned out to be
false; `context-map.md` demolished that reason without reopening the comparison — which is a
gap — but simultaneously introduced the reason that actually settles it. **The justification
needs rewriting, not the decision.** It is the percolator that holds OpenSearch up, not Kafka
Connect.

### R2 — Chain depth **is** 1, including in the case the lead suspected

The lead asked: *"a BFF calling a service that reads a read model projected by another
context — is that still a depth of 1?"*

**Yes, unambiguously.** Depth measures the **synchronous calls** a deadline has to cross. A
projected read model is a **local table of the called service**, fed outside the request by
Kafka. `catalog` reading `date_card_public` talks to nobody; `streaming` reading
`entitlement_projection` talks to nobody. The argument in `transport.md` §2.1 does not depend
on where the data came from, only on the number of network hops. There is not one point in
the system where a service calls another — I looked in `context-map.md` §10, `transport.md`
§5 and both OpenAPI documents, and there is none.

The counterpart written in `transport.md` §5.3 — `x-arthome-deadline` as an absolute
instant, checked by the service before opening a transaction and between the units of an
iterative job — is the right one, and the argument accompanying it (`nestjs-grpc`: Nest never
cancels a unary handler, so a gRPC `deadline` does not stop the callee either) is accurate.

**The HTTP/JSON decision holds. Only the fan-out of 4 is false (G1), and it does not overturn
it.**

### R3 — Both OpenAPI documents genuinely pass the fifteen rules

`definition-of-done.md:148-149` claims: *"`openapi/storefront.yaml` (55 paths, 67 operations,
57 schemas) and `openapi/studio.yaml` (59 paths, 63 operations, 34 schemas) pass the fifteen
rules"*. I reimplemented the mechanizable checks and ran them.

| Check | Result |
|---|---|
| announced counts | **exact**, 55/67/57 and 59/63/34 |
| R2 — no `nullable` | 0 occurrences in either |
| R3 — every `$ref` resolves, no external `$ref` | 0 unresolved, 0 external |
| R4 — `operationId` present, `lowerCamelCase`, unique | none missing |
| R5 — `summary` **and** `description` | none missing |
| R7 — `x-arthome-upstream` non-empty | none missing |
| R8/R9 — example on every request body and every 2xx | none missing |
| R11 — `Idempotency-Key` on every write outside the allowlist | none missing |
| R12 — `traceparent` on every operation | none missing |
| R13 — no `labelFr`/`labelEn`/`messageFr`/`messageEn` | 0 occurrences |
| R14 — no closed vocabulary frozen as an **output** `enum` | 0 in response schemas; 104 `x-arthome-vocabulary` |
| R15 — every 2xx composes `EnvelopeMeta` | none missing |

That is rare, and it is the kind of thing a document asserts without having run it. Here the
assertion is true. **The one known exception is the one `storefront-tv` C4 found**
(`Error.nature`, the only hard `enum` in a response) — and it escapes R14 because the schema
belongs to the **envelope**, not to a payload. The rule is good; the checker has a one-line
blind spot.

### R4 — The outbox contract with Debezium is right in the details that cost money

`data-model.md` §7.3 (lines 859–890). I went looking for the classic mistake and it is not
there:

- `payload bytea` **already framed** by the registry serializer, with
  `binary.handling.mode=bytes` + `value.converter=ByteArrayConverter` — without which
  Debezium emits framed JSON that no Protobuf consumer can read. That is correct, and it is
  the outbox router's number-one trap;
- `REPLICA IDENTITY DEFAULT` suffices **because the table is insert-only** — the reasoning is
  given, not just the conclusion;
- cleanup runs **after** the connector confirms its position;
- `tracecontext` injected **at write time**, with the reason (the relay runs outside the
  request);
- the unconsumed slot that retains WAL, with a threshold (`confirmed_flush_lsn > 1 GB`).

And the distinction between `commit()` after the transaction for **domain** events versus an
outbox row **inside** the transaction for **integration** events (`context-map.md:951-955`)
is stated explicitly as "the most expensive mistake in the model". Nothing to add.

### R5 — The lease that expires rather than the command that releases

`adr-stream-entitlement.md` §3.3 and `data-model.md` §5.4. I looked for the case where a 90 s
lease renewed every 45 s leaves a ghost screen or locks out a household, and there is none:
resuming your own session by `deviceId` covers restarts, and `releasePlayback` exists without
anything depending on it. Two surfaces asked for this independently and the answer is the
right one. **Only the revocation number is wrong (K3), not the mechanism.**

### R6 — The online verification in `adr-auth.md` is real, not decorative

I re-checked the dated facts, because a table labelled "verified online" is exactly the kind
of artifact people manufacture:

- `better-auth`: `npm view better-auth version` → **1.7.5**. Matches;
- **CVE-2026-45337 exists and is described accurately**: published 15 July 2026, CVSS 3.1 =
  7.6 (HIGH), affects 1.6.0 → 1.6.11, *"the deviceAuthorization plugin treats any
  authenticated session as the owner of any pending device code […] POST /device/approve and
  POST /device/deny short-circuit when userId is unset"*. The ADR says "fixed in 1.6.11":
  correct. The only imprecision, harmless: "three months ago" is two;
- `kafkajs`: 2.2.4, last published 2023-02-27. Correct.

And the decision that follows — **writing the ownership guard ourselves at the BFF** (§6.3),
because that is precisely the line that gave way at the vendor — is the right conclusion, not
the comfortable one. The S3 spike that exercises it is named "the test that must exist before
any line of production code".

### R7 — The E2 admission in `definition-of-done.md` §7.6 is deliberate, and I was wrong to read it as a leftover

`definition-of-done.md:507-515` keeps the false sentence — "remove the old key after the
longest token lifetime" — **and writes down why it keeps it**: *"I am leaving it written: a
bullet gets copied out of its context, and that is how rule 15 gets violated."* I first
counted this as a fourth occurrence of the fault. It is the antidote, and the sizing
reasoning that replaces it — `max(token lifetime, 2 × document max-age)` with
`max-age=3600` — is right: the grace window covers the cache of an edge we cannot flush, not
the lifetime of a token. It is the best paragraph in the folder on E2.

**One qualification even so**: `adr-auth.md:466` still carries the false sentence **without**
the marker, corrected only two paragraphs later. A hurried reader takes the first.

### R8 — The "provisional" contexts: the admission holds, one of the four has an invariant that does not

The lead asked whether a contract designed but never observed is even plausible. My answer is
more favourable than I expected:

- **`chat`**: the structural invariant — three axes (`MessageState`, `ModerationItemState`,
  `AudienceSanction`) instead of one stacked field, badge derived by `moderationBadgeOf` with
  a written precedence — is **stronger** than what the mockups exercised, and it is grounded
  in a real defect (`reported`, a triage state lodged in the sanctions field). It holds
  without having been observed because it is demonstrated, not guessed. `storefront-mobile`
  reaches the same conclusion ("designed, not proven", warning maintained on moderation
  alone, lifted on the other ten functions);
- **`streaming`**: nullable metrics with `measured_at` per sample and the distinction between
  "not measured" and "measured at zero" is the right one, and it comes from a `streaming.md`
  requirement. The `PlaybackTicket` is honestly marked provisional because the media vendor
  is not chosen;
- **`payouts`**: the admission "the form is safe, the tax model is not" is exactly inverted
  by K1 and K2 — **it is the form that is wrong, and the model that is recoverable.** It is
  the only one of the four where "provisional" is attached to the wrong half;
- **`notifications`**: no Kafka topic at all (K4), but its invariants (quiet hours
  conditioned on holding a seat, redacting an amount based on `canRevenue`, routing decided
  server-side) are real, verifiable business rules.

---

## What I could not judge, and why

1. **The tax model itself.** Who owes VAT, on what base, who is liable: these are questions
   of law, and the warning at the top of `adr-payments.md` is right to say so. I judged only
   what is judgeable without tax counsel: the **internal consistency** between D-015 and the
   Stripe configuration (K1) and between D-015 and the shape of the data (K2). On those two
   points you do not need a lawyer.

2. **The bundle measurements in D-012** (93 KB versus 7.5 KB gzip). Two agents measured
   independently and converge within 1 KB; the caveat is already recorded (esbuild on an
   isolated schema, tree-shaking not on by default in the React Native bundler). I have no
   bundler here and would have added nothing.

3. **The mockups.** The brief forbids opening them in full and I did not. Everything I claim
   about the design comes from `shared/` (`catalogue.json` read in full on the vocabularies I
   contest) and from the five `needs/`. Where a surface asserts what its mockup shows, I took
   its word.

4. **The percolator at scale.** I verified that it **exists** in OpenSearch (R1). I have no
   order of magnitude for the expected number of saved searches, and
   `search.allow_expensive_queries` is a switch an operator turns off one day under load. The
   day it is turned off, saved-search alerts stop **silently** — but I have nothing to say
   whether that is a risk or a footnote.

5. **`code-conventions.md`.** 2,044 lines read by targeted search, not in full. I draw one
   point from it (G4), and it is verified at both ends.

6. **The real renewal latency at the edge.** K3 demonstrates that the exposure window is the
   token lifetime and not the renewal interval. I could not establish **which** value to aim
   for: dropping the token to 60 s would double the renewal frequency on the hottest path in
   the system, and nobody has measured what that doubling costs. The defect is certain; the
   remedy is not.

7. **`studio-mobile` has not yet written its Confrontation** (`needs/studio-mobile.md` is
   unchanged as I write). Four surfaces out of five have confronted the offer; the fifth is
   still to read, and it may well find in `chat` and in on-call duty what I did not look for.

---

## Appendix — what I ran, so it can be re-run

```bash
# R3 — the fifteen rules, reimplemented and run against both documents
python3 - <<'PY'
import yaml, re, json
ALLOW = {'recordPlaybackPosition','submitHealthSample','openPlayback','renewPlaybackTicket',
         'releasePlayback','sendReaction','quoteCart','quoteSeat'}
for f in ('openapi/storefront.yaml','openapi/studio.yaml'):
    d = yaml.safe_load(open(f)); s = json.dumps(d)
    print(f, 'paths', len(d['paths']), 'schemas', len(d['components']['schemas']),
          'nullable', s.count('"nullable"'),
          'i18n-leak', len(re.findall(r'"(labelFr|labelEn|messageFr|messageEn)"', s)))
PY

# G1 — the real fan-out, the one R7 does not bound
grep -ohE 'x-arthome-upstream: \[[^]]*\]' openapi/*.yaml \
  | awk -F, '{print NF}' | sort | uniq -c

# K4 — the two event vocabularies, side by side
grep -ohE '\b(identity|catalog|ticketing|streaming|chat|payouts)\.[a-z_]+(\.[a-z_]+)*(\.v1)?' \
  architecture/context-map.md architecture/data-model.md | sort -u

# K6 — the authoritative source
python3 -c "import json;print(json.load(open('/home/julien-metral/Dev/arthome-design/design_handoff_arthome/shared/catalogue.json'))['plans'])"
grep -n 'opens:' openapi/storefront.yaml
```

**Sources verified online on 21 September 2026**:
[Stripe — Understand the merchant of record in a Connect integration](https://docs.stripe.com/connect/merchant-of-record) ·
[Stripe — Understand how charges work in a Connect integration](https://docs.stripe.com/connect/charges) ·
[OpenSearch — Percolator field type](https://docs.opensearch.org/latest/mappings/supported-field-types/percolator/) ·
[OpenSearch — Percolate query](https://docs.opensearch.org/latest/query-dsl/specialized/percolate/) ·
[Meilisearch — Filtering, sorting and faceting](https://www.meilisearch.com/docs/capabilities/filtering_sorting_faceting/overview) ·
[Meilisearch — Facet aggregation functions (issue #1083)](https://github.com/meilisearch/MeiliSearch/issues/1083) ·
[Meilisearch — Enterprise Edition license](https://daily.dev/posts/introducing-the-meilisearch-enterprise-edition-license-w4boyi4ho) ·
[CVE-2026-45337 — better-auth device authorization](https://osv.dev/vulnerability/CVE-2026-45337) ·
npm (`better-auth@1.7.5`, `kafkajs@2.2.4`, `time.modified 2023-02-27`).
