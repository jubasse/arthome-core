# Needs — storefront web (Next.js)

> Surface: **Storefront Web**, Next.js, 1440 px. A **public, indexable** ticketing catalogue:
> server rendering and URL stability are not implementation preferences, they are contract
> constraints.
>
> Sources read: `README.md` (corrected), `shared/helpers.js` (in full), `shared/catalogue.json`,
> `shared/taxonomy.json`, `shared/fixtures.js` (excerpts), `shared/i18n/*` (in full for
> `storefront.json`, `system.json`, `index.json`), `mockups/Storefront Web.dc.html` (read in
> fragments: router, component state, view models — never in full),
> `architecture/corrections-handoff.md`.
>
> This document **states needs**. It does not re-describe any mockup: the mockup is the design.
> Everything below changes what the contract must carry or guarantee.

---

## Screen inventory

### Top-level routes — twelve, verified against the mockup's router

The router in `Storefront Web.dc.html` knows exactly twelve values of `page`:
`home · live · browse · categories · category · artists · artist · replay · plans · following ·
account · help`. The lead had listed twelve: the count is right, nothing is missing at this level.

| Route | What it serves | Written up in detail |
|---|---|---|
| `home` | editorial home: carousels mixing a public selection with personalised rails | §Shapes, §Real time |
| `browse` | **the explorer**: full-text search + facets + four result tabs (`best`, `lives`, `replays`, `artists`) | §Shapes, §Pagination |
| `categories` | the **21 disciplines**, grouped by the two universes (`music`, `stage`), in the editorial `rank` order | cross-reference: taxonomy read only |
| `category` | one discipline: five tabs (`ov` overview, `live`, `up` upcoming, `rep` replays, `art` artists), its sub-genres, its own filter set, its save-as-search | §Shapes, §Pagination |
| `artists` | directory: discipline filter, `az` / `followers` sort, two sections (live / not live) | cross-reference: same shape as `browse`, `artists` tab |
| `artist` | artist page: bio, upcoming dates, past dates, replays, average audience, followers | §Shapes |
| `live` | **the page of a date**: player, locked free preview, chat, show store, seat purchase, sharing, information | §Shapes, §Commands, §Real time |
| `replay` | replay player: chapters, speed, resume position, remaining window | §Shapes, §Offline |
| `plans` | the subscription plans and their comparison | §Shapes — **conflicting vocabulary, see Inconsistencies** |
| `following` | followed artists and their upcoming dates | cross-reference: `ArtistSummary` + `DateCard`, nothing new |
| `help` | help and contact: six topics, form, DPO contact | §Commands |
| `account` | **eleven sections**, below | §Shapes, §Commands |

### `account` — eleven sections, one single account shape

`upcoming` (upcoming seats) · `past` (past events and replays) · `faves` (followed artists +
saved shows) · `alerts` (**saved searches**) · `orders` (merch orders) · `sub` (subscription,
invoices, payment method) · `profile` · `prefs` (playback preferences) · `notifs` (notification
settings + quiet hours) · `security` (password, 2FA, passkey, payment methods, connected
devices) · `privacy` (consents, cookies, retention, GDPR rights, DPO).

**These eleven sections share one and the same account shape.** They do not justify eleven calls
nor eleven schemas: they justify **one** `Account` aggregate served in a single call by the BFF,
plus four independent paginated lists (`tickets`, `orders`, `savedSearches`, `notifications`).
Only `alerts`, `orders` and `privacy` introduce shapes that nothing else carries; the other eight
are projections.

### Overlays — not routes, but they have their own contract

They have no URL in the mockup, and **that is a problem to settle** (see §Next.js constraints):

- **cart**, a three-step popover: `cart` → `pay` → `done`;
- **seat purchase** (tier modal), **authentication** (create an account / sign in / continue
  without an account), **sharing**, **notification centre**, **search suggestions**
  (type-ahead), **save a search**, **sort menu**, **mobile menu**;
- **persistent mini-player**: playback survives navigation between routes (`watching`,
  `watchKind`, `pipClosed`). That is a contract constraint, not a layout one — see §Next.js
  constraints.

### Footer pages — to be served, with no data model of their own

`terms` · `privacy policy` · `accessibility` · `press` · `status` · `help centre` ·
`stream on Arthome` · `OBS guide` · `ticketing (for artists)` · `store & merch (for artists)`.
Bilingual editorial content, indexable, session-free. One contract requirement only: **the
service status page must be readable without a session and without depending on the same
services** as everything else — otherwise the status page goes down with what it describes.

---

## Data shapes

Each shape is described once, with the list of screens that consume it. The rule "no value
computed twice" means everything marked **[derived]** must be served by the contract, never
recomputed by the surface.

### 1. `DateCard` — the card of a date. **The most consumed shape in the product**

Consumed by: `home` (every rail), `browse`, `category`, `artist`, `following`,
`account/upcoming`, `account/past`, search suggestions, the notification panel.

It must carry, at minimum:

- identity: `dateId`, `showId`, `artistId`, `venueId`, and a `slug` for each **[stable,
  indexable]**;
- time: the **ISO 8601 UTC instant** of the start, `runtimeMin`, the venue's **IANA** zone
  identifier (`Europe/Paris`) — never a frozen offset in minutes (errata D3, D7);
- state **[derived]**: `scheduled | live | replay | ended`, plus `roomOpen` (the house opens
  `roomOpensBeforeMin` = 30 min before) and `progress` for a live in flight;
- outcome **[derived, takes priority over everything else]**: `null | postponed | cancelled |
  interrupted`, with the rescheduled date when one exists;
- capacity: `seatsAvailable`, `waitlist`, and **the fill rate** — the surface shows "almost sold
  out" past a threshold, and that threshold is a domain rule, not an interface literal;
- price: **the lowest price** in canonical units (minor units + currency code), and the list of
  tiers when the card opens a purchase;
- promotion **[derived]**: see shape 6;
- replay: `policy` (`included | subscription | unit | none`), `windowHours`, and
  **`replayHoursLeft` [derived]** when the state is `replay`;
- rights: `worldwide | restricted`, and if restricted, the **reason code** (`co-production |
  broadcaster | festival`) — never the sentence;
- language: `spokenLanguage[]`, `subtitles[]`, `surtitles[]`, `languageDependency`;
- audience: `viewers` when the state is `live` — and **only then** (the principle: never
  "0 LIVE NOW");
- taxonomy: `categoryId`, `genreId`, `tagIds[]`;
- media: a wide visual **and** a 3:4 poster, with known intrinsic dimensions.

**Three needs this shape imposes on the contract:**

1. **The state of a date changes without a request.** A card server-rendered at 20:29 says
   "house open"; at 20:31 it must say "live". The contract must carry the **transition
   instants** (house opening, start, end, replay expiry) so the surface can schedule the change
   without going back to the server. Serving a state label without its expiry instant makes any
   server-rendered page wrong within minutes.
2. **The price of a date in flight is not constant.** The "already started" rate is reduced
   *pro rata to the time remaining*. It is a value that depends on the instant it is read: it
   must come from the contract with its validity date, or be recomputable by `@arthome/core`
   from served parameters. It cannot be a frozen string.
3. **Two time zones, one of which the server does not know.** The viewer's time first, the venue
   time second when it differs. The server does not know the viewer's zone on the first render.
   The contract must therefore carry **the UTC instant and the venue's IANA zone**, and nothing
   else: that is the only shape which lets the surface resolve both times without a contradiction
   between server render and client render.

### 2. `ShowDetail` — the show

Consumed by: `live`, `artist`, `replay`, the purchase modals.

Title, synopsis, cast, **in both languages where they exist** (`title` / `titleEn` — the rule is
to render the *reader's* language, not the venue's), runtime, discipline, sub-genre, tags,
attributes, replay policy, wide visual and poster, `contentLanguage`.

**Need**: the contract must say which language is available for each translated field, not only
which language was requested. The surface switches language without reloading: it needs both
versions, or a way to get them without losing state.

### 3. `ArtistSummary` / `ArtistDetail`

Consumed by: `artists`, `artist`, `following`, `browse` (`artists` tab), `home` ("artists you
might follow" rail), the page of a date.

Name, avatar, discipline, city, country, **follower count**, bilingual biography, date joined,
**average audience**, last live, `isLive` **[derived]**, `isFollowed` **[session-dependent]**,
upcoming dates, available replays.

**Need**: `followers` and `avgViewers` are aggregate counters shown on four screens. They must
exist in one place only, with a declared freshness. A follower count that is 3% wrong does not
matter; a counter that differs between the artist page and the list does.

### 4. `VenueRef`

Consumed everywhere a date appears. Name, city, country, region, **IANA zone**, capacity, venue
type.

**Need**: `utcOffsetMin` must disappear from the contract (errata D3). Capacity is needed for the
fill rate — but since that rate is **[derived]**, the surface does not need the capacity: it
needs the rate. Serving the capacity and letting the surface compute recreates exactly the
two-places-one-value fault the project forbids.

### 5. `PriceTier`

Closed vocabulary, settled by `shared`: **`full | reduced | support`** (`enums.priceTier`).
Amount in canonical units + currency code. Each tier has a label by i18n code and a description.

**Need**: the price paid is not the tier price. The purchase summary carries
`tier + service fee + subscription discount − promotion = total`. **All four lines must come
from the contract**, computed server-side, never recomposed by the surface — this is exactly the
"an order total composed in two places" case the handoff names as the typical fault. The web
storefront shows a service fee per seat; its schedule is a business rule, not an interface
constant.

### 6. `Promotion`

Five reasons found, with distinct rules: `pre-sale` (up to D-7), `preview-night`,
`discovery-rate` (an artist's first stream), `final-date` (last of a run, until curtain up),
`late-rate` (already started, **pro rata**).

A promotion carries: the reason (a code), the struck-through price, the current price, **the
validity window**, and an explanatory note by i18n code.

**Need**: a promotion is never decorative — it changes the price paid. It must be **attached to
the date server-side**, with its window, and the current price must be the one the command will
accept. A promotional price displayed and then refused at payment is the worst possible fault on
a ticketing platform. Corollary: the purchase command must **reject** an expected price that no
longer matches, with an error code distinct from "payment failed".

### 7. `TaxonomyRef` and facets

2 universes, **21 disciplines**, **176 sub-genres**, **205 tags**, 7 attribute groups. The
taxonomy is reference data: near-immutable, shared by all five surfaces, bulky (≈ 400 entries
with their labels).

**Three needs:**

1. **The editorial `rank` is authoritative and no surface re-orders.** It must be served with the
   taxonomy.
2. **Filter values must be stable identifiers**, never array indices. The mockup filters on
   `fCats: [1]`, `fSubs: [0, 1]` — positions. That is a mockup convenience which survives
   neither a shareable URL, nor a saved search, nor the insertion of a discipline. The contract
   must carry `categoryId`, `genreId`, `tagId`.
3. **Facets must not be enumerated in the contract.** The web surface exposes nine filters today
   (discipline, sub-genre, price, date, status, almost sold out, has dates, on promotion, expiring
   soon), where the taxonomy declares seven further facetable attribute groups (`audience`,
   `minimumAge`, `seatingMode`, `intermission`, `accessibility`, `venueType`,
   `languageDependency`). If the filters are written one by one in the schema, adding
   "wheelchair accessible" is a contract change. **Need: a generic facet shape** — facet id,
   values, counts — plus a set of *structured* filters (price range, date range) which are not
   enumerations at all.

### 8. `SearchResultPage` — and the grouping problem

Consumed by: `browse`, `category`, `artist`, `following`.

The surface **does not render a flat list of dates**. It groups the dates of the same show under
a single card: "3 DATES · more dates (2)". The grouping is on (artist, show) and collapses and
expands client-side.

**This is the most structural need of the search page**, and it is in direct tension with the
"storefront = cursor" decision:

- if the API paginates **dates**, the client cannot group correctly: the second date of a show
  may fall on the next page, and the card duplicates;
- if the API paginates **shows** with their dates nested, the grouping is right, but the "this
  weekend" filter applies to a date, not a show, and the "soon" sort must be that of the *first
  matching date*, not of the show.

**Need: the contract must settle the pagination unit of search**, and serve, for each group, the
representative date chosen **and** the total number of dates in the group that satisfy the
filters. Without that second number, "more dates (2)" is wrong as soon as a filter is active.

### 9. `Ticket` — a held seat

Consumed by: `account/upcoming`, `account/past`, `home` ("your seats" rail), `live` (the
"YOUR SEAT · ATH-…" badge).

`ticketId`, date, show, artist, **seat code**, tier purchased, state **[derived]**
(`upcoming | house-open | live | past`), replay access and its window, invoice, cancellation
right and its deadline.

**Three needs, not one:**

1. **The seat code is shown on web, mobile and TV.** It must be **issued by the server**, never
   derived from an identifier client-side. The mockup computes it by hashing — a mockup
   convenience which, ported as is, would give three different codes for the same seat as soon as
   one surface changes its hash function.
2. **"A held seat opens the show."** Principle 3 of the handoff. The shape must therefore allow
   the question to be answered without a second call: *can this person start playback of this
   date, now?* The answer combines holding, the state of the date, the replay window, territorial
   rights and the subscription plan. It is an `@arthome/core` rule, but all its **inputs** must
   be in the response.
3. **Cancellation has a deadline** ("cancel up to 1 h before the start"). The deadline must be
   served as an instant, not as a sentence.

### 10. `Order` — and the fact that an order may not be ours

Consumed by: `account/orders`, `cart` (`done` step).

`orderRef`, order date, seller, lines (label, quantity, unit price, total), total, state,
invoice, tracking.

**The need nothing else carries**: the mockup distinguishes `source: arthome | shopify |
woocommerce | prestashop | drupal | api`, with `extRef` (merchant reference) and `extHost` (the
artist's own shop domain), and the warning: *"Order handled by the artist's shop. Tracking,
exchange and refund happen on their site."*

**So: the viewer's order list is a merged view over several commerce sources, some of which are
not ours.** That changes three things in the contract:

- an order state has two vocabularies: ours (`prep | shipped | delivered | digital`) and the
  opaque one of an external shop (`external`);
- an external order has **no invoice, no tracking and no refund** with us: the shape must own
  that explicitly rather than serve empty fields;
- reconciliation with the artist and the commission cannot cover what we never collected.

### 11. `CartLine` and `CartQuote`

Consumed by: the cart popover (three steps).

**Correction to the brief**: in the web mockup, **the cart carries merchandise only**
(`ticketing.cart.head` = "Merch cart"; lines are created only by a show's store). Buying a seat
is a **separate** journey, in a modal, immediate, outside the cart. I am not inventing a mixed
cart the design does not show — but I am flagging the divergence to the lead (see
Inconsistencies) because it changes the nature of the command.

What the cart imposes regardless:

- **an order is not single-seller**: each line carries its seller (the artist's channel). A cart
  with two artists is two shipments, two commissions, potentially
  two VAT rates;
- **shipping is computed at payment**, not on add ("Shipping calculated at checkout"). The
  contract therefore needs a **cart quote** command distinct from the payment command: subtotal,
  shipping, subscription discount (15% off stores for subscribers), total;
- **stock is real** (`on-sale | out-of-stock`): an item can become unavailable between the add
  and the payment. The quote must be able to invalidate a line.

### 12. `MerchItem`

`id`, show, selling channel, label, `kind` (`poster | print | textile | record`), price,
currency, stock, state.

**Two gaps for the contract to fill**: (a) there are **no variants at all** — a t-shirt with no
size; (b) `label` exists only in French, with no `labelEn`. A bilingual store on a catalogue
indexed in two languages cannot stop there.

### 13. `SavedSearch` — saved searches

Consumed by: `account/alerts`, `browse` ("save this search" button and the "already saved"
state), `category` (save the discipline), the "my related searches" side rail.

Carries: a free-text name (optional), **scope** (`search | category`) and the discipline when the
scope is a category, the keywords, **the full filter state**, the tab and the sort, the alert
channels (`push`, `email`), the active/paused state, the creation date, and **the number of
matches** (`account.alerts.alertMatches`).

**Three needs:**

1. **A saved search is a persisted query, not a string.** The contract must carry a stable,
   versioned criteria shape: if the filter vocabulary changes, yesterday's saved searches must
   still run, or declare themselves stale.
2. **The "already saved" deduplication is a criteria signature.** The mockup computes it
   client-side. It appears on two screens (`browse` and `category`) and it decides a write: so it
   is an `@arthome/core` value, normalised once, never twice.
3. **The match counter assumes the server re-runs the search.** Ten saved searches per account,
   one counter each, on the Account page: that is ten counting queries. To settle: a real-time
   counter, a dated periodic counter, or a "new since your last visit" counter — the three cost
   very different amounts.

### 14. `Notification`

Consumed by: the notification centre (header), `account/notifs`.

Event type (`live-start | date-soon | new-date | almost-full | replay-available`), subject
(artist or date), instant, read/unread, visual, destination action.

**Need**: the "unread" badge shows permanently in the header, on every route. It is therefore
**the personalised datum present on every page**, including the public indexable ones. See
§Next.js constraints: it is what forbids rendering the header inside the static shell.

### 15. `Plan` and `Subscription`

`planId`, monthly price, entitlements opened (`opens[]`), seat discount (`seatDiscount`), and for
the current subscription: since when, next charge, payment method, invoices.

**Need**: `opens[]` **conditions playback access** and the discount conditions the displayed
price. The access decision belongs to the domain; but the current plan's entitlements must be in
the response of any page that offers to watch, otherwise the surface makes a second call on the
critical path to playback.

### 16. `Device` and `Session`

Connected devices (kind: `tv | mobile | tablet | desktop | box | console | stick`, label, city,
last activity, current session), active sessions with browser and timestamp.

**Need**: "sign out this device" must produce an effect **observable on the targeted device**,
not only in the list. It is a write that must propagate — see §Commands. The Premium plan's "two
screens at once" entitlement (`multi-screen`) also implies a **concurrent playback count**, and
therefore a session datum on the playback side.

### 17. `Profile`, `Preferences`, `NotificationPrefs`, `Consents`

Profile (name, handle, email, phone, city). Playback preferences: quality, **what you see on
landing on a live** (`peek | muted | off`), chat open/closed, reduced motion, subtitle language,
display currency. Notifications: five families × three channels, plus **quiet hours** (no
notification between 23:00 and 09:00, except the start of a live I hold a seat for). Consents:
audience, personalisation, partners, advertising. Cookies: measurement, third-party player, and
an "essential" block that cannot be turned off.

**Needs**: (a) the **display currency** is an account preference whereas the billing currency is
a property of the date's market — the two cannot be the same value (errata D4); (b) the quiet
hours rule has an **exception conditioned on holding a seat**: that is a business rule of the
notification service, not an interface setting; (c) consents must be **timestamped and
versioned** — a consent with no version and no date is legally worthless, and
`account.privacy.updated` is already on screen.

### 18. `PlaybackGrant` — the right to watch

Consumed by: `live`, `replay`, the mini-player.

**Need**: playback is signed at the CDN edge (`streaming.md`). The surface needs a time-limited
playback token, a deadline, and a way to **renew it without interrupting playback**. Three cases
specific to the web storefront:

1. **The free preview**: a non-holder sees the first few minutes, then the lock. The countdown
   (252 s in the mockup, "the first 5 minutes" in the copy) must be **enforced by the token**,
   not by the client. A preview you extend by reloading the page is not a preview.
2. **The mini-player** survives navigation. The token must not be re-issued on every route
   change, or playback cuts on every click.
3. **A territorial block is a refusal to play**, not a technical failure: it has its own code and
   its own reason.

### 19. `ChatMessage`

Author, text, state (`ok | removed | muted | banned`), instant, author colour.
Chat mode per date: **`open | emoji | off | read-only`** (`enums.chatMode`).

**Needs**: (a) chat is **moderated**: a message can be removed after publication, so the state of
an already-displayed message must be able to change; (b) writing is closed under three distinct
conditions — visitor with no account, account holder with no seat, `read-only`/`off` mode — and
the surface must **say which**, so the refusal carries a code, not a boolean; (c) the `emoji`
mode restricts sending to a closed vocabulary of reactions and prepared phrases: that is server
validation, not a restricted keyboard.

### 20. `ReplayChapter` and `ResumePoint`

Chapters set from the control room: chapter-vocabulary identifier + minute. Resume point: date,
position, instant of last playback.

**Need**: the resume point feeds the home page's "Resume" rail **and** the player's opening
position, on three surfaces. It must be written by the client at a reasonable interval and read
as account data — it is a frequent write of low unit value: it calls for handling separate from
the other commands (no strict idempotency, tolerant of loss).

### 21. `Incident` and `Outcome`

`kind`: `hold-screen | postponed | interrupted | cancelled`. Resolution, instant, bilingual
editorial message.

**Need**: principle 4 of the handoff — "outcome states take priority over everything else". The
contract must therefore carry them **on the card**, not only on the detail page: a cancelled date
appearing in a rail must present itself as cancelled. And each outcome carries a distinct
consequence for the viewer, already written: full refund (3 to 5 business days), a credit on the
Arthome account, a seat that remains valid with no action at the new date. **These are three
different financial mechanisms**, and the contract must say which one applies and where the
viewer finds it.

### 22. `Invoice`

Subscription and order invoices, exportable, **retained for 10 years**
(`account.invoiceNote`, `account.privacy.retentionText`).

**Need**: this is the one exception to the rule "no formatted string ever travels" — a billing
document carries formatted, frozen amounts. The contract must say so, and serve a document, not
a template to recompose.

---

## Commands

Every command carries `Idempotency-Key`. Every error response follows the single envelope (code,
params, trace id). Commands are grouped by the guarantee they require.

### A. Money commands — strict idempotency, immediately observable effect

| Command | Expected effect | Specific guarantees |
|---|---|---|
| `purchaseSeat` | one held seat for a date, at a tier | **A double click never creates two seats.** The expected price (tier + promotion + discount) is sent and **verified**: if it has changed, refusal with a code distinct from a payment failure. A distinct refusal if capacity runs out between display and confirmation. |
| `contributeFreeSeat` | free seat + open contribution to the company | An **open** amount, entered by the viewer. Minimum and maximum are domain rules, not attributes of an input field. |
| `joinWaitlist` | waitlist registration | Idempotent by nature: two sends leave one registration. Must state the **rank** or refuse to state it, but not stay silent. |
| `cancelSeat` | cancel a seat | **Deadline: 1 h before the start.** A refusal after the deadline has its own code. Carries a refund. |
| `quoteCart` | quote: subtotal, shipping, subscription discount, total | A read, but **the quote must be binding**: the total shown is the one that will be charged. Explicit validity period. |
| `checkoutCart` | merchandise order | Strict idempotency. May fail partially (one line out of stock): the contract must say whether the order is refused wholesale or trimmed. |
| `subscribe` / `changePlan` / `cancelSubscription` | subscription plan | An **immediately visible** effect on playback entitlements and on displayed prices: a plan change changes the discount on every card in the session. |

**The shared need**: these seven commands change what already-rendered pages display. The
contract must say, for each of them, **which reads become wrong** — that is the condition for the
surface to invalidate exactly what it must (see §Next.js constraints).

### B. Relationship commands — idempotency by intent

`followArtist` / `unfollowArtist` · `addToWatchlist` / `removeFromWatchlist` ("my list") ·
`setReminder` ("remind me") · `saveSearch` · `renameSearch` · `pauseSearch` / `resumeSearch` ·
`deleteSearch` · `setSearchChannels` (push, email) · `saveCategory` (a category-scoped search).

They are **declarative**: "followed" is a state, not an increment. Two sends of the same "follow"
leave one follow. The contract must therefore express them as **state assignments**, not as
toggles — a toggle on a flaky network inverts the result.

**`setReminder` has a need of its own**: the reminder is announced 30 minutes before curtain up.
A reminder is a dated promise: if the date is postponed, the reminder must follow the
postponement, and if it is cancelled, the reminder must be cancelled and not fired into the void.

### C. Account and security commands

`signUp` · `signIn` · `signOut` · `signOutDevice` · `changePassword` · `enable2FA` /
`regenerateBackupCodes` · `addPasskey` · `addPaymentMethod` / `removePaymentMethod` ·
`updateProfile` · `updatePreferences` · `updateNotificationPrefs` · `setQuietHours` ·
`updateConsents` · `updateCookiePrefs`.

**`signOutDevice` is the only one that must propagate outside the current session**: signing a
television out from the web must cut playback on that television. The contract must say after how
long, and what the signed-out device sees.

**`updateConsents`** must timestamp and version. And the "advertising" consent is `false` by
default in the mockup: that default is a decision, not a setting — it belongs to the contract.

### D. Personal-data commands — GDPR

`exportMyData` · `exportInvoices` · `deleteAccount` · `contactDPO`.

**`deleteAccount` has a written business consequence**: *"Deletion cancels unused seats."* It is
therefore a **financial** command as much as a personal one: it triggers refunds, it touches
artist payouts that may already be computed, and it collides with the ten-year accounting
retention of invoices. It cannot be synchronous and it cannot be total.

`exportMyData` and `exportInvoices` are **asynchronous**: the surface must be able to follow a
request in progress and collect a document when it is ready.

### E. Playback and chat commands

`sendChatMessage` · `sendReaction` (`emoji` mode) · `reportMessage` · `recordPlaybackPosition` ·
`openPlayback` (obtaining the token) · `renewPlayback`.

`sendChatMessage`: needs a **rate limit expressed in the contract** (a dedicated error code, with
the wait time as a parameter), because the surface must disable the input cleanly instead of
stacking up refusals.

`recordPlaybackPosition`: a frequent write, tolerant of loss. It must **not** go through the same
idempotency regime as a purchase — otherwise the idempotency key becomes a cost per minute of
playback, per viewer.

### F. Support command

`contactSupport`: six topics (`ticketing-refund`, `playback-quality`, `replay`,
`store-shipping`, `account-signin`, `personal-data`), free-text message. A reply announced within
24 business hours, *"requests about a live in progress are handled first"*.

**Need**: the topic routes the message to a person, and the priority depends on the state of a
date. The contract must therefore accept a **context** (date, seat, order) attached to the
request, without which the announced prioritisation cannot be honoured.

---

## Real time

Three distinct regimes, not to be confused — they have neither the same cost nor the same
guarantee.

### Regime 1 — pushed, sub-second. Only on the page of a live date

| Datum | Acceptable latency | Why |
|---|---|---|
| Chat messages | < 1 s | It is a conversation. Beyond that, answers arrive before questions. |
| Message state change (removed, author muted) | < 2 s | A removed message that stays on screen is a moderation failure. |
| Incident in progress (`hold-screen`, interruption) | < 2 s | Principle 6: never a silent spinner. The hold screen must arrive before the viewer concludes it is their own connection. |
| `roomOpen` → `live` → `ended` transition | < 2 s | The "join" button must exist when the house opens. |

### Regime 2 — refreshed, on the order of tens of seconds

| Datum | Acceptable latency | Screens |
|---|---|---|
| Viewer counter | 10 to 30 s | `live`, and cards on `home`, `browse`, `category`, `artist`. **It appears on list cards**: one counter per card, on a grid of twelve, cannot be one subscription per card. |
| Capacity (`seatsAvailable`, "almost sold out", "sold out") | 15 to 60 s | Same screens. A date shown as available and then refused at purchase is acceptable once; systematically, no. |
| Waitlist | 60 s | `live`, cards. |
| "Already started" price (pro rata) | 60 s | It decreases with time. |
| Unread notification badge | 30 to 60 s | Header, **every route**. |

**The structural need here**: these values live on **list cards**, not on a detail page. The
contract must allow a **batch** of counters to be refreshed for a batch of identifiers, in one
call, rather than opening one subscription per card. Without that, a grid of twelve cards opens
twelve channels.

### Regime 3 — on expiry, with no request

Anything that changes at an instant **known in advance** must never be polled: it must be served
with its deadline, and the surface schedules the change.

- house opening (T−30 min), start, end of performance;
- **replay window expiry** (`replayHoursLeft`, up to 200 h);
- promotion expiry (`pre-sale` at D-7, `final-date` at curtain up);
- a seat's cancellation deadline (T−1 h);
- the end of the free-preview countdown;
- the validity of a cart quote, a playback token, a purchase code.

**Need: every value whose validity expires must travel with its expiry instant.** That is the
only way to server-render a page that will stay right. It is also what makes a cache duration
choosable: a page whose next change is in 4 hours is not in the same regime as a page whose next
change is in 90 seconds.

### What does not need to be real time, and must be resisted as such

An artist's follower count, average audience, the match count of a saved search, merchandise
stock (the `on-sale`/`out-of-stock` state is enough, the exact number is not), the playback
position on another device.

---

## Offline and recovery

The web storefront is not an offline application. But **four things must survive a network loss
or a reload**, and these are contract requirements, not implementation ones.

1. **The cart.** It is built up before payment, by successive adds from a live's store,
   potentially across several sessions. **Need: is the cart account data or browser data?** If it
   is account-side, it reappears on mobile and TV and survives everything; if it is local, it
   does not survive a change of device and that has to be said. The question is addressed to the
   backend.

2. **A purchase in flight.** The network drops between the send and the response: the surface
   does not know whether the seat exists. **Need: the same `Idempotency-Key` replayed must return
   the result of the first attempt**, not a duplicate error — that is the difference between a
   "safe replay" and a "refused replay", and only the first lets the surface offer "try again".

3. **The playback position.** Lost on a drop if it is only written at the end. It needs a
   periodic write, and a tolerance for conflict between devices (the mockup explicitly announces
   "cross-device resume"). Last writer wins is acceptable here, but it has to be decided.

4. **The search state.** Query, filters, sort, tab, page reached. It must live **in the URL**:
   that is the condition for a shareable link, a correct back navigation, and a server render.
   Contract consequence already noted: filter values must be stable, short identifiers.

**The chat message draft** deserves a mention: it is lost on every navigation in the mockup. That
is acceptable — but then the contract has nothing to say about it, and that is a decision.

### The four error families, and the distinction the surface must be able to make

`shared/i18n/system.json` has already named them, and principle 6 requires them:

| Family | Message | What the surface must be able to say |
|---|---|---|
| **The viewer's network** | "Your device can no longer reach the network. Arthome's servers are responding normally." | the problem is on your side |
| **Our servers** | "The problem is on our side, not with your connection." | the problem is on our side |
| **Territorial rights** | "Not available in your country" + the reason | neither: it is a rights matter |
| **Authorisation** | "You do not have a seat for this date" | neither: it is a missing purchase |

**Need: the error envelope must make this distinction readable from the code alone.** A generic
500 does not, and neither does a 403 with no reason. The codes must separate, at minimum: service
unavailability, territorial-rights refusal (with the reason as a parameter), missing entitlement,
capacity exhausted, stale price, deadline passed, rate limit.
---

## Pagination and volumes

Framing decision: **storefront = cursor, infinite scroll, deterministic sort with an identifier
tie-break.** What the web surface additionally requires, or puts under tension:

| List | Regime | Step | Expected volume | Specific need |
|---|---|---|---|---|
| `browse` results (lives) | cursor | **12 groups** | a few hundred to a few thousand dates | Pagination over **groups**, not dates. See shape 8. |
| `browse` results (replays) | cursor | 12 groups | same | |
| `browse` results (artists) | cursor | 12 | on the order of a hundred | `az` and `followers` sorts |
| `category` — overview | fixed slice | **8 per section** | 5 sections | No pagination: an overview is bounded. |
| `category` — `live`/`up`/`rep`/`art` tabs | cursor | 12 | tens to hundreds | |
| `home` rails | fixed slice | 5 to 12 | about a dozen rails | **No pagination.** A rail is an excerpt. |
| `categories` | no pagination | 21 | fixed | It all fits. |
| An artist's dates | slice + "all dates (N)" | 1 shown, N announced | tens | The **N must be served**. |
| A live's chat | sliding window + real-time tail | ~50 on entry | thousands per live | A bounded history, not infinite scroll into the past. |
| `account/upcoming` and `past` | cursor | ~20 | tens | |
| `account/orders` | cursor | ~20 | a few tens | merges several sources (shape 10) |
| `account/alerts` | no pagination | 10 in the mockup | a few tens | Ceiling to be decided. |
| Notifications | cursor | ~20 | hundreds | Plus a **global** "unread" badge. |
| Devices / sessions | no pagination | 3 to 10 | fixed | |

### The friction point, to be settled

**The surface shows "Show more · N left".** A cursor does not give a remainder. Three possible
ways out, and one must be chosen explicitly:

1. serve an **approximate total count** alongside the cursor (what a faceted search engine does
   naturally, and Arthome has one);
2. change the copy to "show more" with no number, and lose information the design judged useful;
3. serve only a boolean "there are more results".

The first is the only one compatible with the design, and it is free if search goes through the
search engine — **that is a question for the backend, not a surface decision**.

**Facet counts raise the same question**: showing "Dance (42)" next to a filter assumes a count
per facet, over the current query, on every keystroke.

---

## Error and loading states

What belongs to the contract, and not to layout.

1. **Skeletons, never a blank page** (principle 7): the surface must be able to render a card
   *before* it has its counters. **Need: separate what can be server-rendered straight away
   (title, visual, date, base price) from what arrives afterwards (viewer counter, capacity,
   current promotion, personalised state).** If both arrive in the same response, the whole page
   waits for the volatile part — and indexing pays for real time the crawler has no use for.

2. **Explicit empty states, with an action that breaks the deadlock** (principle 8). Fifteen
   distinct empty states are written in `shared/i18n` — none of them is generic. **Need: the
   response must say *why* the list is empty**: no result for the query, no result with these
   filters, nothing in this discipline yet, no followed artist live, no orders. An empty list
   with no reason forces the surface to guess, and to guess wrong.

3. **Inert actions are forbidden** (principle 10). Every command must return either an effect or
   an actionable error code. None may return an empty success.

4. **Partial failure must be expressible.** A `live` page whose chat is unavailable is not a page
   in error: the show goes on. **Need: one screen must be able to compose responses some of
   which failed**, each with its own code, without one region's failure taking down the page.
   That is what lets us display "chat is temporarily unavailable" instead of losing the live.

5. **The initial catalogue load is a first-class state.** The mockup carries a boot screen with
   its own error. On an indexable page, that state must **never** be what a crawler sees.

---

## Next.js-specific constraints

Only those that constrain the contract. I loaded `nextjs-how-to` first, as instructed.
**Disclosure required by that skill**: three of its routing rows read "none installed" for the
data-access boundary, the choice of authentication library and caching — so this document does
not rely on a specialised skill for those three subjects, only on the bundled documentation and
on the router's own rules. No skill contradicts the project's decisions.

### 1. The crawler does not see the static shell

Under the "Cache Components" model, **crawlers bypass the prerendered shell and receive a full
dynamic render**, detected by user agent. On a ticketing catalogue where indexing is decisive,
that has a direct contract consequence:

> **The unauthenticated read path of a catalogue page must be complete, self-sufficient and
> bounded in latency.** It cannot depend on a warm-up, on a per-instance local cache, or on a
> second round trip to complete the page.

Concretely: a date page, an artist page and a discipline page must be served **in one call**,
without a session, with everything indexable — and personalisation arrives afterwards,
separately.

### 2. The static shell cannot read the session — and the header needs it

Inside a cached function, neither cookies, nor headers, nor route params are readable: they must
be extracted outside and passed as arguments, where they join the cache key. Yet the storefront
header carries, on **every** route: the unread notification badge, the cart count, the session
state (visitor / signed in / subscriber), and the followed artists.

**Contract need: public reads and personalised reads must be separable.** A read model that
mixes "the date" with "do *you* follow it" can be cached neither for the crawler nor across two
different people. The separation asked for:

- **public, cacheable, indexable**: the date, the show, the artist, the venue, the taxonomy, base
  prices, the replay policy;
- **volatile, public**: viewer counter, capacity, current promotion;
- **personal**: seat held, follows, list, cart, notifications, plan entitlements, resume point.

It is the same separation that makes skeletons possible (§States) — it serves two needs at once.

### 3. Invalidation needs a key, and a signal

Next 16's cache model invalidates by **tag**, with two distinct calls: `updateTag` when the
person must see their own write immediately, `revalidateTag(tag, profile)` when slight staleness
is acceptable — and that second call **deliberately skips the immediate re-render**. The second
argument is not optional.

Two needs follow, and they are addressed to the backend:

1. **One invalidation key per resource.** After `purchaseSeat`, the surface must invalidate: the
   date (capacity), the account's seats, the personalised home. It needs to know **which tags**
   correspond, and those tags cannot be invented by the surface — otherwise mobile and TV will
   invent others.
2. **A signal for what the surface did not write itself.** A date goes live, a promotion expires,
   an artist publishes a replay: no web command caused any of it. Without a signal, the page
   stays wrong until the cache expires. **Question: does the storefront receive a change
   notification (server channel, webhook), or must it settle for a freshness duration?** Kafka
   being reserved for inter-service traffic, the BFF is the only possible point.

### 4. No cache entry survives a deployment

The cache key includes the build id. A deployment therefore empties everything, and the first
minute after a release sends the entire read traffic through to the BFF. **Need: public reads
must be served read models, not expensive compositions.** This is one more independent argument
for projecting the read models where the BFF reads them.

### 5. Every command is a public POST entry point

A server action is a public POST route: the page's redirect does not protect it, and the proxy
layer cannot serve as the authorisation boundary (four known bypasses). **Need: every command
must be authorisable on its own**, from the session and its own arguments alone — never "because
the page that calls it was protected". Concretely, every write command carries the identifier of
the resource it targets, and the contract says which ownership property is checked (is this seat
yours, is this saved search yours, is this message yours).
Corollary on idempotency: **the key must be generated server-side when the form is rendered**,
not client-side — otherwise it is forgeable, and two tabs produce the same key for two different
purchases.

### 6. URLs, indexing, and what is missing today

- **There is no canonical URL for a date.** The mockup addresses the `live` page by artist, and
  resolves "the current date" on arrival (live first, otherwise the next one). Yet a date is what
  you share, what you bookmark, what a reminder and a notification point at, what gets indexed.
  **Need: a public identifier and a stable `slug` per date and per show**, without which sharing,
  notifications, reminders and indexing all point at "the next date", which changes.
- **The overlays have no URL.** Cart, purchase, authentication, sharing. At minimum the purchase
  must be addressable: it is the target of a reminder and of a campaign link.
- **Two languages, two trees.** The API returns codes, the surface resolves them. Indexing needs
  one URL per language and cross-linked alternates. **Need: `slug`s must exist per language**, or
  be language-neutral — but the decision must be taken once, not per surface.
- **Filters must fit in a short, stable URL.** See shape 7.

### 7. The server render does not know the viewer's time zone

"The viewer's time first" is a principle. The server cannot honour it on the first render without
being wrong half the time, and a time rendered on the server then corrected on the client is a
visible divergence. **A need already stated in shape 1, repeated here because Next is what makes
it binding: the contract carries a UTC instant and an IANA zone, never a formatted time nor an
offset.** Resolving the viewer's time is the client's job; the venue time, by contrast, is
server-rendered and stays right.

### 8. The mini-player survives navigation

Playback continues when you change page. That forces a hierarchy where the player is not
unmounted between two routes. What touches the contract: **the playback token must not be bound
to the route**, and its renewal must not depend on a page mount.

### 9. Images

The visuals are remote. **Need: intrinsic dimensions and a stable host in the contract.** Without
dimensions, the layout jumps on load — which costs as much in indexing as in comfort. Without a
host known in advance, Next's image optimisation refuses the domain.

### 10. A zod major upgrade is a contract change

A reminder from the handoff, which weighs here: zod is a runtime dependency shared by seven
services and five applications, pinned. On the web surface it also validates form input.
**Need: a validation failure must translate into an i18n code**, never into zod's English
message — otherwise internationalisation leaks on the first form error, and it is the payment
form that leaks first.

---

## What I cannot get on my own → questions for the backend

In order of impact on the contract.

### Pagination, search, facets

1. **What is the pagination unit of search: the date or the show?** The surface groups the dates
   of one show under a single card and announces "N dates". Paginating dates breaks the grouping
   at page boundaries; paginating shows makes the "soon" sort and the "this weekend" filter
   ambiguous. This question determines the shape of `SearchResultPage` and, with it, the most
   used page in the product.
2. **Can the cursor be accompanied by a total count, even an approximate one?** The copy says
   "Show more · N left". If the answer is no, the design has to change; if yes, say what accuracy
   is guaranteed.
3. **Are per-facet counts served, and over which query?** "Dance (42)" next to a filter assumes a
   count over the current query, recomputed on every change.
4. **How does the contract express facets: enumerated or generic?** Seven attribute groups are
   declared in the taxonomy and never exercised (see Inconsistencies). If the filters are written
   one by one, each of them will be a contract change.

### Caching and freshness — the most urgent question for Next

5. **What is a resource's invalidation key, and who names it?** The surface must invalidate its
   reads after a write and on receiving a change. If each surface invents its own tags, they will
   diverge.
6. **Is the storefront notified of changes it did not cause** (a date goes live, a promotion
   expires, a replay is published), or must it settle for a freshness duration? Kafka being
   forbidden outside inter-service traffic, the answer necessarily goes through the BFF.
7. **What freshness does the BFF guarantee per read family?** Catalogue, capacity, viewer
   counter, promotion: I proposed latencies in §Real time, but those are needs, not commitments.
8. **Can the refresh of volatile counters be batched** — one call for twelve identifiers —
   rather than one channel per card?

### Money, commands, idempotency

9. **Does a replayed `Idempotency-Key` return the result of the first attempt, or an error?** Only
   the first answer lets the surface offer "try again" after a drop. It is the difference between
   a safe recovery and a lost seat.
10. **Is the price sent with the purchase verified server-side, and does the refusal have a code
    distinct from a payment failure?** With five promotion reasons, one of them computed pro rata
    to elapsed time, the gap between the displayed price and the valid price is structural, not
    accidental.
11. **What is the service-fee schedule, and at what level does it apply** — per seat, per order,
    per seller? The surface shows a "service fee" line in the summary.
12. **The subscription seat discount (`seatDiscount`) and the 15% store discount: who computes
    them, and do they stack with a promotion?** Three screens show a discounted price; if the
    stacking rule is not in the domain, it will be written three times.
13. **Is the cart account data or browser data?** If it is account-side, it must follow onto
    mobile and TV; if it is local, the design has to tell the viewer.
14. **Is the cart quote binding, and for how long?** Shipping is computed at payment: there is
    therefore an instant at which the total is fixed, and we need to know which.
15. **A merchandise order with two sellers: one order or two?** Two shipments, two commissions,
    possibly two billing markets. The answer changes the `Order` shape and the payouts.

### Store and external commerce

16. **How does the storefront read orders placed on an external shop** (Shopify, WooCommerce,
    PrestaShop, Drupal, API)? The "My orders" section shows them beside ours, with a merchant
    reference and a domain. Is this a synchronisation, a declarative link set by the artist, or a
    one-off import? The point is absent from the context map, as is the store itself (errata C8).
17. **Does merchandise have variants?** A t-shirt with no size is not sellable. And `label`
    exists only in French.

### Ticketing and access

18. **Who issues the seat code, and in what form?** It is displayed identically on three
    surfaces: it cannot be derived client-side.
19. **The "a held seat opens the show" rule: which inputs does the surface receive to settle it
    without a second call?** Holding, the state of the date, the replay window, territorial
    rights, plan entitlements — five inputs, one verdict.
20. **Is the free preview enforced by the playback token** (duration, non-renewable for the same
    viewer), or only by the client? In the second case, reloading the page
    is enough to extend it.
21. **The Premium plan's "two screens at once" limit: who counts it, and what does the third
    screen see?**
22. **A cancelled, refunded or credited seat: how does the viewer get their money back?** Three
    outcomes, three distinct mechanisms already written (refund within 3 to 5 days, a credit on
    the Arthome account, a seat valid at the new date). The account credit is an internal
    currency — it appears nowhere else in the handoff.

### Account, notifications, personal data

23. **The match counter of a saved search: real time, periodic, or "new since your last visit"?**
    Ten searches per account, one counter each, on a single page.
24. **A saved search is a persisted query: how does it survive a change in the filter
    vocabulary?** It must still run, or declare itself stale.
25. **Does "sign out this device" cut playback in progress on that device, and how quickly?**
26. **Account deletion cancels unused seats.** It is therefore financial: refunds, artist payouts
    possibly already computed, the ten-year accounting retention of invoices. What is the real
    scope of the deletion, and what is its delay?
27. **Are exports (data, invoices) asynchronous, and how does the surface follow a request in
    progress?**
28. **Does chat have a rate limit expressed in the contract**, with a wait time as a parameter?
    Without it the surface can only stack up refusals.

### Cross-cutting

29. **Can the display currency chosen by the viewer and the billing currency of a date differ?**
    Errata D4 notes that multi-currency is declared but never exercised; the account preference
    nevertheless exists in the interface.
30. **What latency does the dynamically served label catalogue guarantee at server render?** The
    web storefront resolves its i18n codes **on the server** in order to be indexable. If the
    catalogue is a network call on the render path, it becomes a critical dependency of every
    public page. The build-time snapshot is the mandatory fallback — but then a typo fix is only
    visible on the web at the next deployment, and the need that motivated the dynamic catalogue
    (mobile and TV) does not concern this surface.

---

## Inconsistencies found

None has been applied. The seven in family **D** of `corrections-handoff.md` were encountered as
announced and are handled above (`languageDependency` vocabulary, two publication-state
vocabularies, frozen time zones, a single market, the payout formula, two levels of sanction,
offsets in minutes). What follows is **in addition**.

1. **The web storefront's cart does not carry seats.** The brief describes a cart carrying
   "seats **and** merchandise, with shipping". In the mockup, cart lines are created only by a
   show's store (`ticketing.cart.head` = "Merch cart", `ticketing.cart.emptyHint` = "Merch is
   added from a live's store"), and buying a seat is a separate journey, in a modal, with no cart
   involved. Shipping is indeed there, on the merchandise. **The divergence changes the nature of
   the command**: either the contract provides for a mixed order the design does not show, or it
   provides for two distinct orders. For the lead to settle.

2. **Three plan vocabularies, mutually incompatible.** `catalogue.json` declares `free` (0),
   `pass` (€12), `premium` (€24). The i18n declares six values: `free`, `pass`, `premium`,
   `monthly`, `season`, `none`. The web's `plans` page shows three others: `free`, `unit`
   ("single seat, from €7"), `sub` ("subscription, €14 / month"). And the reference account
   carries `plan: "season"`, which exists in none of the `plans` lists. The contract must fix a
   single set, and distinguish what is a **plan** from what is a **purchase mode** (a single seat
   is not a subscription).

3. **The plan entitlements do not line up either.** `catalogue.json` uses nine `opens[]` values
   (`browse`, `trailers`, `free-dates`, `replays`, `no-ads`, `one-live-month`, `all-lives`,
   `multi-screen`, `archive`), whereas `corrections-handoff.md` C7 cites only six. That is not a
   divergence in the handoff but an imprecision in the note: all nine really are in the data.

4. **`chatMode`: `open` or `free`?** `catalogue.json` and the i18n say `open | emoji | off |
   read-only`; the web mockup keeps a parallel table `free | emoji | off`. That is exactly the D2
   fault (two vocabularies for the same state machine), on another field. The `catalogue.json`
   vocabulary must be authoritative.

5. **Sub-genre: one or several?** `taxonomy.json` declares the sub-genre "optional, **multiple**,
   closed vocabulary". `catalogue.json` carries a **singular** `genre` field, and `helpers.js`
   reads it as singular — yet the web's search filter is multi-select. The contract must settle
   the real cardinality.

6. **A date's `attributes` field actually carries tags.** The values observed are `revival`,
   `new-creation`, `opening-night`, `open-air`, `archive` — that is, *tags* in the sense of
   `tagPolicy` ("a tag sits on the date as readily as on the show"), and not values of the
   taxonomy's seven `attributes` groups. A name collision between two distinct notions, to be
   fixed at porting time.

7. **Six of the seven attribute groups are declared and never carried.** `minimumAge`,
   `seatingMode`, `intermission`, `accessibility`, `venueType` are set by no show, no date and no
   venue; only `audience` is, and by a crude rule (circus and musical → `family`, everything else
   → `all-audiences`). The same trap as D4: an intention declared in the data, never exercised by
   a screen. `accessibility` in particular is an accessibility promise displayed nowhere.

8. **No reference show carries any tag.** `shows[].tags` is empty throughout `catalogue.json`;
   only the generated fixtures set any. The 205 tags therefore exist as a vocabulary with no
   exercised use — which weakens the lateral pill navigation that `tagPolicy` describes.

9. **`i18n/index.json` declares wrong key counts**: 243 announced for `storefront.json` (671
   actual), 627 for `taxonomy.json` (437 actual). With no consequence for the compilation tool,
   which checks against the key map and not against those numbers — but an index file that lies
   about its own contents will be copied into a contract.

10. **The merchandise label exists only in French.** `merchPool` carries no `labelEn`, and the
    mockup uses the same field for both languages. On a bilingual catalogue indexed in both
    languages, that is a data gap, not a translation gap.

11. **Venue capacity is the basis of the fill rate, and the mockup contradicts it.** The rate is
    computed from `venue.capacity`, but the "seats left" label applies a constant of 2000 seats
    independent of the venue. A mockup convenience — but it shows that the fill rate and the
    number of seats left are currently two independent values: the contract must serve only one
    source for them.
---

## Confrontation

> **Round 3.** The offer is written; I am contesting it on the evidence. Documents read:
> `answers-to-surfaces.md` (my 30 questions), `context-map.md`, `data-model.md`, `events.md`,
> `realtime.md`, `transport.md`, `critical-rules.md`, `adr-auth.md`, `adr-payments.md`,
> `adr-stream-entitlement.md`, `openapi/storefront.yaml`, `DECISIONS.md`.
>
> The contract is good. It is even better than what I asked for on about ten points, and I say so
> below. But **three holes stop it running my surface**, and two of them go to the very reason
> the web storefront exists: being indexable, and taking money.

---

### What is satisfied — briefly, because it is most of the volume

**All 30 of my questions have an answer** (`answers-to-surfaces.md`, "storefront web" section),
and none of them dodges. The points where the contract does exactly what I asked:

- **The pagination unit of search is the show**, with the representative date *and*
  `matchingDatesCount` (`ShowGroup`). That was my first structural question; it is settled the
  right way, with the precision that was missing — "the *this weekend* filter applies **before**
  the grouping". The label "more dates (2)" is finally true under a filter.
- **The approximate count exists and declares its guarantee** (`CursorPageInfo.approximateTotal`
  + `totalIsLowerBound`, exact up to 10,000). "Show more · N left" becomes honest without
  promising a count an index does not give. I did not expect the cursor/remainder tension to be
  resolved this cleanly.
- **Facets are generic** (`Facet { facetId, values[{id, count}] }` + `StructuredFilter`), counted
  over the current query, **in the same response**. Adding "wheelchair accessible" is no longer a
  contract change.
- **Every perishable value travels with its instant**: `displayStateValidUntil`, `roomOpensAt`,
  `replay.expiresAt`, `promotion.validUntil`, `PriceTier.validUntil`, `cancelDeadline`,
  `EnvelopeMeta.servedAt` / `validUntil`. That was my second structural need. It is honoured
  throughout, and `realtime.md` §2.4 draws the right conclusion: those transitions **do not go**
  over the channel.
- **Idempotency**: replayed key → original response, `Idempotency-Replayed` header, 24 h
  (`transport.md` §5.4). That is the difference between a safe recovery and a lost seat, and it
  is settled on the right side.
- **`PRICE_STALE`** distinct from a payment failure, with the current price as a parameter, and
  `expectedTotal` mandatory on `purchaseSeat`. `SOLD_OUT`, `SEAT_EXPIRED` and `PAYMENT_DECLINED`
  exist too. The structural gap between displayed price and valid price is treated as structural.
- **The seat code is issued by the server** (`TicketCard.seatCode`), the service-fee schedule is
  served (`DateDetail.serviceFee.perSeat`), the no-stacking rule for discount and promotion is an
  `@arthome/core` rule (D-017), the cart lives on the account with a **server rank** per line,
  the quote is binding for 15 minutes and shipping is computed **at the quote**.
- **`canonicalUrl` served, never constructed**: that is the first-order gap I had flagged ("there
  is no canonical URL for a date"), and it is filled, with a `slug` per language.
- **`x-arthome-invalidates` is declared operation by operation.** I asked "who names the keys";
  I get better: every write says what it makes stale.
- **`emptyReason` + `emptyActionCode` in `CursorPageInfo`.** I asked for a reason for emptiness;
  I get a reason **and** the action that breaks the deadlock.
- **`WatchVerdict` with `advisory: true`** and the same refusal vocabulary on both sides. Two
  evaluation sites, one implementation. That is the best possible answer to my question 19.
- **`degraded[]` in the envelope**: an overlay that fails degrades the card instead of sinking the
  screen. That is exactly the partial failure I asked to be able to express (§States, point 4).

On the number of round trips, the announced count checks out **screen by screen, from the surface
side**: `home` 1 call, `browse` 1, `categories` 1, `category` 1, `artists` 1, `artist` 1, `plans`
1, `account` 1 (+1 per paginated list opened), cart 1 per step, purchase 2 before payment, `live`
3 (detail, player, chat) — and those three are sequential by nature, not by clumsiness. **The
budget holds.** Batching the counters (`counters:subscribe { dateIds }`, differential tick)
answers precisely what I was asking for: never one channel per card.

---

### What is not

#### ❶ The whole catalogue sits behind a session — and my surface exists to be indexed

**On the evidence.** `openapi/storefront.yaml`, l. 102-105:

```yaml
security:
  - sessionCookie: []
  - bearerToken: []
```

That global requirement is overridden **four times** in the whole file: `/v1/devices`
(`security: []`), `/v1/viewer-context` and the three pairing paths (which add `deviceToken`).
Everything else inherits it. So **`/v1/home`, `/v1/search`, `/v1/dates/{dateId}`,
`/v1/categories`, `/v1/categories/{categoryId}`, `/v1/artists`, `/v1/artists/{artistId}` and
`/v1/plans` require an authenticated session or a bearer token.** `/v1/home` even lists `401`
explicitly.

**Three consequences, and they are serious.**

1. **A crawler has neither a cookie nor a bearer token.** It does not run a `POST /v1/devices` to
   manufacture one, and it would not do so even if it could. The server render of a date page, an
   artist page or a discipline page can therefore produce **nothing but** the authentication
   error page. A public ticketing catalogue where no page is readable without an account is not
   indexable — that is, it does not perform the function for which this surface was chosen in
   Next.js. `README.md` §2 defines it in exactly those terms: "Indexing and server rendering are
   decisive: this is a ticketing catalogue."
2. **Guest mode has no contract.** The mockup makes it a first-class state:
   `account.guest.banner` ("You are browsing as a guest: free previews are open, a ticket unlocks
   the whole show"), `account.auth.alt` ("Or continue without an account"), and four distinct
   gates (`guest.chat`, `guest.follow`, `guest.save`, `guest.bannerCta`). The contract does
   recognise the notion: `ViewerContext.signedIn: boolean` and `currentProfileId: null` admit it,
   and `deviceToken` exists. **But `deviceToken` is accepted on no catalogue path.** A registered
   visitor therefore cannot see the home page.
3. **`GET /v1/changes` also requires a session** (`401` listed) and accepts only
   `scope: profile | device`. See ❸.

**This is not a detail overlooked**: it is the one thing `nextjs-how-to` flags as the trap
specific to my stack — *"Bots and crawlers bypass the shell entirely — detected by user agent and
rendered dynamically"*. The crawler's path is the **dynamic** path, therefore the path that calls
the BFF. If that path requires a session, there is no fallback.

**What I am asking for**: that the eight catalogue paths declare `security: []` — or at minimum
accept `deviceToken` **and** the complete absence of authentication — and that the contract write
down what an anonymous response contains (no `watchVerdict`, no `viewerRelations`, no
`viewerProgress`). This is not an accommodation: without it, my surface's server render has
nothing to render.

#### ❷ No payment confirmation step — the web cannot take money

**On the evidence.** `adr-payments.md` §2:

| storefront web | **Payment Element** (Stripe.js) | renders the price, 3-D Secure and local payment methods without the card touching our domain |

and §(order state): `awaiting_action` ← "3-D Secure in progress" ← `requires_action`. The
vocabulary is carried over into the contract: `Order.state` is
`[pending, awaiting_action, processing, paid, failed, refunded, partially_refunded, disputed]`.

**But no operation makes it possible to reach that state, or to leave it.**
`POST /v1/orders/seats` only answers `201` with `order.state: paid`; `POST /v1/orders/merch` the
same; `PUT /v1/subscription` the same. None of the three returns a `clientSecret`, a
`paymentIntentRef`, a `nextAction` or a return URL; none declares a `202` response. Stripe's
Payment Element **requires** a `client_secret` produced server-side, and `confirmPayment()`
**requires** a `return_url` for the 3-D Secure redirect.

This is not a refinement: in Europe, strong customer authentication is mandatory on a significant
share of card payments. A purchase journey that does not provide for `requires_action` **fails in
production on perfectly valid payments**, and it fails silently — the order stays
`awaiting_action` and nothing picks it up.

**And the corollary, on the same screen**: `AccountScreen.paymentMethods[]` is **read-only** and
there is **no command** to add or remove a payment method from the web. The `payment-method`
intent exists for TV pairing (`adr-auth.md` §4) — that is, the only surface able to register a
card is the one with no keyboard. The account's `security` section nevertheless shows "Payment
methods · 2 SAVED CARDS · **Manage**".

#### ❸ The invalidation feed that drives `revalidateTag` does not exist in the contract

That was my question 6, and the answer is "yes, through the BFF" — which I had anticipated and
which is right. But **the server half of that answer has no operation.**

`realtime.md` §5.2 writes:

> "For Next's server render, the BFF **additionally** exposes a per-tag invalidation feed that
> the Next server consumes in order to call `revalidateTag`."

That feed **exists nowhere in `openapi/storefront.yaml`**. The only mechanism delivered is
`GET /v1/changes`, and three of its properties disqualify it for this use:
- it requires a session (`401` listed);
- its `scope` is `profile` or `device` — **the Next server is neither**. It renders pages for
  everybody and for nobody;
- it is a **pull** (`?since=`), not a push. A render server is not going to poll an endpoint every
  second to find out whether a date has gone live.

**Worse, the contradiction is internal to the contract.** The `ChangeFeed.invalidated` vocabulary
declares eight tags:

```
date:{id} · date:{id}:availability · artist:{id} · category:{id}
account:tickets · account:orders · account:subscription · home:rails
```

Yet the union of all the `x-arthome-invalidates` in the file is:

```
account:cart · account:devices · account:orders · account:profile
account:subscription · account:tickets · date:{dateId}:availability · home:rails
```

**The two lists do not match, in either direction:**

- `account:cart`, `account:devices` and `account:profile` are **emitted** by writes but
  **absent** from the feed vocabulary. A cart modified on another device — a case `realtime.md`
  §2 explicitly provides for on the `viewer:{profileId}` room — therefore never invalidates
  anything on the Next server;
- **`date:{id}`, `artist:{id}` and `category:{id}` are in the vocabulary and are emitted by no
  operation.** Those are precisely the three tags of the **public, indexable** pages, and
  therefore the only three the server render needs to invalidate. They have a name and no
  declared producer.

Put another way: the exact case my question 6 raised — *a date goes live, a promotion expires, an
artist publishes a replay, and the storefront did not cause any of it* — received an answer in
principle, a tag name, and no mechanism.

**What I am asking for**: a named operation, not authenticated by session (the render server
authenticates with a service secret, not with a viewer's cookie), that pushes or exposes the
**public** tags; and the alignment of the two lists, in the same file.

#### ❹ Five screens — or half-screens — are not served

**(a) `following` — the whole page has no entry point.**
It shows the followed artists, their upcoming dates, and the "Followed, live now" section
(`discovery.side.followLive`, `discovery.search.emptyFollowLive`). Yet:

- `/v1/me/follows/{artistId}` exposes only `PUT` and `DELETE` — **there is no collection**
  `GET /v1/me/follows`;
- `/v1/artists` accepts `categoryId`, `sort` and `liveOnly`, **not `followedOnly`**;
- `AccountScreen` does not carry the list of follows;
- `HomeScreen.rails[].kind` does contain `followed`, but that is **a home page rail**, not a
  page: it has no sort, no view toggle, no unfollow in place, and none of its empty states.

The only way to paint this page today is to walk `/v1/artists` in full and filter on
`followedByViewer` client-side — that is, exactly what the contract forbids elsewhere, and
rightly so (`Rail`, note: "the mockup loads 1,814 dates and filters client-side, which the
contract must make impossible").

**(b) `account/faves` is half served.** "My favourites" carries two collections: the **followed
artists** and the **saved shows** (`account.alerts.savedShows`). The second has
`/v1/me/watchlist`; the first is the same hole as in (a).

**(c) `account/security` is read-only.** `AccountScreen.security` returns
`{ twoFactorEnabled, passkeyCount, hasPassword }`. The four rows of the screen each have an
action — *change* the password, *manage* 2FA, *add* a passkey, *manage* payment methods — and
**none has an operation**. `adr-auth.md` §7 places those functions in `identity` via better-auth,
which is a good choice; but the document nowhere says **how the web surface reaches them**, while
`critical-rules.md` rule 1 states that a service is only ever called by the BFF. The contract the
lead points to as mine is silent on four actions of a screen I enumerated.

**(d) Authentication itself has no contract on my surface.** Create an account, sign in with
email and password, sign in with Google or Facebook, sign out, reset a password: no operation in
`openapi/storefront.yaml`. The only identity paths delivered are device pairing (the TV journey)
and `DELETE /v1/me/device-sessions/{sessionId}`. The web's authentication modal is the **front
door** of the product; it is not in the product's contract.

I understand the intent — better-auth mounts its own routes. But then the contract must **say**
where they are mounted, under which domain (the session cookie's scope depends on it, and with it
the Next server's ability to read the session), and how they compose with the BFF. Otherwise three
surfaces will make three assumptions.

**(e) A filtered `category` is not served.** `GET /v1/categories/{categoryId}` accepts only
`categoryId`, `Surface` and `Traceparent`: **no `section`, no `cursor`, no `limit`, no filter, no
sub-genre.** Yet the response carries `sections[].nextCursor` and `facets[]`, and its description
announces: "The four other sections each carry their own cursor." **No operation accepts that
cursor.** The page's four "Show more" buttons lead nowhere, and the discipline's own filter panel
(price, date, status, almost sold out, on promotion, sort, sub-genre) has no parameter to land in.

The same fault hits the home page: `Rail.nextCursor` exists and **no operation consumes it**.
Three cursors served, zero consumers.

#### ❺ The server render does not hold — and I acknowledge I never put it as a question

This was my Next.js constraint number 2, not one of my 30 questions: **public and personalised
reads must be separable**, because a function cached by Next can read neither cookies, nor
headers, nor `searchParams`. The contract therefore refused me nothing — it was not asked. I am
raising it now because it is the lead's question 4, and the answer is no.

**On the evidence**: `DateCard` carries in the **same object** the public body (title, instants,
capacity, prices, rights) **and** three per-viewer overlays — `watchVerdict`, `viewerRelations`,
`viewerProgress`. `HomeScreen.rails[].items`, `CategoryScreen.sections[].items`,
`ShowGroup.representativeDate`, `ArtistDetail.upcomingDates` and `listMyReplays` all return
`DateCard`s. There is **no public variant**, no parameter asking for the overlays to be omitted,
and no declared `Vary` or `Cache-Control` header.

`answers-to-surfaces.md` Q6 (storefront TV) does answer this family of problem — "compose at the
BFF with a short cache: the public body in a Redis cache, the overlay merged at request time".
**That is the right answer to the BFF's problem, and it is not an answer to mine.** On the client
side it produces a single response that varies per viewer. For Next, there are only two outcomes:

- cache that response → **we serve one visitor another visitor's personal state**. That is a leak,
  not a trade-off;
- cache nothing on the indexable routes → every visit and every crawl traverses the BFF end to
  end, and the prerendered shell buys nothing at all.

The `ETag` on `GET /v1/dates/{dateId}` makes the point worse rather than better: since the body
varies per viewer, the validator varies with it, and the shared prefetch it promises the TV does
not hold for a shared cache.

**What I am asking for** is small and mechanical: that the catalogue paths accept an **anonymous
read**, which the contract declares omits `watchVerdict`, `viewerRelations` and `viewerProgress`
and is **identical for every unauthenticated caller**. That is `degraded[]` raised to an explicit
mode — the shape already exists, it just cannot be requested. Together with ❶ and ❸, that closes
all three holes at once.

#### ❻ The small things, each verifiable in a minute

1. **`/v1/search` loses a sort.** `sort: [relevance, soon, popularity, price_asc]` — `price_desc`
   is missing, while `shared/i18n/storefront.json` carries
   `discovery.filter.sortPriceDown | Prix ↓` and the mockup exposes it in the same list as the
   other four. Four sorts out of five.
2. **`filters` is a `{ type: string }` with no grammar.** It is the most important parameter of
   the most used screen, and the only one in the file that is not typed. Since the OpenAPI is
   **generated from zod**, a free string means zod validates nothing. Three surfaces will
   serialise it three ways, and `SavedSearch.criteria` (`additionalProperties: true`) will not
   arbitrate between them — even though `criteriaSignature` is produced by
   `normalizeSearchCriteria()` in `@arthome/core`, so a normalised shape **already exists**. It
   needs publishing.
3. **The free-preview budget is nowhere.** `WatchVerdict.previewSecondsLeft` gives the
   **remainder**; `DomainConstants` does not carry the **total**. The "4 min 12 left" countdown
   therefore has a remainder and no total, and the copy says "the first 5 minutes".
   `critical-rules.md` rule 15 requires an operational constant to have an owning document: this
   one has none.
4. **Two error codes announced and never named.** `cancelSeat`: "a refusal after the deadline
   carries its own code" — that code exists in no list. `quoteSeat`: "minimum and maximum [of the
   open contribution] are domain rules, and the refusal carries its own code" — likewise. A code
   that is not named will be invented three times.
5. **The quote's address and the payment's address can diverge.** `quoteCart` computes shipping
   from `{ shippingCountryCode, shippingPostalCode }`; `checkoutCart` receives a full
   `shippingAddress` and nothing says it must match. A "binding" quote whose address changes in
   between is no longer binding, and no refusal code covers that case.
6. **`emptyReason` carries seven values** for some fifteen empty states written in `shared/i18n`.
   Missing at least: no artist **followed** (distinct from `no_followed_artist_live`), empty cart,
   no saved search, and the three empties of the discipline page which the copy distinguishes
   (`emptyCatLive`, `emptyCatUpcoming`, `emptyCatReplays`) where `nothing_in_category_yet`
   conflates them.
7. **The preferred subtitle language has disappeared.** `ViewerPreferences.account` carries
   `subtitlesDefault: boolean`; the mockup carries `prefs.subs: 'fr'`, a **language**. Turning
   subtitles on and choosing their language are two settings.

---

### What is satisfied otherwise than asked — and whether that suits me

| What I asked for | What I get | Verdict |
|---|---|---|
| A match counter per saved search | **"New since your last visit"**, pushed by the *percolator*, reset on read (Q23) | **Better.** Ten searches cost zero counting queries instead of ten. I withdraw my question. |
| To know whether the price is verified at purchase | `PRICE_STALE` **plus** a mandatory `expectedTotal` in the body | **Better**: the contract makes the fault impossible to ignore, instead of reporting it after the fact. |
| A reason for an empty list | Reason **and** `emptyActionCode` | **Better** — subject to point ❻.6. |
| That `decideWatch` give me enough to paint without a second call | Two evaluation sites, `advisory: true`, **the same refusal vocabulary** on both | **Better.** The `advisory` flag is the precision that stops the surface believing it decides. |
| Who names the invalidation keys | `x-arthome-invalidates` **per operation** | **Better** in principle — unusable as it stands, see ❸. |
| The display currency as a preference (Q29) | **Withdrawn** (D-016), the withdrawal declared reversible | **That suits me, and I am not contesting it.** The argument is right: showing a converted price you cannot charge is a lie, and D4 shows no rule has ever been exercised on two rates. **One consequence to write down anyway**: my surface is the one where a Swiss or Canadian visitor lands from a search engine, and the indexed page will show a price in euros to everybody — including in the structured data an engine reads. That is not a defect, it is a fact to own explicitly rather than discover. |
| Two commands, seats and merchandise | **D-011: two distinct commands** | **That suits me** — it is what I verified against the lead's instruction, and the contract follows the design rather than the intention. |
| That the label catalogue not be on the render path | The web resolves its codes **from the build-time snapshot** (Q30) | **That suits me, with its owned consequence**: the dynamic catalogue never serves the web, and a typo waits for a deployment. It is coherent — the need that motivated it was mobile and TV. |
| Shipping at the quote | Computed at the quote from country + postcode, binding for 15 min, **grouped per seller** | **Better** — subject to ❻.5. |

---

### Questions left unanswered

None of my 30 questions is unanswered — `answers-to-surfaces.md` keeps its promise. The questions
below are **new**, born of reading the offer:

1. **What exactly does a crawler receive?** (❶) Which authentication, which body, which fields
   omitted, which freshness. Until that is written, my surface's server render is an intention.
2. **Where are the authentication routes mounted, under which domain, and how does the Next
   server read the session?** (❹d) The cookie's scope decides everything: if the cookie is set by
   `identity` on a different domain from the BFF, the Next server does not see it and no
   personalised page renders server-side.
3. **Which operation returns the `client_secret` and the payment's return URL, and which
   operation resumes an order left in `awaiting_action`?** (❷)
4. **Which operation adds or removes a payment method from the web?** (❷)
5. **Which operation consumes `Rail.nextCursor` and `CategoryScreen.sections[].nextCursor`?** And
   through which parameters does the discipline page filter? (❹e)
6. **Who emits `date:{id}`, `artist:{id}` and `category:{id}`?** No operation declares them, and
   they are the only three that matter for a cached public page. (❸)
7. **Is there a collection of followed artists**, or a `followedOnly` on `/v1/artists`? (❹a)
8. **Is the free-preview total a served domain constant**, and where? (❻.3)
9. **What is the published grammar of the `filters` parameter**, and is it the same shape as
   `SavedSearch.criteria`? (❻.2)

---

### One source inconsistency, spotted along the way

To be added to the eleven already listed, because it will be met at porting time:
**`shared/i18n/storefront.json` carries `support.topic3Hint` without `support.topic3`.** The third
topic of the help form — the one about replays — has its hint text and not its label, while the
other five have both. The server-side contract is right (`topic: enum [..., replay, ...]`); it is
the copy that is missing.
