# Answers to the five surfaces' questions

> **Ninety-nine questions** addressed to the backend in the "What I cannot get on my own" sections
> of the five `needs/` files. Each one gets an answer here and a pointer to the document that
> motivates it. **None is left unanswered.** The three points I could not settle alone have since
> been arbitrated (**D-015**, **D-016**, **D-019**): see the last section.
>
> This file is an **index**, not a source: the reasoning is in `context-map.md`, `data-model.md`,
> `events.md`, `realtime.md` and the two ADRs. It exists so that temps 3 can contest point by
> point, and so `backend-contracts` can find things quickly.

Pointer key: **CM** `context-map.md` · **DM** `data-model.md` · **EV** `events.md` ·
**RT** `realtime.md` · **AP** `adr-payments.md` · **AS** `adr-stream-entitlement.md`.

---

## storefront TV — 14 questions

| # | Answer | Pointer |
|---|---|---|
| **Q1** How the TV learns a pairing succeeded | **RFC 8628-conformant polling, not the realtime channel** — `adr-auth.md` §5.3's decision, which I fall in behind after having stated the opposite. Reason: bringing a device identity into the WebSocket namespace at `signin` time would widen its attack surface to gain a few hundred milliseconds. **Your requirement is met all the same**: `pollInterval` served at **2 s for the first 60 seconds**, then 5 s — a decay **served by the server**, hence tunable as you ask, and thirty requests at most per pairing. `slow_down` honoured. | `adr-auth.md` §5.3, CM §8 |
| **Q2** Shared television: what the pairing is bound to | For the **four purchase intents**, to the **profile that opened it**: a phone under another identity is **refused** with `PAIRING_IDENTITY_MISMATCH`, and the phone offers "switch account" — a person's act, never the system's. An implicit switch would charge the wrong payment method and deliver the seat to the wrong account. **`signin` is the exception and is not one**: there is no opening profile, the pairing is bound to the **device**, and another identity is the nominal case — that is what "add an account" means. | CM §8, `adr-auth.md` §4 |
| **Q3** Device identity before any session | **Yes**, obtained at first launch (`device_token`, `adr-auth.md` §4/Q3). It serves the four things you ask for: opening and polling a pairing, naming itself in "connected devices", being revoked, carrying a rate limit somewhere other than the IP address — which a household shares. It **is not a session** and opens no personal data; in particular it does not open the realtime channel (see Q1). | CM §7.1, DM §1.3 |
| **Q4** How long the code is valid | **Per intent, and served** — `adr-auth.md` §4/Q4's schedule. Your objection is accepted: 15 min for a payment is long, and the capacity displayed is no longer true. Never hard-coded on the surface; and the waiting screen shows no countdown. **A requirement I add on the `ticketing` side**: for `seat`, the capacity hold is placed **when the pairing opens** and expires with it — otherwise the capacity displayed is wrong for the whole wait. The invariant is written: **`SeatHold.expires_at` is the same instant as the pairing's expiry**, never a second duration that drifts. | CM §8, DM §3.2 |
| **Q5** Editorial header selection for the 21 disciplines | **Your preference is adopted**: the contract carries all 21 with family and rank (mandatory — the TV groups them into two blocks), **plus** an optional `featured_category_ids[]` field served as a rule, never hard-coded. | DM §2.4 |
| **Q6** Do the per-viewer fields make a row non-shareable | **Your third way out: compose at the BFF with a short cache.** The public body is cached (Redis, per surface, short TTL), the per-viewer overlay is merged at request time from three reads **batched by identifier**. One round trip for you, one cacheable unit for the server. That is precisely why the BFF exists. | CM §3, §10.1 |
| **Q7** Who composes the rows, and where | `catalog`, in its projected read models; the composition and ordering **rule** lives in `@arthome/core`. Your contribution to the count is confirmed: **for reads, the TV requires no additional synchronous call** — one composed model, plus three overlays shared by all your screens. | CM §2, §10.1 |
| **Q8** Preferences per profile or per device | **Two scopes, settled field by field.** Account: language, default subtitles, audio description, behaviour when opening a live show, display currency, reading time zone. Device: quality, **subtitle size**, **reduced motion**, automatic video preview. Your reasoning is taken as it stands. | DM §1.8 |
| **Q9** Playback token: shape, interval, release | (a) **Yes** — never a token in the path, so adoptable without restarting playback; (b) **45 s**, under your 60 s ceiling; (c) **yes** — a 90 s lease that expires for want of renewal, `releasePlayback` speeds it up but nothing depends on it. | AS §3.1, §3.3 |
| **Q10** Canonical URL for sharing a date | **Yes, it exists now**: `Date.canonical_url`, served, never built by the surface, and `slug` per language. It existed nowhere — a first-order gap that you spotted. | DM §2.7 |
| **Q11** Chat rate ceiling and reaction quota | **Ceiling enforced server-side, per surface: 2 msg/s for the TV** (6 mobile, 10 web), selection made upstream, a 20-message catch-up. Reaction quota **returned with the response** (remaining + recharge instant), one in flight at a time. | RT §2.2, §2.3 |
| **Q12** Behaviour in front of an unknown enumeration | **Declared in the contract: keep the raw value and treat it as neutral, never reject.** Strictness bears on the **shape**, never on the **member**. In Protobuf it is native; on the zod side, `backend-contracts` must write it — a bare `z.enum()` does not do it. | CM §13, EV §5.2 |
| **Q13** Barrel-free entry point in `@arthome/contracts` | **Yes — already settled by the chief (D-012)** on the basis of your measurement and `storefront-mobile`'s. It is a requirement of `definition-of-done.md`. | D-012 |
| **Q14** Domain constants served | **Yes, all of them.** Room opening (30 min), preview delay (4 s), scarcity threshold, cancellation deadline (1 h), credit period (a **code**), notification thresholds, priority window (2 h), provisioning threshold (10,000), revision deadline (72 h), chat ceiling, reaction quota. Served in `ViewerContext`. | CM §14.9 |

---

## storefront web — 30 questions

### Pagination, search, facets

| # | Answer | Pointer |
|---|---|---|
| **1** Search pagination unit | **The show**, for the `best`, `lives` and `replays` tabs. Each group carries the **representative date chosen** (the first that satisfies the filters, under the current sort) **and the total number of the group's dates that satisfy the filters** — without that second number, "see more dates (2)" is wrong as soon as a filter is active. The "soon" sort is the representative date's, not the show's; the "this weekend" filter applies **before** grouping. The `artists` tab paginates artists. | DM §2.5 |
| **2** Approximate total beside the cursor | **Yes.** The contract serves `approximateTotal` **and** `totalIsLowerBound`: exact up to a threshold, "at least N" beyond it. **The threshold is a served domain constant**, not a number carved into prose — an earlier version of this answer quoted `track_total_hits: 10000`, which is the name of a Lucene parameter and its default: that was an engine's shape leaking into the contract, and "at least 10,000" would have become a promise made in the name of a provider we would have replaced. | CM §14.6 |
| **3** Per-facet counts | **Yes**, OpenSearch aggregations computed on the current query, **in the same response** as the results. No second call. | CM §2 |
| **4** Enumerated or generic facets | **Generic**: `{ facetId, values[{ id, count }] }`, plus a set of **structured** filters (price range, date range) which are not enumerations. Adding "wheelchair accessible" is then not a contract change. Your argument is accepted. | DM §2.6 |
| **5** Per-resource invalidation key, and who names it | **The contract names them**, never a surface: `date:{id}`, `date:{id}:availability`, `artist:{id}`, `category:{id}`, `account:tickets`, `account:orders`, `home:rails`. If each surface invented its own, they would diverge. | RT §5.2 |
| **6** Is the storefront notified of what it did not cause | **Yes**, by the BFF — Kafka being forbidden outside inter-service use, it is the only possible path, and you had seen it. Two shapes: `GET /changes?since=` (a list of invalidations, not the data) and a stream of invalidations by tag that the Next server consumes to call `revalidateTag`. | RT §5.2 |
| **7** Freshness guaranteed per family | Table served: taxonomy 24 h (artefact) · `category`/`artist`/`plans`/`account` 5 min · `home`/`tickets`/`list`/`replays` 60 s · `live`/capacity/counter 15 s · playback token **never**. These are commitments, not wishes. | DM §4 |
| **8** Batched refresh of volatile counters | **Yes**: `counters:subscribe { dateIds: [...] }` on the single channel, an instant response then **differential** ticks. The batch is replaced when the window moves, without reopening the channel. Never one channel per card. | RT §2.1 |

### Money, orders, idempotence

| # | Answer | Pointer |
|---|---|---|
| **9** Replayed `Idempotency-Key` | **Returns the first attempt's response**, never a duplicate error. The store is per service: key + request fingerprint + memorised response + a **24 h** lifetime. That is the difference between "safe replay" and "refused replay", and you are right that only the first allows "try again". | CM §14, DM |
| **10** Price verified, distinct code | **Yes**: `PRICE_STALE`, distinct from a payment failure, with the current price as a parameter. With five promotion reasons, one of them pro rata, the gap is **structural**. | AP §8, DM §3.1 |
| **11** Service fee schedule | **Per seat**, and the **schedule is served** by the contract, never a screen constant. | DM §3.1, AP §11 |
| **12** Stacking subscription discount / promotion | **No stacking: the one most favourable to the viewer wins**, a rule in `@arthome/core`. Two distinct discounts on two bases: `seatDiscount` (10 / 20%) on **seats**, 15% in the **shops** — E1 shows they coincide in no source. | DM §3.1, AP §11 |
| **13** Basket: account or browser | **Account.** The mockup shows a persistent basket in the header, it is built up across several sessions, and all three storefronts show it. Conflict between devices: per line, last writer wins, **server rank** (a version number, never a client date). | DM §3.5 |
| **14** Binding quote, for how long | **Yes, 15 minutes.** The total presented is the one that will be charged. Shipping is computed **at the quote**, not when adding to the basket. | DM §3.5 |
| **15** Merchandise order from two sellers | **Two orders.** Business reason (two shipments, two commissions, two payouts) **and** an independent technical reason: a Stripe `destination charge` allows only one destination. The basket splits **at payment**. | AP §3, DM §3.4 |

### Shop and external commerce

| # | Answer | Pointer |
|---|---|---|
| **16** Orders placed on an external shop | **A read-only reflection** (`ExternalOrder`), a distinct aggregate with `external_ref`, `external_host`, `state: external`, `synced_at`. **What we guarantee**: freshness as of `synced_at`, nothing more. When the host does not answer, the reflection is served **with its age**, not as an error. No invoice, no tracking, no refund on our side, and the contract owns that rather than serving empty fields. | DM §3.4 |
| **17** Merchandise variants | **Yes**, `variants[]` — a t-shirt with no size cannot be sold. And `labelEn` is a **data gap** to fill at porting time, not a translation gap (E10). | DM §3.4 |

### Ticketing and access

| # | Answer | Pointer |
|---|---|---|
| **18** Who issues the seat code | **The server**, always. It appears identically on three surfaces: the mockup computes it by hashing, which would give **three different codes for the same seat** as soon as one surface changed function. | DM §3.3 |
| **19** Which inputs for "a seat opens the show" | All five, and the **verdict already returned**: `decideWatch` in `@arthome/core`, evaluated **at the BFF as indicative** (to paint without a second call) and **in `streaming` as authoritative** (to issue the token). The same refusal vocabulary on both sides. | CM §3 |
| **20** Is the free preview enforced by the token | **Yes, and counted down server-side, per account.** A non-holder's token carries `scope: preview` and `exp = min(now+120 s, now+secondsLeft)`. Reloading the page extends nothing. | AS §4 |
| **21** Who counts "two screens", and what the third one sees | `streaming`, by a **90 s lease** that expires for want of renewal. The third receives `CONCURRENT_LIMIT_REACHED` **with the list of active sessions** (device, city, instant) so one can be released. Never a network error. | AS §3.3 |
| **22** How the viewer gets their money back | Three distinct mechanisms: `cancelled` → **refund** to the original method (amount + a **period code**, never the sentence); `postponed` → **no movement**, the seat follows; `interrupted` → **credit note** (`Credit`), an **internal currency** that existed nowhere and that the contract creates. | AP §6, §9 |

### Account, notifications, personal data

| # | Answer | Pointer |
|---|---|---|
| **23** Match counter for a saved search | **"New since your last visit"**, incremented by the index's *percolator* when a new date matches, reset to zero on read. Ten searches then cost **zero** counting queries when the page opens; the two other options cost ten. | DM §2.5 |
| **24** Survival of a search through a vocabulary change | `criteria_version`: it **replays identically** if migration is possible, otherwise it **marks itself `stale` and says so**. It never vanishes in silence. | DM §2.5 |
| **25** Does "disconnect this device" stop playback, and how fast | **Yes — but up to 120 s, not 60. I gave you a wrong number.** `identity.device.revoked.v1` is consumed by `streaming`, which revokes the leases; the next **renewal** is refused (≤ 45 s), but the **token already in hand** stays valid until it expires, and the CDN edge knows nothing about it. Typical 45 to 75 s, worst case 120 s. **Arbitrated: the token stays at 120 s** — shortening it would double the renewal frequency on the hottest path, and the defect was the promise, not the window. **In practice you will see better than that**: a `playback:stop` signal is pushed on the channel and stops playback in ≤ 2 s — but it is a **courtesy, not a security boundary**, and the contractual guarantee remains 120 s. The device shows `SIGNED_OUT_ELSEWHERE`, never a network error. | AS §3.3, RT §2 |
| **26** Scope and delay of account deletion | **Asynchronous, persistent saga, 30 days of grace, then anonymisation — never deletion.** Invoices keep their frozen content (10 years), accounting lines an anonymised identifier, chat messages are dissociated from the person without being deleted while their retention runs. You were right: it can be neither synchronous nor total. | DM §7.5 |
| **27** Asynchronous exports and tracking | **Yes**: acknowledgement + request identifier, a queryable state, the document delivered by a **short-lived signed URL**. A tax export is not an HTTP response. | DM §6.2, §7.5 |
| **28** Chat rate limiting in the contract | **Yes**: `CHAT_RATE_LIMITED` with the **wait time as a parameter**, so you can disable the input cleanly instead of stacking refusals. | RT §2.2 |

### Cross-cutting

| # | Answer | Pointer |
|---|---|---|
| **29** Display currency ≠ billing currency | **Arbitrated: the preference is removed from the screens at milestone 1 (D-016).** Prices are shown in the **date's billing market currency**, formatted client-side according to the locale. Reason accepted: displaying a converted price we cannot charge is a lie, and D4 showed that no rule has ever been tested against two rates. **The removal is reversible** — §5.6 of the ADR lists the four lines to write to come back to it: rate source, exchange date, rounding, who bears the gap. It is the only place in the session where the contract asks the design to step back. | AP §5.6, **D-016** |
| **30** Latency of the label catalogue at server render | **None: the web resolves its codes from the build-time snapshot**, never through a network call on the render path. The dynamic catalogue serves mobile and TV only. An owned consequence, and you had anticipated it: a typo is only fixed on the web at the next deployment — which takes minutes. | CM §1.8 |

---

## storefront mobile — 11 questions + 2 follow-ups

| # | Answer | Pointer |
|---|---|---|
| **1** State served, derived, or both | **Both, exactly as you ask**: the bounds (`starts_at`, `runtime_min`, `room_opens_at`, `replay.expires_at`) **and** the state at serve time **and** `displayStateValidUntil`. And the arbitration that makes it legitimate: a rule lives once in `@arthome/core` and is evaluated in several places — what is forbidden is two **implementations**, never two **calls**. | CM §0 |
| **2** `servedAt` + validity on every response | **Yes, on every response.** `servedAt` is the reference clock for **every** countdown on your surface; `validUntil` as soon as a perishable value is present. It is also what `ws:pulse` carries every 5 s. | CM §14.2, RT §4 |
| **3** Long-lived cursor or delta read | **Both.** Cursor valid **24 h**, an explicit `CURSOR_TOO_OLD` code beyond that. And `GET /changes?since=<servedAt>` which returns **a list of invalidations, not the data** — one request instead of twelve when returning to the foreground. Your most expensive question is handled from both ends. | RT §5.2, CM §14.5 |
| **4** Is the playback entitlement a first-class shape, per date | **Yes.** `WatchVerdict { allowed, reasonCode, fallbackAction, previewSecondsLeft, validUntil }`, served per date, **re-checked when playback starts, never inherited from the catalogue** — you are right that the country changes between the two and that on mobile that gap is measured in hours. And the contract declares that the entitlement is **never cached to disk**. | CM §3, AS §5 |
| **5** `multi_screen` counting, and who releases a killed session | **Nobody: the lease expires.** 90 s, renewed every 45 s. `releasePlayback` speeds it up, nothing depends on it. And you can **resume your own session**, identified by the device. Your argument ("a session that only closes on a client event leaves a ghost screen") is the reason for this choice. | AS §3.3 |
| **6** Preview budget counted server-side | **Yes, per account** (not per device: otherwise a household with four devices gets four previews; not per date alone: it is `(account, date)`). The remainder is served in the verdict. | AS §4 |
| **7** Which commands queue offline, and the key's lifetime | **Your classification is confirmed.** Queued: follows, watchlist, preferences, saved searches, watched marks, playback position. Never: purchase, paid basket, chat message (**dropped**, not queued — a message replayed ten minutes later no longer means anything), consents, device disconnection, plan change, playback session. **Key lifetime: 24 h**, which covers a restart after a night. | DM, CM §14 |
| **8** Where the basket lives | **On the account.** The mockup shows a persistent basket, so a local basket would make it lie. | DM §3.5 |
| **9** Order with a third party: reflection and guarantee | A **read-only** reflection, served **with its age**. Offline, it shows with its freshness date. When the host does not answer: the age grows, nothing fails. | DM §3.4 |
| **10** Notification thresholds served, and the third channel | The five thresholds live in **`@arthome/core`** and are **served** — never copied, otherwise "the web will say 30 minutes, the TV 15, and mobile will be right by accident". **The third channel: I propose `in_app`, not `sms`** — an SMS channel has a per-message cost, a regulation of its own and one more provider, for a value nothing has tested. **A proposal, not an observation**: escalated to the chief. | DM §6.3 |
| **11** zod's `mini` barrel-free entry point | **Yes — D-012**, settled by the chief on your measurement and `storefront-tv`'s. | D-012 |
| **follow-up a** Server-computed offset in addition to the IANA identifier | **Yes**: `VenueClock { venue_timezone, venue_utc_offset_min }`, the offset being **recomputed at every serve for that instant**, never stored. This is not a return to D3: the computation happens **once**, server-side, and five applications do not bundle a time zone database. | `proto/arthome/common/v1` |
| **follow-up b** Taxonomy as an immutable versioned artefact, per language and per surface | **Yes**, the same regime as the i18n: `/taxonomy/{locale}/v{N}.json`, **per slice and per surface** (mobile loads neither the studio vocabulary nor the TV key table), a very long cache, embedded at build time as a fallback. | CM §1.8 |

---

## studio web — 29 questions

### Roles and rights

| # | Answer | Pointer |
|---|---|---|
| **1** Effective rights or raw material | **Both, and your position is adopted in full**: the raw material in the **eight**-role vocabulary, the effective rights computed **once in `@arthome/core`** and served by the studio BFF. The fold onto six is a **label**, never a right — it destroys `director`'s invitation right. | CM §1.1 |
| **2** Filtering by role: server projection or client masking | **Server projection — your position, word for word.** `canRevenue` decides the **content**, not the display. Yes, that implies different shapes for the same screen depending on the role, and that is **acceptable and intended**: a forbidden field is **absent**, never present and null. A corollary I add: **a sort key on an absent field is refused** (`SORT_KEY_FORBIDDEN`), never ignored. | CM §2 |
| **3** Where one-off access to a date lives | **`identity`**, a `DateAccessGrant` aggregate distinct from `ChannelMembership`: scoped to one date, expiry **served as an instant**, revocable without touching membership. C9 is settled: `identity` owns the channel as an **organisation**, `catalog` owns the artist as a **public page**. | CM §1.1, DM §1.6 |
| **4** Who owns the invitation, which event publishes it | **`identity`**, and `identity.channel.membership_changed.v1` on acceptance, followed by `identity.rights_version.bumped.v1` — that is what brings the channel into the picker **without a reload**. | EV §4.1 |

### State machine and publication

| # | Answer | Pointer |
|---|---|---|
| **5** One set of names, and does the rank travel | **Confirmed**: `catalogue.json`'s (D2). And **yes**, `order_rank` travels with the state — otherwise each surface reinvents `STATE_ORDER`. | DM §2.3 |
| **6** `publication` served separately from `date` | **Separate: two aggregates inside `catalog`, and two distinct read models.** The studio works on the publication, the storefront reads the date. The date **never** carries `publication` or `publishedBy` on a public model (E8). | DM §2.2, §2.3 |
| **7** Which checklist is authoritative | **The seven on the sheet**, not the four in the fixtures: the four are an arbitrary subset, the seven are the ones a screen exercised. "Chapters planned" and "moderator assigned" become **non-blocking warnings** — it must be possible to publish without chapters. Three of the seven are **projected facts** from `ticketing` and `streaming`. | DM §2.3 |
| **8** How strong the guarantee is on one-way transitions | **Server refusal AND an audit trace of the attempt.** You are right: "an attempt to go back on a committed price is itself information". The refusal carries `TRANSITION_IRREVERSIBLE` + the target transition + the **promise made**, as parameters. And the lock is on the **pair** `from > to`, not on the state (E5). | DM §2.3 |

### Money

| # | Answer | Pointer |
|---|---|---|
| **9** Who owes the VAT, on what base, who is liable | **Researched, not assumed.** Recommendation: the **"commissionnaire" model** — Arthome acts in its own name, so the base is the **whole ticket**, the rate is the **viewer's country's**, the liable party is **Arthome**. Six converging indications from the design impose it. **And the commission is taken on the net of tax**, not on the gross, otherwise 12% would vary with the buyer's country. **This is an architecture recommendation, not tax advice**: to be validated by counsel before any real money is taken. **Your finding is accepted, and it went further than I had seen**: the breakdown is the right shape, but the key is not the **market** — it is the **jurisdiction**. A billing market says which currency we sell in, not which rate applies; and the country is no more sufficient (≈ 9,000 jurisdictions in the United States). The order now carries a **buyer tax location with its evidence**, and the line keeps **the rate applied at the sale**. | AP §5.0 |
| **10** Multi-currency honoured or deferred | **One balance per currency, never a converted balance.** A channel that sells in two currencies has **two balances**. Converting would introduce a rate, an exchange date and an inexplicable reconciliation gap. Stripe keeps one balance per currency; we mirror it. | AP §5.5 |
| **11** Dual bank approval: aggregate state or a separate flow | **A full aggregate** (`BankAccountChangeRequest`), not a field: two actors, two distinct roles, a deadline, a trace, **and it suspends the transfer in progress**. A single write cannot carry that. | DM §6.2 |
| **12** The bounds of a "season" | **1 September → 31 August**, the live-performance convention. `seasonBounds()` in `@arthome/core`, served. You are right to refuse to hard-code it in the studio. | DM §6.2 |
| **13** Do tax and accounting exports belong to `payouts`; who owns reconciliation | **`payouts` for both.** Exports = **asynchronous jobs** (BullMQ **internal to `payouts`**) returning a short-lived signed URL. And a period **does not close with an unexplained gap**: `payouts.reconciliation.discrepancy_found.v1` routes an alert to `treasury`. | DM §6.2, AP §7.5 |

### Live and realtime

| # | Answer | Pointer |
|---|---|---|
| **14** Which channel, which guarantees | **Confirmed**: broadcast by the Socket.IO adapter over Redis, a **sequence number per stream** (`seq`), and both the chat and the journal are **durable Kafka streams**, not leftovers in a memory buffer. The WebSocket resume covers minutes; the HTTP read covers hours. | RT §3.1, §5 |
| **15** Does the control channel have a heartbeat | **Yes — and you are right to treat it as blocking.** `ws:pulse` every 5 s. No pulse for 15 s = **I am deaf**; a pulse with no sample for 30 s = **the venue has stopped sending**. Two states, two screens, no inference. And it serves two other needs: `serverTime` as a reference clock, `seq` as a resume point. | RT §4 |
| **16** Metrics per protocol, and cadence | **Every metric is nullable, and its absence means something.** Jitter and lost packets are **omitted** over RTMP, not set to zero. Cadence 1 to 2 s. And each sample carries **`measured_at` at ingest**: the studio shows "measured 3 s ago" instead of "0 Mb/s", which is a lie. | DM §5.3 |
| **17** End-to-end latency: server or client | **Client**, via `RTCPeerConnection.getStats()` on the WHEP path, **submitted** to the server with `source: client_submitted`. If it is not measured, it is **absent** — never a native figure presented as end-to-end. | DM §5.3 |
| **18** Is the monitor path served in the state | **Yes**, `monitor_path` (`whep` \| `ll_hls`) in the run state. You need to know it so as not to promise the operator a latency they do not have, and `streaming.md` refuses to create a media branch just to make a schema uniform. | DM §5.3 |
| **19** Does the standby-screen message travel with the state, in what shape | **Yes, as CONTENT with the language it was written in** (`LocalizedText`), not as an i18n key. The catalogue supplies **templates** per incident nature, which the run desk keeps or replaces. It is one of only two exceptions to "i18n by codes". | EV §4.4 |

### Moderation

| # | Answer | Pointer |
|---|---|---|
| **20** Composition of message / person sanctions, and which wins; where the banned person lives | **Three separated axes**, never stacked: `MessageState` (`published`/`removed`), `ModerationItemState` (`reported`/`claimed`/`settled`), `AudienceSanction` (`none`/`muted`/`banned`). The single badge is **derived** by `moderationBadgeOf`, precedence: banned > muted > removed > published. **The banned person belongs to `chat`**, because the sanction is **per channel**: the same person is banned on one artist's channel and welcome on another's. | CM §1.5 |
| **21** Is claiming a lease | **Yes**, `claim_expires_at`, renewed while the person is present, released by the server. Your argument is the right one: without an expiry, a moderator who closes their browser freezes a row for the whole live show. | DM §6.1, RT §3.2 |
| **22** Does the refusal of a duplicate verdict carry the winning decision | **Yes**: author **and** verdict, so the screen can say "X has already deleted this message" instead of a bare failure. A bare refusal would force a second round trip in the middle of a live show. | DM §6.1 |
| **23** Does adding a word live reclassify published messages | **Yes, and ASYNCHRONOUSLY** — the ambiguity you flag is settled. The command answers immediately with `reprocessing: true` and the **estimated** count; the new items arrive over the channel, marked `origin: retroactive_filter`, which lets the journal tell them apart from a human decision. A synchronous reclassification over thousands of messages would block the command mid-show. | DM §6.1 |
| **24** Does search cover viewers who have not written | **Yes.** `AudienceMember` is **a collection queryable in its own right**, not a projection of the chat, and it carries **presence** on the current live show. | DM §6.1 |

### Capacity and infrastructure

| # | Answer | Pointer |
|---|---|---|
| **25** The 10,000 threshold, provisioning, penalty, 72 h deadline | **All contract data**, served. You are right: as constants they would be copied onto five surfaces. | DM §3.1 |
| **26** Opening a tier and notifying the list: one command | **One, transactional**, with the **priority window (2 h) as a domain parameter**. Two calls would let the scarcity dissipate between them. | DM §3.1 |

### Cross-cutting

| # | Answer | Pointer |
|---|---|---|
| **27** Where identifiers are generated | **In the domain** (`@arthome/core`), UUIDv7, never by a database default. Three reasons, including **yours**: the `wizard` announces "draft saved" before any round trip, and a domain identifier makes that possible without a correlation key. The other two: the outbox requires it, and temporal ordering fills indexes well. | DM §7.1 |
| **28** Does the label catalogue also serve the studio | **Yes, the same versioned-artefact regime, served per surface.** The studio loads four themes (`studio`, `taxonomy`, `system`, `storefront`) and its enumeration-key count is high: the split by surface exists precisely for that. And **no service** serves it — it is a CDN artefact. | CM §1.8 |
| **29** Granularity of reading a date sheet | **One call to `catalog` for the sheet and its open panes, then one call per pane to its owner** (`tickets` → `ticketing`, `chat` → `chat`, `tech` → `streaming`, `crew` → `identity`), the projection being **dictated by the rights**. Reason: a `mod` must be able to load the `chat` pane **without** loading the whole sheet, otherwise the ticketing data travels for nothing — that is your own argument. | CM §2, §10.1 |

---

## studio mobile — 13 questions

| # | Answer | Pointer |
|---|---|---|
| **1** Token-bearing session on the native shell | **Yes, alongside the cookie session.** A device-bound refresh token in the native store (never `localStorage`), a short access token, **revocation per device**, and on return from the background with an expired token: **silent refresh** — re-authenticating mid-shift is a fault. The detail belongs to `adr-auth.md`; the topology is settled here. | CM §7 |
| **2** Return from an external browser | **A universal-link return address, strict allow-list** (never a pattern); an **opaque, single-use, short-lived state** that carries nothing meaningful. **The resume resource is the bootstrap** (`GET /studio/bootstrap`), plus the **server-side pending aggregates** (`BankAccountChangeRequest`, connected-account state). Your finding is taken as it stands: *a payment confirmed by a URL parameter is a payment confirmed by the client*. | CM §7, AP §8 |
| **3** Effective rights in one request, and how to learn they changed | **Yes, a single bootstrap**: account, **all** channels with their effective roles, `grants` **projected onto the person's roles**, preferences, rights version, counters. The change arrives via **`rights_version`**, carried on every HTTP response **and pushed** on the channel — and the server makes you leave the rooms of a lost channel without waiting for a reconnection. | CM §1.1, RT §3 |
| **4** Offline regime for commands | **Your split is validated**: queued are verdicts on a named message and sanctions on a named person, **and nothing else**; everything else is refused locally, with a **distinct** error nature (`offline_forbidden`). And **yes**, those commands are **conditional** (aggregate version, refused if a colleague has settled), never blindly idempotent. | CM §14.4, DM §6.1 |
| **5** Resume cursor, and a per-person channel across channels | **Yes to both.** Three possible answers, including an explicit **`resume:too_old`** — without it, "the moderator comes back to a queue missing ten messages, and nothing tells them". And the channel is **per person**, carrying the events of every accessible channel, each tagged with its `channelId`: a run-desk operator may have two feeds under their watch the same evening. | RT §3, §5 |
| **6** The queue's three mechanisms, and who owns the banned person | **All three are confirmed**: the claim lease, the refusal of the second verdict with the winner's name, by-name propagation. **`chat` owns all three**, including the banned person — the sanction is per channel, and lodging a write in `identity` would force every verdict into a cross-service write to the most sensitive service in the system. | CM §1.5 |
| **7** Paginating a living collection | **Your proposal is the one the chief has already settled (D-010)**: a cursor for the **moderation queue** and the **live chat** — those are streams — page + total everywhere else, and the **journal stays on page + total with a mandatory period filter**. Your diagnosis ("offset pagination there mechanically duplicates and skips rows") is exactly the reason adopted. | D-010 |
| **8** WHEP on the native shell | **No at milestone 5: the WHEP monitor return path is reserved for the studio web; the studio mobile receives LL-HLS**, with the real latency **announced** (`monitor_path`) rather than promised. Reason: `capacitor://localhost` as a secure context inside WKWebView **is not verified**, and you are right to refuse to promise it without a real device. **Arbitrated by D-019**: verification on a real device remains to be done before any promise, and it also conditions `getUserMedia` and Web Crypto. This is not a refusal, it is "not before we have measured". | DM §5.3, AS, **D-019** |
| **9** Binaries: poster and exports | **Yes to both shapes you ask for.** Upload by a **signed upload URL** obtained through a JSON command, never multipart from the WebView. Export = an **asynchronous job** returning a signed URL **usable without a session cookie**. Proposed lifetimes: **upload 15 min**, **export 60 min** — long enough for a venue's 4G, short enough not to be an access token in disguise. | DM §6.2, §7.5 |
| **10** Notifications: routing, registration, redaction | **Routing by role and by channel decided server-side** — the application does not filter a common feed. Device registration per account. A payload carrying channel + date + target page. **And yes, redaction applies: a notification never carries an amount if the recipient's role does not have `canRevenue`.** Your argument is decisive: a notification appears on a locked screen. | DM §6.3 |
| **11** Reading time zone and interface preferences | **`identity`**, in `AccountPreferences` — and the reading time zone is **the same field** as the storefront's: same account, one owner. The run-desk layout and the encoding profiles are also **per account**, not in `localStorage` (which is bound to the origin, clearable by the system, and travels in no way). The resource is **additive and tolerant**: a key unknown to one version is neither rejected nor erased on the next write — otherwise the mobile version under store review overwrites settings made from the studio web. | DM §1.8 |
| **12** Vocabulary of incident causes | **Yes, a closed vocabulary of CAUSES, separate from the OUTCOMES.** Six causes, including your three (`venue_feed_lost`, `run_desk_disconnected`, `bitrate_collapsed`) plus `compatibility_worker_failed`, which `streaming.md` names. And **yes**, the automatic standby screen (the channel's "15 s" rule) produces an incident **of the same nature** as a manual trigger, told apart by `IncidentTrigger.AUTO`. That is the right answer to the "the run-desk operator is unreachable" case. | DM §5.6 |
| **13** The six absent shapes: which enter the contract | **All six enter, but not at the same milestone.** What is a **rule** enters `@arthome/core` at **milestone 1**: the provisioning threshold (10,000), the monotonicity of capacity tiers, the priority window (2 h), the revision deadline (72 h). What is a **shape** enters the `ticketing` contract at **milestone 3**, marked provisional: complimentary tickets by category, an item's source and external orders, live pinning. | DM §3.1, §3.4 |

---

## The three unsatisfied points — arbitrated since

All three were settled on 21 September 2026. No surface question remains unanswered.

| Point | Outcome |
|---|---|
| **Display currency** (`storefront-web` Q29) | **D-016: the preference is removed from the screens at milestone 1**, and the removal is **reversible**. The design steps back; it is the only place in the session where that happens. The four lines to write to come back to it are in §5.6 of the ADR. |
| **WHEP on the native shell** (`studio-mobile` Q8) | **D-019: not promised.** The studio mobile receives LL-HLS with its **real latency announced**, never a sub-second promised and not kept. Measuring on a real device remains to be done — that is a verification, not an opinion. |
| **Tax model** (`studio-web` Q9, D5) | **D-015: the commissionnaire model is adopted**, commission on the net of tax. **The reservation remains and is at the top of the ADR**: it is not tax advice, and it must be validated by counsel before any real money is taken. The **shape** is carved and does not depend on that validation — but it has been **hardened**: breakdown by **jurisdiction** (not by market), a **buyer tax location with its evidence** carried by the order, and the **rate applied at the sale** kept on the line. Without those dated facts, reconstructing them would not be expensive: it would be **impossible**. |

And the four proposals are **accepted as they stand (D-017)**: the credit note's scope bounded to
the issuing channel, `in_app` as the third channel, single-seller merchandise orders, and no
stacking of discount and promotion.
