# Needs — studio mobile (Angular + Ionic + Capacitor)

> What the contract must carry and guarantee for the duty tool. No screen descriptions: the
> mockups *are* the design. This document states **what the surface needs**, and why the native
> shell and the duty situation make some needs non-negotiable.
>
> Sources read: `mockups/Studio Mobile.dc.html` (in fragments), `shared/helpers.js`,
> `shared/studio-data.js`, `shared/catalogue.json`, `shared/fixtures.js`, `shared/i18n/studio.json`,
> `README.md` §7, `streaming.md`, `architecture/corrections-handoff.md`.
>
> Orchestrators loaded before any decision: `ionic-capacitor-how-to`, then `angular-how-to`
> (D-001). None of their rules contradicts a project decision; where they bear on the contract,
> they are cited.

---

## Screen inventory

**Same tree as the studio web.** The lead's survey is accurate and complete. I confirm and extend
it below; I do not re-describe the screens the studio web will cover.

### Pages

`agenda` · `dashboard` · `moderation` · `crew` · `events` · `stream` · `stats` · `tickets` ·
`store` · `replays` · `payouts` · `journal` · `settings` · `help` · `regie` · `event` · `wizard` ·
`inbox` — eighteen, of which fourteen are in the menu (`ORDER`) and four are not.

The distinction between the two families is not cosmetic. It is carried by two separate tables in
the mockup and it governs authorization:

| Family | Table | What it is |
|---|---|---|
| Menu pages | `ACCESS[role]` | what a role **opens**, and what fills the bar and the sheet |
| Contextual pages | `FREE[role]` | `event`, `wizard`, `regie` — reached **from** another page, never listed |
| Inbox | hardcoded | `inbox` is added to `FREE` for everyone, with no role condition |

### Sub-tabs found

| Page | Sub-tabs | Origin |
|---|---|---|
| `moderation` | `live` · `queue` · `filter` · `sanct` | fixed |
| `crew` | `members` · `matrix` · `guests` · `log` | fixed |
| `regie` | `ov` · `chat` · `crew` · `q` | fixed |
| **`event`** | `public` · `tickets` · `chat` · `tech` · `crew` · `replay` | **role-derived** |
| `events` | `upcoming` / `past` | a temporal split, not tabs |
| `stats` | `audience` / `series`, each as a chart or a table | fixed |

**The sixth case is the most important one, and it was missing from the survey.** Each of the six
tabs on the date record carries its own list of roles (`public`: artist, prod — `tickets`: artist,
prod, tres — `chat`: artist, prod, mod — `tech`: artist, prod, regie, coord — `crew`: artist, prod,
coord — `replay`: artist, prod). A seventh entry, "overview", appears only when at least three tabs
are open to the person. **A detail screen whose very division depends on effective rights**: it is
not only the root navigation that must know the rights before painting, it is every record too.

### Dialog sheets

Listed, because each one is a command point and not an ornament: `more` (the remaining pages),
`chan` (channel picker), `account` (account and reading timezone), `states`, `sort`, `move` (state
transition), `dup`, `del`, `banword`, `mute`, `crewdate`, `slot`, `role`, `invite`, `refund`,
`slug`, `danger`, `confirm`.

### Six personas

`artist` · `prod` · `regie` · `mod` · `coord` · `tres`. **These are six projections of eight real
roles** (`memberRoles`: artist, production, coordination, director, video, sound, moderation,
treasury). See "Inconsistencies found", point 3: the projection is not safe for authorization.

---

## What sets this surface apart from the studio web

Five differences. None of them is a matter of screen size; all five change what the contract must
carry.

### 1. The root is not a channel, it is a person

The studio web opens on a channel and stays there. The studio mobile opens on `agenda` — "**your
duties, all channels**" — for the `regie` and `mod` roles. That screen aggregates, **across every
channel**, the dates the person has to hold: title, channel, the role they hold there, day, venue
time **and** their own local time, date state, announced runtime. It also detects **overlapping
duties** ("two streams to hold tonight").

**What the contract must carry**: a read model **centred on the person, not on the channel**. One
single request must return the person's duties in full over a time window, each carrying the
channel identifier, the date identifier, the role held **on that particular channel**, the
curtain-up instant and the venue's IANA timezone. Without it, the home screen of the duty tool
costs N requests, one per channel, on a venue's network.

The overlap must be **computed once**: it is a domain rule (two duties overlap when their on-air
windows overlap, window = curtain-up − doors open → announced end). It belongs in `@arthome/core`,
not in two surfaces.

### 2. Four tabs at most, derived from the role — so rights before the first paint

The bottom bar is computed like this, in exactly this order:

```
roles      = role held on the current channel  ∪  optional second role
union      = ⋃ ACCESS[r] for r ∈ roles           "access is the union of roles, never a rank"
allowed    = ORDER filtered by union             canonical order, not arrival order
free       = ⋃ FREE[r] + inbox
pref       = ⋃ TAB_PREF[r], deduplicated         per-role preference order
tabs       = pref ∩ (allowed ∪ free), 4 at most  + a "More" entry, always present
```

Three consequences for the contract, and they are heavy:

**a. Effective rights must arrive before the first paint.** The app cannot draw its navigation and
then correct it: the tab bar is the mental map of a person on duty, and a bar that shifts under the
thumb during a live show is a fault. So there must be **a single bootstrap resource**, read before
the first route activates, carrying: the account, **all** the channels where the person has access,
and for each one the **effective role set**. One read per channel is out of the question —
switching channel recomputes the whole navigation, and a network round trip between the gesture and
the repainted bar is unacceptable on duty.

**b. `ACCESS`/`FREE` are authorization, `TAB_PREF`/`ORDER` are presentation.** Authorization comes
from the contract and is never guessed client-side. The preference order, on the other hand, is a
presentation table — but it must be **shared with the studio web**, which orders the same menu: so
it lives in `@arthome/core`, not in the app's repository. No value computed twice.

**c. Rights change while the app is open.** An accepted invitation adds a channel to the picker; a
one-off access **expires on its own at curtain-down**; a role can be removed. The contract must let
the app **learn that its navigation is stale** — a rights version number, carried on every response
and pushed over the real-time channel. Without it, the person keeps a tab that opens a 403, and
discovers it mid-duty.

### 3. Role-based redaction is not display masking

Two predicates govern entire swathes of content:

- **`canRevenue`** = artist ∨ prod ∨ tres. Decides whether **amounts exist at all**. The mockup is
  explicit and says so on screen: "outside your right to know". A show caller escalating an
  incident sees "340 seats affected", never the revenue.
- **`canDecide`** = artist ∨ prod. Governs the gestures that bind the buyers: publish, postpone,
  cancel, compensate, duplicate, delete, apply to the series.

**What the contract must guarantee**: a forbidden field is **absent from the payload**, never
present and null. The distinction is decisive on mobile: the payload is in clear in the WebView,
inspectable, and it survives in the phone's HTTP cache. An amount "hidden at display time" is an
amount delivered.

A less obvious corollary: **a sort key on an absent field must be refused**, not ignored. The
`events` page sorts on six keys, one of which is `rev` (revenue). A sort silently accepted on a
redacted field betrays the order of the values it is not allowed to show.

### 4. The show caller in the venue is not where the stream is

This is the most specifically mobile difference, and the mockup devotes a whole block to it — "two
failures not to confuse":

| What is happening | What the app must say | What it must **above all** not do |
|---|---|---|
| The venue is sending nothing | "feed lost" — restart the encoder | — |
| **The phone lost the network** | "I no longer know" — **the broadcast continues, do not cut** | announce that the feed is lost |
| Bitrate collapses | "step down one tier" | — |

A studio web sits on the office network; a studio mobile sits on the 4G of a basement venue.
**The app must never infer the stream's state from the state of its own connection.**

**What the contract must carry**: every on-air measurement travels with the **instant it was
measured at the ingest**. The app can then display "bitrate 8.9 Mb/s, measured 3 s ago" or "last
measurement 2 min ago" — which is honest information — instead of "0 Mb/s", which is a lie.
`streaming.md` already states the rule for TV and web: "hide what is not measured rather than show
zero: a zero reads as *perfect*, not as *not measured*". On mobile, the same rule must cover a
third case: *measured, but I could not receive it*.

### 5. Two settings follow the person, not the channel

The mockup writes it twice: the **run-desk layout** ("per person, not per channel — your choice
follows your account") and the **encoding profiles** ("your profiles travel from one channel to the
next: the post changes, the settings stay").

Yet the mockup keeps them in `localStorage`. On the native shell that is wrong twice over: the
storage is bound to the origin (a scheme change orphans it), the OS may clear it, and it travels in
no way from one device to another — so it "follows" no account at all.

**What the contract must carry**: a small **per-account interface preferences** resource, read at
bootstrap and written by command. Two entries identified today (run-desk layout, named encoding
profiles), a third likely (the reading timezone, see below). It must be **additive and tolerant**:
a key unknown to one version of the app must neither make it fail nor be erased on the next write —
otherwise the mobile version sitting in store review overwrites settings made from the studio web.

---

## Data shapes

`shared/` is authoritative on vocabulary and rules, not on shapes. What I ask for here is what is
missing, not what already exists.

### What every response must carry

- **ISO 8601 instants in UTC**, never an offset in minutes (D7). Every date additionally carries
  **its venue's IANA timezone** (D3): the mockup systematically shows the venue time **and** the
  person's own time, and the wizard's input is given in venue time.
- **A version number per aggregate read** (date, publication, moderation item, member, payout).
  That is what lets a command be conditional rather than blind — see "Commands".
- **A freshness instant per read model** (`asOf`), distinct from the version. On duty you need to
  know how old what you are looking at is, not only whether it changed.
- **The audit fields `shared/` lacks**: who decided, when, from which surface. The mockup promises
  "timestamped and named" everywhere — moderation log, access log, channel journal, incidents. As
  of today the promise has no field behind it.

### Read models specific to this surface

I name them and say what they carry; the models shared with the studio web (date, publication,
payout, statistics, store, replay) are its business.

**1. The bootstrap** — one request, before the first route. Account; the complete list of channels
with, per channel: identifier, name, artwork, **effective roles**, venue IANA timezone, an "on air
right now" flag, ownership (`own`); the `grants` table **projected onto the person's roles** (what
*this person* can assign, not the general table); the interface preferences; the rights version;
the inbox counter. Small, cacheable, revalidatable.

**2. Duties** — described in §1 above. Configurable window (tonight / the week), all channels.

**3. The moderation queue** — an item carries: the **message** identifier, the identifier of the
**audience member** who wrote it, the text, the report reason (`moderationReasons`), the report
count, the instant, **and the position in the media** (see below), plus the claim state: free,
claimed by me, claimed by a named colleague, **settled** (with the verdict and the name of whoever
settled it). That claim state exists nowhere in `shared/` and it is the heart of the screen.

**4. Media anchoring of chat.** `streaming.md` §5 already requires it for replay: a message carries
**its position in the media**, not only its send time. The mobile run desk has a second use for it:
the duty stopwatch counts **from curtain-up**, and the moderation log timestamps in venue time
relative to the broadcast. A message without a media position makes the moderation log unreadable
when replaying a recording.

**5. On-air measurements** — a short time series: upstream bitrate, latency, dropped frames,
viewers, **each with its measurement instant** and, per `streaming.md`, **absent when not
measurable for the ingest protocol** (jitter and lost packets do not exist over RTMP). On mobile
the series must be requestable **short**: duty needs the last three minutes, not the history of the
whole show.

**6. The audience member** — a channel's audience is a **collection queryable in its own right**,
not a projection of the chat. The sanctions console searches for "a spectator in the audience, even
one who never wrote". It carries: handle, sanction state, dates attended, message count, seniority,
subscriber status.

**7. Received invitations** — they carry a **scope** (permanent, or a single date), the date
concerned where applicable, who is inviting, the proposed role, and an **expiry** ("expires at the
date", "expires in 6 days"). An accepted invitation must bring the channel into the picker
**without a reload**: it is a rights change, therefore a rights-version increment.

**8. A date's crew slots** — for the crew matrix: per date, per post (`regie`, `mod`), the **list**
of assigned people (several are possible), and whether the slot is **out of the viewer's hands**.
Assigning the run-desk slot is restricted to artist ∨ prod for a reason the contract must make
explicit: **it is what grants the stream key**.

### What `shared/` does not carry and I need

- **The cause of an incident.** `catalogue.incidentMessages` knows four entries — `hold-screen`,
  `postponed`, `cancelled`, `interrupted` — which are **outcomes**, not causes. The mobile run desk
  distinguishes three more, which exist in no vocabulary: *feed lost at the venue*, *run desk
  disconnected*, *bitrate collapsed*. A closed vocabulary of causes is needed, distinct from the
  vocabulary of outcomes.
- **The source of a store item.** The mockup displays Arthome / Shopify / WooCommerce / digital and
  infers it from `merch.kind`, which is wrong (`print` is a printed programme, not a digital
  deliverable). A source field is missing, and for external orders, the address to go out to ("open
  at the merchant").
- **Pinning an item during the live show**: a studio command that changes what the storefront
  displays live. No shape today.
- **The technical provisioning of a capacity.** The mockup speaks of a threshold of 10,000
  simultaneous viewers beyond which infrastructure is provisioned in advance, with a penalty if the
  forecast exceeds the real figure, and of **tiers** that widen a capacity without ever shrinking it
  once on sale. Nothing in `shared/`.
- **The waitlist priority window** (2 h) and the fact that opening a tier notifies the list "in the
  same gesture".
- **Complimentary tickets** (press, partners, guests): issued / allocated, by category.

---

## Commands

All of them carry `Idempotency-Key`. Here the rule counts twice over: a mobile network replays, and
a user who sees no response taps again.

### Inventory

| Domain | Commands |
|---|---|
| Publication | state transition; duplicate a date; delete a date; apply to the series; edit a field on the record |
| Ticketing | open a capacity tier; refund; authorize a seat transfer; answer a bank dispute |
| Moderation | claim / release; publish; remove; mute (with a duration); ban; lift a sanction; add/remove a dictionary term; change the chat regime, the filter severity, slow mode, ticket-holders-only |
| On air | declare an incident; broadcast the hold screen and its message; resume the broadcast; escalate to production; postpone / cancel and refund / continue with compensation; change the broadcast profile |
| Streaming | reveal the stream key; **rotate the stream key** |
| Crew | invite; change a member's roles; remove a member; assign to / remove from a slot; revoke a one-off access; accept / decline an invitation |
| Treasury | request a bank account change; generate an accounting export |
| Channel | edit the public identity; change the broadcast defaults; transfer ownership; delete the channel |
| Store | pin / unpin an item during the live show |
| Account | change the reading timezone; save an interface preference; sign out |

### Three regimes, and the contract must name them

**a. Conditional commands — most duty gestures.** They carry the **aggregate version** the decision
was made against, and the server **refuses** if it has changed. The canonical case is the
moderation verdict: two moderators are on the same queue, and the mockup is categorical — "the line
is closed on their verdict". The second verdict must not overwrite the first, it must be **refused
with the winning verdict and the name of whoever rendered it**, so the screen can say so. A blind
idempotent replay would produce exactly the opposite.

**b. Claims — leases, not writes.** "Claiming" is not settling. A claim must **expire on its own**:
a moderator whose phone dies must not freeze the queue. So an explicit lease duration, renewed
while the person is present, and released by the server on expiry. A claim is **never** queued
offline: replayed on reconnection, it would claim a line somebody else has already handled.

**c. Two-step commands.** Three gestures do not apply immediately and create a **pending state**
the contract must carry:

- **the bank account change** — it goes to the owner for countersignature, and **suspends the
  payout in flight** until it is signed;
- **the channel ownership transfer** — double validation;
- **the invitation** — pending until the invitee answers, and visible as such in the member list.

### The guards the server must set, and whose reason it must state

The app cannot check them on its own, and must not try:

- deleting a date is **impossible once seats are sold**;
- deleting a channel is **impossible while a date is on sale or a payout is due**;
- publishing is **blocked while a checklist item is missing** — and the refusal must name **which
  ones**, as parameters of the error code, since the screen counts them ("publish — 3 missing");
- publication is **locked until the technical check has passed**;
- two transitions are **one-way** and require a confirmation whose text comes from the contract:
  `draft|reserve → scheduled` (publishing commits the displayed price) and `ended → replay-online`
  (spectators have paid for the replay);
- **prices lock on going on sale**, the **time** locks on going on air;
- "apply to the series" **excludes prices and capacity** — never carried over, each date binds its
  own buyers.

These locks live in `@arthome/core` and are **served by the contract**, not recomputed by the app.
The mockup recomputes them from the state; that would be a second implementation of the rule, hence
a guaranteed divergence.

### One command that deserves its own treatment: the stream key

It is a secret displayed on a phone, in a venue, often in front of a contractor. The contract must
guarantee: the key is **never in a list payload**; revealing it is a **distinct, audited, named
command**; rotation is immediate and the old key **stops broadcasting at once**; and assigning the
run-desk slot — which grants access to the key — is restricted to artist ∨ prod. On mobile, add:
the key must not end up in the HTTP cache, nor in an app snapshot taken by the OS when going to the
background.

---

## Real time on duty

### Who needs what, and at what latency

| Stream | For whom | Acceptable latency | Nature |
|---|---|---|---|
| Moderation queue | `mod` | **one second** | additions, removals, claims, verdicts |
| Live chat | `mod`, `regie` | one second | additions, with per-message state |
| Chat rate (msg/min) | `mod` | ~5 s | an aggregate measurement, not inferred from the message stream |
| On-air measurements | `regie` | ~5 s | timestamped samples |
| Incident state | every role on the channel | **immediate** | the hold screen is a veil |
| Crew presence | `regie`, `mod` | ~10 s | "moderator online" / "nobody on the post" |
| Duties and alerts | everyone | one minute | and by notification when the app is closed |
| Rights version | everyone | immediate | invalidates the navigation |

The channel is the project's: broadcast through the Socket.IO adapter on Redis, Kafka remaining the
durable log for moderation and audit. I have no need that calls this into question.

### What duty adds as requirements

**1. A multi-channel subscription.** A show caller can have **two streams under their watch the
same evening**; a moderator can cover several channels. The channel must therefore be **per
person**, and carry the events of every channel where they have access, each tagged with its
channel identifier. One subscription per channel would multiply connections on an already fragile
mobile network.

**2. A switchover threshold that depends on a server-side measurement.** Beyond **60 messages per
minute**, the console stops showing the chat message by message and switches to the queue. That
threshold is a domain rule; the measurement it applies to must be **defined in the contract** —
sliding window, unit, refresh rate. Today the mockup computes it from the message count divided by
the hours elapsed, and calls it "msg/min" (see Inconsistencies, point 6).

**3. A resume, not a replay.** See the next section: it is the heaviest consequence of mobile
backgrounding.

**4. Visibility of concurrency.** The queue screen shows "*X* is examining", "*X* has settled".
That assumes other people's claims and verdicts arrive on the same channel, with the **name** of
whoever is acting. It is a contract requirement, not a display one: without it, two moderators work
blind to each other and collide on every line.

**5. A retroactive effect to propagate.** Adding a term to the dictionary "applies retroactively:
already published messages containing it go back into the queue". That is a server-side
reprocessing that produces a batch of new queue items. The contract must say whether it is
synchronous (the command answers with the number of messages requeued) or asynchronous (the queue
grows on its own a few seconds later) — both are defensible, the ambiguity is not.

---

## Offline, background and resume

This is the section where the studio mobile diverges most from the studio web, and it comes down to
one question: **what gets queued, and what gets refused?**

### The rule I propose

> **A command is queued offline if and only if it bears on a named object and its meaning does not
> depend on the instant it is applied. Everything else is refused.**

### What gets refused — and why refusal is the right behaviour

| Command | Why it does not replay |
|---|---|
| Publish, postpone, cancel and refund, compensate | the decision is **priced against the state of the moment** — seats sold, revenue. Replayed three minutes later, it decides on stale facts |
| Put a replay online | one-way, and it puts it on sale |
| Broadcast the hold screen, change its message | it is a **broadcast to the spectators**. Replayed after recovery, it cuts a broadcast that is fine |
| Rotate the stream key | immediate effect on the ingest; a replay cuts a live broadcast |
| Open a capacity tier | it notifies the waitlist and commits infrastructure |
| Claim a queue line | it is a lease: replayed, it claims a line already handled |
| Change the bank account, transfer, delete the channel | two-step, and irreversible |

The refusal must be **explicit and distinct from a network error**: "this gesture cannot be
prepared offline" is not "it did not work, try again". On duty, the difference decides whether you
retry or pick up the on-call phone.

**The matching safety net already exists and must be in the contract**: the channel setting
"automatic hold screen if the feed is lost for more than 15 s". That is **the** right answer to the
"the show caller is unreachable" case — a server rule, not an app behaviour. It must be carried by
the contract as a channel default, and its firing must produce an incident event on the same
footing as a manual trigger.

### What gets queued

Two families only, and both conditional:

- **Moderation verdicts on a named message** (publish, remove) — idempotent by nature, and
  **refused if a colleague settled in the meantime**. The replay overwrites nothing; it discovers.
- **Sanctions on a named person** (mute with a duration, ban, lift) — likewise. A sanction **borne
  by the person** survives reconnection without ambiguity, unlike a sanction inferred from a
  message.

These two families are precisely the ones where the mockup writes that "claiming is not settling:
until the colleague has rendered a verdict, **your sanction applies**". That is the admission that
the verdict bears on the object, not on the session.

### Returning from the background

The OS suspends the WebView; the real-time connection dies **with no clean close event**. On wake,
the app must **resynchronise, not replay**.

**What the contract must offer**: a **resume cursor** per channel. "Give me everything that has
happened on this channel since *this cursor*", with three possible answers:

1. here are the events you missed;
2. **the gap is too large, reload the whole read model** — an explicit answer, never a silence;
3. the cursor is no longer valid (rights changed, channel left).

Without the second answer, the moderator comes back to a queue missing ten messages, and nothing
tells them so.

**Ionic makes the problem worse, and that must be known when writing the contract.** Under
`ion-router-outlet` a page stays in the DOM after you navigate away: it is redisplayed as-is on
return. So the contract must offer a **cheap freshness read** — a version per read model, queryable
without pulling the content back — so that returning to a page ends in "nothing has changed" rather
than a full reload on a venue's 4G.

### The clock

The duty stopwatch, the length of a mute, the expiry of a replay window ("expires in 41 h"), the
waitlist priority window (2 h), the expiry of a one-off access: all of it is counted on a phone
whose clock drifts in standby and is settable by its holder.

**What the contract must guarantee**: everything is an **instant**, never a remaining duration
computed by the server and sent as-is. The app derives its countdowns from a server instant and a
measured offset. That is exactly what D7 already imposes — and this is where it matters most.

---

## The native shell: Capacitor

Verified against `@capacitor/core` 8.5.2 and `@ionic/angular` 9 through `ionic-capacitor-how-to`.
What follows is not about appearance — the Arthome tokens through Ionic's CSS variables are outside
my scope, as stated.

### The origins

The app is **served from the phone**, not from a server:

| Platform | Origin the BFF receives |
|---|---|
| Android | `https://localhost` |
| iOS | `capacitor://localhost` |
| Development | the dev server's origin |

**What the contract must guarantee**: the studio BFF's CORS allow-list contains **both literal
strings**, plus the development origins. A bare `localhost` entry covers neither.
`Access-Control-Allow-Origin: *` is **illegal** with credentialed requests: the origin must be
echoed back verbatim. And `capacitor://` is a non-standard scheme: a server framework that
normalizes the `Origin` header through a URL parser will reject it — the check must be against the
literal string.

The Android scheme must **never** be changed: it changes the origin, orphans everything stored
under it, and reads as a mass, silent sign-out of every user on update.

### The session: where the studio mobile cannot do what the studio web does

iOS 14 and later block third-party cookies by default, and a page served from
`capacitor://localhost` calling the BFF **is a third-party context**. The studio web holds its
session in a cookie; **the studio mobile cannot**, short of going through `WKAppBoundDomains` — ten
domains maximum, and it locks down navigation for the whole app.

**What the contract must offer**: a **bearer-token session** for the native shell, alongside the
web's cookie session. Concretely, what I ask of `adr-auth.md`:

- a device-bound refresh token, kept in `@capacitor/preferences` (native store: `UserDefaults` /
  `SharedPreferences`), **never in `localStorage`** — which the OS can clear and which an origin
  change orphans;
- a short access token, exchanged by the BFF for the signed service token as planned;
- **per-device revocation**, because the device is a phone that gets lost, and the person holding
  it is on duty on channels that are not theirs;
- the expected behaviour on **returning from the background with an expired token**: refresh
  silently, or require re-authentication? On duty, a re-authentication at the wrong moment is a
  fault. The answer must be written down, not implicit.

### Deep links: the five exits to an external browser

The app leaves its shell in five cases, all found in the mockup:

| Exit | What it does | What must be guaranteed on return |
|---|---|---|
| **`arthome.fr/compte`** | identity, **payment methods**, purchased seats — "the account is shared with the public site" | the app must **re-read its bootstrap**: name, address and language may have changed |
| **OAuth** (Google, Facebook) and 2FA | sign-in | code exchange, opaque state, session written to the native store |
| **Payout account onboarding** (Stripe Connect) | the provider imposes its own web flow | the account state has changed on the provider's side: the app must **ask again**, never believe the URL |
| **Public page** of a date, platform **documentation** | read-only | nothing to bring back |
| **Merchant site** (Shopify, WooCommerce) | "tracking, exchange and refund happen on the merchant's site" | nothing to bring back, but the app must know it only keeps the count |

**What the contract must guarantee on those returns** — and this is the most specifically Capacitor
point in the whole document:

1. **A return address declared by the app**, in the form of a universal link (`applinks` on iOS /
   App Links on Android) to a project domain, which reopens the app. The backend must accept that
   address as a legitimate redirect and validate it strictly — an allow-list, not a pattern.
2. **An opaque, single-use, short-lived state**, issued by the backend before departure and
   verified on return. It must carry **nothing meaningful**: on mobile the return URL transits
   through the OS, can be logged, and can be opened by another app.
3. **The return must never be the source of truth.** The OS may have killed the app during the trip
   to the browser: on return the WebView is a fresh page, the app's state is gone, and only the deep
   link and the native store remain. So: the deep link says **where** to go and **which** state to
   resume; it is the backend that says **what changed**. A payment confirmed by a URL parameter is
   a payment confirmed by the client.
4. **A resumption flow must be replayable.** If the app is killed between departure and return, the
   person must be able to pick up where they were from the inbox or the screen concerned, without
   restarting the flow. That requires the pending state to be **server-side** ("bank account change
   awaiting signature", "payout account connection in progress"), not in the app's memory.
5. `allowNavigation` serves **only** to let the authentication redirect come back into the WebView.
   It is neither a CORS control nor a security boundary, and it must not be used to work around a
   badly configured allow-list.

A sixth, quieter exit: the **on-call line** ("call"). That is a `tel:` navigation from the WebView —
it does not come back, but it must be planned as a native open and not as a link.

### Uploads and downloads

Two binary payloads exist, and both are constrained by the shell:

- **A date's artwork**: 16:9 image, two megabytes maximum.
- **Accounting exports**: sales journal as CSV, FEC general ledger, Sage/Cegid entries, grouped
  invoices as PDF — "files generated on demand".

The trap: if `CapacitorHttp` is enabled to work around CORS — it is **disabled by default**, and
that needs saying, because the opposite belief is widespread — then on native a request body can be
**only a string or JSON**. `FormData`, `Blob` and `ArrayBuffer` are web-only. A multipart upload
silently stops working on the device while continuing to work in the browser.

**What the contract must offer**, and which is robust either way:

- **Upload**: a JSON command returning a **signed, short-lived deposit address**, then a direct
  deposit. No multipart from the WebView.
- **Download**: an export is an **asynchronous job** — that needs saying, an FEC is not an HTTP
  response — which, once ready, returns a **short-lived signed address**, usable by a native
  transfer **without a session cookie**. An export protected by a cookie is undownloadable on the
  native shell.
- In both cases the signed address's expiry must be long enough for a venue's 4G and short enough
  not to be an access token in disguise. The value is to be decided, not guessed.

### Notifications

Duty must be wakeable with the app closed: "moderation queue saturated", "no moderator assigned at
D-1", "unstable bitrate", "bank dispute within 24 h". The mockup already routes each alert **to a
role** and announces **a distinct sound alert per channel**.

**What the contract must carry**: a per-account device registration (FCM token, platform, version,
language); alert routing **by role and by channel** decided server-side; a payload carrying the
channel identifier, the date identifier and the page to open, **so that opening the notification
lands the app on the right channel, the right page and the right sub-tab** — the same deep-link
mechanism as above, applied internally.

And a rule that follows from redaction: **a notification never carries an amount** if the
destination role does not have `canRevenue`. A notification shows on a locked screen.

### What the contract need not carry, noted for the record

- No service worker on the native shell: the WebView already serves the bundle locally, a worker
  adds a second, stale cache layer. If one exists for a web version of the studio, it must be
  registered **only** on the web platform.
- `android/` and `ios/` are generated native projects **but they are committed**.
- Unresolved, to be checked on a real device before relying on it: is `capacitor://localhost` a
  **secure context** in WKWebView? That governs Web Crypto and `getUserMedia`. See question 8 to
  the backend: the WebRTC/WHEP run-desk return feed is the exposed point.

---

## Pagination and volumes

The project decision applies: **studio = page + total**, deterministic sort with an identifier
tie-break. What the surface adds:

### Totals matter more than pages

The tab bar carries badges (`agenda`: duties tonight, `events`: dates, `moderation`: messages in
the queue), the inbox carries a counter, a screen's stat band displays "in queue: 14",
"invitations: 2", "dates to cover: 3". **None of those numbers may require pulling a page.** The
contract must carry them in the bootstrap and keep them up to date over the real-time channel.
Otherwise the bottom bar costs five requests on every launch.

### Observed volumes

| Collection | Page size in the mockup | Plausible real volume |
|---|---|---|
| A channel's dates | 6 | tens to hundreds per season |
| A crew's members | 4 | tens |
| Moderation queue | 5 (capped) | **hundreds during a saturated live show** |
| Live chat | all | thousands |
| A channel's audience | all, searchable | thousands |
| Journal, duties | 12, all | tens |

Small pages, then, and deliberately so: a thumb does not scroll a hundred rows.

### The tension to arbitrate: a moderation queue is not a page

A moderation queue **grows while you read it**. Offset pagination duplicates rows and skips others
— mechanically, not exceptionally. Live chat has the same problem.

I am **not reopening** the "studio = page + total" decision. I am pointing out that it cannot apply
as-is to two living collections, and I propose the narrowest possible distinction:

- **Stable collections** — dates, members, payouts, replays, journal, store, one-off accesses,
  audience: **page + total**, as decided;
- **Living collections** — moderation queue, live chat: **cursor** to go back through history,
  **real-time channel** for the head, **a separate total** for the badge.

For the lead to arbitrate. If the decision is "page + total everywhere", the contract must then say
what happens when a row is inserted between two pages — and the app will have to live with it.

### Sorting

`events` sorts on six keys: date, title, state, price, capacity, revenue — with a direction. Two
requirements: state sorts by the **canonical order of the state machine**, not alphabetically (it
is domain data, not surface data); and sorting by revenue is **refused** to roles without
`canRevenue`, as said above.

`events` also carries a temporal split (upcoming / past) and a multi-state filter. Both must be
contract parameters, not filtering after retrieval — the "past" split covers the channel's entire
history.

---

## Error and loading states

### The envelope

The project's: code, parameters, trace identifier. **i18n by codes**, with a build-embedded
snapshot as the mandatory fallback. That is vital here and it needs saying bluntly: **a store
review is slow**. If a new error code arrives from the backend before the app is updated, the
person on duty must see a sentence, not `moderation.verdict.conflict`. The embedded fallback and
the dynamically served catalogue (C6) are, on mobile, an **operating condition**, not a
convenience.

### The distinction the envelope lacks, and that duty demands

Three natures of failure, today indistinguishable:

| Nature | What the person must do | Example |
|---|---|---|
| **Refused** — the server said no, definitively | do not retry, understand why | a colleague settled it; three items are missing to publish |
| **Unavailable** — the network said no | retry, or prepare offline if allowed | basement 4G |
| **Impossible offline** — a local refusal, before any send | wait for the network, or escalate | cancel and refund |

The contract must carry that nature explicitly in the envelope. Without it the app cannot choose
between "retry", "explain" and "pick up the on-call phone", and that is precisely the decision duty
has to make in ten seconds.

### The codes I ask for, beyond the generic ones

- rights stale / access revoked / channel left;
- already settled by *X* (with the verdict, as a parameter);
- claim lost or expired;
- resume cursor too old — full reload required;
- publication blocked: the list of missing items as parameters;
- deletion refused: seats sold (with the count);
- transition locked, with the reason;
- payout suspended: account change awaiting signature;
- capacity tier refused: technical provisioning;
- stream key: rotation during a live show.

### Loading

The first paint must wait for **one thing only**: the bootstrap. The mockup already does this — it
refuses to render anything before the data layer has answered, "the tables are never read empty".
That is the right behaviour, and it imposes its constraint on the contract: **the bootstrap must be
small and fast**, because nothing is painted until it is there. Everything else — measurements,
queue, statistics — arrives afterwards, screen by screen.

A bootstrap failure is a failure screen in its own right, with the trace identifier: it is the only
moment when the person can still read a number out to support.

---

## Inconsistencies found

Beyond D2 and D6, which I confirm and refine, eight points found in my sources. I do not apply
them.

**1. D2, made worse on my surface.** The studio mobile mockup carries **the same parallel table**
as the studio web's (`draft | hidden | sched | tech | live | done | replay`) — and goes further: it
additionally carries **its own hardcoded French labels** and a home-made English translation table,
instead of going through `enums.publicationState.*`, which exists and is translated. Two parallel
vocabularies **and** two parallel i18n tables. The contract fixes the `catalogue.json` names, as
decided.

**2. D6, and there is a fourth vocabulary.** Full census across my sources:

| Source | Values | Bears on |
|---|---|---|
| `catalogue.json.messageStates` | `ok` `removed` `muted` `banned` | the message |
| `fixtures.js` `audience[].state` | `ok` `muted` `banned` | the person |
| `fixtures.js` `moderation[].state` | **`reported`** `removed` `muted` `banned` | the queue line |
| `studio-data.js` | `ok` `held` | the run desk |
| `i18n/studio.json` `enums.moderationState` | **`published`** `removed` `muted` `banned` `reported` | ? |

Two remarks on top of D6. First, `reported` is **not a sanction**: it is a triage state, and it
occupies the same field as sanctions — which is why the queue is built by filtering
`state === 'reported'`, which is not a state filter but a nature filter. Second, the i18n table
says `published` where `catalogue.json` says `ok`: **the translation table matches none of the four
vocabularies exactly**. Three axes must be separated — the nature of the line (reported / settled),
the state of the message, the state of the person — rather than stacked into one field.

**3. The six-persona projection is not safe for authorization.** `studio-data.js` collapses
`director`, `video` and `sound` into a single `regie`. Yet `grants` distinguishes them: `director`
can invite `video` and `sound`; `video` and `sound` can invite nobody. Authorizing on the short
role grants a sound engineer an invitation right they do not have. **The contract must carry the
real role and the effective rights; the six personas are presentation.**

**4. `TAB_PREF` names a page that `ACCESS` refuses.** `TAB_PREF.regie` contains `regie`, absent
from `ACCESS.regie`; it only works because `FREE.regie` catches it. A preference table that names a
page the access table does not grant is a trap: the day `FREE` changes, a tab disappears and nobody
understands why. Tabs must derive from **one single** list of open pages.

**5. A date's displayed state is a composition of three fields, and none of them carries it.**
`publication.state` knows neither `cancelled`, nor `postponed`, nor `interrupted`: those three live
on `date.outcome` and on `run.state`. Yet the mockup displays them **over** the publication state
("cancelled and refunded", "postponed · seats still valid", "interrupted · credits issued"). The
contract must say which of those fields is authoritative for the badge, or expose a single derived
state — otherwise every surface will compose it its own way.

**6. The chat rate is measured in one unit and compared in another.** `studio-data` / the mockup
compute `message count ÷ hours elapsed` and label it "MSG/MIN"; the threshold that flips the
console is at **60 msg/min**. A window, a unit and a refresh rate must be fixed by the contract.

**7. Two different bitrates carry the same name.** The streaming screen mixes the bitrate
**measured at the ingest** (health series, a server observation) with a "measure upstream bitrate"
button that measures **the phone's** link. The phone is not the encoder: it is in the venue,
sometimes on another network. The contract must distinguish a server measurement from a
client-submitted one, and say which one feeds the pre-flight checklist.

**8. The pre-flight checklist mixes server facts with local checkboxes.** Four entries are facts
(`publication.checklist`: technical check, chapters, moderator assigned, replay policy); two are
local toggles ("mark done"). A list that blocks publication cannot have boxes the client ticks for
itself. It must be **entirely server-side**, each entry carrying its reason and its state.

**9. The person's reading timezone has no owner.** The mockup takes it as an input property and
lets it be changed from the "My account" sheet. Yet it changes the display of **every** time on
**every** channel. It is an account setting, on the same footing as the two found in §5 — but
unlike them, it is shared with the storefront, where the same account buys seats. Where does it
live?

---

## What I cannot get on my own — questions to the backend

**1. The session on the native shell.** The studio web holds its session in a cookie; the studio
mobile cannot (`capacitor://localhost` is a third-party context on iOS). Does the studio BFF offer
a **bearer-token session** alongside the cookie session, with a device-bound refresh token,
per-device revocation, and a written behaviour for returning from the background with an expired
token? Without an answer, the surface has no authentication. → `adr-auth.md`

**2. The return from an external browser.** Five flows leave the app (the shared
`arthome.fr/compte` account, OAuth, payout account onboarding at the provider, the public page, the
merchant site). Which return address does the backend accept, in what form of opaque state, and
**which resource does the app query on return to learn what changed**? I take it as given that
nothing meaningful may travel in the return URL; I am asking for the resumption resource.
→ `adr-auth.md`, `adr-payments.md`

**3. Effective rights in one request.** Is the bootstrap I describe — account, all channels with
effective roles per channel, projected `grants`, preferences, rights version, counters — a read
model of the studio BFF? And **how does the app learn that its rights have changed** while it is
open (invitation accepted, role removed, one-off access expired at curtain-down)?
→ `context-map.md`, the studio BFF's OpenAPI

**4. The offline regime of commands.** I propose: queued are the ones that bear on a named object
and do not depend on the instant — verdicts on a message, sanctions on a person, and nothing else;
everything else is refused locally. Does the backend endorse that split? And does it accept that
those commands be **conditional** (aggregate version, refused if a colleague settled) rather than
blindly idempotent? → `realtime.md`, `critical-rules.md`

**5. The resume cursor.** On returning from the background, the app must be able to ask for
"everything that happened since this cursor" and receive, where applicable, an explicit **"too old,
reload everything"**. Does that mechanism exist in the real-time plan, per channel and per person?
And can the channel be **per person, multi-channel**, rather than one subscription per channel?
→ `realtime.md`

**6. Concurrency on the moderation queue.** Three mechanisms need confirming: the claim **lease**
(duration, renewal, automatic release); the **refusal of the second verdict** with the name of
whoever settled; and the **named propagation** of claims and verdicts to the other moderators. Who
owns those three — `chat`, or a separate moderation context? The question crosses D6: the message
belongs to `chat`, but who does a person banned from a channel belong to? → `context-map.md`, D6

**7. Pagination of a living collection.** "Studio = page + total" is a decision, and I am not
reopening it. I am pointing out that a moderation queue grows while you read it and that offset
pagination duplicates and skips rows mechanically. Cursor for the two living collections (queue,
chat) and page + total everywhere else, or some other answer? → the lead's arbitration, then
`critical-rules.md`

**8. The WebRTC/WHEP run-desk return feed on the native shell.** `streaming.md` plans a sub-second
run-desk return feed over WHEP. Two unknowns: is it **expected on the studio mobile** or reserved
for the studio web? And if so, is `capacitor://localhost` a secure context in WKWebView — which
governs `RTCPeerConnection`, and the end-to-end latency measurement through
`RTCPeerConnection.getStats()` that `streaming.md` names explicitly? This needs verification on a
real device before being promised. → `adr-stream-entitlement.md`, `streaming.md`

**9. Binaries: artwork and exports.** I ask for an **upload by signed deposit address** obtained
through a JSON command (no multipart from the WebView) and an **export as an asynchronous job**
returning a short-lived signed address, usable **without a session cookie** by a native transfer.
Does the backend follow, and with what validity durations? → the studio BFF's OpenAPI

**10. Notifications.** Alert routing **by role and by channel** decided server-side, per-account
device registration, payload carrying channel + date + target page. And does the redaction rule
apply to the notification payload — that is, is an amount excluded from a notification destined for
a role without `canRevenue`? A notification shows on a locked screen. → `notifications`,
`adr-auth.md`

**11. The reading timezone and account preferences.** Three settings follow the person and not the
channel: reading timezone, run-desk layout, encoding profiles. The first is shared with the
storefront (same account). Who owns them — `identity`, or a preferences resource at the BFF? And is
the resource **additive** (does a key unknown to a mobile version survive a write)?
→ `context-map.md`

**12. The missing vocabulary of incident causes.** `catalogue.incidentMessages` carries four
**outcomes** (`hold-screen`, `postponed`, `cancelled`, `interrupted`). The mobile run desk
distinguishes three **causes** that exist nowhere: feed lost at the venue, run desk disconnected,
bitrate collapsed. Can we have a closed vocabulary of causes, separate from the outcomes? And does
the automatic hold screen (the channel rule "if the feed is lost for more than 15 s") produce an
incident of the same nature as a manual trigger? → `data-model.md`, `streaming.md`

**13. What `shared/` does not carry and I cannot invent.** The technical provisioning of a capacity
and its threshold of 10,000 simultaneous viewers; capacity tiers and the fact that they never
shrink once on sale; the waitlist priority window (2 h); complimentary tickets by category; the
source of a store item and orders coming from an external integration; pinning an item during the
live show. Six missing shapes, all of them displayed by the mockup. Which ones enter the tier-1
contract? → `data-model.md`, `context-map.md` (C8)

---

# Confrontation

> Round 3. Read: `answers-to-surfaces.md`, `adr-auth.md`, `context-map.md`, `data-model.md`,
> `events.md`, `realtime.md`, `transport.md`, `critical-rules.md`, `openapi/studio.yaml` and
> `DECISIONS.md`. **On the evidence**: the answer index is a promise, the YAML is the proof. Every
> objection below is verifiable against a line of the contract, cited.

---

## What is satisfied

Short, because it is substantial. On my thirteen questions the essentials hold — and several times
better than what I asked for.

**The bootstrap exists and it is better than my request.** `GET /v1/bootstrap` carries the person,
**all** their channels with `roles` in the eight-value vocabulary, `assignableRoles`
**materialized**, `dateGrants` with their expiry instant, `rightsVersion`, `counters`, `constants`,
`labelCatalog` and `realtime`. And `datePanes` per channel **plus** `openPanes` per date: the
record panes I had found to be role-derived are served, not inferred.

**The native session is decided my way.** `adr-auth.md` §2.2: "`capacitor://localhost` is a
**third-party context on iOS 14+** → the cookie is dead", bearer token in
`@capacitor/preferences`, never `localStorage`, silent refresh on returning from the background.
§6.6 takes over word for word the two literal CORS strings and the raw-string comparison. §6.4
adopts the five exits in full: an allow-list of literal strings, a single-use opaque state of 10
minutes, **pending state on the server side**, and my sentence as it stands — *a payment confirmed
by a URL parameter is a payment confirmed by the client*.

**The rest, one line each.** The three error natures (`refused` / `unavailable` /
`offline_forbidden`) are in the envelope and in `critical-rules.md` §8. The offline queue is
bounded to my two families. Claim leases exist. The second verdict is refused **with the winner**.
The three moderation axes are separated. My two pagination exceptions are granted (D-010) with a
separate `pendingCount` for the badge. `resume:too_old` exists. The channel is **per person**,
multi-channel. `measuredAt` is at the ingest. The signed deposit is 15 min, the export 60. The
vocabulary of incident causes exists, separate from the outcomes, with `IncidentTrigger.AUTO`. And
`critical-rules.md` §9 engraves my clock requirement: "a countdown is computed against `servedAt`,
never against the client's clock".

I will not come back to it. What follows is what does not hold.

---

## What is not satisfied

Twelve points. The first four are serious: each one breaks a mechanism the contract elsewhere
claims to uphold.

### C1 — Four of my eighteen pages have no rights carrier, including the duty page

`EffectiveRights.navigation` has a **closed** vocabulary of fourteen entries:

```
[agenda, dashboard, moderation, crew, events, stream, stats, tickets, store,
 replays, payouts, journal, settings, help]
```

My four contextual pages — `regie`, `wizard`, `event`, `inbox` — are not in it, and **no other
field authorizes them**. `canOps`, `canTech` and `canDecideOutcome` exist, but no text in the
contract says they open `regie` or `wizard`.

**The consequence is measurable**: a show caller's bottom bar cannot contain `regie` — their duty
page, the one they open when the feed drops. It would contain `agenda`, `stream`, `events` and
nothing else.

And the path by which we got here deserves stating. I had flagged, and the errata recorded as
**E6**, that "`TAB_PREF.regie` names a page that `ACCESS` refuses". The resolution was to **remove
the page from the vocabulary** rather than reconcile the two tables. **The duty's main destination
was deleted to remove the inconsistency that flagged it.**

This is not a matter of missing paths: `/v1/dates/{dateId}/run`, `/run/state`,
`/run/health-samples`, `/incidents`, `/stream-key/*` all exist and serve the run desk very well. It
is **the right** that is missing, not the data.

### C2 — The four-tab bar does not derive from `navigation`, and the proof is arithmetic

`navigation` is described as served "in **canonical order**". That is `ORDER`. But the bar is not
`ORDER` truncated to four: it is `TAB_PREF`, a **per-role** order, and a different one.

For `artist`, `ORDER ∩ ACCESS` gives, in order:

```
dashboard · crew · events · stream · stats · tickets · store · replays · payouts · journal · settings · help
        ↑ the first four: dashboard, crew, events, stream
TAB_PREF.artist                 : dashboard, events, crew, tickets
```

**Two differences out of four.** Taking the first four entries of `navigation` puts `stream` in an
artist's bar and drops `tickets` — ticketing, what an artist looks at most. For `prod`, `regie` and
`tres`, the gap is of the same order.

I had asked for `TAB_PREF` to live in `@arthome/core`, because the studio web orders the same menu
and `critical-rules.md` §2 requires it — "every value displayed twice comes from `@arthome/core`:
two *calls* are allowed, two *implementations* never". Searched across the whole repository:
**`TAB_PREF` appears exactly once**, in `corrections-handoff.md`, as errata E6. It is neither in
the contract, nor named as belonging to the domain. Two surfaces are therefore going to implement
it twice, and that is exactly the case rule 2 forbids.

### C3 — The moderation optimistic lock conflates the lease with the decision, and cancels the offline queue

This is my most serious objection, and it is demonstrated with the contract's **own examples**.

```
POST /moderation/items/{id}/claim    → data: { state: claimed,  …, version: 2 }
DELETE /moderation/items/{id}/claim  → data: { state: reported, …, version: 3 }
POST /moderation/items/{id}/verdict  ← body: { verdict: mute, …, expectedVersion: 2 }
```

Taking then releasing a lease — **without settling anything** — moves the version from 1 to 3. So:

> A moderator reads the queue at `version: 1`. The network drops. They settle; the verdict goes
> into the offline queue with `expectedVersion: 1`. Meanwhile a colleague claims the line and
> releases it, **with no verdict**. On reconnection, the verdict is refused.

The offline queue is **the only concession granted to mobile**, and the lease hollows it out. On a
live show running at 60 messages a minute, lines change lease constantly.

The defect runs deeper than a misplaced counter. The mockup's real rule is a **supersession**:
"claiming is not settling — until the colleague has rendered a verdict, **your sanction applies**".
A verdict must therefore be **accepted** while someone else holds the lease. A single counter
cannot express "refuse if settled, accept if merely claimed".

And the contract contradicts itself here: the **only** documented 409 on `/verdict` is
`MODERATION_ALREADY_SETTLED`. Either `expectedVersion` really is checked, and an undocumented
`STATE_CONFLICT` is missing that will refuse legitimate verdicts; or it is not, and
`expectedVersion` is decorative while the contract makes it its guarantee of conditionality.

**Fix requested**: condition the verdict on the **settlement axis** — `settledAt` being null, or a
`decisionVersion` that **only a verdict increments** — and let `version` carry the lease. Two
separate axes, which is precisely the doctrine the contract already applies, and applies well, to
the three moderation states.

### C4 — `RIGHTS_VERSION_STALE` cannot be emitted, and that is exactly the transition case

The contract states the doctrine in so many words: three distinct codes — `FORBIDDEN`,
`RIGHTS_VERSION_STALE`, `CHANNEL_ACCESS_REVOKED` — "because the person must know whether to
reload, to call, or to give up". The response carries `X-Arthome-Rights-Version`.

But **no request parameter carries the version the client holds**. The complete list of reusable
parameters in the document is: `Traceparent`, `Surface`, `IdempotencyKey`, `ChannelId`, `DateId`,
`Page`, `PageSize`, `SortBy`, `SortDir`, `Cursor`, `Limit`. Nothing else.

The server therefore cannot distinguish "you never had this right" from "you had it two hundred
milliseconds ago". Two of the three codes are out of reach, and only `FORBIDDEN` remains — that is,
the very indistinction the three codes existed to remove.

**This is exactly the question put to me**: an event arrives during a transition. Under
`ion-router-outlet` the page is already pushed, the request has already left. It comes back a 403.
If the code is `FORBIDDEN`, the app sends the operator back to the home screen as though they never
had the right; if it is `RIGHTS_VERSION_STALE`, it reloads the bootstrap and **finds its place
again**. On duty, the difference is between "I carry on" and "I lost my screen".

A request header is missing — `If-Rights-Version`, symmetric with the response one.

**And there are two revocation clocks, not one.** `realtime.md` §3: "the server makes the client
leave the rooms of a lost channel **without waiting for a reconnection**" — immediate. The preamble
of `studio.yaml`: "the maximum staleness of authorization is **60 seconds**, the lifetime of the
internal token minted by the BFF". For a minute, the console is mute but the command still goes
through. Which one is authoritative on screen? The contract does not say, and a moderator who
watches their queue freeze while their verdicts succeed will understand neither.

### C5 — Four commands require a `reauthToken` that nothing issues

`stream-key/reveal`, `stream-key/rotate`, `ownership-transfer` and channel deletion declare
`required: [reauthToken]`. **No studio BFF endpoint mints it.** `adr-auth.md` §6.1 defers to
better-auth's `one-time-token` plugin — an implementation detail of `identity`, not a surface
contract. The contract requires a token it does not offer.

And the underlying question is not settled for the native shell: **by what factor?** Rotating the
stream key is the show caller's emergency gesture — "the gesture to make after every contractor",
and the one you make when you suspect a key has leaked during a live show. If re-authentication is
a password to be typed in a dark venue, one-handed, the guarantee is paid for in dead air. If it is
the device's biometrics, that needs saying, along with what happens when it fails.

### C6 — No device management, no revocation, no sign-out

The answer to my question 1 promises **per-device revocation**. The studio contract offers neither
`/me/sessions`, nor `/me/devices`, nor revocation, **nor sign-out**. Yet the mockup's "My account"
sheet carries "SIGN OUT", and it is the only exit an operator has.

`adr-auth.md` §6.5 grants device revocation only to the **shared television** — `Device` and
`DeviceSession` are the notions of RFC 8628 pairing, not those of a bearer-token session on a
phone. With no device notion attached to the mobile session, "revoke this phone" has no referent.

What that is worth concretely: a phone left behind in a venue opens a moderation console and the
revelation of a stream key **on channels that do not belong to its holder** — a freelancer works
across several channels, which is the premise of this entire surface. The contract offers no
gesture, neither to the person nor to the channel owner.

### C7 — No notification token registration

My question 10 is answered with "routing by role and by channel decided server-side, per-account
device registration, payload carrying channel + date + target page". Server-side routing is secured
— `escalate` returns `routedToRoles`. But there is **neither an endpoint nor a schema** to declare
an FCM token: searched for `push`, `fcm`, `apns`, `deviceToken` in `studio.yaml`, no occurrence
outside the preamble on redaction.

Without it, duty cannot be woken with the app closed. That is half the reason a duty tool exists:
"moderation queue saturated", "no moderator assigned at D-1", "unstable bitrate" are alerts that
arrive when the app is not in the foreground. Redaction of amounts in the payload is promised; the
payload has no addressee.

### C8 — `GET /changes` exists only on the storefront BFF

`realtime.md` §5.2 describes exactly the mechanism I need:

```
GET /changes?since=<servedAt>&scope=… → { invalidated: [...], servedAt, complete: bool }
```

It returns **a list of invalidations, not the data**, and `complete: false` means "reload
everything" — the same honesty as `resume:too_old`. The document attributes it to "a need specific
to the storefront mobile".

It is in `openapi/storefront.yaml`. It is **not** in `openapi/studio.yaml`.

Yet it is the need I named, and for a reason that exists only here: under `ion-router-outlet`, a
page **stays in the DOM** after you leave it and is redisplayed as-is on return. A cheap freshness
read is required, otherwise every return to a page is either a stale display or a full reload on a
venue's 4G. The studio has `servedAt` and `rightsVersion` per response, but nothing that says in
one call "here is what changed" for a screen's six reads. The mechanism is written, motivated,
specified by someone else — and not wired up here.

### C9 — Two pages are named in `navigation` and have no endpoint

`dashboard` and `stats` appear in the `navigation` vocabulary and in the example served by the
bootstrap. There exists in `studio.yaml` **neither a path nor a schema** that serves them: the
complete schema list contains no measurement aggregate, and the only trace of statistics is
`stats_csv` as an accounting export kind.

This is not a secondary page. **`dashboard` is the first entry of `TAB_PREF` for `artist`, `prod`
and `tres`** — the default tab of three personas out of six. As it stands, three personas open the
app on a screen the contract does not fill.

### C10 — The "one call per pane" pattern is implemented for one pane out of six

`GET /dates/{dateId}/sheet` serves `openPanes`, and serves better than my request: **per date**
rather than per channel. The description states the pattern: "one call for the record, then **one
call per open pane, at its owner**", with my own argument as the justification — "a moderator must
be able to load the `chat` pane **without** loading the whole record, otherwise ticketing travels
for nothing".

Only `/v1/dates/{dateId}/panes/tickets` exists. There is no `chat`, `tech`, `crew`, `replay` or
`public` pane.

The argument is therefore **defeated by its own implementation**: a `mod` whose only pane is `chat`
has to call `/sheet` — if only to learn which panes are open to them — and then has nowhere to go.
Neighbouring paths exist (`/dates/{id}/crew`, `/run`, `/chat-policy`, `/replay-policy`) and may
cover the material, but then the announced pattern is false and the surface does not know which
path to call for which pane.

### C11 — `Duty` does not carry the venue timezone

`DateSheet` carries `venueClock { venueTimezone, venueUtcOffsetMin }`. `Duty` carries `dateId`,
`channelId`, `channelName`, `title`, `crewRole`, `startsAt`, `runState`, `overlapsWith`,
`accessExpiresAt` — and not the timezone.

Yet the duty screen, which is **this surface's home screen**, displays for each duty the venue time
**and** the person's own time. That is the handover's doctrine ("the spectator's time first, the
venue's time second"), it is D3, it is E7 — and it is an explicit need of my document, quoted in
the answer given to me.

Rendering the venue time on the duties list therefore costs one call per duty: **exactly the N+1
the bootstrap exists to kill**, and on the one screen a show caller opens on arriving at a venue.
`runtimeMin` is missing too, which the row displays ("announced runtime"). The **rule** is safe —
`overlapsWith` is served and computed in `@arthome/core`, which is right — but the display is not.

### C12 — Seven screen holes, named

Less serious, but each one is a page or a gesture of the mockup with no counterpart:

| Missing | What exists instead |
|---|---|
| **Crew matrix** — slots per date × post across N dates | `/dates/{id}/crew`, one call per date |
| **Access log** (distinct from the channel journal) | `/channels/{id}/journal` only |
| **Replay catalogue** at channel level | `/dates/{id}/replay-window`, per date |
| **Seat transfer** and **bank dispute** — two of the three "pending requests" | `/seats/{id}/refund` only |
| **Named encoding profiles**, which "travel from one channel to the next" | `encodingProfileName`, a string — nothing stores the profiles |
| **Sign-out** | nothing |
| **`help`** | nothing, and nothing says it is a static artifact |

---

## What is satisfied differently, and whether that works for me

**WHEP → LL-HLS (D-019): works for me, and it is better than my request.** I asked that nothing be
promised that is not measured; the contract goes further by serving `monitorPath`
(`whep | ll_hls`) in the run state, so the app **announces** the latency it has instead of
promising it. I keep the reservation as D-019 writes it: the measurement on a real device is still
to be done, and it also governs **Web Crypto** — hence anything we might one day want to encrypt
client-side.

**The heartbeat (`ws:pulse`) is a better answer than mine.** I asked that every measurement carry
its measurement instant, so the app could say "measured 3 s ago" instead of "0 Mb/s". The contract
does that (`measuredAt` at the ingest) **and** adds a mechanism I had not proposed: no pulse for
15 s = I am deaf; a pulse arriving with no health sample for 30 s = the venue is no longer sending.
Two states, two screens, no inference — and the same pulse carries `serverTime` as the reference
clock and `seq` as the resume point. Three of my needs settled by a single mechanism. Accepted
without reservation.

**`deviceUpKbps` versus `ingestUpKbps`: my inconsistency 7 is settled.** Two distinct names, and
the sentence that decides it — "only `ingestUpKbps` feeds the pre-flight checklist". The phone is
not the encoder, and the contract now says so.

**The pre-flight checklist goes from four items to seven**, two of which become non-blocking
warnings. My inconsistency 8 aimed the other way — I asked for it to be entirely server-side; it
is, and it is moreover more accurate than what I flagged.

**The three moderation axes (E3/D6).** `ModerationItemState` = `reported | claimed | settled`,
message state = `published | removed`, person sanction = `none | muted | banned`, and the single
badge **derived** by `moderationBadgeOf` with a served precedence. `reported` has left the
sanctions field, exactly as asked — and the schema description takes up my diagnosis: "that is why
the queue was built by filtering `state === 'reported'`, which is not a state filter but a nature
filter". Accepted.

**Two additions I had not asked for, and which are right.** `atMediaSec` on the queue line — media
anchoring carried all the way into moderation, which makes the log readable again over a replay.
And `origin: human_verdict | retroactive_filter | author_sanctioned`, which lets the journal
distinguish an automatic requeue from a human decision.

**My safety net became a server rule.** `holdScreenAutoAfterSec: 15` is served in the constants,
and its firing produces an incident of the same nature as a manual trigger, marked
`IncidentTrigger.AUTO`. That is better than what I asked for: I proposed that the rule exist, the
contract serves it **and** makes it auditable.

**The served constants settle half of my inconsistency 6.** `chatBurstThresholdPerMinute: 60` is
served, so the threshold will not be copied onto two surfaces. The measurement **window** is
missing — see the questions.

**The reading timezone** lives in `identity`'s `AccountPreferences`, **the same field as the
storefront's**. I asked who owns it; the answer is stronger than the question, and it settles my
inconsistency 9.

**`critical-rules.md` §9** engraves my clock requirement as a critical rule of the project: "a
countdown is computed against `servedAt`, never against the client's clock". I asked for an app
behaviour; it became a contract rule.

**Escalation: half.** `routedToRoles: [artist, production]` is served, the routing is server-side,
and the gesture exists for roles without `canDecideOutcome` — that was my need. Two reservations:
the mockup announces "**2 people** received the alert", and **role labels** do not say how many
humans were reached; and the command body carries only a free-text `note`, whereas the mockup
promises that "the report reaches them with the technical reading". If the reading is attached
server-side from the incident, that is fine — but it needs writing down, otherwise the surface will
try to stuff it into the note.

---

## The unanswered questions

| # | Question |
|---|---|
| **a** | In what form does the client declare the rights version it holds? Without a request header, `RIGHTS_VERSION_STALE` cannot be emitted (C4). |
| **b** | Of the two revocation clocks — the channel's immediate one, HTTP's 60 s — which is authoritative on screen? |
| **c** | Who mints the `reauthToken` of the four sensitive commands, and **by what factor** on a phone in a venue? |
| **d** | Device revocation and sign-out: which studio BFF endpoint? |
| **e** | Notification token registration: which endpoint, and does the payload really carry `channelId` + `dateId` + target page? |
| **f** | `regie`, `wizard`, `event`, `inbox`: which field carries their right? Are `canTech` and `canOps` meant for that, or must `navigation` be widened? |
| **g** | `TAB_PREF`: where does it live, given that two surfaces display it and `critical-rules.md` §2 forbids two implementations? |
| **h** | The verdict is conditional **on which axis** exactly, and which 409s does the contract document beyond `MODERATION_ALREADY_SETTLED`? |
| **i** | `dashboard` and `stats`: deferred to a named tier, or omitted? They are in `navigation` and at the head of `TAB_PREF` for three personas. |
| **j** | The five record panes with no endpoint: served by the neighbouring paths — and which ones — or still to be written? |
| **k** | What is the measurement **window** for the chat rate? The threshold is served, the window is not — and that is the half my inconsistency 6 was missing. |
| **l** | `GET /changes` on the studio BFF: granted or refused? Ionic's page cache depends on it. |
| **m** | Escalation: is the technical reading attached server-side from the incident, and is the number of people actually reached returned? |
