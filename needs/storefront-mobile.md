# Needs — storefront mobile (React Native)

> Surface: storefront mobile, React Native, portrait and landscape, five bottom tabs.
> Sole author of this file. Written at time 1. The **Confrontation** section required by D-007
> was added at time 3.
>
> This document states **what the contract must carry or guarantee**. It describes no screen:
> the mockups are the design.
>
> Sources read: `shared/helpers.js` (in full), `shared/catalogue.json`, `shared/fixtures.js`
> (dates, accounts, chat and store sections), `shared/taxonomy.json`, `shared/i18n/`,
> `mockups/Storefront Mobile.dc.html` (read in fragments, never whole),
> `architecture/corrections-handoff.md`, `DECISIONS.md`.
>
> Skills loaded, per D-001 (no React Native orchestrator exists): `react-core`,
> `react-native-best-practices`, `react-server-state`. None contradicts a project decision;
> three of their findings **constrain the contract** and are carried into "Offline, background
> and resume" and "Constraints specific to React Native".
>
> *Translated from French in full at the project lead's decision that everything technical is
> English from now on. Nothing was rewritten in the process.*

---

## Screen inventory

### Correction to the lead's list

The list I was handed counted sixteen screens. Reading the mockup gives **twelve**. Four entries
were not screens at all:

| Entry on the list | What it actually is | Evidence |
|---|---|---|
| `tiles` | a **display mode**, `view: 'tiles' \| 'list'` | initial state `view: 'tiles', followView: 'tiles'` |
| `list` | the other value of that same mode | `view === 'list'` |
| `chat` | a **tab of the side panel** of `live` | `tab: 'chat' \| 'store'` |
| `store` | the other tab of that same panel | `goStore: () => setState({ page: 'live', tab: 'store' })` |

The distinction is not cosmetic as far as the contract goes: a display mode changes the **density**
of a list (hence the page size requested — see "Pagination and volumes") without changing the shape
served; a panel tab shares the **lifecycle and the realtime channel** of the screen that carries it,
and therefore cannot be served by an independent read.

### The twelve routes

| Route | Introduces | Cross-reference where nothing is new |
|---|---|---|
| `home` | `DateSummary`, `ArtistSummary`, bounded rails, the resume point, the guest banner | — |
| `browse` | full-text search, facets, sorting, **infinite scroll**, `SavedSearch` | — |
| `categories` | the whole taxonomy (21 disciplines across 2 universes, editorial rank) | — |
| `category` | facets narrowed to one discipline, sub-genres, four anchored sections (`ov`/`live`/`up`/`rep`/`art`) | shapes: `DateSummary`, `ArtistSummary` |
| `artists` | sort by name or by audience, filter by discipline | shape: `ArtistSummary` |
| `artist` | `ArtistDetail`, the replay policy, the run of dates, the store, the ticketing sheet | — |
| `live` | `PlaybackGrant`, `LiveSession`, `ChatMessage`, `MerchItem`, the free preview, the current incident | — |
| `replay` | `ResumePoint`, chapters, speed, quality | otherwise: `live` |
| `plans` | `Plan` and what it opens | — |
| `following` | nothing new: `ArtistSummary` split into "live" / "not live" | shapes from `home` |
| `account` | the shell of eleven sub-screens (`accView: 'menu' \| 'section'`) | — |
| `help` | six help topics, purely editorial; no domain data | no need of its own |

### The Account section — eleven sub-screens

Confirmed in `navDefs`: `upcoming` · `past` · `faves` · `alerts` · `orders` · `sub` ·
`profile` · `prefs` · `notifs` · `security` · `privacy`.

| Sub-screen | Introduces | Cross-reference |
|---|---|---|
| `upcoming` | my upcoming seats | `DateSummary` + `PlaybackGrant` |
| `past` | my past seats, with what is left of the replay window | `DateSummary` |
| `faves` | followed artists + an alert toggle **per artist** | `ArtistSummary` |
| `alerts` | `SavedSearch`: rename, activate, delete, channels | — |
| `orders` | `Order`, including the **order placed with a third party** | — |
| `sub` | `Subscription`: renewal date, payment method, seniority | `Plan` |
| `profile` | `Profile`: display name, public handle, verified email, phone, city | — |
| `prefs` | `Preferences`: language, quality, behaviour when opening a live, chat, subtitles, motion, currency | — |
| `notifs` | `NotificationPrefs`: 5 triggers × 3 channels + quiet hours | — |
| `security` | password, 2FA, passkey, payment methods, **active sessions** | `Device` |
| `privacy` | `Consent` (4 purposes) + cookies (2 categories) + export and deletion | — |

### The overlay surfaces — they carry commands, not screens

Sheets and panels that have no route but do **write**: ticketing (`ticketOpen`), share
(`shareOpen`), authentication (`authOpen`, two tabs), cart (`cartOpen`, three steps
`list` → `pay` → `done`), notifications (`notifsOpen`), filters (`filtersOpen`), sort
(`sortOpen`), saving a search (`saveOpen`, two steps), delete confirmation (`deleteId`), menu
(`menuOpen`), search (`searchOpen`), Studio announcement (`studioOpen`, purely editorial).

Plus one **cross-cutting, persistent** surface: the **mini-player** (`watching`, `watchKind`,
`pipClosed`). It survives navigation between routes. It is the only thing on this surface that
holds a stream open while the user browses elsewhere — see "Realtime" and "Offline, background and
resume".

---

## The data shapes

Each shape appears once, with the screens that consume it and **what `shared/` does not carry
about it**. Recall the handoff rule: `shared/` is authoritative on vocabulary and rules, never on
shapes.

### 1. `DateSummary` — the workhorse shape of this surface

**Consumed by**: `home` (every rail), `browse`, `category`, `artist`, `following`,
`account/upcoming`, `account/past`, the search suggestions, the mini-player.

It carries the identity of the date, its show, its artist, its venue, its seats, its entry price,
its replay policy, its chat mode, its outcome if any, its broadcast rights, its viewer count, and
its position within a tour or a residency.

**What the contract must settle, and `shared/` does not:**

- **State is not a field, it is a derivation over time.** `helpers.stateOf()` computes
  `scheduled | live | replay | ended` from `startsAt`, the runtime and the replay window. The
  "no value computed twice" decision forbids recomputing it on the client — but a frozen state
  served at 14:02 is **wrong at 14:03**, and on mobile the app may sleep eight hours holding that
  response in cache. What I ask: the contract carries **the bounds** (`startsAt`, `runtimeMin`,
  `replay.expiresAt`, `roomOpensAt`) **and** the state as computed at service time, together with
  the instant at which that state stops being true. The client invents nothing: it only knows when
  to ask again.
- **ISO instants in UTC, not offsets.** D7: `startOffsetMin`, `atMin` and
  `rescheduledToOffsetMin` are mockup conveniences. On the wire: `startsAt`, `endsAt`,
  `expiresAt`, `rescheduledTo`, as ISO strings in UTC.
- **IANA zone, not a frozen offset.** D3. But see the Hermes constraint further down: I ask **in
  addition** for the offset computed by the server *for that particular instant*.
- **Media is an identifier, not a URL.** `helpers.imageUrl(kind, key, width)` already composes the
  URL from a recipe. The contract must carry the identifier and let the client ask for the width it
  actually displays. On mobile this is the single largest traffic item in a list.
- **Absent from `shared/`, required by the contract**: a record version (for targeted
  invalidation), a last-modified instant, explicit nullability on every optional field, and a
  **stable public identifier** (slug) — see `Deeplink` below.

### 2. `DateDetail`

**Consumed by**: `artist` (ticketing sheet), `live`, `replay`.

Adds to the summary: synopsis, cast, run crew, chapters, the language line, the other dates in the
same run, store items, three price tiers (`full` / `reduced` / `support`), fees, the current
incident, and the incident's text.

- **The language line is a rule, not a field.** `languageLine()` composes "Performed in French ·
  Subtitles FR, EN". `isUnderstandable()` answers "can I follow this show with the languages I
  know?". The contract must carry the **ingredients** (`spokenLanguage[]`, `subtitles[]`,
  `surtitles[]`, `languageDependency`) and let `@arthome/core` compose. The real vocabulary of
  `languageDependency` is **`none | helpful | essential`** (D1) — `light` does not exist, and
  `essential` is the value the most visible rule on the surface depends on.
- **Prices are canonical amounts.** Three tiers, each in integer minor units plus a currency code.
  `fixtures.js` carries them as whole euros: one more mockup convenience, not to be transported.

### 3. `ArtistSummary` / `ArtistDetail`

**Consumed by**: `artists`, `artist`, `following`, `account/faves`, `home`, `category`.

Summary: identity, avatar, discipline, genre, audience, country, "live right now", next date, last
live. Detail: bilingual biography, upcoming dates grouped, past dates, replays, replay policy,
store, other artists in the discipline.

- **"Live right now" is a derivation over time**, of the same family as a date's state: same
  treatment, same bounds.
- **The replay policy is carried by the date and displayed on the artist.** The mockup reads it off
  the artist (`artist.replay`); `shared/` carries it on the date (`date.replay.policy`). If an
  artist has two dates under two different policies, the artist page lies. The contract must say
  whether a default policy exists at artist or channel level, or whether the page must display only
  an honest aggregate.

### 4. `Taxonomy` — the reference artefact

**Consumed by**: `categories`, `category`, the facets of `browse`, the labelling of every card.

21 disciplines across 2 universes, 176 genres, 205 tags, with an **editorial rank** (`rank`) that
no surface has the right to recompute.

- **A need specific to mobile**: this is the largest and the most stable piece of data on the
  surface — **59.5 KB raw, 8.4 KB gzipped**, measured on `taxonomy.json`. It must be served as a
  **versioned immutable artefact**, addressed by version, with a very long cache, and **embedded at
  build time** as a fallback — exactly the regime already decided for i18n. Without it, a first
  launch offline can display no label at all.
- It must be servable **by slice**: mobile needs neither the studio vocabulary nor the TV key maps.

### 5. `Money`

Integer minor units plus an ISO currency code. Consumed wherever a price is displayed.

- The contract **never** carries a symbol or a symbol position: `helpers.price()` derives them from
  the code, and that derivation belongs to `@arthome/core`.

### 6. `Plan` and `Subscription`

**Consumed by**: `plans`, `account/sub`, and — indirectly — every playback screen, since the plan
conditions access.

`catalogue.json` is authoritative: `free`, `pass`, `premium`, with `priceMonth`, `opens[]` and
`seatDiscount`. The nine openings: `browse`, `trailers`, `free-dates`, `replays`, `no-ads`,
`one-live-month`, `all-lives`, `multi-screen`, `archive`.

- **`multi-screen` is a runtime constraint, not a marketing line.** "Two screens at once" requires
  a server-side count of concurrent playbacks. See `LiveSession`.
- `Subscription` (renewal date, payment method, seniority) **exists nowhere in `shared/`**: the
  mockup displays it as a literal. A shape to be created.

### 7. `PlaybackGrant` — the right to watch, a missing and decisive shape

**Consumed by**: `live`, `replay`, `account/upcoming`, `account/past`, and every card that offers
"Watch".

`helpers.isWatchable(account, date)` answers the question by crossing four things: holding a seat
(`account.ownedDates`), the state of the date, the replay policy, and territorial availability
(`availableIn`).

**That is a mockup convenience and it does not survive mobile.** It assumes the client holds the
account's complete list of seats. I can neither transport nor keep `ownedDates` current in full: it
grows, it changes while the app sleeps, and the territorial decision does not belong to the client.

**What I ask**: a right to watch **per date**, served by the backend, carrying at minimum: allowed
or not; the reason for refusal when it is refused (no seat / out of territory / outside the replay
window / insufficient plan / concurrent-screen limit reached); the instant at which the right
expires; and the proposed fallback action (buy a seat, see the other dates, subscribe).

That right must be **re-checked when playback starts**, never inherited from a catalogue read: the
viewer's country can change between the two (travel, roaming, corporate network), and on mobile
that interval is measured in hours.

### 8. `LiveSession` — the playback session

**Consumed by**: `live`, `replay`, the mini-player.

Absent from `shared/`. Required as soon as `multi-screen` caps the number of concurrent screens.

**What I ask, and this is the need most specific to my surface**: a playback session opened
explicitly, kept alive by a heartbeat, and **expired by the server after a delay**. The reason is
the lifecycle: the operating system kills a mobile app without warning and without giving it time
to close anything. A session that only closes on a client event leaves a ghost screen, and the user
is refused their own second playback. The expiry delay must be **short relative to the limit**, and
the contract must let the client **reclaim** a session it left behind itself, identified by the
device.

It also carries: the available quality variants and their bitrate, the subtitle track, and the
server instant (see "clock" below).

### 9. `ResumePoint`

**Consumed by**: `replay`, the "Resume" rail (`discovery.rail.resume` already exists in the shared
vocabulary), `account/past`, the mini-player.

`fixtures.js` carries it as `{ dateId, positionSec }`. The contract must add the instant of the
last write and the originating device — without which two devices playing the same replay overwrite
each other silently.

### 10. `ChatMessage`

**Consumed by**: the chat tab of `live`.

`fixtures.js`: id, date, viewer, author, role, position, state (`ok | removed | muted | banned`),
bilingual text, authoring language.

- **A message's position is a position in the media, not a send time.** `atMin` is relative to
  curtain-up. That is the right rule and it must be carried as such, in seconds from the start,
  **in addition to** the absolute instant — because a replay resumed part-way must be able to
  replay the chat at the right place.
- Three chat modes on the date side (`open | read-only | emoji | off`) and one mode on the viewer
  side (a preference). The contract must say which wins. The mockup lets the viewer pick
  `free | emoji | off` on top of the date's mode, which only makes sense in the restrictive
  direction.
- D6 remains open: the state of the **message** and the state of the **person within the channel**
  are two unrelated scales. My surface displays only one badge: there can be only one owner of the
  truth.

### 11. `MerchItem`, `CartLine`, `Order`

**Consumed by**: the store tab of `live`, `artist`, the cart, `account/orders`.

`MerchItem`: id, show, channel, label, kind, price, stock, state (`on-sale | out-of-stock`).

`Order` carries a distinction I have seen nowhere else in the handoff and which is structural:
**the order may not be ours**. Four third-party platforms are named (`shopify`, `woocommerce`,
`prestashop`, `drupal`) plus an `api` mode, with an external merchant reference and host, and a
text that says explicitly that "tracking, exchange and refund happen on the artist's own site".

**What I ask**: the contract must distinguish an order **executed by the platform** from a
**read-only reflection** of an order held elsewhere, and say what it guarantees about the latter —
freshness, completeness, and what happens when the external host does not answer. Mobile is the
surface where that reflection will most often be consulted offline.

### 12. `SavedSearch`

**Consumed by**: `browse`, `category`, `account/alerts`, the notifications panel.

This is the most demanding shape on the surface, and it does not exist in `shared/`. It carries a
name, a scope (`search` or `category`), the discipline targeted, the text query, **the complete
filter state** (disciplines, sub-genres, price bands, date window, status, "almost sold out", "has
dates", "expiring soon", "on promotion"), the sort, two alert channels, an active switch and a
creation date.

**What the contract must guarantee**: a **stable and versioned** representation of the filter. A
saved search survives months and app version upgrades; if the filter grammar changes, a search
saved yesterday must either replay identically or say honestly that it no longer can. An opaque
serialisation of screen state, like the mockup's, does not allow that.

**A consequence specific to mobile**: the alert is the entry point of a push notification. The
contract must therefore tie the saved search to the notification it triggers, and the notification
must carry enough to open the right screen **with no network at the moment of opening** (see
`Deeplink`).

### 13. `Notification` and `NotificationPrefs`

**Consumed by**: the notifications panel, `account/notifs`, `account/faves`.

Five triggers, each with a numeric rule already written in the mockup: a followed artist goes live
("the moment the stream opens"); a reminder before a live I hold a seat for ("30 minutes before");
a new date announced ("as soon as tickets open"); a saved event is almost sold out ("from 85% of
seats sold"); a replay is about to expire ("6 hours before expiry").

Three channels per trigger, plus global **quiet hours**. Plus an independent alert toggle **per
followed artist**.

**What I ask**: those five thresholds are **domain rules**, not interface copy. They must live in
`@arthome/core` and be served, not recopied into each surface — otherwise the web will say 30
minutes, the TV 15, and mobile will be right by accident. And the third channel is named nowhere:
see "Inconsistencies found".

### 14. `Preferences`, `Profile`, `Device`, `Consent`

- `Preferences`: interface language, default quality, behaviour when opening a live
  (`peek | muted | off`), chat state, subtitles, reduced motion, currency. They must **follow the
  account**, not the device — except quality, which depends on the device's network. The contract
  must settle which are per account and which are per device.
- `Profile`: display name (visible in chat), **public handle** (`arthome.live/@…`), email with its
  verification state, phone, city, seniority, member number.
- `Device` / `Session`: kind, label, city, last activity, "this device", and the remote sign-out
  command. `helpers.devicesOf()` exists and already carries the rule; the mobile mockup does not
  use it (see "Inconsistencies").
- `Consent`: four purposes (`audience`, `perso`, `partners`, `ads`) and two tracker categories
  (`stats`, `player`), one of which is essential and cannot be switched off. Plus data export and
  account deletion.

### 15. `Incident`

Four kinds: `hold-screen`, `postponed`, `cancelled`, `interrupted`, each with a bilingual message
written in `catalogue.json`. Three date outcomes: `cancelled`, `postponed`, `interrupted`, with
their commercial consequences already written (cancelled and refunded · postponed, seats still
valid · interrupted, credits issued).

An incident must arrive **in realtime** on an open playback screen, and **on wake** on a screen
that was asleep. See the next section.

### 16. `Deeplink` — a cross-cutting shape, specific to mobile

The mockup exposes two public identifiers: `arthome.live/vartan/nocturnes-ii` for a shared date,
`arthome.live/@marie.j` for a profile.

**What I ask**: a stable public identifier, resolvable in a single call, **with no catalogue in
cache**. It is the entry shape of three journeys only mobile knows: opening from a push
notification, opening from a shared link, and a cold resume after the OS kills the app. In all
three the app starts with nothing, and the first call must return enough to paint the target screen
in full.

### 17. `Page<T>` — the pagination envelope

`{ items[], nextCursor, prevCursor, servedAt }`. See "Pagination and volumes".

---

## The commands

Every command that writes, with its effect and what the contract must guarantee. The **"offline
queue"** column is the need specific to my surface: it says whether the command can be held on the
device and replayed when the network returns.

| Command | Effect | Offline queue | Guarantee asked |
|---|---|---|---|
| Buy a seat (chosen tier) | creates a holding, charges | **never** | strict idempotency; the key is generated **before** the send and **persisted**; the right to watch must follow immediately |
| Pay the cart | creates an `Order` | **never** | likewise; the cart must be emptied by the response, not by a local timer |
| Add / change / remove a cart line | changes the cart | yes | the contract must say **where the cart lives**: on the device or on the account. On the account, conflict resolution between two devices is needed; on the device, it does not survive a reinstall and the mockup lies |
| Follow / unfollow an artist | changes `followedArtists` | yes | commutative, replayable; the final state wins, not the sequence |
| Toggle an artist's alert | changes a per-artist preference | yes | likewise |
| Create a saved search | creates a `SavedSearch` | yes | idempotency by key, otherwise a replay creates two identical alerts |
| Rename / activate / delete a search | changes a `SavedSearch` | yes | a delete replayed on an already-deleted entry must succeed, not fail |
| Toggle an alert channel | changes a `SavedSearch` | yes | likewise |
| Send a chat message | publishes a moderated message | **never** | a message replayed ten minutes later no longer means anything: it must be **dropped**, not queued. The contract must say whether the server timestamps it or the client supplies its position |
| Mark notifications read | changes a read state | yes | monotonic: one does not un-read |
| Edit the profile | writes `Profile` | yes | concurrency to be settled: last writer, or optimistic version? |
| Edit preferences | writes `Preferences` | yes | likewise, field by field rather than whole document |
| Edit notification preferences and quiet hours | writes `NotificationPrefs` | yes | likewise |
| Change consents and cookies | writes `Consent` | **no** | a consent has evidential value: it must be timestamped by the server, with the version of the text accepted |
| Sign a device or session out | revokes | **no** | this is a security command: it must fail loudly rather than be replayed blind |
| Sign up / sign in | creates a session | **no** | out of scope for this file, handled by `adr-auth` |
| Change plan | changes `Subscription` | **no** | commits money |
| Export my data / delete my account | starts a long-running job | **no** | asynchronous: the contract must return an acknowledgement and a way to follow it, not an immediate answer |
| Record a playback position | writes a `ResumePoint` | yes | **the most frequent of all**: see the cadence asked below |
| Open / keep alive / close a playback session | creates and maintains `LiveSession` | **no** | server expiry mandatory, see `LiveSession` |
| Share | changes nothing server-side | — | but must produce a resolvable link, see `Deeplink` |

### Two cross-cutting needs on commands

**Idempotency counts double here.** A mobile network does not fail cleanly: it switches from Wi-Fi
to cellular in the middle of a request, and the client does not know whether the write landed. The
`Idempotency-Key` must therefore be **generated before the send and written to disk before it**,
not held in memory: an OS kill between send and response must not produce a second purchase on
restart. The contract must also say **how long** a key stays valid server-side — an offline queue
may replay a write several hours later.

**The client's clock cannot arbitrate.** Any conflict-resolution strategy based on a timestamp
supplied by the phone is wrong: a mobile clock drifts, jumps on timezone change, and its owner can
set it. If the contract wants "last writer wins", the rank must come from the server — a version
number, not a client date.

---

## Realtime

What changes while a screen is open, and the freshness the contract must guarantee. The value of N
is not mine to set; what is mine is to say which classes exist and that they do not share one
requirement.

| What changes | Where | Requirement |
|---|---|---|
| Viewer count | `home` billboard, rail cards, `live`, mini-player | the least demanding: a value a few tens of seconds old misleads nobody. **But it is displayed on dozens of cards at once** — see the batch constraint below |
| A date's state flipping (`scheduled` → `live` → `replay` → `ended`) | everywhere | the most demanding: it changes the action button. A viewer who taps "Watch" three seconds after the end must get an honest error, not an empty player |
| Room opening (30 minutes before) | `artist`, `account/upcoming`, notification | derivable from the bounds if `roomOpensAt` is served |
| Seats left, sold out, waiting list | `artist`, ticketing sheet, `browse` | demanding at the moment of purchase, tolerant elsewhere. The contract must guarantee that **the truth is at order time**, not at display time |
| Chat messages | chat tab of `live` | a continuous stream while the screen is in the foreground |
| Incident (hold screen, interruption, postponement, cancellation) | `live`, `replay`, `account/upcoming` | **must interrupt**, including a playback screen in progress and a screen that was asleep |
| A replay expiring | `replay`, `account/past`, notification | derivable from `expiresAt` |
| Store item stock | store tab of `live`, `artist` | tolerant; the truth is at payment |

### The three needs this places on the contract

**One channel per screen, never one per item.** A virtualised list displays about twenty cards and
buffers as many again; each carries a viewer count. Twenty subscriptions means twenty CPU wake-ups
and a drained battery. The contract must allow subscribing to **a batch of identifiers** over a
single channel, and changing that batch as the scroll window moves — without reopening the channel.

**The channel must be suspendable and resumable, not merely open or closed.** When the app goes to
the background, the right behaviour is neither to close (we would lose the resume point) nor to
leave it open (the OS will cut it anyway). The contract must offer a **resume from a point**: "here
is where I was, tell me what changed since". Without it, resuming is a full reload.

**Realtime and playback are not the same channel.** The mini-player survives navigation: we need a
playback stream that continues while the screen shows something else, and a screen channel that
follows navigation. The two cannot share a lifecycle.

---

## Offline, background and resume

**This is the section where my surface contributes what no other will.** The web has a tab that
stays loaded; the TV has mains power and a stable network. Mobile has a process the OS kills, a
network that really does drop, and an app reopened eight hours later on the same screen.

### The six transitions the contract must survive

1. **Foreground → background.** The user takes a call, switches apps. Realtime channels are about
   to be cut by the OS, in-flight requests about to be cancelled.
2. **Background → foreground, seconds later.** Almost nothing has changed. Reloading everything is
   pure waste.
3. **Background → foreground, eight hours later.** Everything carrying a temporal state is wrong.
   The catalogue on screen is stale, the "upcoming" seats are past, the replays have expired.
4. **Killed by the OS, then cold relaunch.** All volatile memory is gone. Whatever was not written
   to disk no longer exists.
5. **Cold relaunch from a notification or a shared link.** The app starts directly on a deep
   screen, with no catalogue, no taxonomy in memory, sometimes no network.
6. **Wi-Fi ↔ cellular switch.** It happens mid-request, with no clean transition. Any in-flight
   write is in an indeterminate state.

### Need 1 — every response must say when it was produced and how long it holds

This is the most structural ask in this document.

On return from the background, the client must decide **on its own** what to refresh. It can only
do that if every response carries two things: the **server instant** at which it was produced, and
the **duration beyond which it must not be displayed without warning**.

The server instant also solves the clock problem: every countdown displayed ("42 min left", "the
preview ends in 4:12", "the replay expires in 6 h") must be computed against the server's clock,
not the phone's. Without a server instant, a clock twenty minutes out makes every screen on the
surface lie — and the user who has just changed timezone is exactly the one opening the app on a
train.

### Need 2 — the cursor must survive a night, or the contract must offer a delta

A verified technical finding, and the most expensive of the lot. The server-cache library chosen
for this family of clients refreshes an infinite-scroll list **page by page, from the first, in
sequence**. A forty-page list scrolled yesterday therefore produces, on return to the foreground,
**forty chained round trips** before the first pixel is up to date. On a cellular network that is
unacceptable; on roaming it is billed.

Two ways out, and the contract must choose at least one:

- **a cursor that stays valid for a long time** — several hours at minimum — so the client can cap
  the number of pages it keeps and reload only those it displays;
- **a delta read**: "here is my cursor and the instant of my last read, tell me what changed".

The second is by far preferable for my surface, and it also serves need 1: a woken app asks what
changed, not for everything.

Corollary: the client must be able to **go back** in a list whose first pages it has discarded. The
cursor must therefore be **bidirectional**.

### Need 3 — revalidation on return to the foreground is a burst, not a request

The automatic revalidation mechanisms of this family of libraries listen for browser events that
**do not exist** in React Native: focus resumption and connectivity detection must be rewired by
hand onto the app lifecycle and the network state. The consequence for the contract is not an
implementation detail: at the precise moment the app returns to the foreground, **every observed
read revalidates at once**. An account screen easily shows half a dozen; a category page as many.

The contract must therefore offer one of two things: a **batched read** (several resources in one
call), or an endpoint answering "**what changed since T?**" that returns a list of invalidations
rather than the data. Without one of the two, every return to the foreground is a burst that rate
limiting will eventually refuse — and refusing a burst on return to the foreground is refusing to
let the app open.

### Need 4 — resuming playback, three distinct cases

**Live.** One does not resume a live, one joins it where it is. The position is computed from the
start instant and the server clock. The contract must say whether a live joined part-way is served
from the beginning (what the mockup suggests: "the show started 18 minutes ago, join it where it
is") or from the live edge, and whether a catch-up window exists before the end.

**Replay.** The position is a `ResumePoint`. Two questions for the contract: **at what cadence**
the client writes it — it is the most frequent command on the surface, and writing it every second
over cellular is unreasonable — and **what happens** when the app is killed between two writes.
What I ask: a write at a reasonable interval, **plus a forced write when going to the background**,
and a contract that accepts a slightly earlier position rather than lose the resume point.

**Free preview.** The mockup grants a preview budget (4:12 in the copy, 252 seconds in the state).
That budget **cannot be counted by the client**: a reinstalled app, or simply a killed one, would
reset the counter. It must be decremented by the server, per account or per device as the contract
decides, and the right to watch must carry what is left of it. That is the only way to make the
preview honest on mobile.

### Need 5 — what must survive a kill, and what must not

**Must survive, therefore must be written to disk**: the cart (or the server cart's identifier);
the idempotency key of an in-flight write; the offline command queue; the playback position; the
chat message draft; the current filter and sort; the saved search being named; the cursor of the
list being browsed; the last screen and its argument.

**Must not survive, or must survive encrypted**: the session token — and the contract must state
its lifetime and the renewal mechanism, because an app reopened after a week will find a dead token
and must not for that reason send the user back to a sign-in screen if there is a way to renew it
silently.

**Must never survive**: the right to watch. It expires, it depends on the territory, it depends on
the screen limit. A right re-read from disk is a false right.

### Need 6 — what the app really shows without a network

**No show download appears anywhere in the mobile mockup.** The only occurrence of "download" in it
concerns an order invoice. I flag it because it is counter-intuitive for a mobile performing-arts
app, and the lead may want to settle it: if there is no offline playback, then offline means
**cached catalogue, read only**, and nothing else.

In that case the contract must let the app display, with no network: the last catalogue seen, my
seats, my orders, my followed artists, my saved searches — each **with its freshness date visible**.
And the error envelope must allow saying "this is old" without saying "this is broken".

What is **not** consultable offline must be announced as such rather than fail: a right to watch, a
stock level, seats remaining, a viewer count.

### Need 7 — the first launch offline must render something

The mockup puts up a blocking boot screen that displays nothing but a raw error message if loading
fails. On mobile that case is common: first opening on the underground, after a store update.

The decision to embed an **i18n snapshot at build time** already covers the copy. I ask for the
same regime for **the taxonomy**, and for the same reason: without it no discipline label can be
displayed, and the home screen is illegible even if the catalogue is cached.

Measurements: the i18n subset useful to mobile (storefront + taxonomy + system, two languages,
1,126 keys) weighs **117 KB raw / 25 KB gzipped**; a single language weighs about 54 KB raw.
`taxonomy.json` weighs **59.5 KB raw / 8.4 KB gzipped**. A complete bilingual embedded snapshot
therefore approaches 177 KB raw — enough to weigh on start-up time if loaded in one block.
**What I ask**: the contract must serve these artefacts **per language and per surface**, not as a
single dictionary, so the embedded snapshot can carry only what it uses.

---

## Pagination and volumes

The decision is settled: **cursor** for the storefront, deterministic sort, tie-broken by
identifier. What my surface adds:

**Page size is decided by the client, and it changes mid-course.** In landscape the shell doubles
in width and the grid goes from one to several columns: the same list shows two to four times more
items per screen. The contract must therefore accept a **variable, bounded page size**, supplied by
the client with every page.

**Page size cannot be part of the cursor's identity.** Otherwise a rotation mid-list invalidates the
cursor and re-emits items already served, or skips some. The cursor must designate a **position in
the ordering**, not a rank multiplied by a page size.

**The cursor must be bidirectional.** A virtualised list caps what it keeps in memory, and
refreshing an infinite list restarts from the first page: with no way back, a long list is either
kept whole — at the cost of memory — or unrecoverable when the user scrolls back.

**A card must be renderable without a second request.** Virtualisation mounts and unmounts items
continuously while scrolling; if a card triggers a call to complete what it lacks, fast scrolling
produces a request storm and slow scrolling produces empty cards. Everything a card displays must
be in the page that served it.

**Not every list on this surface is infinite.** The home rails, the sections of a discipline, an
artist's dates are **bounded** lists that the mockup pages in steps with a "Show more · N left"
button — so it knows the **remainder**. The contract must say whether it returns a total, a "there
are more", or nothing: the three produce three different interfaces, and only the first allows
announcing the remainder. Only `browse` is infinite scroll.

**Reference volumes observed**: 21 disciplines, 176 genres, 205 tags; about thirty venues; a
generated date catalogue whose size the fixtures do not bound. The `browse` facets combine freely
(disciplines × sub-genres × five price bands × five date windows × three statuses × four flags): the
contract must say whether a combination that returns nothing is a normal empty response or an
error, and whether the result count is known before the first page.

**Page weight matters more here than elsewhere.** On a cellular network, a page of catalogue is
billed. Two asks: that the image be a resizable identifier rather than a frozen URL, and that the
contract allow requesting a **reduced form** of a card — the landscape grid shows more cards but no
more information per card.

---

## Error and loading states

The vocabulary is **already written in `shared/i18n/system.json`**, and it settles a distinction the
error envelope must make possible:

- "Your device cannot reach the network. **Arthome servers are responding normally.**"
- "The problem is on our side, **not your connection.** We are working on it."

**What that demands of the contract.** An application code is not enough: the first case is the one
where **no response ever arrived**, and only the client can observe it. The second is a
fully-formed server response. The envelope must therefore distinguish, in a way usable without
reading any text:

- a server failure, announced by the server itself;
- a domain refusal (no seat, out of territory, window closed, insufficient plan, screen limit
  reached) — each with its **parameters** and its **fallback action**;
- rate limiting, with the delay before retrying — without which a revalidation burst on return to
  the foreground turns into a loop;
- a session expiry, which must be distinguishable from a rights refusal: the first renews
  silently, the second is displayed.

And the client adds, on its own, a fifth state: **no network**. It must never be presented as a
platform failure.

**The territorial blackout has a shape of its own.** `common.error.blackoutBody` is parameterised by
the reason (`{reason}`), and the copy promises that "the other dates of this show remain available".
The error must therefore carry the reason **and** the means to keep that promise: the other dates.
An error that promises a way out without carrying it forces the client into a second request at the
worst possible moment.

**Empty states are not errors.** `common.empty.list`, `.live`, `.search`, `.tickets` already exist.
An empty list is a successful response.

**One extra state, specific to mobile, that the other surfaces will not have.** A read can be
**waiting for the network**: neither in progress, nor in error, nor served. The user must see the
difference between "we are loading" and "we are waiting for you to find signal again". Nothing to
ask the backend for here — except not to force the client to invent an error in order to express
it.

**The trace must come back to the client.** The decision already puts a trace identifier in the
envelope. On mobile that is the only usable link between "my app crashed" and a server log: the
user cannot open a console. They must be able to read or copy that identifier from the error
screen.

---

## Constraints specific to React Native

Only those that constrain the contract.

### 1. zod — the measurement, as asked

Measured on **zod 4.6.5**, bundled with esbuild in production mode, against a realistic schema
(one page of catalogue: date, show, venue, seats, three price tiers, replay policy, rights,
cursor).

| Entry point | Tree-shaking on | Minified | Gzipped |
|---|---|---|---|
| `import { z } from "zod"` (classic) | yes | **446 KB** | **93 KB** |
| `import { z } from "zod"` (classic) | no | 446 KB | 93 KB |
| `import * as z from "zod/mini"` | yes | **22 KB** | **7.5 KB** |
| `import * as z from "zod/mini"` | no | 421 KB | 85 KB |
| floor: `z.string()` alone, classic entry | yes | 446 KB | 93 KB |
| floor: `z.string()` alone, `zod/mini` | yes | 9.6 KB | 3.6 KB |

**Three findings, two of which are asks.**

- **The classic entry point does not tree-shake.** A single `z.string()` costs the entire package.
  The cause is identified: the classic entry makes **64 translation files** of the error messages
  reachable, that is 341 KB of source out of roughly 850 KB in total. For a project whose decision
  is **i18n by codes with an embedded snapshot**, those 64 tables are dead weight in full: we will
  never display an error message written by zod.
- **The saving from `zod/mini` depends entirely on the bundler tree-shaking.** Without it — and the
  React Native bundler does not enable it by default — `zod/mini` falls back to 85 KB gzipped, that
  is to say the level of the classic entry. The gain from 93 KB to 7.5 KB is not acquired: it is
  **conditional**.
- **An ask directed at the contracts package.** `@arthome/contracts` must expose a **`mini` entry
  point** and must import zod only through deep paths, never through a barrel file that re-exports
  everything. Without that, the choice of entry point is confiscated from the mobile client, and the
  "zod validates everything" decision costs 93 KB gzipped of bundle to the most constrained surface
  in the project. I am not contesting the decision: I am asking that it be delivered in a form
  mobile can afford.

> **↪ Outcome (added after this was written, 21 September 2026).** **Closed, and taken one level
> deeper than asked.** The ask became **D-012**, *"`@arthome/contracts` exposes a barrel-free entry
> point"*. But the measurement's real lesson — that zod's cost is **fixed and tied to the import**,
> not marginal and tied to the number of schemas — was applied to `@arthome/core` as well, which now
> ships **two entry points**: `.` for the rules, which imports zod *at no depth*, and `./schema` for
> the boundary schemas, the only one that depends on it. `packages/core/package.json` records the
> reasoning in its `_comment_exports` block — still in French at the time of writing, so I
> paraphrase rather than quote: a surface needing only the rules pulls in not one line of zod;
> zod's cost is fixed and tied to the import, not marginal and tied to the number of schemas
> (it cites D-012); and had the main entry imported it, no barrel-free entry of
> `@arthome/contracts` could have made up the bill. A gate, `tools/check-core-entry.mjs`, enforces
> it. That is more than I asked for: I
> asked not to be charged 93 KB for validating, and the answer was to make it possible not to be
> charged at all for not validating.

### 2. Client-side formatting — the `Intl` dependency is not a given

The decision is: amounts in canonical units, formatting on the client. Good news, verified:
`helpers.js` formats **without `Intl`** — `price`, `number`, `compact`, `clock`, `dayLabel`,
`longDate`, `duration`, `timecode` are all written by hand, with day and month names hard-coded in
both languages. The port to `@arthome/core` can therefore stay free of `Intl`, which is exactly
what is needed: the React Native JavaScript engine does not offer a complete `Intl` implementation
everywhere, and the polyfill costs several hundred kilobytes.

**What that constrains in the contract**: the ISO currency code must travel, never a symbol nor a
symbol position; and the contract must **never** assume the client knows how to format a currency
it does not know. If an unforeseen market ever appears, it is `@arthome/core` that must be updated,
not the contract that must start sending pre-formatted strings.

### 3. Timezones — IANA, plus the computed offset

D3 mandates an IANA identifier and a UTC instant, and the display rule is right: the viewer's time
first, the venue's time second when it differs.

**The constraint**: the complete timezone database is not guaranteed on the React Native client,
and embedding it is expensive in bundle terms. **What I ask**: the contract carries the IANA
identifier *and* the offset in minutes **computed by the server for that date's instant**. This is
not a return to D3's frozen offset: it is a **served** value, recomputed at every service, never
stored. It respects "no value computed twice" — the computation happens once, server-side — and it
avoids embedding a timezone database in five applications.

### 4. Virtualised lists — two consequences already stated, and a third

A reminder: a card must be complete within its page, and a realtime counter cannot be one request
per card. Third consequence: **the number of items kept in memory is bounded**, so the contract
cannot assume the client holds everything it has already read. Any operation that assumes "the
client already has the list" — for instance computing a right from the seats held — is false on
this surface.

### 5. The cost of a wake-up

Every open channel, every poll, every silent notification wakes the processor. Three asks already
made above, gathered here because all three are mobile in nature: subscription **by batch of
identifiers** over a single channel; **resume from a point** rather than reload; **batched read or
delta** on return to the foreground.

### 6. Killed by the OS — the idempotency key before the send

Already said under "The commands", repeated here because it is the most specifically mobile
constraint in this document: the key must be written to disk **before** the request leaves. It is
the only way an interrupted purchase does not become two purchases on restart. The contract must
consequently guarantee a **validity window for the key** long enough to cover a relaunch — and say
what it returns when the key is replayed: the original response, not a conflict.

### 7. Data volume consumed — a preference already announces it

The mockup announces "4K uses about 12 GB per hour" and lets the user choose a default quality. The
playback contract must therefore carry the **available variants and their bitrate**, for two
reasons: so the client can honour the preference, and so it can warn before starting an expensive
playback over cellular. A playback that negotiates its own quality allows neither.

### 8. Two lists of different dimensions for the same data

Switching to landscape widens the shell and multiplies the columns. That has no layout consequence
for the contract — but two consequences already stated: **variable page size** and a **cursor
independent of page size**. I restate them here because they are the only reason orientation
appears in this document at all.

---

## Inconsistencies found

Discrepancies met **in addition to** the twenty-seven already recorded in
`corrections-handoff.md`. I do not apply them. Seven of the eleven are the same fault — a literal
table running parallel to `shared/` — that is to say exactly what D2 describes for the publication
states, and what principle no. 1 of the handoff forbids.

1. **The plans are a parallel table.** The mobile mockup displays three plans named
   `free` / `unit` / `sub`, at "Free" / "from €7" / "€14 per month". `catalogue.json` declares
   `free` / `pass` / `premium` at 0 / 12 / 24 per month, with `opens[]` and `seatDiscount`. The
   mockup **never** calls `A.plans()`: verified, zero occurrences. The contract must follow
   `catalogue.json`.

2. **The plan vocabulary overruns the data.** `i18n/storefront.json` carries six `enums.plan.*`
   values — `free`, `pass`, `premium`, `monthly`, `season`, `none` — while `catalogue.json.plans`
   declares only three. `monthly`, `season` and `none` are referenced by no data at all. Either the
   vocabulary anticipates plans that were never written, or it is dead; the contract must settle it
   before freezing the enumeration.

3. **The replay policy is a third parallel table.** The mockup uses `sub` and `off` where the shared
   enumeration says `subscription` and `none`. It even adds a fifth steering value, `artiste`,
   meaning "take the artist's own", which belongs to no vocabulary.

4. **The replay window is stated three times, differently.** `fixtures.js` generates five values
   (24, 41, 48, 72 and 96 hours); the mockup's copy asserts "72 h" hard-coded in the description of
   the included policy; the notification rule announces "6 hours before expiry". The duration must
   come from `replay.windowHours`, never from a string of copy — and yet here it is the **copy**
   that carries the value, which makes it untranslatable and unfalsifiable.

5. **The currencies do not agree.** The currency preference offers `eur` / `usd` / `chf`;
   `catalogue.json.billingMarkets` declares `eur` / `chf` / `cad`. `usd` exists nowhere else; `cad`
   is missing from the screen. To be read alongside D4: only one market is actually exercised by the
   generator, so none of these lists has ever been tested.

6. **Two discounts, on two different bases, and neither matches.** The subscription screen promises
   "15% off artist stores". `catalogue.json` carries `seatDiscount` — a discount on **seats** — at
   0.1 for `pass` and 0.2 for `premium`. Neither the rate nor the base coincides.

7. **Mobile chat is not wired to `shared/`.** The mockup holds eight literal messages in its state
   and adds more at random every 4.2 seconds; it never calls `A.chatOf(date)` — verified, zero
   occurrences. Consequence for the contract: the four message states (`ok`, `removed`, `muted`,
   `banned`) **have never been exercised on this surface**. Moderation as the mobile viewer sees it
   remains to be designed, not observed.

8. **The third notification channel is named nowhere.** The preferences grid offers three channels
   per trigger but no header names them. The only two channel names in the handoff are `PUSH` and
   `E-MAIL`, in the saved searches. The profile hints at the third without saying it: the phone
   field carries the note "for SMS reminders". To be settled, because an SMS channel has a cost and
   a regulation of its own.

9. **The account's subscription is entirely literal.** Renewal date, payment method and seniority
   are hard-coded; none of the three exists in `fixtures.accounts`, which carries only
   `memberSinceOffsetMin` and `plan`. The `Subscription` shape has to be created from scratch.

10. **Two notions of preview under neighbouring names.** `catalogue.json.time.previewIdleSec` is 4
    and is used nowhere in the mobile mockup; the preview budget actually displayed is 252 seconds
    and has no shared source — it is written both in the state and in the French copy. Two values
    with no owner.

11. **Devices and sessions are treated as two things.** The security screen displays three literal
    sessions, while `fixtures.accounts[].devices` exists and `helpers.devicesOf()` already renders
    them with their kind, their bilingual label, their city and their last activity. The contract
    must say whether a device and a session are the same thing — the answer determines what the
    "Sign out" button does.

**A general remark, which stands as a warning for time 3.** I checked the use of sixteen
`shared/helpers.js` functions in the mobile mockup: **fourteen are never called** — `isWatchable`,
`availableIn`, `rightsNote`, `languageLine`, `hasLanguageBarrier`, `seatsLabel`, `progressOf`,
`viewersOf`, `messageState`, `devicesOf`, `alertsOf`, `resumeOf`, `plans`, and `chatOf` (point 7
above). The only two actually used are `isRoomOpen` and `replayHoursLeft`. The mobile surface
therefore exercises far fewer shared rules than the web storefront will. It means that, for this
surface, territorial rights, the language barrier, seats remaining, playback resumption, devices and
subscriptions **have never been exercised on screen**: the contract covering them must be
**designed, not observed**. I flag it because it is exactly the kind of silence that gets mistaken
for agreement.

> **CORRECTION — 24 September 2026, by this file's author on its last turn, and verified by the lead
> before it was written in.** The counts above are right and **the comparison is wrong**. The two
> mockups call **exactly the same thirty-nine** `A.*` helpers: not the same number, the same set —
> nothing is exclusive to either side. All fourteen of the never-called helpers are dead in the
> **web** mockup too.
>
> So `designed, not observed` does not distinguish mobile from web. **It covers the whole storefront
> family**, and only `chat` was ever marked provisional for it.
>
> *That makes the warning larger rather than smaller, which is why it is worth correcting.* Written
> as a difference between two surfaces, it reads as a gap one of them will close. It is not a gap
> between surfaces — it is a gap between the mockups and the contract, and there is no surface
> standing on the other side of it.
>
> **And the original sentence is the fault it warns about, committed in the act of warning:** it
> mistook a silence for a difference, having measured only one side. The measurement that settles it
> is one line per mockup. [Verified: `comm` over the two sorted sets — 39 shared, 0 exclusive either
> way.]

---

## What I cannot obtain on my own — questions to the backend

Eleven questions, in order of impact on my surface. The first four block the design of the client;
the others constrain it.

1. **Is a date's state served, derived, or both?** I ask for both: the bounds (`startsAt`,
   `runtimeMin`, `roomOpensAt`, `replay.expiresAt`) **and** the state at service time together with
   the instant at which it stops being true. If the contract serves only the state, an app woken
   after a night displays false states and does not know it. If it serves only the bounds, the
   client recomputes and violates "no value computed twice".

2. **Will every response carry a server instant and a validity duration?** Without a server instant,
   every countdown on my surface is at the mercy of a phone clock that drifts or jumps. Without a
   validity duration, the client cannot decide on its own what to refresh on return from the
   background, and will refresh everything.

3. **Does a cursor stay valid for several hours, or will there be a delta read?** This is the most
   expensive question in the document. Without a favourable answer, a return to the foreground on a
   long list produces dozens of chained round trips over cellular. A "what changed since T?" read
   would at the same stroke settle the revalidation burst described in need 3.

4. **Is the right to watch a first-class shape, served per date?** `helpers.isWatchable` assumes the
   client holds all the account's seats: untenable on mobile. I need a right per date, with its
   refusal reason, its expiry and its fallback action — and re-checked when playback starts, not
   inherited from the catalogue.

5. **How is `multi-screen` counted, and who releases a killed session?** The operating system kills
   an app without warning; a session that only closes on a client event leaves a ghost screen and
   locks the user out of their own account. I ask for a playback session with a heartbeat, with
   **server-side expiry** and the ability to reclaim one's own session identified by the device.

6. **Is the free preview budget counted server-side?** If it is counted on the client, a reinstall —
   or simply a kill — resets it. And is it per account, per device, or per date?

7. **Which commands accept being queued offline, and how long does an idempotency key stay valid?**
   I proposed a classification under "The commands"; it needs confirming. The key's validity window
   is the unknown that decides whether an offline queue is usable at all: a queue that replays an
   expired key two hours later creates duplicates.

8. **Where does the cart live: on the device or on the account?** On the account, conflict
   resolution between two devices is needed. On the device, it does not survive a reinstall, and the
   mockup — which shows a persistent cart in the header — suggests otherwise.

9. **Is an order placed with a third party a read-only reflection, and what is guaranteed about its
   freshness?** Four external platforms are named. Mobile is the surface where that reflection will
   most often be consulted offline: we need to know what we promise when the external host does not
   answer.

10. **Are the five notification thresholds served domain rules, or constants recopied per surface?**
    "30 minutes before", "85% of seats", "6 hours before expiry". Recopied, they will diverge. And
    what is the **third channel**?

11. **Will `@arthome/contracts` expose a `mini` entry point for zod, with no barrel file?** With the
    measurement behind it: 93 KB gzipped on the classic entry, 7.5 KB on a tree-shaken `mini` entry,
    and 85 KB if tree-shaking is not on. I am not reopening the zod decision; I am asking that it be
    delivered in a form the most constrained surface in the project can afford.

**Two subsidiary questions, less urgent but not to be lost.**

- **Will the contract carry the timezone offset computed by the server, in addition to the IANA
  identifier?** Without it, every application embeds a timezone database. With it, D3's rule is
  respected and the computation happens only once.
- **Will the taxonomy be served as a versioned immutable artefact, per language and per surface?**
  59.5 KB raw for the taxonomy, 117 KB for the storefront's bilingual i18n: an embedded snapshot
  carrying everything would weigh on the app's start-up.

---

# Confrontation

> Time 3. I read `answers-to-surfaces.md`, `context-map.md`, `realtime.md`, `transport.md`,
> `critical-rules.md`, `DECISIONS.md` and above all `openapi/storefront.yaml` — my contract. I
> contest on evidence: every complaint cites the document, the section or the line.
>
> The index of answers claims all thirteen of my questions are met. **Eleven actually are**, and
> several are met better than I asked. Two are not, and I add three defects the index could not
> see because they answer none of my questions: they answer my **screens**.
>
> **What this section is.** A confrontation written on **21 September 2026** against the contract
> **as it then stood**. The grievances below are preserved **verbatim**, line references included,
> dead or not — their value is that they were written before the fixes. The notes marked
> **↪ Outcome** were added later, after the fixes landed; everything else is the record of
> 21 September and has not been renumbered, softened or re-cited.
>
> **Every line reference below is now dead.** `openapi/storefront.yaml` stood at 5,072 lines and
> 53 endpoints when this was written and has since passed 7,000 and 75 — and it moved again
> between the day the outcome notes were added and the day after, which is the whole argument.
> Every citation below therefore names its **identifier** as well — a schema, a path, an
> `operationId`, a section — and that is what to follow. The outcome notes anchor on identifiers
> only, for the same reason; they do not rewrite the original citation.
>
> **Three exceptions, and they are substitutions, not rewrites.** In §4 below, two pointers into
> `context-map.md` were line numbers into a document I do not own; `backend-domain` found them
> dead after its translation, and they now name **§7.1** and **§13** instead. In C5, a section
> number was added *beside* the surviving line number into `transport.md`, which had a quotation
> for an anchor and nothing else.
>
> Nothing else in the record was touched. A line number into a document someone else maintains is
> a citation that dies on their next edit, and those two had already died **reading plausibly** —
> which is how a bad reference survives, because nobody follows a pointer that looks right.

---

## 1. What is satisfied — briefly, because it is the greater part

My three structural needs became project rules, and I say so before I start hitting.

**`servedAt` and `validUntil`** are **critical rule no. 9** (`critical-rules.md`), carried on
`EnvelopeMeta` (`storefront.yaml` l. 3536) with the wording I had asked for: "a countdown is
computed against `servedAt`, never against the client's clock". `degraded[]` comes with it, which I
had not asked for and which settles the case "the per-viewer overlay failed, the card is served
anyway".

**The playback lease** (`PlaybackTicket`, l. 4589): 90 s lease, 120 s token, renewal at 45 s, and
the exact sentence I was looking for — "`releasePlayback` speeds things up, **nothing depends on
it**". My ghost-screen argument is cited as the reason for the choice. `qualityCap` is **declared**,
so I will not offer "4K" when the device is capped; `drmSystem` is chosen by the server, which
spares me guessing on devices I cannot test.

**Pagination**: three asks, three granted, and better written than mine. The cursor (l. 3367) is
opaque over `(created_at, id)`, **bidirectional**, **independent of page size** — "which is exactly
what a screen rotation produces" — valid 24 h, with `CURSOR_TOO_OLD` and `params.maxAgeHours`
(l. 3500). `CursorPageInfo` (l. 3568) carries a **bounded** `approximateTotal` and
`totalIsLowerBound`, which makes "Show more · N left" honest without promising a count an index
cannot give. And `emptyReason` + `emptyActionCode`: the empty state is not an error, and it carries
a way out.

**Realtime**: `counters:subscribe` by **batch of identifiers**, the batch replaced without
reopening the channel, a **differential** tick (`realtime.md` §2.1) — my ask word for word. One
connection, multiplexed by room. And §2.4 settles it the right way: scheduled transitions are **not**
pushed, the contract delivers the instants and the surface schedules the flip locally.

**The rest, in brief**: `WatchVerdict` as a first-class shape, `advisory: true` on the card and
binding at open, `validUntil` ≤ 60 s, **never on disk** · UUIDv7 idempotency "generated **and
persisted before the send**", 24 h, replay = the original response + `Idempotency-Replayed`
(l. 3353) · `DomainConstants` (l. 3705) serves my three thresholds — `reminderLeadMinutes` 30,
`scarcityThresholdBps` 8500, `replayExpiryWarningHours` 6 · `SavedSearch` (l. 4878) with
`criteriaVersion`, `criteriaSignature` and `stale`, over **stable identifiers and never array
indices**, plus `newMatchesSinceLastVisit` which saves me ten count queries on open · `VenueClock`
IANA + served offset · `Money { amountMinor, currencyCode }` · `Device.sessions[]`, which finally
settles the ambiguity I had raised · `traceId` copyable from the error screen, with my argument
cited · `LabelArtifactRef` and `taxonomyArtifact` per slice and per surface · the `mini` entry point
for zod (**D-012**).

And two gains I had not seen: `quietHours.bypassWhenTicketHeld` (l. 4934) — "you do not miss a show
you paid for because it starts at 23:15" — and `availability.fillRateBps`, which serves the **rate**
rather than the capacity, cutting short the double computation.

**`/v1/me/progress/{dateId}` (l. 1601) reproduces my ask to the comma**: a 30-to-60 s heartbeat, a
**forced write when going to the background**, a late write accepted even after `releasePlayback`,
last writer wins **with a server rank**, and the absence of an idempotency key justified rather
than merely suffered. I have nothing to add.

---

## 2. What is not

### C1 — One of my five bottom tabs is served by no read at all

**This is the unserved screen.** `following` is one of the five permanent tabs of my surface, and
`account/faves` is its projection inside the account. None of the fifty-three endpoints in
`openapi/storefront.yaml` returns the set of artists a viewer follows.

The finding, checked three times:

- `/v1/artists` (l. 460) accepts `categoryId`, `sort` and `liveOnly`. **No `followedOnly`.**
- `AccountScreen` (l. 4993) carries profile, subscription, credits, payment methods, security,
  devices, preferences, notification preferences, consents, deletion. **No follows.**
- `/v1/me/follows/{artistId}` (l. 2354) is a **PUT and a DELETE**. The command exists, the read does
  not.
- Searching for `followedOnly`, `faves`, `favoris`, `followedArtists` across `storefront.yaml`
  **and** the thirteen documents in `architecture/`: **zero occurrences**.

**The predictable objection does not hold.** `Rail.kind` (l. 4192) contains `followed`, so the home
screen carries a "because you follow" row. But a rail is a **bounded, server-composed** list of
`DateCard`, and my Following page has two sections: followed artists who are **live**, and followed
artists who are **not**, "sorted by name · last live". A followed artist **with no announced date
has no `DateCard`** — so they are invisible from a rail, while being precisely the content of my
second section. A home row does not serve a screen.

**And the contract contradicts itself on this point.** `CursorPageInfo.emptyReason` (l. 3595)
carries the value **`no_followed_artist_live`**. An empty-state code was written for a list no
endpoint knows how to produce. That is the internal proof that the screen was thought about and
then lost.

**The precise journey, broken twice.** "Following" tab: I have nothing to call, and I cannot paint.
Account → "My favourites (N)": the N is computable by no call. And the alert toggle **per followed
artist**, which is a control on that screen, has neither read nor write —
`/v1/me/reminders/{dateId}` (l. 2427) sets a reminder **per date**, which is a different notion: a
reminder is a dated promise about one specific date, an artist alert is a standing subscription to
their announcements. The `newEvent` trigger ("new date announced by a followed artist") does exist
in `NotificationPreferences`, but nothing allows setting it artist by artist as my surface offers.

**What I ask**: `GET /v1/me/follows`, cursor-paginated, returning for each entry an `ArtistSummary`
plus `nextDate: DateCard | null`, `lastLiveAt` and `alertsEnabled` — the three things my page
displays and nothing else carries. Plus `followedCount` in `AccountScreen` (see C5). Plus a
per-artist alert write, or the explicit decision that following and being alerted are the same
gesture — in which case `/v1/me/follows/{artistId}` must say so, since its description currently
asserts the opposite ("**Following and being alerted are two settings**", l. 2360) without offering
the second.

> **↪ Outcome (added after the confrontation, 21 September 2026).** **Closed, and closed on all
> three asks.** `GET /v1/me/follows` exists
> (`openapi/storefront.yaml`, `operationId: listFollowedArtists`), cursor-paginated, and its own
> description opens with *"**The whole page was unserved.**"* It
> carries the three things this grievance said nothing else carried: `alertEnabled` per artist,
> `nextDate` *"which gives the split the screen displays without a call per artist"*, and a
> `liveOnly` parameter described as *"**the 'Following live' section**, served rather than filtered
> client-side"*. Sorting is served too (`alpha | followers | next_date`). The endpoint states that
> it also serves `account/faves`, *"of whose two collections this is the first — the second being
> `/v1/me/watchlist`"*, which closes the second half of this grievance as well.
>
> The per-artist alert write landed with it: `PUT /v1/me/follows/{artistId}`
> (`operationId: followArtist`, cited above as l. 2354) takes `alertEnabled` in its body, and its
> description states that the alert is *"a flag
> **per followed artist** carried by `notifications`"*. So the description that asserted following
> and being alerted were two settings now offers the second — the contradiction this grievance
> named is resolved in the direction it argued for.
>
> The self-contradiction is cited in the fix: the endpoint's own text records that `emptyReason`
> carried `no_followed_artist_live`, *"**an empty state for a list no operation produced**"*. The
> vocabulary now carries `no_followed_artist` instead.

### C2 — No endpoint resolves a public link: three cold openings are broken

The contract **serves** a public identifier everywhere: `DateCard.slug` and `DateCard.canonicalUrl`
(l. 3968 and 3956, "served, never built by the surface"), `ArtistSummary.slug` (l. 4286),
`NotificationEntry.deepLink` (l. 4921). And it accepts one **nowhere**: `DateId` (l. 3402) and
`ArtistId` (l. 3411) are `format: uuid`. All five occurrences of `slug` in the file are outbound.
There is no `GET /v1/dates/by-slug/{slug}`, no `GET /v1/resolve?url=`. `/v1/account-deep-link`
(l. 2117) goes the other way: it **produces** a link to the account.

This was **shape 16** of my needs, named "a stable public identifier, resolvable in a single call,
**with no catalogue in cache**". It was not addressed, and it was not one of my thirteen questions —
which is why the index does not see it.

**The three journeys, all specific to mobile:**

1. **Push notification.** "Compagnie Verticale is going live", 20:58. The app has been killed for
   hours. The user taps the notification: I start cold with a URL
   `https://arthome.fr/fr/d/nuit-blanche-2026-09-21` and **nothing else**. I cannot open it. That is
   the journey that justifies the very existence of notifications.
2. **Shared link.** A friend sends the URL by message. Same dead end.
3. **Relaunch after a kill on a deep screen.** I persisted "the last screen and its argument", as my
   need 5 requires. If I persisted a UUID, it is not shareable and it is not what the notification
   carries; if I persisted the URL, I do not know how to resolve it.

**And the hole reaches beyond my surface.** `DateCard.canonicalUrl` states that it is "what the TV
encodes into a QR code for the Share action, since a television has neither a clipboard nor a usable
messaging app". The phone that scans that QR code is **mine**, and it does not know how to open it.
The TV's share journey stops on my home screen.

**What I ask**: a resolution endpoint, taking a canonical URL or a (type, slug) pair, returning the
complete `DateCard` or `ArtistSummary`, **accessible without a session** (a shared link often opens
as a guest) and **in a single round trip**.

### C3 — `/v1/changes` does not cover the eight-hour scenario, on three counts

My question 3 was "the most expensive in the document". The answer is excellent in principle —
`/v1/changes` returns "a list of invalidations, **not the data**", one request instead of twelve —
and incomplete on three details that decide its real usefulness.

**(a) No retention window is stated.** `realtime.md` §5 bounds the WebSocket resume to "30 minutes
or 5,000 events per stream", which is perfectly sized for a network hiccup and **useless for my
case**: eight hours in the background is two orders of magnitude beyond it. §5 adds "the WebSocket
resume covers minutes; the HTTP read covers hours" — but that sentence is written about the
**durable studio journal in Kafka**, in a paragraph about the run desk console, and **says nothing
about `/changes`**. Neither the endpoint (l. 238) nor `ChangeFeed` (l. 3858) says how far back
`since` may reach. If the answer to `since = now − 8 h` is `complete: false`, then "reload
everything" over cellular is **exactly** the cost my question existed to avoid, and I will have paid
it in one request instead of forty — which is progress, but not the answer.

**(b) The tag vocabulary is narrower than what the realtime channel carries.** The
`viewer:{profileId}` room (`realtime.md` §2) carries "notification badge, rights recomputed after a
purchase, **cart modified elsewhere**, revocation". `ChangeFeed.invalidated` (l. 3870) carries eight
tags: `date:{id}`, `date:{id}:availability`, `artist:{id}`, `category:{id}`, `account:tickets`,
`account:orders`, `account:subscription`, `home:rails`.

**Neither the cart nor the notifications appear there.** Yet those are the two badges in my header,
present on **all** my screens, and the cart "lives on the account" (`Cart`, l. 4444) — so the web
can change it while my app sleeps. On returning after eight hours the WebSocket channel has long
been dead: `/changes` is my **only** path, and it cannot tell me my cart changed. Also missing:
`account:saved-searches`, `account:watchlist`, `account:preferences` and `account:devices` — a
device revoked from the web must reach me.

**(c) `since` is a single instant, while I hold N responses at N different instants.** My home
screen dates from T1, my account from T2, my category page from T3. A single `since` forces me to
send **the oldest**, which maximises the change set returned and therefore the probability of
`complete: false`. It is a mechanical penalty, and it bites harder the longer the app has been
closed — that is to say, precisely in the case it targets.

**What I ask**: a retention window **stated in the contract** and aligned with the cursor's lifetime
(24 h); the six missing tags added to the vocabulary; and a `since` acceptable **per tag**, so the
home screen does not pay for the staleness of the account.

### C4 — Reclaiming one's own playback session is promised in the index and absent from the contract

`answers-to-surfaces.md`, mobile Q5, writes: "you can **reclaim your own session** identified by the
device". I cannot find it.

`POST /v1/playback/{dateId}/open` (l. 1395) does take a `deviceId` in its body, but **its
description nowhere says** that an `open` from a `deviceId` already holding a lease on the same date
recovers or replaces it. And `ActivePlaybackSession` (l. 4719), served with the
`CONCURRENT_LIMIT_REACHED` refusal "so the surface can offer to release one", carries `sessionId`,
`deviceLabel`, `city` and `openedAt` — **not `deviceId`**, no `isCurrentDevice`. So I cannot
recognise which of the listed sessions is mine. Two phones in one household labelled "Phone" are
indistinguishable.

**The precise journey.** The OS kills the app at the tenth second of a 90 s lease. The user taps the
icon again immediately — the commonest gesture after an unexplained disappearance. `PlaybackTicket`
is `Cache-Control: no-store`, and the contract is right to require it: I therefore **no longer have
the `sessionId`**, and I can neither renew nor release. I call `open` again, I receive
`CONCURRENT_LIMIT_REACHED`, and I have to show the user a list asking them to release **their own
phone, without being able to point at it**.

**And this is not an annoyance, it is a block.** `ViewerContext` carries
`concurrentStreamsAllowed`, and the contract's own examples fix it: line 219 and line 645,
`plan: { tier: pass, ..., concurrentStreamsAllowed: 1 }`. A `pass` subscriber — the middle plan,
therefore the commonest — is thus **locked out of their own device for eighty seconds** after every
OS kill, with no way out they can understand.

The 90 s lease is the right answer and I got it. **What is missing is the last metre**, and it is
all the more regrettable because the rest of the reasoning is sound.

**What I ask**: that `open` from a `deviceId` already holding a lease on the **same date**
**reclaim** it — same session, lease extended, no refusal — and that `ActivePlaybackSession` carry
`deviceId` and `isCurrentDevice` so the refusal stays legible in the other cases.

> **↪ Outcome (added after the confrontation, 21 September 2026).** **Closed, both halves, in the
> words this grievance used.** `openPlayback`'s `deviceId` now carries a description that begins
> *"**This is what carries resumption.**"*: an opening on a `deviceId` already holding a live lease
> for that date *"**resumes that lease** and returns the same `sessionId`; it does not open a second
> one and does not consume another screen"*. It ends by naming the defect — *"The promise 'you can
> resume your own session, identified by the device' was written in the answers to the surfaces and
> was carried nowhere in the contract."* `releasePlayback` says the same from the other
> side: *"The client can **resume its own session**, identified by `deviceId`."*
>
> `ActivePlaybackSession` (cited above as l. 4719) gained both fields, and `deviceId`
> carries the reason verbatim from this grievance: *"**Served, because without it the list is not
> actionable.** The surface must be able to recognise **its own** session in order to offer 'resume
> here' rather than 'release another screen', and a device label is not enough: two phones of the
> same model carry the same one."*
>
> One consequence I had not anticipated: resumption made the idempotency key redundant on this
> endpoint. `x-arthome-idempotency-exemption` now argues that *"the effect of a second call is the
> effect of the first, by construction and not by memorisation"*, and that a key would have forced a
> signed token into a 24-hour store for a response the contract declares `no-store`. The fix is
> cheaper than the ask.

### C5 — The account menu costs six calls for six badges, and the header two more on cold start

`transport.md` §1 (l. 31) announces "internal calls **per screen**: 1 to 4, all parallel". That is the
BFF's fan-out to the services, and it is good. **That is not what I pay.** The number of round trips
**from the client to the BFF** is budgeted nowhere, and it is the only one measured in cellular
latency — at 150 ms per round trip, four calls make six hundred milliseconds before the first screen
is correct.

**The account menu.** `AccountScreen` (l. 4993) presents itself as "**one** aggregate for the eleven
sections" and keeps that promise magnificently on **content**. But the menu displays a **count per
section** — upcoming, past, favourites, saved searches, orders, unread notifications — and
`AccountScreen` **carries none of them**. To paint six badges I must call `/v1/me/account`,
`/v1/me/tickets?window=upcoming`, `/v1/me/tickets?window=past`, `/v1/me/saved-searches`,
`/v1/me/orders` and `/v1/me/notifications`: **six round trips**, and the seventh — favourites — does
not exist at all (C1). An aggregate that avoids ten content calls and imposes six counting calls has
won only half its bet.

**The header, on every cold start.** Two badges live there on **all** my screens: unread
notifications and the cart. `ViewerContext` (l. 3810) is explicitly "the entire budget of the boot
screen" and carries deviceId, profiles, account, plan, preferences, constants, label catalogue,
taxonomy and the realtime entry point — **but neither `unreadCount` nor the cart's line count**. A
complete cold start therefore costs `POST /v1/devices` (first launch) + `GET /v1/viewer-context` +
`GET /v1/home` + `GET /v1/me/notifications` + `GET /v1/cart` = **five round trips** before my first
screen is entirely correct, two of them for two numbers alone.

**What I ask**: a `counts` object on `AccountScreen`, and `unreadNotifications` + `cartLineCount` on
`ViewerContext`. These are already-projected counters — `unreadCount` is in fact already served as
"global, not the page's" by `/v1/me/notifications` (l. 2702), so the value exists. The server cost is
nil, the client gain is four round trips on the most frequent journey in the application.

---

## 3. What is satisfied by other means — and whether that suits me

### S1 — Language is served on the detail page only: that suits me only halfway

`DateCard` carries `languageDependency` (l. 4079) with the vocabulary
**`none | helpful | essential`** — D1 applied, `light` dropped, my time-1 finding upheld. But
`spokenLanguages`, `subtitleLanguages` and `surtitleLanguages` appear only on `DateDetail`
(l. 4109–4111).

Consequence: a **card** cannot display "Performed in French · Subtitles FR, EN", and
`isUnderstandable(show, my languages)` cannot be evaluated over a list. And that is not a detail of
the detail page: it is a **decision** input — a viewer who does not speak French discards a card on
that line, and the language barrier is the most visible rule on the surface (that is `helpers.js`'s
own reasoning: "what really gets in a live-performance viewer's way is not the rights but the
understanding").

On **facets**, by contrast, the design is right and I have nothing to say: `Facet` (l. 4313) is
generic, "never an enumeration of facets in the contract", so a language facet can appear with no
change of contract. **That suits me for search, not for the card.** Three arrays of two-letter ISO
codes cost a few tens of bytes.

### S2 — The third channel is `in_app`, not SMS: that suits me

I had noted that nothing named the third channel and that the profile hinted at SMS ("for SMS
reminders"). The contract settles on `push | email | in_app` (`SavedSearch.channels` l. 4906,
`NotificationPreferences.triggers` l. 4930), with my own argument — cost per message, its own
regulation, one more vendor, value never tested. **It is the right choice.** One consequence to
record: the profile's phone field loses the justification it displayed, and `phoneVerified` remains
in `AccountScreen` with no declared use.

### S3 — Chat mode: resolved by reframing, and better

My question was "the date's mode or the viewer's preference — which wins?". The contract does not
settle it, it dissolves it: `chatMode` on the date (`open | emoji | read_only | off`) is the
**regime**, and `ViewerPreferences.account.chatOpenByDefault` is a **panel** preference. They are
two things, and my mockup conflated them. **That suits me, and it is cleaner than what I
described.**

### S4 — `nature` has no member for "no network": a reservation

`Error.nature` (l. 3613) is `refused | unavailable | offline_forbidden`, and `offline_forbidden` is
an inspired addition: a **local refusal, never emitted by the server**, in the vocabulary "so the
surface has only one shape of error to render". That is exactly the spirit of my ask.

But it means "**this command** is forbidden offline", not "**this read** is waiting for the
network". My fifth state — the one where no response ever arrived, which only the client can
observe, and which must above all not display as a platform failure — has no name. Every surface
will invent one. That is the fault **critical rule no. 15** describes: "an operational constant has
one owning document; elsewhere you refer to it, never copy it". A minimal ask: add
`network_unreachable` to the vocabulary, marked client-only as `offline_forbidden` already is.

### S5 — Bitrate is served nowhere: a reservation, and it is the same fault

`qualityCap` is a ceiling, `ViewerPreferences.device.defaultQuality` is a preference
(`auto | low | medium | high`), `dataSaver` is a boolean. **Nothing carries a variant's bitrate or
an estimate of consumption.** Yet my surface displays "4K uses about 12 GB per hour" to justify that
setting, and `DomainConstants` (l. 3705) does not carry that number. It will therefore end up
hard-coded on my surface, then recopied differently on the TV — the eleventh instance of the fault I
catalogued eleven times at time 1, and one forbidden by critical rule no. 15. Ask: a bitrate or an
approximate consumption per variant in `PlaybackTicket`, or a domain constant.

### S6 — A territorial refusal with no way through to the other dates

`rights.reasonCode` is a **code** (`co_production | broadcaster | festival`, l. 4066) and not a
sentence: my finding is upheld, and `shared/`'s i18n leak is fixed. `WatchVerdict` carries
`reasonParams` for "the territory, the plan required, the expiry instant".

But my copy promises, word for word: "This date is an exception: {reason}. **The other dates of this
show remain available.**" And `fallbackAction` (l. 3930) is
`buy_seat | join_waitlist | subscribe | watch_preview | see_replay_policy | none`: **no code says
"see the other dates"**. `DateDetail.seriesDates` exists (l. 4136) but is not reachable from a
refusal received on a card. My need said: "an error that promises a way out without carrying it
forces the client into a second request at the worst possible moment". That is the case here. Ask: a
`see_other_dates` in the vocabulary, and the run's identifiers in `reasonParams`.

---

## 4. My time-1 warning, confronted

I had verified that **fourteen of the sixteen functions** in `shared/helpers.js` are never called by
my mockup, and written that their contract had to be "**designed, not observed**". Here is what was
designed, and my verdict.

| Function never exercised | What was designed | Verdict |
|---|---|---|
| `isWatchable` | `WatchVerdict`, ten refusal codes, `fallbackAction`, `validUntil` ≤ 60 s | **holds** |
| `availableIn`, `rightsNote` | `rights.scope` / `blackoutCountries` / `reasonCode` + `OUT_OF_TERRITORY` with `reasonParams` | **holds, except the way out** (S6) |
| `languageLine`, `hasLanguageBarrier` | `languageDependency` on the card, the languages on the detail page only | **holds halfway** (S1) |
| `seatsLabel`, `isSoldOut` | `availability`: `seatsAvailable`, `waitlistCount`, `fillRateBps`, `soldOut` | **holds, and better** |
| `progressOf` | `liveEdgeSec` + `startsAt` + `runtimeMin`, derived against `servedAt` | **holds** |
| `viewersOf` | `viewers` nullable — "absent, never zero" — plus a differential `counters:tick` | **holds** |
| `devicesOf` | `Device` + `sessions[]`, device and session finally distinguished; my remark cited in `context-map.md` §7.1 | **holds** |
| `alertsOf` | `NotificationEntry` + `SavedSearch` + `newMatchesSinceLastVisit` | **holds, except the per-artist alert** (C1) |
| `resumeOf` | `resumePoint`, `viewerProgress`, `/v1/me/progress` with its cadence | **holds entirely** |
| `plans` | `Plan`, `Subscription`, `concurrentStreamsAllowed` served | **holds** |
| `messageState`, `chatOf` | `badge` **derived** by `moderationBadgeOf`, precedence written down, three axes kept separate model-side, removed messages filtered at source | **designed, not exercised** |

**Eleven hold, two hold halfway, one remains open.** And `context-map.md` §13 (contract maturity)
marks `chat` **provisional**, citing my verification explicitly — "no screen has ever exercised
moderation as the viewer sees it; a contract that is designed and not observed is not frozen".
That is the right answer to my warning: not to claim it lifted. **I maintain the warning on
moderation alone, and I lift it on the other ten.**

---

## 5. The questions with no answer

Seven, in order of impact.

1. **How far back can `since` reach on `/v1/changes`?** No window is written down. At eight hours,
   is it `complete: false`? (C3a) — **blocking for the design of the client cache**.
2. **Does an `open` from a `deviceId` already holding a lease on the same date reclaim it?** (C4) —
   blocking for a `pass` subscriber, for whom the contract itself sets
   `concurrentStreamsAllowed: 1`.
3. **What is the screen limit for `free`?** `multi_screen` is in the `opens[]` of `premium` only,
   the examples fix `pass` at 1, and `free` is illustrated nowhere.
4. **Following and being alerted: one gesture or two?** `/v1/me/follows/{artistId}` asserts they are
   two settings and offers only the first. (C1)
5. **Bitrate per variant, or an approximate consumption?** (S5)
6. **`network_unreachable` in the `nature` vocabulary?** (S4)
7. **`see_other_dates` in the `fallbackAction` vocabulary?** (S6)

Questions 4 to 7 are vocabulary additions, not changes of shape: they cost one line each and stop
five surfaces from inventing five answers.

> **↪ Outcome (added after the confrontation, 21 September 2026).** **Two of the seven are
> answered.** Question 2 — does an `open` from a `deviceId` already holding a lease reclaim it —
> is now yes, stated on the parameter itself (see C4). Question 4 — following and being alerted,
> one gesture or two — is answered as **two**, with the second now offered: `alertEnabled` is
> written through `PUT /v1/me/follows/{artistId}` and read back on every entry of
> `GET /v1/me/follows` (see C1).
>
> **Five remain open as of this date**, and I record that rather than leave a reader to infer it
> from silence: question 1 (the retention window of `/v1/changes`), question 3 (the screen limit for
> `free`), question 5 (bitrate per variant), question 6 (`network_unreachable`), question 7
> (`see_other_dates`). Grievances **C2**, **C3** and **C5** are open for the same reason — no
> outcome note appears under them because nothing has yet happened, not because nothing was found.
