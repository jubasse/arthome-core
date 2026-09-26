# Context map

> Written for `backend-contracts`, which will derive from it the two OpenAPI documents, the
> contract for synchronous BFF → service calls, `definition-of-done.md` and `critical-rules.md`.
> Drafted at temps 2, after reading the five `needs/` files, `DECISIONS.md`, the 79 divergences in
> `corrections-handoff.md`, the corrected handover file and `streaming.md`.
>
> Every closed vocabulary quoted here is the one that has authority in the contract; the mockups'
> parallel tables (E2) are never adopted.

---

## 0. The rule that governs all the others

Five surfaces out of six asked, in different forms, the same question: *"is a date's state served
or derived?"* — `storefront-tv` ("a response that delivers SCHEDULED is stale in flight"),
`storefront-mobile` (Q1), `storefront-web` (shape 1, need 1), `studio-mobile` (§The clock). They set
two of the file's principles against each other, and they look incompatible: *no value computed
twice*, and *a response must still be right eight hours after being cached*.

They are not incompatible. The arbitration, which holds for all the rest of this document:

> **A rule lives once, in `@arthome/core`. It is evaluated in several places.
> What is forbidden is two *implementations*, never two *calls*.**

Immediate consequences, and they run through every contract:

1. The contract carries **the rule's inputs** (the instants, the bounds, the policies) **and** its
   result at serve time, **and** the instant at which that result stops being true.
2. The client invents nothing: it calls the same `@arthome/core` function again when `validUntil`
   has passed. It does not rewrite the rule, it re-executes it.
3. Every response carries `servedAt` (the server instant) and, when it contains a perishable value,
   `validUntil`. That is also what settles the phone's clock: every countdown displayed is computed
   against `servedAt`, never against the local clock.

The functions concerned, named here once and for all, and which exist in one place only:
`displayStateOf`, `isRoomOpen`, `replayHoursLeft`, `progressOf`, `decideWatch`, `effectiveRightsOf`,
`overlapsWith`, `payoutOf`, `roundMinor`, `normalizeSearchCriteria`, `nextPublicationTransitions`,
`moderationBadgeOf`.

---

## 1. The seven contexts, and why there are not eight

The three orphan families from `corrections-handoff.md` (C7 subscriptions, C8 shop, C9 directory
and channels) are **attached**, not isolated. The reason is written in the file: *"one more service
costs operations, for one person"*. But an attachment is only valid if it follows a boundary of
**language**, not a boundary of convenience. Each is justified below, and each is refutable by an
argument I also write down.

| Context | Language | Does not own |
|---|---|---|
| `identity` | who this person is, on which device, and **by what right they act** | the content, the money, the speech |
| `catalog` | what is **published** and how it is found | the sale, the run, the speech |
| `ticketing` | what the viewer **buys** and what that purchase **opens** | the broadcast right, the payout |
| `streaming` | the **run of the live show** and the **right to watch now** | the sale, the publication |
| `chat` | **speech** in a channel and its policing | the account's global identity |
| `payouts` | what the platform **owes** a channel | taking the money |
| `notifications` | **reaching** a person outside the application | what there is to say |

### 1.1 `identity` — the person, the device, and the right to act

**Owns.** The account (`Account`), its device profiles (`Profile`, up to five per television), the
sign-in credentials, 2FA, passkeys, sessions, devices (`Device` — a device *is* a session, see
§7.1), device pairings (`DevicePairing`), account and device preferences, timestamped and versioned
consents, artist follows and the watchlist, the directory of people (`Person`), the **channel as a
workspace** (`Channel`: owner, members, sets of roles, `grants`, invitations, one-off access to a
date), and the **table of effective rights**.

And — **attachment returned at temps 4** — the **studio journal**: the 24-month by-name audit of
every act, across all channels and all contexts. See §1.9.

**Does not own.** The artist's public face (that is `catalog.Artist`). The channel's Stripe account
(that is `payouts`). The banning of a viewer in a channel (that is `chat`).

**Why the boundary is there.** `corrections-handoff.md` C9 says `people` and `channels` straddle
`identity` and `catalog`. They do, because a channel has two faces, and we had conflated them. I
separate them:

- the channel **as an organisation** — who belongs to it, with which roles, who can invite whom,
  who has a stream key: that is **authorisation**. An authorisation is verified against the token
  the BFF issues, and a token can only carry what `identity` knows. So `identity`.
- the channel **as a public page** — name, biography, avatar, discipline, subscribers, shows,
  dates: that is **catalogue**. So `catalog.Artist`, in a 1:1 relation with `identity.Channel` by
  `channel_id`.

The proof that the cut is right: no studio command crosses both. `inviteMember`,
`changeMemberRoles`, `grantDateAccess`, `transferOwnership` are pure `identity` writes.
`updateChannelIdentity` (public name, slug, artwork, verification) is a pure `catalog` write — and
that is exactly what the studio's Settings screen shows: two blocks that never mix.

**`grants` and the fold onto six personas (E6).** The contract carries the **eight** canonical roles
(`artist`, `production`, `coordination`, `director`, `video`, `sound`, `moderation`, `treasury`).
The fold onto six (`artist`, `prod`, `regie`, `mod`, `coord`, `tres`) is **a presentation label**
and appears in no response: it destroys `director`'s invitation right, and `studio-web` and
`studio-mobile` verified it independently. `identity` serves, for the (person, channel) pair, a
**set** of roles — one person holds several — and the projection of `grants` onto those roles
(`assignableRoles[]`), materialised, never the table to be recomposed.

**Two scales of access, never conflated** (`studio-web`, §Multiplicity):

| | `ChannelMembership` | `DateAccessGrant` |
|---|---|---|
| scope | the channel | **one date** |
| duration | permanent | **expires at a served instant** |
| revocation | removes from the channel | removes from the date only |
| owner | `owner: true`, `removable: false` | never the owner |

Conflating them would turn revoking a stand-in into exclusion from the channel. They are two
aggregates.

#### Isolation between channels is an **invariant**, not a convenience

Run-desk operators and moderators **are not our employees**: they are artists' collaborators or
freelancers working across several channels — `people` already models them that way, with
`channels[]` and `runsCalled`, and one date in twelve is run by a freelance stand-in.

That changes the nature of the need. While we believed we were talking about employees, the absence
of sign-out and device revocation on the studio side (`studio-mobile` C6) was an **ergonomics
defect**. With third parties moving from one artist to another, it is a **data-protection defect**:
a freelancer would see the moderation queue, the nicknames and the viewer history of channels that
are not theirs.

> **Every studio read is carried by a channel, and the right is verified on that channel — never
> on membership of some channel.** No moderation, audience, journal or ticketing read crosses a
> channel boundary, not even for an owner.

Three consequences, which are invariants and not display filters:

- **`chat`'s collections are indexed by channel** — `AudienceMember`, `ModerationItem`,
  `BannedWord`, the sanctions — and a query without a `channel_id` does not exist;
- **the only two per-person reads** are `person_duties` (my duties) and the inbox. Both carry only
  what concerns **the channels where the person has a live access**, and a one-off access that
  expired at curtain-down removes them **without waiting for a reconnection**;
- **a revoked access is visible within the second**: `identity.rights_version.bumped.v1` makes you
  leave the lost channel's rooms (`realtime.md` §3), and the service token issued by the BFF lives
  only 60 s — that is the authorisation's freshness bound, and it is written down.

**Possible refutation.** One can argue that `Channel` deserves its own `organisation` context. I
rule it out because the only thing a channel does without `identity` is carry a name, and a name is
not an invariant.

### 1.2 `catalog` — what is published

**Owns.** The taxonomy (2 universes, 21 disciplines, 176 sub-genres, 205 tags, 7 attribute groups,
the **editorial rank**), the public artist, the venue, the show, the **date** as a public object,
the **publication** as the channel's act, the date's **outcome** (`outcome`), the **territorial
rights**, the **replay policy** (the promise, not the file and not the price), media as declared
renditions, the **OpenSearch index and its facets**, the **saved searches**, and the **composed
read models** the two BFFs read (home rows, tonight's grid, discipline page, date sheet, events
table, channel agenda).

**Does not own.** Capacity, prices, promotions, revenue (`ticketing`). The viewer counter, feed
health, chapters, incidents (`streaming`). The chat policy (`chat`). The channel's members
(`identity`).

**Why the index belongs to it** (chief's list, point 9). The facets derive from the taxonomy, and
the taxonomy belongs to `catalog`. A `search` service would own no invariant, no write and no
vocabulary: only a projection. But a context is a boundary of language, not a kind of
infrastructure. Two foreign facts enter the indexed document — availability and the headline price,
which come from `ticketing` — and they enter **through a Kafka event consumed by the indexer**,
never through a CDC reading another service's database. So the "one database per service" rule is
not circumvented by the back door.

**A consequence, and it is binding**: Kafka Connect's OpenSearch *sink* connector, which the README
cites as **the only argument** ruling out Meilisearch, **is not usable here**. It writes one
document per message; our document is a composition of three sources — three in the target document,
and even the one built today is a *projection* of its single message and not that message, with
renamed fields, a protobuf enum read as `@arthome/core`'s vocabulary, and an `indexed_at` no message
carries. Debezium keeps its place, but for **publishing the outbox**, not for feeding the index.

That conclusion is about the *sink* connector and holds wherever the indexer runs. What follows is
the implementation, and this paragraph used to state it wrong in three ways, each expensive to copy.

- **A separate deployable, `apps/search-indexer`, and not a consumer internal to `catalog`** — an
  eighth deployable beside the seven `SERVICES`, and deliberately **not** a member of that constant.
  `SERVICES` answers "which service does a BFF operation call": it is what makes fan-out countable,
  so a name in it that nothing calls makes every upstream count wrong — exactly the mistake the
  constant was created to catch, where `realtime` was declared as a service and anyone counting got
  eight out of seven. Nobody calls the indexer; it consumes a topic and writes an index. None of
  this moves the index out of `catalog`'s context: the paragraph above already settles that a
  context is a boundary of language and not a kind of infrastructure, and a deployable is the
  second kind of thing.
- **A pure projection — one event in, one document out, nothing else consulted — and that purity is
  what licenses the ordering.** The indexer writes OpenSearch **first** and commits its
  `processed_message` row **second**, because the two cannot commit together and the crash window
  between them must duplicate rather than drop: a repeat is absorbed by an idempotent write, a gap
  is absorbed by nothing. Re-applying is free only while the document depends on the event and on
  nothing that has happened since. **The design this paragraph used to describe — an indexer
  that reloads from its own write model — is precisely the design that breaks it**: reload a row
  and the second write is no longer the same write, the ordering stops being correct, and what it
  degrades into is a show absent from search for ever, with nothing logged and no alert to run a
  reindex nobody knows is owed.
- **`version_type: external_gte`, not `external`, and the difference is forced by what the version
  is.** The version is the event's `occurred_at` in epoch milliseconds. `external` demands
  strictly greater, so two events about one show inside the same millisecond — a bulk publication, a
  fixture load — would see the second **refused and its content lost**. `external_gte` accepts an
  equal version: a redelivery rewrites the same bytes, a same-millisecond pair applies in arrival
  order, and anything genuinely older is still refused. That refusal is the out-of-order guard a
  retry topic makes necessary — a message five minutes late loses to the newer one already indexed,
  and the 409 is read as success rather than retried into the dead-letter queue. So a late replay
  still can never overwrite a newer version; the index itself is what refuses, and no ordering
  assumption is made about what Kafka hands us.

#### The engine comparison reopens, and OpenSearch wins for another reason

I cannot demolish the only argument that ruled out Meilisearch without reopening the comparison. So
I reopen it, and **the decision does not change — its justification does.**

> **What holds OpenSearch is not Kafka Connect. It is the *percolator*.**

A saved search must fire when a **new** date matches **old** criteria: that is an **inverted
query**, and that is exactly what a percolator is — you index the queries and query with a
document. The whole answer to `storefront-web` Q23 depends on it (`saved_search_percolator`,
`catalog.saved_search.matched.v1`, and the fact that ten saved searches cost **zero** counting
queries when the Account page opens).

| | OpenSearch | Meilisearch |
|---|---|---|
| inverted query | **`percolator` field type + `percolate` query**, inherited from Elasticsearch 7.10 and kept at the fork | **no equivalent** — `facetDistribution` counts documents, and aggregation in the broad sense remains an open request |
| licence | **Apache 2.0** | dual-licensed since: Community under MIT, Enterprise under the **Business Source License** |

Without a percolator, we would have to re-run N saved searches on every date publication, or ten
counts every time an Account page opens. That is the difference between a feature and a debt.

**The reasoning is retrospective in form and right in substance**, and I say so: the original file
picked the right engine for a reason that turned out to be false, and I demolished that reason
without reopening the comparison — which was a gap. The reason that really settles it was already
in this document, one section further down, with nobody making the connection.

**One reservation recorded, because it is not settled**: `search.allow_expensive_queries` is a
switch an operator turns off on a day of overload, and **the saved-search alerts would then stop in
silence**. So we need a probe on that setting, not only on index lag. I have no order of magnitude
for the expected number of saved searches; the risk is real, its size is not.

**Why saved searches belong to it.** The criteria vocabulary is the facets' vocabulary;
re-execution is an index query; the match counter is an index count; and firing an alert when a
**new** date matches is an inverted query — exactly what an OpenSearch *percolator* does. Putting
them elsewhere would mean copying the filter grammar. `notifications` receives only the
consequence.

**Possible refutation.** A saved search is very personal data and could live in `identity`. I rule
it out: it would then be unexecutable without a synchronous call to `catalog` on every count, and
the criteria grammar would be declared in two places.

### 1.3 `ticketing` — what the viewer buys, and what that purchase opens

This context absorbs **C7 (subscriptions)** and **C8 (shop)**. Its language is not "tickets": it is
**the viewer's commerce and the rights it opens**.

**Owns.** Capacity and its tiers, the waiting list and its priority window, the prices
(`full | reduced | support`), promotions and their windows, service fees, the **seat order**
(`SeatOrder`) and the **merchandise order** (`MerchOrder`) — two distinct orders (D-011) — the
basket, the binding quote, the seat held and its **server-issued seat code**, complimentary tickets,
the **subscription** (`Subscription`) and the catalogue of plans with their `opens[]` and their
`seatDiscount`, the **shop** (items, variants, stock, live pinning), the **read-only reflection** of
orders placed with a third party (E14), taking money through Stripe and its webhooks, the
**commercial outcomes** (refund, credit note), the **account credit** (`Credit`), invoices, and the
**projected purchase entitlement** the storefront reads (`viewer_entitlements`).

**Does not own.** Computing the payout entitlement and the artist's VAT (`payouts` — see §1.6).
Issuing the playback token (`streaming`). The date's state (`catalog`).

**Why subscriptions are here and not in `identity`.** A subscription is **a recurring purchase**: it
has a payment method, a renewal date, an invoice, a pro rata, a cancellation, a chargeback. Those
are `ticketing`'s invariants, not `identity`'s. And above all: `plan.opens[]` and `seatDiscount`
condition **the price displayed** and **the right to watch**, that is, the two things `ticketing`
already serves. Separating them would produce two Stripe integrations, two idempotency stores, two
refund policies, and one more synchronous call on playback's critical path.

**Why the shop is here and not elsewhere.** The same argument: the same Stripe customer, the same
order envelope, the same payout flow, the same refund policy. Merchandise has its own invariants
(stock, variant, shipping): it is a **distinct aggregate in the same context**, with its own tables,
never one more field on a seat order.

**A consequence I state explicitly** (`storefront-web` Q15): **a merchandise order is
single-seller.** A basket containing two channels' items **splits into two orders at payment**, each
with its own shipping, commission and payout. A technical reason on top of the business one: the
Stripe model adopted (`destination charges`, see `adr-payments.md`) allows **only one destination
per payment**.

**Possible refutation.** `ticketing` becomes the system's largest context and its hottest in writes.
That is true, and it is the price we own. The signal that would trigger the split is written in §8:
if `merch` and `subscription` together exceed 30% of the service's writes, or if `ticketing`'s
BullMQ queue durably mixes shipping jobs with ticketing ones, we extract `shop` — the boundary is
already clean, the aggregates do not touch.

### 1.4 `streaming` — the run, and the right to watch now

**Owns.** The run (`Run`: on-air state, crew on duty, cameras, broadcast profile, quality ladder),
the **stream keys** and their rotation, ingest authorisation, the **health measurements** (bitrate,
latency, dropped frames, jitter — with their measurement instant and their absence when the
protocol does not supply them), the **viewer counter**, the **chapters**, the **incidents** (cause +
outcome + run-desk message) and the standby screen, the **recording** and the **replay** as an asset
(existence, duration, expiry instant), the **playback token**, the **playback session** and the
concurrent-screen limit, the **free-preview budget**, and the **resume point** (`ResumePoint`).

**Does not own.** The replay *policy* (`catalog`: the promise) nor its *going on sale* (`ticketing`:
the price). `streaming` owns its **file** and its **expiry instant**, which is derived from the end
of the live show and from `windowHours` served by `catalog`.

**Why the resume point is here.** It is the system's most frequent write (`storefront-mobile`: "the
most frequent of all"). Putting it in `identity` would make the coldest and most sensitive service
in the system its hottest write path. It is of the same family as the playback session: same
producer (the player), same tolerance of loss, same lifecycle.

**Why the right to watch is here, and not in `ticketing`.** Because it is `streaming` that issues
the token, and an entitlement that produces no token has no effect. See §3, which handles
`isWatchable` in full.

### 1.5 `chat` — speech and its policing

**Owns.** The message and its **anchor on media time** (`at_media_sec`, in addition to the absolute
instant), the message's state, the **moderation queue** and its claim leases, the verdicts and their
precedence, the **sanction on a member of the audience, within a channel**, the **dictionary of
filtered words** and its retroactive effect, the date's chat policy (`chatMode`), slow mode, the
reservation to seat holders, the **channel's audience** as a queryable collection (`AudienceMember`
— including those who have never written), and the **moderation journal**.

**Does not own.** The global suspension of an account (`identity`) — which is a different thing.

**The answer to D6 / E3, and it is structuring** (chief's list, point 8). Four vocabularies exist in
`shared/` for one notion. The underlying fault is not that they diverge: it is that **`reported` is
a triage state lodged in the sanctions field**. So the contract separates **three axes**, never
stacked:

| Axis | Bears on | Contract vocabulary | Owner |
|---|---|---|---|
| `MessageState` | the message | `published` · `removed` | `chat` |
| `ModerationItemState` | the **queue item** | `reported` · `claimed` · `settled` | `chat` |
| `AudienceSanction` | the **person, within a channel** | `none` · `muted` (with a nullable `expires_at`) · `banned` | `chat` |

`ok` is renamed `published` (it is the i18n vocabulary, and the only one that says what it does).
`muted` and `banned` **disappear from the message**: they never had meaning there, they bear on the
person. A banned person's message is `removed`; the sanction is on the person.

**The single badge** the surfaces display is **a derived value**, `moderationBadgeOf`, which lives in
`@arthome/core` and composes the three axes in this order of precedence:
`AudienceSanction.banned` > `AudienceSanction.muted` > `MessageState.removed` > `published`.
Served, never recomposed.

**Why the banned person belongs to `chat` and not to `identity`** (`studio-mobile` Q6). Because the
sanction is **per channel**: the same person is banned on one artist's channel and welcome on
another's. A per-channel sanction in `identity` would force every moderation verdict — the most
frequent act of a saturated live show — into a cross-service write to the most sensitive service in
the system. A ban bears on the speech, not on the account.

### 1.6 `payouts` — what the platform owes

**Owns.** The **payout entitlement** per date and per channel (gross, commission, **VAT breakdown by
jurisdiction**, net), the payout's state (`scheduled | held | paid | refunded | suspended`), the due
date (14 days), the **withholding** while an outcome is open, the channel's Stripe connected account
and its onboarding flow, the **dual-signature bank details change request**, **reconciliation**
against Stripe's ledger, period closing, and the **accounting exports** (sales journal, tax export,
Sage, Cegid, grouped invoices).

**Does not own.** Taking the money — that is `ticketing`. **Stripe remains the source of truth for
the movement of money**: `payouts` never rebuilds its ledger, it **reconciles** its own with it and
reports the gaps. A period does not close with an unexplained gap.

**Why it is a context separate from `ticketing`, when I attached two orphans.** Because they are two
different languages with two different interlocutors: `ticketing` speaks to the viewer (capacity,
basket, refund); `payouts` speaks to the artist and to the accountant (base, rate, withholding,
accounting entry, tax export). And above all: `payouts` has **no write on a purchase's path**. It
consumes, it computes, it pays out. That is the definition of a downstream context.

### 1.7 `notifications` — reaching a person outside the application

**Owns.** Device registration for push (FCM/APNs token, platform, version, language), preferences
per trigger and per channel, **quiet hours** and their exception conditioned on holding a seat,
**routing by role and by channel** for the studio, the **studio inbox** (`inbox`), dated reminders
(`setReminder`), sending, and the send journal.

**Does not own.** The **thresholds** that trigger an alert: they are domain and live in
`@arthome/core` ("30 minutes before", "85% of the seats", "6 hours before expiry", "queue beyond ten
messages", "post unassigned at D-1"). `notifications` reads them, it does not invent them. A direct
answer to `storefront-mobile` Q10.

**A drafting rule** (`studio-mobile` §Notifications): **a notification never carries an amount if
the recipient's role does not have `canRevenue`.** A notification appears on a locked screen.

### 1.8 What is **not** a context: the label catalogue (C6)

**Decision: no service.** `@arthome/core` holds the keys and the reference catalogue; a CI job
publishes **immutable versioned artefacts** `/{surface}/{locale}/v{N}.json` to MinIO and then to the
CDN; each application embeds a **build-time snapshot** as a mandatory fallback. The current version
is served in the bootstrap payload (`ViewerContext.labelCatalog`), never in a per-page call.

**Why not a service.** It would have no invariant, no transaction and no event — only a static file
read, already done better by a CDN. The one real need (fixing a typo without waiting for a store
review) is met by publishing a new artefact version. The day a copywriter has to edit the copy from
the studio, that becomes a studio screen pushing into the same pipeline, not one more service.

**Consequence for `storefront-web` (Q30).** Server rendering resolves its i18n codes **from the
build-time snapshot**, never through a network call on the render path. The dynamic catalogue serves
mobile and TV only. So a typo fixed is only visible on the web at the next deployment — that is
owned, and it is the right trade-off: the web deploys in minutes.

**And the taxonomy?** The same regime (`storefront-mobile`, shape 4): an immutable versioned
artefact, `/taxonomy/{locale}/v{N}.json`, **served per slice and per surface** (mobile loads neither
the studio vocabulary nor the TV key table), a very long cache, embedded at build time as a
fallback. 59.5 KB raw / 8.4 KB gzip: not an API call.

### 1.9 The studio journal belongs to `identity` — a missing attachment, returned at temps 4

**The defect.** I sorted seven contexts and attached three orphan families; **this one escaped me.**
The journal — 24 months of retention, a purge, an export, a written retention policy — was declared
nowhere as an aggregate, absent from the read-model table, and composed by the studio BFF from
**five services** in `page + total`. That is, in one line, everything this document forbids:

- a **join at query time**, on the one screen that head-on contradicts `data-model.md` §4 (*"no
  screen is served by a join at query time"*);
- an **impossible total**: you would have to count by period and by kind across five services, apply
  the projection by role, sort the union, then extract page 3 from it. None of the five knows the
  other four's total;
- and **a BFF that would keep a table** to get out of it — the line it has no right to cross.

**The decision: `identity` owns the journal**, as a read model fed **only by Kafka consumption**.

**Why `identity`, and why this is not an eighth service.** A journal answers one question, and one
only: *who did what, when, from which surface, on which channel*. The subject of the sentence is an
**actor**, and the actor is `identity`'s language. And the attachment costs the producers
**nothing**: every message already carries `actor-id` in a header (§EV 1.3) and an `Actor` in its
payload. So `identity` has no field to ask anyone for — it consumes what already circulates.

Three consequences that settle the three defects at once: **one table, hence an exact total** and
the `page + total` pagination D-010 prescribes for the studio; **no join** at query time; **no table
in the BFF**.

**What this puts into `identity`, and what I own.** An entry of kind `money` carries an amount. That
is `ticketing` data projected into `identity` — but the precedent exists and is already written:
`channel_dues` already projects facts from `ticketing` and from `payouts` in order to refuse the
deletion of a channel. **Redaction by role** applies as everywhere else: without `canRevenue`, the
`money` kind is **absent from the response**, never present and null.

**Possible refutation, and it is a serious one.** I ruled resume points out of `identity` on the
grounds that they would make the coldest service the hottest write path. A journal is a continuous
write too — but of **a few dozen acts per day per channel**, not several per second per viewer.
Three orders of magnitude separate the two cases, and that is what makes the attachment acceptable
here and unacceptable there.

---

## 2. The four owners of a "date" (chief's list, point 1)

A date is the most shared thing in the system. In the mockup it carries eight families of fields
belonging to four contexts. Here is where the boundary runs, and why.

| Family | Owner | Reason for the boundary |
|---|---|---|
| identity, UTC instant, the venue's IANA zone, duration, taxonomy, media, slug, canonical URL | `catalog` | it is what is **published** |
| `rights` (scope + territories + reason **code**) | `catalog` | a broadcast right is a clause of a performance contract, negotiated with the date |
| `replay.policy` + `windowHours` | `catalog` | it is the **promise** made before the purchase (the file's principle no. 5) |
| `outcome` (`cancelled · postponed · interrupted`) | `catalog` | it is a fact about the performance, decided by the channel, shown on every card |
| `publication.state` | `catalog` | it is the channel's act |
| `seats`, `prices`, promotions, fees, complimentary tickets, `replay` **on sale** | `ticketing` | it is what **is bought** |
| `revenue`, `sold` | `ticketing` (gross) → `payouts` (entitlement) | run-desk data, **never** on the public model (E8) |
| `run.state`, `viewers`, health, chapters, incidents, the replay **asset** and its expiry | `streaming` | it is what **is broadcast** |
| `chatMode`, slow mode, reservation to holders | `chat` | it is what **is said** |

### The projections that serve the screens

<!-- arthome-codes-source: ERROR_CODES -->


No screen calls four services. Each screen is served by **an already composed read model**, held by
the context that owns the majority of its invariants, and fed for the rest by the Kafka events of
the other three.

| Read model | Held by | Fed by |
|---|---|---|
| `date_card_public` | `catalog` | its own writes + `ticketing.date_sales.availability_changed.v1`, `ticketing.date_sales.pricing_changed.v1`, `streaming.run.state_changed.v1`, `streaming.viewer_count.sampled.v1`, `streaming.replay.asset_ready.v1`, `chat.date_chat_policy.changed.v1` |
| `date_detail_public` | `catalog` | same + cast, chapters (`streaming.chapter.posted.v1`) |
| `home_rails`, `live_grid`, `category_page`, `artist_page` | `catalog` | composed from `date_card_public` + the index |
| `search_index` (OpenSearch) | `catalog` | same, via `catalog-indexer` |
| `studio_date_sheet` (per pane) | `catalog` for `public`/`replay`; `ticketing` for `tickets`; `chat` for `chat`; `streaming` for `tech`; `identity` for `crew` | each by its own writes |
| `viewer_entitlements` | `ticketing` | its own writes |
| `viewer_relations` | `identity` | its own writes |
| `viewer_progress` | `streaming` | its own writes |
| `channel_agenda`, `events_table` | `catalog` | + `ticketing.date_sales.availability_changed.v1` for capacity and revenue |
| `person_duties` (the duties, across all channels) | `identity` | + `catalog.date.scheduled.v1`, `streaming.run.state_changed.v1` |

**The studio's read model is projected by role.** `canRevenue` does not hide a column: **it decides
what the response contains**. A run desk that received the ticketing gross in its payload and did
not show it is a leak, not a rule — the payload is in the clear in a WebView, inspectable, and it
survives in the phone's HTTP cache. A direct answer to `studio-web` Q2 and `studio-mobile` §3.
**Corollary**: a sort key on an absent field is **refused** (`api.sort_key_forbidden`), never ignored —
a sort silently accepted on revenue betrays the order of the values we are not allowed to show.

---

## 3. `isWatchable`: the most dangerous value in the system (chief's list, point 3)

<!-- arthome-codes-source: ERROR_CODES -->


Five sources: holding a seat (`ticketing`), the date's state (`catalog`), territorial rights
(`catalog`), replay policy (`catalog` + `ticketing` for going on sale), subscription plan
(`ticketing`). Shown on every card of every surface. Candidate no. 1 for "computed twice".

**The arbitration.**

1. **One implementation**: `decideWatch(inputs): WatchVerdict` in `@arthome/core`.
   Inputs: holding a seat, subscription state and `opens[]`, the date's state and its bounds, replay
   policy and window, whether the replay is on sale, rights scope and the viewer's territory,
   preview budget remaining, number of playback sessions open and the ceiling.
   Output: `{ allowed, reasonCode, fallbackAction, previewSecondsLeft, validUntil }`.
2. **Two evaluation sites, one single authority.**
   - **At display time**: the storefront BFF assembles the inputs from its three batched reads and
     calls `decideWatch`. The result is **indicative and not binding**, and it is declared as such in
     the contract. It serves to paint the card without a second round trip — which the TV requires.
   - **When the player opens**: `streaming` assembles the same inputs from **its own projected
     copies** (fed by `ticketing`'s and `catalog`'s events) and calls `decideWatch`. **That is the
     only evaluation with authority**, because it is the only one that produces a token.
3. **The same refusal vocabulary on both sides.** A card announcing "subscription required" and a
   player refusing for the same reason say the same code. Closed vocabulary:
   `watch.no_seat` · `watch.room_not_open` · `watch.out_of_territory` · `watch.subscription_required` · `watch.no_replay` ·
   `watch.replay_expired` · `watch.replay_not_on_sale` · `watch.preview_exhausted` · `watch.concurrent_limit_reached` ·
   `watch.date_cancelled`. Each produces a different screen on the three storefronts; a generic code would
   produce a wrong one.
4. **The entitlement is never cached client-side** (`storefront-mobile`, need no. 5). It expires, it
   depends on territory, it depends on the screen limit. An entitlement re-read from disk is a wrong
   entitlement. The contract says so, and a verdict's `validUntil` never exceeds 60 seconds.
5. **Re-checked when playback starts, never inherited from the catalogue.** The viewer's country
   changes between the two (travel, roaming, corporate network), and on mobile that gap is measured
   in hours.

**What this settles**: `storefront-tv` Q6, `storefront-mobile` Q4, `storefront-web` Q19.

**What it costs**: `streaming` must keep a projected copy of seat holdings and of the subscription.
It is the only projection in the system that carries **authority** rather than a display, and I
accept it because the alternative is a synchronous call between services — forbidden — or an
entitlement decided by the BFF, which has no authority.

---

## 4. `publicationState` locks values it does not own (chief's list, point 2)

<!-- arthome-codes-source: ERROR_CODES -->

<!-- arthome-codes-not: publication.engaged  a publication STATE, consumed as an event by
     ticketing, not a refusal code. It is two segments in a real code family, so only this
     line distinguishes it. -->


The observation is correct: publication commits the **price** (ticketing), **putting the replay on
sale** (ticketing) and the **chat policy** (chat). Three contexts, one aggregate.

**The arbitration: publication locks nothing it does not own. It publishes a fact; each owner
applies its own lock.**

```
catalog.Publication  ── publication.engaged.v1 ──►  ticketing   locks prices, capacity-shrink
                                                ──►  chat       locks chatMode
                                                ──►  streaming  opens ingest
```

Concretely:

- `catalog.Publication` carries the state, the checklist, the transitions offered **to this
  operator**, and the one-way transition pairs. It carries **no price**.
- `ticketing` refuses `setPrices` on a date for which it has received `publication.engaged` — with
  its own code, its own trace, its own message. It does not need to ask `catalog`.
- `chat` likewise refuses `setChatMode` after the commitment, except to restrict (you can always
  **close** a live chat; you can no longer open it further after the commitment).
- The **publication gate** (the checklist) is served by `catalog`, but **three of its nine items are
  projected facts**: "at least one active price" and "capacity" come from `ticketing`, "technical
  check passed" comes from `streaming`. `catalog` keeps them up to date by event and **serves the
  list of missing items** with an identifier per item — never a percentage, which the client would
  compute.

**The authoritative checklist** (`studio-web` Q7, inconsistency 5): **nine items**, the sheet's, not
the fixtures' four. The fixtures' four are an arbitrary subset; the nine are the ones a screen
actually exercised:
`title_and_discipline` · `poster` · `description` · `at_least_one_active_price` · `capacity` ·
`technical_check_passed` · `chat_mode_set` · `chapters_planned` · `moderator_assigned`.

**Seven block publication and two do not — and blocking is a property of the ITEM, not a second
vocabulary.** "Chapters planned" and "moderator assigned" are non-blocking warnings: it must be
possible to publish a date without chapters, and an unassigned post can be filled up to the last
day.

> **This was two vocabularies and it was wrong on two counts.** Promoting a warning to blocking is
> a product decision that *will* happen — under the split it moves an item from one vocabulary to
> another, which breaks anyone matching on either; as a property it flips a boolean. And a client
> rendering the checklist wants all nine with their status, so two lists forced every surface to
> concatenate them — a composition the server should have served, which is the same fault as making
> a surface recompose `displayState`.

**The lock is on the transition, not on the state** (E5, `studio-web` inconsistency 6). The contract
carries **pairs** `from > to`, not a list of states. Two one-way pairs, with the promise they commit,
which travels with the refusal:

| Pair | Promise committed | Refusal code |
|---|---|---|
| `draft\|reserve → scheduled` | *publishing commits the displayed price* | `publication.transition_irreversible` |
| `ended → replay-online` | *viewers have paid for the replay* | `publication.transition_irreversible` |

And the attempt to go back is **itself journalled** (`studio-web` Q8): an attempt to go back on a
committed price is in itself a piece of run information.

---

## 5. Three state axes on a date, and their hierarchy (chief's list, point 10; E4)

None of the three carries the displayed state, and each surface recomposed it its own way. The
contract writes the hierarchy **once**, and serves the result.

| Axis | Owner | Vocabulary | What it decides |
|---|---|---|---|
| `publication.state` | `catalog` | `draft · reserve · scheduled · technical · live · ended · replay-online` | what is public and what is committed |
| `run.state` | `streaming` | `idle · rehearsal · on_air · interrupted · ended` | being on air, and nothing else |
| `date.outcome` | `catalog` | `postponed · cancelled · interrupted` (nullable) | the money and the message to the viewer |

**Two corrections I return along the way:**

1. `run.state` **loses** `postponed` and `cancelled`. Those two values were echoes of `outcome`
   lodged in the technical axis — the same fault as `reported` in the sanctions. A run desk has no
   "cancelled" state: it has a stage sending nothing. `interrupted` stays, because it describes a
   feed actually cut, and it **causes** the outcome without being the outcome.
2. `publication.state` carries an **explicit rank** (`order_rank`), served with it. The studio's
   events table sorts by state, and the order is the state machine's, not alphabetical. Without a
   served rank, each surface reinvents `STATE_ORDER` (`studio-web` Q5).

**The hierarchy, written:**

> `outcome` outranks `run.state`, which outranks `publication.state`.

And the contract serves **a fourth value, derived and unique**: `displayState`, produced by
`displayStateOf(publication, run, outcome, instants, now)` in `@arthome/core`, accompanied by
`displayStateValidUntil`. It is the only value the cards display, and nobody recomposes it.

**The vocabulary has ELEVEN members, and the split between the two products is the point.**

| | Members | |
|---|---|---|
| public, both products | `scheduled · room_open · live · replay · ended` | the time axis |
| both products | `postponed · cancelled · interrupted` | the three outcomes, which **replace** the rest |
| **studio only** | `draft · reserve · technical` | a date that is not public yet still has to be shown to the channel that owns it |

The last three are why the count is eleven and not eight. They deliberately **share the strings of
`publication.state`**, because for a non-public date the displayed state IS the publication state —
there is no third axis to reconcile yet. A storefront never receives them, not by filtering but **by
construction**: a date reaches the storefront only once published.

> **Consequence for `backend-contracts`, and it is a cardinality question rather than a spelling
> one.** The `displayState` vocabulary is **one** vocabulary with eleven members. The studio contract
> declares all eleven. The storefront contract may declare the eight it can actually receive — but as
> a **documented narrowing of the same vocabulary**, said in the schema, never as a second
> vocabulary that happens to be shorter. Two independently authored lists for one field is how E4
> started.

> **On BOTH products, and the studio first.** `studio-web` measured 13 occurrences of `displayState`
> on the storefront side and **0 on the studio side**, which is the inverse of the need: **it is the
> studio that has three axes to reconcile**, and its outcome labels *replace* the state
> (`CANCELLED AND REFUNDED`, `POSTPONED · SEATS VALID`, `INTERRUPTED · CREDITS ISSUED`). Serving
> `state` + `orderRank` + `outcome` and letting the surface compose them is **exactly the second
> implementation this paragraph forbids** — left to the surface where the error is not a
> mislabelled card, but **a run desk on the wrong screen**.
>
> So every read model carrying a date carries `displayState` and `displayStateValidUntil`: on the
> storefront side `date_card_public` and `date_detail_public`; **on the studio side
> `channel_agenda`, `events_table`, `studio_date_sheet` and `person_duties`**. `orderRank` is still
> served alongside, because it serves **sorting** by state, which is not the same need as display.

---

## 6. `outcome`: one event, four consequences (chief's list, point 4)

<!-- arthome-codes-source: ERROR_CODES -->

<!-- arthome-codes-not: date.outcome  a nullable FIELD on a date — postponed, cancelled,
     interrupted — not a refusal code. Two segments in a real code family, so only this line
     distinguishes it. -->


`catalog.date.outcome_declared.v1` is published once, by the channel, from the studio
(`decideOutcome`, reserved to `artist ∨ production`). Four contexts consume it, and each produces
**its** consequence, without talking to the others:

| Consequence | Context | Detail |
|---|---|---|
| refund / credit note | `ticketing` | `cancelled` → full refund; `interrupted` → a **credit note** on the account; `postponed` → **no movement**, the seat follows the new date |
| payout withholding | `payouts` | `held` while an outcome is open; `refunded` if cancelled |
| public copy | `catalog` | the outcome replaces the state on **every card**, not only on the sheet |
| priority display | `catalog` | the date rises in "My tickets" and in the studio inbox |

**What a viewer whose screen was open during the transition sees.** That is the chief's exact
question, and it has a precise answer, in three steps:

1. **Within the second**: the realtime channel pushes `date.outcome` into the `date:{id}:state`
   room. The player **lays the incident veil over the intact video** — never a feed switch,
   `streaming.md` is categorical — with the message written by the run desk, in the language it was
   written in. The veil states the outcome and what it means for the seat.
2. **The playback token is not revoked in the same act.** For `postponed` and `cancelled`, the
   broadcast is over anyway or has not started. For `interrupted`, playback **stops at the next
   renewal refusal** (≤ 45 s) with the `date.interrupted` code, not by an abrupt cut: a feed cut with
   no explanation is exactly what principle no. 6 forbids. The edge, for its part, may keep serving
   until the token in hand expires (120 s) — it is the client that stops, not the CDN.
3. **The financial consequence comes afterwards, and it is visible elsewhere.** The viewer does not
   see their refund on the player screen: they see it in "My tickets", which carries the **amount**
   and the **period code** (never the sentence "3 to 5 working days"). The contract does not invent a
   money notification on a performance screen.

**What is forbidden**: a surface deriving the outcome from anything other than `outcome`. The TV
mockup and the studio mockup both recomposed it, differently.

---

## 7. Two token systems (chief's list, point 7)

<!-- arthome-codes-source: ERROR_CODES -->


Two tokens, two lifetimes, two verifiers, **never interchangeable**.

| | **Session** | **Service token** | **Playback token** |
|---|---|---|---|
| issued by | the BFF | the BFF | `streaming` |
| carried by | cookie (web) / bearer (native) | an internal header | a signed request to the CDN |
| lifetime | **fixed by `adr-auth.md`** (session 7 d, daily sliding) | **60 s** | **120 s** |
| verified by | the BFF, against Redis | each service, **by JWKS, locally** | the **CDN edge** |
| revocation | the session store | expiry alone | the playback session lease |

**No service calls `identity` or reads the session store.** The BFF validates the session, then
issues a short signed token carrying: `sub` (account), `pro` (profile), `did` (device), `chn[]`
(accessible channels) and `rol[]` (effective roles per channel) for the studio, `scope`, `exp`, and
the `traceparent`. Each service verifies by JWKS, locally, with no network on the hot path (key set
cached, `kid` in the header, **rotation cadences fixed by `adr-auth.md` §8.1** — 30 d / 24 h grace
for the two BFFs, 90 d / 7 d grace for the playback token and the `device_token`). The "24 h with
two live keys" an earlier version of this paragraph carried was a plausible number and a wrong one:
see §7.0 and `adr-stream-entitlement.md` §3.4.

**Three points the surfaces insisted on:**

- **The concurrent-session limit** is not carried by the session, but by the **playback session
  lease** (`adr-stream-entitlement.md`). An account session and a playback session do not count the
  same thing.
- **`signOutDevice` must produce an observable effect on the device concerned**
  (`storefront-web` Q25). It revokes the session **and** publishes `identity.device.revoked.v1`,
  which `streaming` consumes to **invalidate that device's playback leases**. The television shows
  `identity.signed_out_elsewhere`, not a network error. **Exposure window: up to 120 s**, not 60 — revocation
  refuses the next renewal, but the token already in hand stays valid until it expires, and the CDN
  edge knows nothing about it. Typical 45 to 75 s. An earlier version of this paragraph said
  "≤ 60 s": that was the renewal interval taken for the guarantee
  (`adr-stream-entitlement.md` §3.3).
- **The studio mobile cannot keep its session in a cookie** (`studio-mobile` Q1):
  `capacitor://localhost` is a third-party context on iOS. So the studio BFF offers **a
  bearer-token session alongside the cookie session**: a device-bound refresh token kept in the
  native store (`@capacitor/preferences`, never `localStorage`), a short access token, revocation
  per device. The behaviour on returning from the background with an expired token is **silent
  refresh**; re-authenticating mid-duty is a fault. The detail belongs to `adr-auth.md`; the
  topology is here.

### 7.0 The JWKS document has no owning context — and that is intended

`adr-auth.md` §8.1 sets the mechanism: **a single, static JWKS document served by the CDN**,
carrying the public keys of the four issuers (storefront BFF, studio BFF, playback entitlement,
`device_token`), told apart by a `kid` prefix, in ES256, with two distinct rotation cadences. What it
does not say, and `auth` raises it itself: **who owns it**.

That is a question for this map, because the answer conditions a project rule:

> **"No service calls the identity service" must stay true *including for key discovery*.**

Two answers would break it, and they must be ruled out explicitly:

| Wrong answer | What it breaks |
|---|---|
| `identity` serves the JWKS | **every service would call `identity`** every time it builds its key set — the rule violated literally, through the discovery door |
| a BFF serves the JWKS | the services would depend on **the entry point**. The dependency is inverted: a service must expect nothing from the BFF |

**My proposal — the JWKS is an infrastructure artefact, like the i18n and the taxonomy (§1.8), and
it belongs to no context.**

- it has **no invariant, no transaction and no event**: it is a static file, and a service that
  serves a static file is a service to operate for nothing. The same reasoning as in C6, and it has
  already served twice;
- **each issuer publishes only its public keys** into an object-storage prefix; a job in
  `arthome-platform` assembles them into `/.well-known/jwks.json` and pushes it to the CDN. **No
  private key leaves its issuer**, and no service reads another's;
- the CDN caches the document aggressively — which is precisely why `auth` imposes two rotation
  cadences and publishing the new key **before** signing with it.

**This is not settled: I propose it, `backend-contracts` handles it too.** The point to agree on is
the **split of the rotation job** — one job generating all four pairs (simple to operate for one
person, but it holds four private keys) against four independent rotations publishing only public
material (bounded blast radius, four things to watch). I lean towards the second, because the first
would make an infrastructure job the most sensitive point in the system.

### 7.1 Device and session: two objects, and it is `adr-auth.md` that names them (E13, E15)

`storefront-mobile` notes that the mockup treats devices and sessions as two things without saying
which is authoritative, and E13 notes that `devices` has two shapes under one name. **The cut
adopted is `adr-auth.md` §4/Q3's, and it is better than the one I had proposed:**

- **`Device`** — the **registered** device, durable, revocable, identified before any session. Kind
  (`tv · mobile · tablet · desktop · stick · console · box`), label, city derived from the address,
  last-activity instant, a "this device" flag.
- **`DeviceSession`** — the **(device, profile)** pair. A living-room television carries up to five
  profiles, hence up to five sessions on a single device.

Two acts, and they do not do the same thing: **"disconnect a profile"** closes a `DeviceSession` —
*"the other accounts stay signed in"*, which the TV requires; **"revoke the device"** deletes the
`Device`, all its sessions **and its playback leases**.

**And both publish, each at its own grain**: `identity.device_session.closed.v1` carries
`profile_id` and makes `streaming` revoke the (device, profile) pair's leases;
`identity.device.revoked.v1` makes it revoke all of the device's. Without the first — which was
missing — the distinction had no effect on playback: `signOutProfile` stopped nothing, and the only
way out was to revoke the device, hence to disconnect the living room's five profiles.

**Device identity exists before any session** — the answer to `storefront-tv` Q3, and it is a plain
yes. It is necessary for four things, and all four are asked for by the surfaces: opening a sign-in
pairing, naming itself in "connected devices", being revoked, and carrying a rate limit somewhere
other than on the IP address (which a household shares).

---

## 8. Device pairing: one primitive, five intents

<!-- arthome-codes-source: ERROR_CODES -->


`corrections-handoff.md` poses it as an open question; `storefront-tv` demonstrated its necessity by
counting five journeys. **Decision: one single primitive, in `identity`, conformant to RFC 8628.**

```
identity.DevicePairing
  intent      signin | seat | plan | payment_method | merch
  payload     depends on the intent, opaque to identity, relayed to the target service
  deviceId    the device identity (§7.1)
  profileId   the profile that opened the pairing — nullable for `signin`
```

- `userCode`: **six characters**, and **the exact alphabet is declared by `adr-auth.md` §5.1** — a
  subset with no confusable glyphs, sized above RFC 8628 §5.1's entropy threshold. I do not
  redeclare it here: two declarations of one alphabet are exactly the parallel literal table E2
  describes. What the data model does impose: uniqueness **among pairings in progress only** — a
  code is reused once expired, otherwise the space is exhausted — a cap on attempts per code **and
  per device**, and a lockout after failures.
- `verificationUri` and `verificationUriComplete` (the QR, code included): **both served**, never
  built by the surface.
- **Duration per intent** (`storefront-tv` Q4): `signin` 15 min (you go and find your phone, you do
  2FA); `seat` and `merch` **5 min** (beyond that, the capacity displayed is no longer true); `plan`
  and `payment_method` 10 min. Served in `expiresAt`, never hard-coded on the surface. The waiting
  screen **shows no countdown**: the TV uses it to give up, not to worry the viewer.
- **Lifecycle**: `pending → approved | denied | expired | cancelled`, plus
  **`approved_with_failure`** for the purchase intents — the phone finished but the purchase failed
  (sold out in the meantime, payment declined). Five distinct codes, because the TV says five
  different things.
- **Reattachment after a restart**: the TV persists `pairingId` and calls `attachPairing` rather
  than opening a second one. Without that, a television restarted during payment shows the home
  screen while the payment completes into the void.
- **A television is shared** (`storefront-tv` Q2). For the **four purchase intents**, the pairing is
  bound to the **profile that opened it**: a phone approving under another identity is **refused**
  with a distinct code (`pairing.identity_mismatch`), and the phone offers "switch account" — a
  person's act, never the system's. Reason: an implicit switch would charge the wrong payment
  method, credit the wrong entitlements and deliver the seat to the wrong account, in a living room,
  at the precise moment two people are watching the same screen. **`signin` is the exception and is
  not one**: there is no opening profile, so the pairing is bound to the **device**, and a phone
  signed in under another identity is the nominal case — that is the very meaning of "add an
  account". No `MISMATCH` is possible there.
- **What is not a pairing**: the QR on the account page, which sends you to account management on a
  phone. That is a **hand-off** (`AccountDeepLink`), nothing waits, the screen does not switch. Two
  distinct shapes in the contract, otherwise we will implement a wait where there is none.

**How the TV learns the outcome** (Q1): **RFC 8628-conformant polling, and not the realtime
channel.** That is `adr-auth.md` §5.3's decision, and **I fall in behind it, withdrawing the one I
had proposed** (a push on a `device:{deviceId}` room).

Its reasoning is the right one: at `signin` time, bringing a device identity into the WebSocket
namespace **would widen its attack surface to gain a few hundred milliseconds**. And the TV's
requirement — a switch within two seconds at most — is met without that: `pollInterval` is served at
**2 s for the first 60 seconds**, then 5 s. It is a decay **served by the server**, hence tunable as
`storefront-tv` asks, and it costs at most **thirty requests per pairing**. Against a WebSocket room
reachable before any session, the trade is not a good one.

`slow_down` is honoured, and the TV never polls faster than the served interval.

---

## 9. Entry topology

```
                    ┌─────────────────────────────────────────────┐
  web · mobile · TV │                  Traefik                    │  TLS, routing by host,
  studio web/mobile │   (infrastructure gateway, configured)      │  coarse rate limits,
                    └───────┬─────────────────────────┬───────────┘  WebSocket upgrade, affinity
                            │                         │
                 ┌──────────▼────────┐     ┌──────────▼────────┐
                 │  bff-storefront   │     │    bff-studio     │  session, CORS, error
                 │  + ws /storefront │     │  + ws /studio     │  envelope, idempotence,
                 └──────────┬────────┘     └──────────┬────────┘  composition, service token
                            │   synchronous calls (the only direction allowed)
        ┌────────┬──────────┼──────────┬──────────┬──────────┬─────────┐
     identity  catalog  ticketing  streaming    chat      payouts  notifications
        └────────┴──────────┴────┬─────┴──────────┴──────────┴─────────┘
                                 │  Kafka — outbox + Debezium — the only inter-service channel
                                 ▼
                  PostgreSQL ×7 · Redis ×4 uses · OpenSearch · MinIO
```

### Why an infrastructure gateway **and** two BFFs, from the start

The mission asks for an argument, not a preference. Here it is, in four points, three of which are
needs expressed by the surfaces:

1. **TLS, routing by host and coarse rate limits are configuration.** Rewriting them in NestJS would
   be redoing, less well, what a standard proxy does in ten lines. **Ruled out in advance, and I
   confirm the exclusion**: a NestJS application gateway that would only re-dispatch. It would own
   no invariant and would become the shared bottleneck.
2. **WebSocket needs it.** Socket.IO's Redis adapter relays broadcasts, not polling requests: you
   need **either session affinity, or clients on `websocket` transport only**. Both are settled at
   the proxy, not in the application.
3. **`storefront-tv` raises a requirement that reaches the gateway**: *"every response from the
   system, including under overload, must carry the error envelope with its code and its trace
   identifier"*. A gateway that returns a raw HTML page makes it impossible to tell "your
   connection" from "our servers", and the viewer will go and restart their set-top box. So Traefik
   must be configured to serve **a JSON error page conformant to the envelope** on the 5xx it
   produces itself. That is a line of `definition-of-done.md`, and `backend-contracts` must carry
   it.
4. **CORS cannot live at the gateway.** It must know the literal strings `capacitor://localhost` and
   `https://localhost` (`studio-mobile`), return the origin as it stands with credentialed requests,
   and `capacitor://` is a non-standard scheme a URL parser rejects. It is a check **by literal
   string**, hence application-level, hence at the BFF.

**One BFF per product**, never a single shared one: the two products have different sessions (cookie
against bearer), different pagination (cursor against page + total), different response envelopes
(projection by role against projection by viewer) and different deployment cycles.

**What the BFFs have no right to do**: carry a domain rule. The price, the discount, the right to
watch, the order of the rows, the scarcity threshold, computing a payout — all of that is in
`@arthome/core`, executed by the owning service. The BFF **composes and adapts**. The only thing it
evaluates itself is `decideWatch` in indicative mode (§3), and the contract says so.

### The real risk, named

A **stateless component replicates**: Traefik, the BFFs and the WebSocket gateways have no local
state (session in Redis, broadcast in Redis, journal in Kafka), so they scale by adding replicas.
The danger is not the load: **it is a gateway becoming thick.** A BFF that starts computing a price,
keeping a business cache or joining three services in memory becomes a distributed monolith — all of
a monolith's coupling, plus network latency. The measure that would trigger an action is in §11.

---

## 10. The count of synchronous BFF → service calls

**Counted, not assumed**, from the five `needs/` files. A synchronous call goes only from a BFF to a
service; between services, nothing.

### 10.1 Reads — the count is low because the models are projected

| BFF | Distinct read methods | Calls **per screen** |
|---|---|---|
| storefront | **22** | **1 to 4**, all in parallel |
| studio | **38** | **1 to 3** |
| **total** | **60** | |

The detail that matters, screen by screen, on the heaviest screens:

| Screen | Internal calls | Which ones |
|---|---|---|
| `home` (TV, web, mobile) | **4** | `catalog.GetHomeRails` + three per-viewer overlays, batched by identifier: `ticketing.GetViewerOverlay`, `identity.GetViewerRelations`, `streaming.GetViewerProgress` |
| `live` / `category` / `artist` / `search` | **4** | the same pattern: one composed model + three overlays |
| `title` (date sheet) | **4** | same, with `date_detail_public` |
| `boot` (`ViewerContext`) | **1** | `identity.GetViewerContext` |
| `confirm` (pairing outcome) | **0** | everything comes from `PairingOutcome` |
| `player` | **1** | `streaming.OpenPlayback` — chapters, tracks, chat policy, incident, resume point, live edge, DRM, quality ceiling: **all in the same response** |
| `run desk` (studio) | **3** | `streaming.GetRunConsole`, `chat.GetModerationQueue`, `identity.GetChannelPresence` — the third is composed into `RunConsole.presence`, so the run desk's real fan-out is **2** (`realtime.md` §5.3) |
| `event` (date sheet, studio) | **1 + 1 per open pane** | `catalog.GetDateSheet` then the pane from its owner |
| `payouts` | **1** | `payouts.GetPayouts` |

**The maximum fan-out is 5, not 4 — and it has to be said, because the alert threshold is at 4.**
Two operations cross it on delivery day: `getDateDetail`
(`catalog, ticketing, identity, streaming, chat`) and reading the channel journal. The transport
decision is not overturned by it — 5 is not 12, and the depth stays 1 — but **the sentence that
justifies it would be false**, and that sentence is the one we will re-read in six months.

Each of the two cases has its own remedy, and they are read-model remedies, not threshold ones:

- **the journal**: it goes from five services to **one** with §1.9's attachment;
- **`getDateDetail`**: the `chat` pane is **both called and already projected** —
  `date_detail_public` is fed by `chat.date_chat_policy.changed.v1` (`data-model.md` §4). So the
  call is redundant, and that is exactly the act the threshold prescribes: *"the read model is
  missing"* — except that here it is not missing, we simply are not using it.

The threshold stays at **4**, and I refuse to raise it to 5 to cover a composition we can delete. A
threshold raised to silence an alert stops being a threshold.

**The three overlays are one batch, never one call per card.** They take a list of identifiers and
return a table. And the storefront BFF caches them per profile in Redis (TTL 30 s, invalidated by
the profile's writes): in steady state, `home` falls back to **1 to 2** internal calls.

**So the count `storefront-tv` announced is confirmed**: *"for reads, if the models are projected,
the TV requires none"* — none extra, that is: one composed model plus the overlays shared by all its
screens.

### 10.2 Writes — the count is high, and it is structural

| Context | storefront | studio | total |
|---|---:|---:|---:|
| `identity` | 26 | 13 | **39** |
| `catalog` | 5 | 12 | **17** |
| `ticketing` | 14 | 12 | **26** |
| `streaming` | 4 | 15 | **19** |
| `chat` | 3 | 13 | **16** |
| `payouts` | 0 | 5 | **5** |
| `notifications` | 9 | 1 | **10** |
| **total** | **61** | **71** | **132** |

**Grand total: 60 reads + 132 writes = 192 synchronous BFF → service methods.**

### 10.3 What that count weighed, and how the transport was settled

I gave the count and the material; **`backend-contracts` settled it**, as the mission provides. The
weighing is kept as I had written it — it explains why the decision was not obvious — and the
decision is recorded at the end.

**What argued for gRPC.**
192 typed methods, described once. The Protobuf schemas already exist for the events and the `buf`
tooling is already in place: the client generator is free. A BFF → service call has a **deadline**
that crosses and propagates, which HTTP/JSON does not offer natively — and on `OpenPlayback`'s
critical path (a ≤ 1 s budget inside a total budget of 10 s to first frame), that is not a comfort.
Batched reads (per-identifier overlays) are exactly what gRPC does well.

**What gRPC would cost one person.**
`h2c` to configure in Traefik (the proxy must speak cleartext HTTP/2 to the services, or you need
internal TLS). No `curl`: debugging a call needs `grpcurl` or reflection, and reflection must not be
exposed in production. Distinct probes: `grpc-health-check` instead of a `GET /health`. A graceful
shutdown that is not the default (`gracefulShutdown: true` is undocumented, and the default cuts
in-flight calls on every rollout). And client-side load balancing (`round_robin` +
`max_connection_age_ms`), because a ClusterIP Service pins a single pod.

**My recommendation was gRPC for the 60 reads. `backend-contracts` settled the opposite, and it is
right — I record the result and the two arguments I had missed.**

> **Decision: HTTP/JSON described in OpenAPI 3.1, no gRPC.**

What carried the decision is not the count of 192, but **1 and 4**:

- **chain depth: 1, by construction.** My own rule — no call between services — means a deadline has
  **nobody to propagate to**. Yet deadline propagation was my best argument for gRPC; it falls on
  its own. Worse, `nestjs-grpc` establishes that **Nest never cancels a unary handler**: the gRPC
  deadline does not stop the callee, it is the same manual work as in HTTP;
- **maximum fan-out: 4**, and all in parallel. We are not in the regime where a binary transport's
  typing pays.

And an argument that touches directly what this document has been defending from the start: gRPC
would take each closed vocabulary's handwritten declarations from **two to three** — the union in
`@arthome/core`, the event proto, **plus** a service proto. That is **+50% of surface exposed to
E2**, the project's dominant fault, for a latency gain the fan-out does not justify. I had listed
the operational cost in the previous paragraph; this is the one that was missing.

---

## 11. The hot spots, and the measure that triggers an action

No "it could scale". Three real risks, each with the threshold that commands an act.

### (a) Joins at query time

**The risk.** A screen served by seven internal calls because the read model is missing. That is
exactly what this whole event-driven architecture exists to avoid.

| Measure | Threshold | Act |
|---|---|---|
| `bff_upstream_calls_per_request` p95 | **> 4** on a list screen | the read model is missing: create it in the majority context |
| `bff_request_duration_ms` p95 | **> 400 ms** on a public read | same, or the overlay is not batched |
| `read_model_staleness_seconds` p99 (age of the last event applied) | **> 30 s** | the projection consumer is falling behind: raise `partitionsConsumedConcurrently`, or the partition count |
| `search_index_lag_seconds` p99 | **> 60 s** | the indexer is falling behind; a published date is not findable |

A reminder from `storefront-web` §4: Next's cache key includes the build identifier, so **a
deployment empties everything** and the first minute sends the whole read traffic to the BFF. That
is an independent, and decisive, argument for public reads being served models rather than expensive
compositions. If `bff_request_duration_ms` p95 explodes in the minute after a web deployment, that
is the defect.

### (b) A popular performance's partition key

**The risk, named precisely.** The partition key is the aggregate identifier (`nestjs-kafka` rule
7). On a heavily watched live show, `dateId` concentrates that performance's chat, moderation,
purchases and audience samples onto **a single partition**. A partition is a queue: it does not
parallelise.

| Measure | Threshold | Act |
|---|---|---|
| `kafka_consumergroup_lag` on a **single partition** of `arthome.chat.date` | **> 10,000 messages or > 30 s** | change the `chat` topic's key from `date_id` to `date_id#shard`, the shard count being **served in the contract** |
| `kafka_consumergroup_lag` on `arthome.ticketing.order` | **> 30 s** | raise the partition count; the key stays `date_id` (order there is a capacity invariant) |
| `partition_bytes_in` max/median imbalance | **> 10×** | same diagnosis |

**Why sharding is permitted on the chat and forbidden on ticketing.** A chat's order is restored on
read by `(at_media_sec, seq)`: it is not carried by the partition. The order of purchases on a date
**is** the capacity invariant: it must stay inside one partition.

**And the viewer counter does not go through Kafka at the sample's frequency.** One sample per
second per live show in a durable log is waste. The counter travels over **Redis** (broadcast), and
only a **per-minute aggregate** enters Kafka for history and statistics. That is `streaming.md`'s
Kafka/Redis boundary, applied.

### (c) The WebSocket broadcast of a heavily watched live show

**The risk.** 20,000 viewers in the `date:{id}:chat` room, spread over N nodes. The Redis adapter
relays **every message to every node**, which then writes it to each of its sockets. The cost grows
as N × messages, and the Redis channel becomes the bottleneck.

| Measure | Threshold | Act |
|---|---|---|
| `socketio_broadcast_lag_ms` p99 (emission → witness client reception) | **> 500 ms over 30 s** | turn on the server-side per-room ceiling (see below), then shard the room |
| `redis_pubsub_channel_bytes_per_sec` on the adapter's channel | **> 20 MB/s** | move to `@socket.io/redis-streams-adapter`, or shard |
| `ws_connections_per_node` | **> 15,000** | add a replica (the component is stateless) |
| `ws_reconnects_per_minute` | **> 5% of connections** | session affinity is broken at the proxy |

**The ceiling is enforced at the source, not at the client.** `storefront-tv` requires it and is
right: a TV cannot absorb a high-rate stream in order to throw 95% of it away, each rejected message
having cost parsing and allocation on a device that is already decoding video. So the server applies
**a ceiling per room and per surface** (TV: 2 msg/s; web and mobile: 10 msg/s), with the selection
made upstream, and a short catch-up history on entry (20 messages on TV, 50 elsewhere). The answer to
`storefront-tv` Q11.

**The real danger is none of the three.** It is a gateway becoming thick (§9). The measure: if the
BFF acquires a table it writes itself, or a cache whose invalidation becomes a business rule, it has
crossed the line. That is not a metric, it is a review — and it is a line of
`definition-of-done.md`.

---

## 12. What is CQRS, and what is not

Not on principle. The rule I apply: **CQRS where the write model and the read shapes genuinely
diverge, and nowhere else.** Elsewhere, service + repository + DTO.

| Context / module | Regime | Justification |
|---|---|---|
| `catalog` — publication, date, outcome | **full CQRS** (command bus, aggregates, projections) | Seven states, two one-way transitions, a checklist fed by three contexts, optimistic concurrency across operators, **and** six read models radically different from the write model (rows, index, tiles, sheet by pane). The divorce is total. |
| `ticketing` — seat, capacity, order | **full CQRS** | Capacity is a pure concurrency invariant; the reads are projections by viewer and by channel. And the write model (one order, one payment, one outcome) has nothing of the shape that is read (a seat card with its replay window). |
| `chat` — moderation | **full CQRS** | Conditional verdicts, leases, precedence, retroactive reclassification, and a queue read by several people at once. |
| `streaming` — the run | **commands only**, no query bus | The writes are run-desk commands with invariants (you do not go on air without a technical check). The reads are short time series: a repository is enough, a query bus would be ceremony. |
| `identity` — rights and channels | **aggregates without a bus** | `Channel` and `ChannelMembership` have real invariants (the owner is never removable; an assignable role depends on `grants`), hence aggregates and methods. But one single read shape, and it resembles the write model. No bus. |
| `identity` — preferences, consents, follows, watchlist | **service + repository** | CRUD. Aggregates here would be ceremony over flat tables. |
| `payouts` | **service + repository + state machine** | The computation is pure domain (`@arthome/core`), the persistence is one row per date. The complexity is fiscal, not structural. |
| `notifications` | **service + repository + queue** | No cross-cutting invariant. |
| `identity` — pairing | **an aggregate, no bus** | A short state machine (five outcomes) with an expiry. |

**What I explicitly refuse**: *event sourcing*. `@nestjs/cqrs` persists nothing — an event store,
snapshots, replay and projections would all have to be written. For one person that is a project
inside the project, and the **24-month by-name audit journal** the studio requires is a table, not
an event store. The two are often conflated; they do not replace each other.

**And the rule that makes all this safe** (`nestjs-cqrs` rule 8): an aggregate publishes its domain
events through `commit()` **after** the transaction has resolved, never inside it — a rollback does
not recall a published event. **Integration** events, for their part, are outbox rows written
**inside** the transaction (see `data-model.md`). Those are two mechanisms, and confusing them is
the model's most expensive fault.

---

## 13. Contract maturity

| Context | Regime | Reason |
|---|---|---|
| `identity` | **stable** | milestone 2. `buf breaking` and `oasdiff` block any break. |
| `catalog` | **stable** | milestone 2. |
| `ticketing` | **stable** | milestone 3. |
| `streaming` | **provisional** | milestone 5. The media provider has not been chosen, and the declared capabilities (segment signing, DRM, renditions) **will change the `PlaybackTicket`'s shape**. Freezing now means freezing against MediaMTX. |
| `chat` | **provisional** | milestone 5. Four sanction vocabularies existed; I settle three axes from them, but **no screen has ever exercised moderation as the viewer sees it** (`storefront-mobile` verified: `chatOf` is never called in its mockup). A contract designed and not observed does not freeze. |
| `payouts` | **provisional** | milestone 3+. The tax model is settled (`adr-payments.md`, D-015), but **its legal validation is not**: the VAT base and the liable party could still move the fields. The *shape* — a breakdown per jurisdiction, each line carrying the rate applied at the sale — is safe and will not move. |
| `notifications` | **provisional** | milestone 6. The third channel is not named in the file; I propose `in_app`, but it is a proposal. |

**A reading rule for `backend-contracts`**: a *provisional* contract is changed without ceremony
until its milestone arrives. A *stable* contract is changed by addition only. Both are generated by
the same chain; only the CI gate differs.

**One requirement that crosses both regimes** (`storefront-tv` Q12, and it is the question the
fleet's survival depends on): **the behaviour in front of an unknown enumeration value is declared,
and it is "keep the raw value and treat it as neutral", never "reject".** A TV store review is slow:
a version published today will be running in living rooms a year from now, and the day the catalogue
gains a 22nd discipline, those televisions will receive it. Strict per-enumeration validation would
not degrade a card: it would fail the **whole page**. So strictness bears on the **shape** (the
mandatory fields, the types), never on a vocabulary's **member**. In Protobuf that is the native
behaviour (an unknown member arrives as its number); on the zod side, `backend-contracts` must write
it explicitly — a bare `z.enum()` does not do it.

---

## 14. What `backend-contracts` should take from here

<!-- arthome-codes-source: ERROR_CODES -->


An operational summary, so the whole document does not have to be re-read.

1. **60 read methods, 132 write methods.** §10 gives the split per service. The transport is its
   call; the count is established.
2. **Every response carries `servedAt`**; every response containing a perishable value carries
   `validUntil`. Non-negotiable: five surfaces depend on it.
3. **Every response carries the result *and* the inputs** of the perishable rules (state, replay
   window, room opening, capacity, preview remaining).
4. **One single error envelope**, up to and including the Traefik gateway, with `code`, `params`,
   `traceId`, and an explicit **nature**: `refused` (the server said no, definitively) /
   `unavailable` (try again) / `offline_forbidden` (refused locally before sending).
   `studio-mobile` requires it and is right: it is the decision a person on duty has to take in ten
   seconds.
5. **Two pagination regimes** (D-010), plus the two named exceptions. Cursor as **opaque Base64**
   over `(created_at, id)`, **24 h lifetime**, a `api.cursor_too_old` code that requires a full reload.
   The cursor is **bidirectional** and **independent of page size** (`storefront-mobile`: a rotation
   must not invalidate it).
6. **A page envelope carries a total** — exact for the studio, **bounded approximate** for
   storefront search. **The threshold beyond which the total becomes a lower bound is a served
   domain constant**, never a number carved into prose: carving it would expose an engine's shape in
   the contract, and make a promise in the name of a provider we could replace. The envelope carries
   `approximateTotal` **and** `totalIsLowerBound`.
7. **Projection by role, server-side** for the studio: a forbidden field is **absent**, never present
   and null; a sort key on an absent field is **refused**.
8. **No ticketing or run-desk field on a public model** (E8): not `sold`, not `revenue`, not
   `publication`, not `publishedBy`.
9. **Domain constants are served**, never copied: room opening (30 min), billboard preview delay
   (4 s), scarcity threshold, cancellation deadline (1 h), credit period (a **code**, not "3 to 5
   working days"), notification thresholds, waiting-list priority window (2 h), technical
   provisioning threshold (10,000), revision deadline (72 h), chat rate ceiling, reaction quota. They
   live in `@arthome/core` and are served in `ViewerContext` (storefront) and in the bootstrap
   (studio).
10. **`@arthome/contracts` exposes a barrel-free entry point** (D-012), and imports zod only through
    deep paths.
