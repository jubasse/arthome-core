# Needs — storefront TV (react-native-tvos)

> Surface: connected televisions, operator set-top boxes, games consoles, HDMI
> sticks. 1920 × 1080, driven with five keys, read from three metres away,
> a highly heterogeneous fleet, memory counted. The studio does not exist here:
> the TV is a spectator surface, nothing else.
>
> This document states **what the contract must carry or guarantee**. It
> describes no layout: the `Storefront TV.dc.html` mockup and
> `Prompt - Storefront TV.md` are the design, and they are authoritative.
>
> Sources read: the full TV specification, `README.md`, `streaming.md`,
> `shared/helpers.js` (in full), `taxonomy.json`, `catalogue.json`, `fixtures.js`
> (dates / accounts / chat / publications sections), `i18n/` including
> `tv-keymap.json`, `architecture/corrections-handoff.md`, `DECISIONS.md`. The
> mockup was read in fragments.
>
> Skills loaded (D-001, in the absence of a React Native orchestrator):
> `react-native-tv-best-practices` (the main one), `react-native-best-practices`,
> `react-server-state`, `react-core`. None contradicts a project decision; one
> **sharpens** one in a binding way — see *What zod costs*.

---

## Screen inventory

Twenty-two screens. The columns say where each one **introduces** something; a
screen that introduces nothing is served by a shape already described elsewhere
(D-006: exhaustive coverage, deduplicated writing).

| Screen | Role | Introduces a shape | Introduces a command | Real time | Calls |
|---|---|---|---|---|---|
| `boot` (pre-screen) | start-up, before any language is known | `ViewerContext` | — | — | **1** |
| `gate` | profile selection on opening | `ProfileSummary` | `selectProfile` (local) | — | 0 |
| `signin` | sign-in by device pairing | `DevicePairing` | `createPairing`, `cancelPairing` | waiting for the verdict | 1 + wait |
| `home` | billboard + carousels | `HomeScreen`, `Rail`, `DateCard` | `toggleList` | viewer count, going on air | **1** |
| `search` | on-screen keyboard + live results | `SearchResults` | — (read) | — | 1 per query state |
| `live` | what is on air + tonight's schedule grid | `LiveScreen`, `ScheduleSlot` | — | viewer count, state flip | **1** |
| `categories` | the 21 disciplines, grouped by universe | `CategoryTile` | — | — | **1** |
| `category` | one discipline, as sub-genre rows | `CategoryScreen` | — | — | **1** |
| `artists` | grid of portraits | `ArtistCard` | — | — | 1 + cursor |
| `artist` | an artist's page | `ArtistDetail` | `followArtist` / `unfollow` | — | **1** |
| `title` | a date's or a show's page | `DateDetail` | `toggleList`, `share` | viewer count if on air | **1** |
| `book` | price tier and number of seats | — (derived from `DateDetail`) | `refreshAvailability` | seat gauge | 0 or 1 |
| `pay` | QR + short code, waiting screen | `DevicePairing` (same shape) | `createPairing` | waiting for the verdict | 1 + wait |
| `confirm` | outcome of a purchase journey | `PairingOutcome` | — | — | **0** |
| `player` | full-screen player | `PlaybackTicket`, `Chapter`, `Track`, `ChatMessage`, `IncidentState` | `renewPlaybackTicket`, `saveProgress`, `sendReaction`, `releasePlayback` | **incident, chat, viewer count, latency** | **1** + renewals |
| `dateinfo` | information about the date, from the player | — (derived from `PlaybackTicket`) | — | — | **0** |
| `tickets` | my seats | `TicketCard` | `cancelBooking` | house open, outcome | **1** |
| `list` | my list | — (`DateCard`) | `toggleList` | — | **1** |
| `replays` | replays, the ones expiring first | — (`DateCard`) | — | remaining window | **1** |
| `plans` | subscriptions | `PlanCard` | `createPairing` (intent `plan`) | — | **1** |
| `account` | identity, subscription, payment methods, devices, settings | `AccountScreen`, `DeviceSession`, `ViewerPreferences` | `revokeDevice`, `updatePreferences`, `signOutProfile` | — | **1** |
| `help` | key help | — (embedded) | — | — | **0** |
| `ambient` | screensaver after 8 min idle outside playback | — (reuses posters already in hand) | — | — | **0** |

**Second-rank screens, which are not pages but do consume the contract**: the
player's panels (chapters, subtitles, tracks and quality, chat, information), the
incident screen, and the end-of-show screen with the show's shop. On a TV a modal
*is* a page, but none of these panels may trigger a call: everything ships with
the `PlaybackTicket`.

**Screens absent from the mockup yet declared**: `plans`. The specification and
the sidebar both provide for it; the mockup exposes only eight entries and no
subscriptions page, even though the `plan` payment intent does exist in the
confirmation journey. See *Inconsistencies found*, point 2.

**Demo settings that are really contract state.** The mockup exposes twelve
props. Seven of them are served data, not an author's switch:

| Prop | What it really is |
|---|---|
| `profile` | the profile selected on this device, and its entitlements (including the child profile's filtered catalogue) |
| `signedIn` | whether a device session exists |
| `onAir` | derived from the state of the dates served, never an application boolean |
| `chatMode` | **a property of the date** (`open`, `emoji`, `read-only`, `off`), decided in the gallery |
| `replayPolicy` | **a property of the date** (`included`, `subscription`, `unit`, `none`) + the window in hours |
| `incident` | **state pushed by the control plane** (none, hold screen, postponed, cancelled) |
| `lang` | the profile's interface language, and the embedded i18n fallback |

The other five (`heroMotion`, `autoplayPreview`, `focusScale`, `remote`,
`safeArea`) are presentation or a local preference — except `autoplayPreview`,
which is a **profile preference** persisted server-side (see
`updatePreferences`).

---

## The data shapes

### The rule that governs everything: a card must be self-sufficient

At three metres a card carries six pieces of information at most, and each of
them is a **badge derived from the data**, never a literal. The contract must
therefore deliver, on the card itself, everything that feeds a badge — otherwise
the TV will have to make a second call, recompute, or invent.

But that same card must **not** carry the synopsis, the cast, the biography or
the full media set: on a 1 GB TV, a virtualized row that keeps fat objects in
memory causes image evictions and reload loops while the viewer is navigating
with their thumb. Hence **two explicitly named, disjoint sizes**, and a ban on
the small one carrying the large one's fields.

### `DateCard` — the universal projection

This is the most-served shape on the whole surface: it is the content of every
home row, every grid, every search result.

What it must carry, and why:

- **identity**: the date id, the show id, the artist id, the discipline and
  sub-genre ids;
- **title and artist name** already in the viewer's language (the `content()`
  rule in `helpers.js`: render the reader's language when it exists, fall back to
  the other one otherwise — the performed language is stated elsewhere);
- **start instant as an ISO UTC string**, plus the **venue's IANA zone id**.
  Never an offset in minutes, never a formatted wall-clock time. The TV composes
  the two clocks (the viewer's time first, the venue's time second when it
  differs);
- **runtime** in minutes;
- **state** in the single vocabulary the contract settles on, and the **outcome**
  if there is one (`cancelled`, `postponed`, `interrupted`), plus the **new date**
  when postponed. The outcome overrides the state on display: the contract must
  deliver both, not a pre-merged state;
- **seat gauge**: seats available and waiting list. These are two numbers, and
  the label ("86 seats" / "Sold out" / "Waiting list · 340") is derived;
- **replay policy** + **window in hours** + **hours remaining** when the replay
  is online. Hours remaining is a decreasing value: it is **derived** from the
  end instant and the window, so the contract delivers the two inputs, not the
  result. This is directly the "no value computed twice" rule: if the server
  delivered the hour count, it would be wrong one minute later;
- **rights**: is the content broadcastable in the viewer's territory, and if not,
  the reason **code**;
- **viewer access**: does the viewer hold a seat, can they start playback now,
  and if not **why** (no seat, house not yet open, out of territory, subscription
  required, no replay). This is the most expensive field in the contract — see
  question Q6;
- **resume**: position in seconds if the profile has started this date;
- **viewer count**, present **only** when the date is on air. Never zero: the
  handoff rule forbids "0 LIVE", so the field must be absent rather than null;
- **media**: one 16/9 visual descriptor and one 2/3 poster descriptor, each
  **already rendered at the sizes actually displayed**. Not a URL recipe with a
  width placeholder. A memory reason, not a comfort one: a 4K backdrop decoded
  for a thumbnail costs as much as a full-screen one, and it is the primary
  memory-pressure lever of a TV UI.

What `DateCard` must **not** carry: synopsis, cast, biography, the list of other
dates, per-tier prices, and above all no ticketing data (amounts sold, revenue).
The current demonstration data set exposes `prices[].sold`, `prices[].revenue`,
`seats.sold`, `publication` and `publishedBy` on the object the storefront reads
— see *Inconsistencies found*, point 5.

### `DateDetail`

`DateCard` plus: the full synopsis, the cast, the spoken language, subtitles,
surtitles, **language dependency** (`none | helpful | essential` — the real
vocabulary, cf. erratum D1), cross-cutting attributes (audience, minimum age,
seating, intermission, accessibility, venue type), the venue with its city and
country, per-tier prices in **canonical unit + currency code**, the applicable
subscription discount, and the **replay policy in plain sight before purchase** —
it is what justifies the price difference, and the handoff makes it a principle.

To which are added three `DateCard` rows **composed by the server**: the other
dates in the run, the other dates by the same artist, and a suggestion in the
same discipline. They are part of the same response (a one-call budget).

### `Rail` and `HomeScreen`

A row carries: a stable id (focus memory hangs off it), a **title code** or a
parameterized title ("Because you follow {artist}" — the recommendation is named,
never anonymous, so the parameter belongs in the contract), a **total count**, a
card form (`wide`, `poster`, `portrait`), an optional semantic state colour
expressed as a **code** rather than a colour, and the first page of its cards
with its cursor.

The **total count** is not decorative: every row displays a counter to the right
of its title. If the row is paginated, `items.length` is wrong — the counter
would be a parallel literal. The contract must therefore carry `total` in the
page envelope.

`HomeScreen` = one billboard (a lightened `DateDetail`: enough to show the
kicker, the title, three lines of synopsis, the metadata, and two or three
actions) + the ordered list of rows. **The order of the rows belongs to the
server.** The specification fixes it (resume, on air, your seats, tonight,
because you follow, replays expiring soon, two or three rows per discipline,
posters, artists to follow): that is an editorial rule, and it is not recomputed
on five surfaces.

### `CategoryTile`

Twenty-one disciplines, in the **editorial rank declared by `taxonomy.json`**
(`rank`, from the most mainstream to the most specialist, families intermixed),
with their family (`music`, `stage`), their i18n code, their date count and their
count of dates on air. No surface reorders.

Twenty-one tiles do not fit on a screen the way nine do. Two ways out, and it is
for the contract to choose: either it carries the 21 with their family and rank
and the TV groups them into two vertically traversed blocks; or it additionally
carries a **short editorial selection for the top of the page**, written as a
rule and served, never hard-coded. I ask for the first by default and the second
as an optional field — see Q5.

### `CategoryScreen`

A hero chosen by the server (a date on air, failing that the next one, failing
that a replay) and **sub-genre rows already chosen and already ordered by the
server**. The mockup currently computes an "interest" score per sub-genre from
viewer counts, replay views and seats sold, then keeps the sub-genres with two or
more dates and groups the tail. That is an editorial ranking computed on a
surface: the "no value computed twice" rule forbids it, and seats sold have no
business on a public client. The server must deliver the rows already made.

**A structural consequence**: with five keys, a faceted filter is unusable — you
cannot open a panel, tick three boxes and remember to close it again. So the TV
turns facets into rows. It **does not consume the catalogue's facet API**. This
is a divergence of shape, not of content, and it justifies the storefront BFF
serving two read models for the same discipline.

### `ArtistCard` / `ArtistDetail`

Card: id, name, an already-sized portrait, discipline, follower count,
**number of upcoming dates**, and the profile's follow state. Page: biography in
the viewer's language, billboard visual, a row of upcoming dates, a row of
replays, follow state.

### `TicketCard`

`DateCard` plus: the tier held, the house-opening instant (derived from
`startsAt` and the opening constant — 30 minutes today, which must come from the
contract and not from a constant copied five times), and for each outcome what
the viewer is supposed to do about it: the new date for a postponement, **amount
and credit delay** for a refund, **credit-note amount** for an interruption.
These amounts are in canonical units; the delay ("3 to 5 business days") is a
policy: a **code**, not a sentence.

The display order is a rule: on air and house open first, then upcoming (a
postponement appears at its new date), then available replays, then closed
outcomes, then past. It belongs to the domain.

### `PlaybackTicket`

The most critical shape on the surface, and the one that must arrive in **a
single round trip**. It carries:

- the **manifest URL** and the **signed playback token**, short-lived, with its
  expiry instant and the expected renewal interval;
- the **protocol and DRM system chosen for this device**, picked by the server
  from a device descriptor the TV sends. The TV does not choose: the fleet
  imposes HLS + FairPlay on tvOS and DASH + Widevine elsewhere, with PlayReady on
  some SKUs, and a client that guesses will get it wrong;
- the **quality cap** that the hardware security level allows. An entry-level
  HDMI stick offers only software Widevine, capped at SD: the server must degrade
  gracefully rather than refuse playback, and the TV must know it has been capped
  so that it does not offer "4K" in the quality panel;
- the **chapters laid down in the gallery** (position in seconds + vocabulary
  code);
- the **available subtitle and audio tracks**, including audio description, with
  their language codes;
- the **date's chat mode**;
- the **current incident state**;
- the profile's **resume position**;
- for a live: the **live-edge position** and the **measured latency**. The bar
  shows the elapsed portion and the latency, and the "Back to live" button only
  appears if the viewer has rewound — both derive from the edge, which must
  therefore be served;
- for the end of the show: replay availability and duration, the **next date in
  the run**, and whether a show shop exists.

None of these warrants a separate call: a subtitle panel that takes 600 ms to
fill is a defect visible from three metres.

### `ChatMessage`

Id, date id, author handle, role, text, text language, and **position in the
media** — not the send time. That is the shape `fixtures.js` already carries
(`atMin`, relative to the start of the show) and it is right: on a replay, a
message must reappear at the point in the show where it was written, not at the
time you happen to be watching.

The TV **must never receive** a removed or hidden message. Moderation is a state
on the `chat` side; the public surface receives the already-filtered stream. The
studio sees the four states, the TV sees one.

### `DevicePairing` and `PairingOutcome`

See the dedicated section.

### `ViewerContext`, `ProfileSummary`, `ViewerPreferences`, `DeviceSession`

`ViewerContext` is the start-up response: the profiles signed in on **this
device** (up to five), the selected profile's entitlements, its preferences, the
label catalogue version, and the domain constants the TV derives from (house
opening, billboard preview delay, scarcity thresholds). A constant copied onto
five surfaces will end up diverging.

`ProfileSummary`: id, name, sized avatar, profile type, and for a child profile
the **list of allowed disciplines**. Filtering the child catalogue happens
**server-side**: otherwise a child's TV downloads the adult catalogue in order to
hide it.

`ViewerPreferences`: interface language, subtitles on by default, subtitle size,
audio description, reduced motion, automatic video preview. An open question: are
these preferences carried by the profile (and follow the viewer from one
television to another) or by the device (and stay in the living room)? Reduced
motion and subtitle size argue for the device, language for the profile. See Q8.

`DeviceSession`: id, device kind (`tv`, `mobile`, `tablet`, `desktop`, `stick`,
`console`, `box`), label, city, last activity, and "is this the current device".
The account page allows signing a device out remotely: that is a command, and it
must invalidate that device's in-flight playback tokens, not only its session.

### Cross-cutting shape rules

1. **ISO instants in UTC + IANA zone id.** Never a frozen offset: a date
   scheduled six months out would display at the wrong time after a clock change.
   The TV composes the two clocks.
2. **Amounts as an integer canonical unit + currency code.** Formatting is
   presentation; it happens on the TV, in its language.
3. **i18n by codes.** No sentence in an API response, error envelope included.
   One deliberate exception: the **incident message written by the gallery**,
   which is authored content and not a label — so it travels with its language,
   like a synopsis. The geo-blocking reason code, by contrast, must be a code:
   the current data set carries authored labels.
4. **Closed vocabularies, with a defined behaviour for an unknown value.** See
   *TV-specific constraints*, point 5. It is the constraint most specific to this
   surface.
5. **Additive only.** A removed field breaks a fleet I cannot update.

---

## The commands

All carry `Idempotency-Key`. All answer with the **single error envelope**: code,
params, trace id.

**A TV-specific rule: a command returns the projected state, not an
acknowledgement.** A `204` forces the TV to make another call to repaint the
screen, therefore to pay a second round trip on a mediocre home network,
therefore to show a screen that fills in two stages. Every command below returns
the card or cards it changes.

| Command | Effect | Returns | TV-specific notes |
|---|---|---|---|
| `createPairing` | opens a pairing for an intent | `DevicePairing` | the heart of the surface; dedicated section |
| `cancelPairing` | closes a pending pairing | — | triggered by Back; the TV often leaves without waiting |
| `bookSeat` | books n seats at a tier | updated `TicketCard` + `DateCard` | **never called by the TV**: it goes through the pairing |
| `joinWaitlist` | joins the waiting list | `TicketCard` + `DateCard` | same, via the pairing |
| `cancelBooking` | cancels a seat | `TicketCard` + `DateCard` | the mockup announces "cancel up to 1 h before": that is a **domain rule** that must come from the contract, not from a line of screen copy |
| `subscribe` / `changePlan` | subscribes or changes plan | `AccountScreen` | via the pairing |
| `addPaymentMethod` | saves a payment method | `AccountScreen` | via the pairing; the TV displays methods read-only |
| `buyMerch` | buys an item from the shop | — | via the pairing, from the end-of-show screen |
| `toggleList` | adds to or removes from My list | updated `DateCard` | removal by long-pressing OK; must be instant on screen and reconciled afterwards |
| `followArtist` / `unfollowArtist` | follows an artist | updated `ArtistCard` | **triggers notifications**: the contract must say whether following creates a notification subscription or whether that is a second setting |
| `saveProgress` | records the playback position | — | see the rate discussion below |
| `sendReaction` | sends a reaction during a live | remaining quota | see the rate limit below |
| `renewPlaybackTicket` | renews the playback token | partial `PlaybackTicket` | see *Real time* |
| `releasePlayback` | releases a concurrent session | — | **cannot be guaranteed**: a television gets unplugged |
| `revokeDevice` | signs a device out | `AccountScreen` | must also invalidate that device's playback tokens |
| `signOutProfile` | signs a profile out of this device | `ViewerContext` | "the other accounts stay signed in": sign-out is **per profile**, not per device |
| `updatePreferences` | changes a preference | `ViewerPreferences` | scope to be settled (Q8) |

### Three commands deserve an explicit rate in the contract

**`saveProgress`.** The "Resume" row is the first on the home screen, and a wrong
resume point shows. But a TV that writes its position every five seconds for
three hours produces 2,000 writes per show per household. The contract must fix
the cadence (I propose: on pause, on exit, on end, and a long heartbeat — 30 to
60 s), and above all it must accept a **late background write**: the TV can be
cut off at any moment, and the last position written must be taken even if it
arrives after a `releasePlayback`.

**`sendReaction`.** Chat is read-only on TV, but reactions write. Six emoji,
chosen with the D-pad, on a live that may gather thousands of viewers. There must
be a **rate limit declared in the contract** — not merely enforced — because the
TV must *disable* the control rather than let it fail: an inert action is
forbidden by the handoff, but an action that fails silently is worse. I ask for:
a quota per viewer per date, returned with the response (how many are left, when
it recharges), and a single reaction in flight at a time.

**Search.** It is not a command but it has the same problem. The on-screen
keyboard produces one character per key press and the results are live, with no
"Submit" button. Without discipline, that is one request per letter. What I
impose on the client side: no request below two characters, a debounce of roughly
250–300 ms, a single request in flight with cancellation of the previous one.
What I ask of the contract: that the request be **cancellable** and answer in
under 200 ms, failing which the visual feedback of typing decouples from the
typing.

### A command that does not exist and should

The **Share** action is present on a date's page. No command serves it, and in
the mockup it wrongly leads to the payment screen. On a TV, sharing cannot mean
copying a link: there is no useful clipboard and no messaging app. The only
sensible form is a **QR to the date's public page** — hence a canonical URL served
by the contract, not built by the surface. See Q10.

---

## Device pairing

This is the most important section of the document, and the most specific to this
surface.

### The finding: one primitive, not four — and there are five

The specification announces four QR + short-code journeys: sign in, buy a seat,
subscribe, buy merchandise. The mockup in fact exposes **five intents** for
payment and sign-in:

| Intent | Triggered from | What the TV expects back |
|---|---|---|
| `signin` | `signin`, `gate` (add an account) | one more profile on this device, and the session |
| `seat` | `book` → `pay` | the seat booked, and the date updated |
| `plan` | `plans` | the active subscription, and recomputed entitlements |
| `payment-method` | `account` | the payment method saved |
| `merch` | end-of-show screen | the purchase confirmed |

Plus a sixth case that **is not one**, and must not be conflated: the account
page's QR, which hands the viewer off to account management on their phone. That
one is a **hand-off**, not a pairing: nothing waits, the screen does not flip. The
contract must distinguish the two, or we will implement a wait where there is
none.

The five real journeys share exactly the same mechanism: a short code shown on one
screen, picked up on another device, and a screen that waits then flips by itself.
That is the **OAuth device flow (RFC 8628)**, and the handoff already identified
it as such. Designed five times, it will be implemented five times.

### What I ask for: one command, one intent

```
createPairing(intent, payload?, deviceDescriptor) → DevicePairing
```

- `intent`: one of the five values above;
- `payload`: what the intent requires — for `seat`, the date id, the tier and the
  number of seats; for `plan`, the plan id; for `merch`, the item; empty for
  `signin` and `payment-method`;
- `deviceDescriptor`: what the TV knows about itself, which must serve to name
  the device in the list of connected devices.

`DevicePairing` carries, in the shape of RFC 8628:

- `pairingId` — the opaque id the TV **persists on the device**;
- `userCode` — six characters;
- `verificationUri` — the short address to type (`arthome.fr/tv` in the mockup);
- `verificationUriComplete` — the URI encoded in the QR, code already included, so
  that the phone has nothing to type;
- `expiresAt` — an ISO instant;
- `pollInterval` — the minimum polling rhythm.

**The QR and the short code are two views of the same pairing, not two
mechanisms.** The contract delivers both forms; the TV fabricates neither.

### The code alphabet: this is a contract requirement, not a design one

Six characters read from three metres on a screen, then typed on a phone. The
mockup's codes (`H4T9RD`, `K7QM2P`) mix digits and letters, with the classic
confusions: `0`/`O`, `1`/`I`/`L`, `5`/`S`, `8`/`B`. This is not a typeface
question: whatever the typography, a viewer who types `O` instead of `0` fails and
starts over, and on a TV starting over costs a return to the beginning of the
journey.

The contract must therefore **declare the alphabet**, not leave it to each client.
An alphabet of 23 to 26 unambiguous symbols over six positions gives on the order
of 10^8 combinations. That is enough for an ephemeral code, and too little to be
left undefended: there must be an attempt ceiling per code and per address, a
lockout after failures, and code uniqueness **among in-flight pairings only** — a
code must be reusable once expired, or the space runs out.

### The validity period: fifteen minutes, but for what?

The mockup announces "CODE VALID FOR 15 MINUTES". That value exists nowhere in
`shared/`: it is a mockup literal, and the contract must take ownership of it.

I dispute that a single duration suits all five intents. Fifteen minutes for a
sign-in is reasonable: the viewer looks for their phone, signs in, perhaps does a
2FA. Fifteen minutes for a **payment** is long: in that time the date can fill up,
and the booking screen was showing a seat gauge that is no longer true. I ask for
a duration **per intent**, served in the response (`expiresAt`) and never coded on
the surface — so that the TV has nothing to know and the policy stays changeable
without a store review.

The TV mockup is right on one point, which must be kept: **the waiting screen
shows no countdown.** An anxiety-inducing countdown pushes people to give up. The
contract carries `expiresAt`; the TV uses it to know when to give up, not to
display it.

### How the TV learns it is done

Three possible mechanisms, and it is for the backend to decide (Q1):

1. **Periodic polling**, compliant with RFC 8628, with `pollInterval` and the
   `slow_down` response. Simple, no connection state to maintain, robust to a
   transient Wi-Fi drop. But the perceived latency is the interval.
2. **The existing real-time channel**, the one for chat and incidents. Better
   latency, but during sign-in the TV **does not yet have a session**: the channel
   would have to accept a device identity, which widens its surface.
3. **A dedicated server stream** for the lifetime of the pairing.

My requirement, whatever the answer: **the TV flips within two seconds at most**
after the journey ends on the phone. Beyond that the viewer thinks it did not work
and starts over — which creates a second pairing for the same purchase. And the TV
must never poll faster than `pollInterval`: the contract must be able to slow it
down, because a few thousand televisions all waiting on a payment are a load the
server must be able to moderate.

### The life cycle, and the four outcomes

`pending` → `approved` | `denied` | `expired` | `cancelled`.

All four must be **distinguishable by a code**, because the TV says four different
things: "try again", "you declined on your phone", "the code expired, here is
another", "you cancelled". A single failure code would produce a wrong message
three times out of four.

To which is added a fifth outcome, specific to the purchase intents:
`approved_with_failure` — the phone did finish but the purchase failed (sold out
in the meantime, payment declined). The contract must carry it distinctly,
because the TV must not display "Your seat is booked".

### If the phone gives up

Three cases, three behaviours expected of the contract:

- **the phone never comes**: the pairing expires; the TV learns this from
  `expired` and offers a new code without restarting the journey from the
  beginning (the tier and seat count chosen with the remote must survive — that is
  the tedious work);
- **the viewer leaves the screen on the TV** (Back): the TV calls
  `cancelPairing`. If it cannot — network cut — the pairing must expire on its
  own;
- **the TV app restarts**: this is the case people forget. The TV has persisted
  `pairingId`; it must be able to **reattach** to the pairing in progress rather
  than open a second one. Without that, a television that restarted while the
  viewer was paying will show the home screen while the payment completes into
  the void.

### What the outcome carries

For each intent, `PairingOutcome` must deliver **the result, not an
acknowledgement**, and it must be complete enough for the confirmation screen to
render **without a single further call**. For `seat`: the seat created, the
updated date, and enough to write the line "See you [day] at [time], your local
time; the house opens 30 minutes before" — so the instant and the zone, not the
sentence. For `plan`: the recomputed entitlements, because they condition playback
immediately. For `payment-method`: the saved method, read-only. For `signin`: the
profile added and the session.

### Two points only the TV can see

**A television is shared.** The phone that approves is not necessarily the one
belonging to the profile that started the pairing: in a living room that is a
common case, not an edge case. The pairing must therefore be **bound to the
profile that opened it**, and the contract must say what happens if the phone is
signed in under another identity: refusal with a distinct code, or switching the
profile on the TV? Both are defensible; a choice has to be made (Q2).

**Sign-in has no session.** For the `signin` intent, the TV calls `createPairing`
without being authenticated. It therefore needs a **device identity** obtained at
first launch, or anonymous endpoints where the code is the only secret. The first
option is better — it makes it possible to name the device under "connected
devices", to revoke it, and to rate-limit per device rather than per address — but
it creates one more notion. To be settled (Q3).

---

## Real time

Only four needs, and they are not equally urgent. Conflating them would cost a
permanent channel where a served instant is enough.

| Need | Tolerance | Mechanism |
|---|---|---|
| **Incident state** | ≤ 2 s | **pushed, mandatory** |
| Pairing outcome | ≤ 2 s | pushed or polled (Q1) |
| Chat messages | ≤ 2 s | pushed, capped |
| Viewer count | 10 to 30 s | pushed along with the stream, or polled |
| Going on air, house opening, replay expiry | — | **derived, no call** |
| Seat gauge | 30 to 60 s on display | derived, corrected by the command |

### What does not need real time, and why that is a requirement

A television stays on the same screen for hours. Meanwhile a date goes on air, a
house opens, a replay expires. The temptation is to push these transitions.
**It must be resisted**: if the contract delivers the instants (start, end, replay
window) and the constants (house opening), the TV derives the state locally, to
the second, without a single call. That is exactly what `stateOf()` already does
in `helpers.js`, and it is the reason the contract must carry **instants and not
labels** — a response that delivers "SCHEDULED" is stale in flight; a response
that delivers an instant never is.

The practical consequence: a screensaver that runs for eight hours makes **no**
request, and a TV sitting on the home screen refreshes only what actually moves.

### The incident is the only non-negotiable need

When the gallery broadcasts a hold screen, the viewer stares at a frozen image
wondering whether the problem is at their end or at the venue's. The handoff makes
it a principle: never a silent spinner. The control plane publishes the state, the
player lays the veil over the untouched video — `streaming.md` says so explicitly,
and it is the right solution: switching the upstream feed would be slow.

What the state must carry: the kind (hold screen, postponed, cancelled,
interrupted), the **message written by the gallery** with its language, the
instant, and what it means for the seat. When the incident resolves, the state
changes and the player lifts the veil — the TV must not have to ask for a new
`PlaybackTicket`, or resumption costs a stream reload.

### Chat: capped at the source

A high-audience date produces more messages than the TV displays — it shows fewer
than ten. A TV cannot absorb a high-rate stream in order to throw away 95% of it:
every rejected message has cost parsing and allocation on a device that is already
decoding video.

So I ask for a **cap enforced server-side**: N messages per second at most on the
channel served to the TV, with the selection made upstream, and a short catch-up
history on join (20 messages, no more). And the stream is **already moderated**:
no removed message may reach the surface.

### What the player requires of the playback token

`streaming.md` sets out the mechanism: `@arthome/core` says whether the seat is
valid, the `streaming` service asks the provider for a short token, the client
renews it as long as the seat holds, the CDN refuses anything unsigned. What that
requires of **my** player, concretely:

1. **Renew without a break.** The token must be renewed before expiry, and the
   renewal must produce a URL the player can adopt **without restarting
   playback**. A token whose renewal forces a manifest reload produces a micro-
   freeze every N minutes, visible on a static theatre shot. That is a constraint
   on the **shape** of the token (in a signed request, not in the path), not on
   its duration.
2. **Fail by saying why.** If the renewal is refused, the TV must distinguish
   "your seat has expired", "the concurrent-screen limit is reached", "you were
   signed out from another device" and "our servers are not responding". Four
   different messages on screen, therefore four codes in the envelope.
3. **A short renewal interval.** It is the renewal that carries the concurrent-
   session limit: if another device takes the slot, the TV will only learn it at
   the next renewal. Beyond a minute, you are watching a stream you no longer have
   a right to. I ask for ≤ 60 s.
4. **Release by expiry, not by command.** `releasePlayback` cannot be guaranteed:
   a television gets unplugged, a set-top box gets cut off. The concurrent-session
   limit must therefore rest on a **lease that expires for want of renewal**, not
   on an explicit release. Otherwise a household ends up blocked by phantom
   sessions, and the only visible way out for the viewer will be "sign a device
   out" on the account page.
5. **One stream at a time.** A television decoder often decodes only one high-
   definition stream: the billboard's video preview and playback cannot coexist.
   Contract consequence: the billboard preview must be served as a **light
   rendition** and declared as such, and the TV must be able to tear it down
   before opening the player.

### One channel, not four

The TV must open only **one real-time channel**, multiplexed by topic, and close
it on leaving the player. Four connections (incident, chat, viewer count, pairing)
cost four reconnections at every home Wi-Fi hiccup and four times the buffer
memory. If the channel cannot serve the pairing for want of a session, then the
pairing goes by polling — but the other three share a channel.

---

## Per-screen call budget

### The rule

**One screen = one round trip. Two at most, and never to paint the same area of
the screen.**

Three reasons, only one of which is aesthetic:

1. At three metres, a screen that fills in pieces is illegible: you do not scan a
   television the way you scan a phone at thirty centimetres.
2. A television's Wi-Fi is the worst in the household — a device at the back of
   the living room, often on 2.4 GHz. Every additional request is one more chance
   to stall, and some TV systems kill a stuck request after a few seconds without
   warning.
3. A television does not work in the background between sessions: **every opening
   is a cold start** that pays the full bill. The start-up budget on an entry-level
   stick is on the order of 5 s, and the contract must not consume half of it.

### What the contract must prevent, and which happens today

The mockup loads **the entire catalogue** and filters client-side. The figures,
measured on the deterministic data set from `fixtures.js`:

| Entity | Volume | JSON weight |
|---|---|---|
| dates | **1,814** | **1.79 MB** |
| shows | 1,315 | ~1.1 MB |
| artists | 213 | — |
| venues | 69 | — |
| audience (chat) | 934 | — |
| one date | — | ~890 bytes |

1.8 MB of JSON to parse and hold in memory on a device that has 300 to 500 MB for
everything, video included, is a crash or an image-eviction loop. That is
acceptable in a mockup; it is the thing the contract must make impossible.

**Rule: the TV never filters the catalogue.** It asks for a read model already
composed, already ordered, already truncated. Every composition the mockup
currently does client-side — the home rows, the evening grid, the sub-genre rows,
the ordering of My seats, the billboard choice, the child-profile filtering —
belongs to the server.

### The budget, screen by screen

| Screen | Calls | What it requires of the contract |
|---|---|---|
| `boot` | **1** | a complete `ViewerContext`: the device's profiles, entitlements, preferences, domain constants, label catalogue version. The labels themselves come from the embedded snapshot — the version check does not block rendering |
| `gate` | **0** | the profiles arrived at start-up |
| `home` | **1** | billboard + 10 to 13 rows, 6 to 8 visible cards each, a cursor per row. 60 to 100 cards ≈ 50 to 90 KB: sustainable. Composition and order are server-side |
| `live` | **1** | what is on air at the top + the evening grid **already grouped by the viewer's local hour**. The grouping depends on the time zone: the TV sends it, the server groups |
| `categories` | **1** | the 21 tiles with family, rank, date count and live count. **Not one call per tile** |
| `category` | **1** | hero + sub-genre rows already chosen and ordered |
| `artists` | **1** + cursor | 213 artists: a first page is enough to fill the grid |
| `artist` | **1** | page + upcoming dates + replays, in the same response |
| `title` | **1** | page + run + same artist + suggestions. **Called speculatively** (see below), so it must be cheap and carry a cache validator |
| `book` | **0 or 1** | the date is already in hand. One legitimate call: refresh the gauge and the price before showing a total |
| `pay` | **1** + wait | `createPairing`, then the wait |
| `confirm` | **0** | everything comes from `PairingOutcome`. This is the strictest requirement of the journey: a confirmation that loads is a confirmation you do not believe |
| `player` | **1** + renewals | a complete `PlaybackTicket`. Chapters, tracks, chat mode, incident, resume, live edge: **all in the same response**. Budget: entitlement and token exchange ≤ 1 s, within a total budget of ~10 s to first frame |
| `dateinfo` | **0** | derived from the `PlaybackTicket` |
| `tickets` | **1** | already ordered by the server |
| `list`, `replays` | **1** each | cursor |
| `plans` | **1** | three plans, their entitlements, the seat discount |
| `account` | **1** | identity, subscription, payment method, devices, preferences |
| `search` | 1 per query state | see below |
| `help` | **0** | embedded |
| `ambient` | **0** | reuses posters already in hand. This mode runs for hours: it must ask for nothing |

### Prefetching: yes, but bounded

TV comfort wants the focused card's page prefetched so that OK opens instantly.
But aggressive prefetching on a memory-constrained device causes exactly what it
claims to avoid: cached images + JSON + video buffer, then eviction and reload.

My position: **at most the focused item, and only after the focus has settled**
(a viewer holding a key crosses a row in one second; prefetching every card
crossed would be twenty requests for nothing). What that requires of the contract:
that `title` be cheap, and that it carry something to validate a cache — without
which the prefetch is paid for twice.

### Freshness: it belongs to the contract, not to the five surfaces

If the contract does not say how long a response stays good, five surfaces will
invent five policies and the TV will invent the worst one, having no way to
measure. I ask for a **freshness hint per read model**, which the TV maps directly
onto its client cache freshness:

| Model | Freshness asked for |
|---|---|
| taxonomy, disciplines | 24 h |
| `category`, `artist`, `plans` | 5 min |
| `home`, `tickets`, `list`, `replays` | 60 s |
| `live` | 15 s |
| `account` | 5 min |
| `PlaybackTicket` | never cached |

### The corollary: commands return the state

Already said under *The commands*, but this is where it bites: a command that
returns nothing turns every action into **two** round trips and repaints the
screen in two stages. On a TV, that is the difference between an application and a
website shown large.

---

## Pagination and volumes

**Cursors everywhere** (project decision), deterministic sort with an id
tie-break. Three refinements the surface imposes:

**1. Page size is not the same for every shape.** A horizontal row shows six to
eight and must be able to advance without a jolt: 20 per page suits it. A grid
(search, artists, My list) shows more: 30. Page size must therefore be a **request
parameter with a server maximum**, not a constant frozen per surface — otherwise
the TV will pay for the web's or the mobile's format.

**2. The page envelope must carry a total.** Every row displays a counter beside
its title. With a page of 20 on a row of 60, `items.length` is wrong and the
counter becomes a parallel literal — exactly what principle no. 1 of the handoff
forbids. `total` (or a bound declared as such) is therefore a requirement, not a
comfort.

**3. The real volumes, measured.**

| Set | Volume |
|---|---|
| disciplines | 21 (14 Music, 7 Stage) |
| sub-genres | 176 |
| tags | 205 |
| dates | 1,814 |
| shows | 1,315 |
| artists | 213 |
| venues | 69 |
| profiles per device | 5 at most |
| devices per account | 1 to 4 observed, no declared ceiling |

Only the 21 discipline tiles are served in full, because that is a whole screen
and a bounded set. Everything else is paginated.

**4. What virtualization requires of the contract.** A TV row is virtualized: only
a few cards exist in memory at any instant, and the practice is to keep ids in the
list items and fetch the detail on demand. This confirms the `DateCard` /
`DateDetail` separation and forbids the card from growing: every field added to
`DateCard` is multiplied by the number of cards held in memory, across all rows.

**5. Chat.** A short catch-up history on join (20 messages), then a capped stream.
No backward pagination: nobody scrolls back through a live chat with a remote.

**6. Screensaver mode.** It iterates over posters. It must reuse the ones already
in hand — a pool of eight is enough — and **ask for nothing**. An ambient mode that
paginates is an ambient mode that wakes the Wi-Fi every seven seconds all night.

---

## Error and loading states

### The distinction the envelope must carry

The handoff requires it and the TV copy already applies it: the message must
distinguish "**your** connection" from "**our** servers". A client cannot make
that distinction from a timeout: the two look alike.

What I draw from this for the contract:

- a **transport** failure (no response, DNS, socket) is read by the TV as "your
  connection";
- **every** response from the system, including under load, must carry the error
  envelope with its code and its trace id — that is what makes it possible to say
  "our servers". A gateway that returns a raw error page makes the distinction
  impossible: the TV will display "your connection" when that is false, and the
  viewer will go and reboot their router.

This constraint therefore reaches all the way up to the infrastructure gateway,
not just the BFF.

### The error codes this surface must be able to tell apart

Each produces a different screen. A generic code would produce a wrong one.

| Situation | What the TV must say |
|---|---|
| no seat for this date | said **before** the player opens, never after |
| house not yet open | with the time remaining, derived |
| out of territory | in plain words, **with the reason** |
| subscription required | with what the plan opens |
| no replay for this date | distinct from "replay expired" |
| replay expired | distinct from the previous one |
| sold out | distinct from "waiting list" |
| concurrent-screen limit reached | with the option to free one |
| seat expired during playback | distinct from a network error |
| pairing expired / denied / cancelled | three distinct messages |
| purchase approved but failed | never display "booked" |

### Geo-blocking

`rights.scope` and the territory list are enough to decide; the **reason** must be
a code, not a sentence. The current data set carries labels authored in French and
English inside the data (`blackoutReasons`), whereas everything else goes through
`enums.*`. That is an i18n leak: see *Inconsistencies found*, point 4.

### Start-up: the case where the TV has nothing, not even a language

There is a moment, before the first response, when the TV knows neither the
profile, nor the language, nor the labels. If the start-up call fails, it must
still display a legible message — not a raw code, not a blank screen.

That is what makes the **build-time embedded i18n snapshot mandatory**, and not
merely desirable. Measured on the current data set: the three files the storefront
loads (`storefront`, `taxonomy`, `system`) amount to **1,126 keys, 54 KB raw,
15.6 KB compressed** for one language. That is negligible against the bundle, and
it is the only thing that guarantees no raw code will ever reach the screen —
which matters all the more here, because a TV store review is slow and a label
defect would stay on screen for weeks.

The dynamically served catalogue then layers on top, through immutable versioned
artifacts. It must **never** block the first render.

### Loading and empty

Skeletons and empty states are presentation and require nothing of the contract,
with one exception: the **action that gets you out of the dead end** ("See the
categories", "Browse") is an editorial choice. It must be an **action code** served
with the empty state, not a sentence, and not a constant copied across five
surfaces.

### Replay and idempotence

A television loses the network more often than a phone. Any command replayed after
a hiccup must be safe: that is the purpose of `Idempotency-Key`, and it is
especially true of pairing-triggered commands, where both the phone and the TV can
retry.

---

## TV-specific constraints

Only those that constrain the contract.

### 1. No text entry beyond six characters

Anything that requires writing goes through the pairing. That empties the surface
of: sign-up, password, 2FA, card details, the shop's delivery address, writing in
chat, the support form. The contract therefore has **no free-text write command**
to serve the TV, except search — and search writes nothing.

An often-forgotten corollary: **voice search** is provided for in the
specification. If it is kept, it produces a string just as the keyboard does and
uses the same endpoint. Nothing new for the contract, but it needs confirming
rather than inventing later.

### 2. Five keys: facets become rows

Already said under `CategoryScreen`, repeated here because it is the most
structural divergence of shape between the TV and the web: **the TV does not
consume the facet API.** It consumes composed rows. The storefront BFF must
therefore serve two read models for the same content, and that is a deliberate
choice, not an accident.

### 3. Three metres: one round trip, six pieces of information

The call budget follows from it (dedicated section), and the ceiling of six pieces
of information per card bounds `DateCard`. This is not an aesthetic constraint in
disguise: one more field on the card is one more field × the number of cards held
in memory.

### 4. Memory counted

Reference figures: many devices in the fleet have 1 to 1.5 GB **in total**, of
which the application gets 300 to 500 MB; a 4K decode consumes 100 to 200 on its
own. Three requirements follow, all carried by the contract:

- **media as declared renditions**, at the sizes actually displayed — not a width
  placeholder for the client to fill in;
- **lean cards**, details on demand;
- **page sizes bounded server-side**, so that a client parameter cannot ask for
  500 items.

### 5. A heterogeneous fleet: the closed vocabulary must tolerate the unknown

This is the constraint most specific to this surface, and it is first-order.

A TV store review is slow, and the fleet updates badly: a version published today
will still be running in living rooms a year from now. The day the catalogue gains
a 22nd discipline, a new date outcome, a new chat mode or a new subscription
entitlement, **the old televisions will receive it**.

Now, strict enum validation **rejects** an unknown value. A schema that refuses an
unheard-of vocabulary member does not degrade the display of one card: it fails
validation of the **whole page**, and the TV displays nothing at all. A date added
with a new outcome value would empty the home screen on part of the fleet.

**Requirement**: for each closed vocabulary, the contract must declare the
expected behaviour in the face of an unknown value — and that behaviour must be
"keep the raw value and treat it as neutral", never "reject". Concretely, on the
client side, transported enumerations are validated leniently and i18n falls back
to a generic label rather than to a raw code. This does not excuse skipping
validation: it moves the strictness from the **member** to the **shape**.

It is the only thing in this document that, done badly, produces a black screen
for people who can do nothing about it.

### 6. What zod costs, measured

A measurement explicitly asked for. Run on **zod 4.6.5**, bundled by esbuild
(`--bundle --minify --format=esm`), then compressed with `gzip -9`. The "realistic"
schema set uses the TV DTOs from this document: a cursor page of date cards, with
ids, ISO instants, four enumerations, amounts and URLs.

| Import shape | Minified | Compressed |
|---|---|---|
| `import { z } from 'zod'` — **one** trivial schema | 453,056 B | **92,097 B** |
| `import { z } from 'zod'` — 3 schemas, ~20 fields | 453,677 B | **92,364 B** |
| `import { object, string } from 'zod'` — one schema | 84,276 B | 24,732 B |
| `import * as z from 'zod/mini'` — one trivial schema | 12,379 B | **4,440 B** |
| `import * as z from 'zod/mini'` — 3 schemas, ~20 fields | 22,996 B | **7,682 B** |

Three readings, and they change a packaging decision:

1. **The cost is fixed, not marginal.** Between a trivial schema and twenty fields
   spread over three schemas, the difference is 267 compressed bytes. Adding DTOs
   costs nothing; **importing `z` costs everything**. So one cannot "limit the
   number of schemas on the TV" to cut the bill: it will not work.
2. **The `z` namespace is the culprit.** The same schema via named imports drops
   from 92 KB to 24.7 KB compressed. It is a textbook barrel import, and it is
   fixable without changing library.
3. **`zod/mini` divides by twenty.** 4.4 KB against 92 KB compressed at the
   entry point, and 7.7 KB against 92.4 KB on a realistic set.

92 KB compressed — more than 450 KB to parse and compile at start-up — on an HDMI
stick whose cold-start budget is a few seconds, is an expense nothing justifies:
the TV only **decodes** responses. It needs neither the rich error messages nor
the full API surface. And `zod/mini`'s terse messages ("Invalid input") are no
loss here, since the "i18n by codes" decision forbids displaying a library message
anyway.

**What I ask for**, without questioning the "zod validates everything, the OpenAPI
is generated from zod" decision:

- that `@arthome/contracts` expose an **alternative barrel-free entry point** for
  constrained clients — the same schema source, exported as named symbols or in
  `zod/mini` — and that the OpenAPI generator, which runs on the tooling side,
  keep the full form;
- or, failing that, that applications be under a written ban on importing `z` and
  an obligation to import the symbols they use.

The decision is not contradicted; it is its **packaging** that must account for the
most constrained surface. That is exactly what this measurement was meant to
establish.

### 7. A shared device, individual profiles

The TV has no "the user": it has a living room. Three contract consequences:

- entitlements are carried by the **profile**, never by the device;
- the child profile's catalogue is filtered **server-side**;
- sign-out is **per profile** — "the other accounts stay signed in". Revoking the
  device is a separate command, and it lives on the account page.

### 8. The player and the signed token

Covered under *Real time*. The point that reaches highest: the `PlaybackTicket`
must carry the protocol, the DRM system and the quality cap **chosen by the server
for this device**. A fleet that ranges from a low-hardware-security HDMI stick to a
high-end box is not served by a single stream package, and a client that guesses
will get it wrong on the devices I cannot test.

---

## Inconsistencies found

Found while reading `shared/` and the TV mockup. **None is applied**; they are
reported. The seven family-D discrepancies in `corrections-handoff.md` are known
and not repeated here, except D1, which I did actually run into
(`languageDependency`: the declared vocabulary `none | light | helpful` does not
contain `essential`, which is nevertheless the value `hasLanguageBarrier` depends
on and which five shows carry; `light` is used nowhere).

**1. Three disjoint subscription vocabularies — and a rule that fails
silently.** This is the most serious discrepancy I found, and it is not in the
errata.

| Source | Values | Prices |
|---|---|---|
| `catalogue.json` → `plans[]` | `free`, `pass`, `premium` | 0, 12, 24 |
| `catalogue.json` → `accounts[].plan` | `season`, `monthly`, `none` | — |
| TV mockup, account page | `saison`, `mecene` | 14, 39 |

`i18n/storefront.json` translates **all six** identifiers, which masks the
problem. The direct consequence: `helpers.planOf(account)` does
`plans().filter(p => p.id === account.plan)[0] || plans()[0]` — no account ever
matches, so **they all fall back to `free`**. The TV's account page and
subscriptions page would therefore display the wrong plan for everyone, and the
`opens[]` entitlements that condition playback access would be those of the free
plan. One vocabulary must be authoritative in the contract.

**2. The `plans` page is declared and absent.** The TV specification describes a
Subscriptions page (§9) and a sidebar with ten entries including "Subscriptions"
and "Account" (§ structure). The mockup exposes only eight navigation entries and
no subscriptions page — even though the `plan` payment intent does exist on the
confirmation screen. A purchase journey with no starting point.

**3. The viewer's offset does not exist in the data.** The TV mockup computes the
venue time as `venue.utcOffsetMin - fx.geography.viewerUtcOffsetMin`. That second
field **exists nowhere** in `catalogue.json` or `fixtures.js`: it is therefore 0,
and "venue time" is in fact computed against UTC, not against the viewer. The
discrepancy is in the mockup and not in `shared/`, but it demonstrates a contract
gap: **the surface has no input for the viewer's time zone**, whereas the "two
clocks" rule is a handoff principle. The TV must send its IANA zone id and receive
the venue's.

**4. Geo-blocking reasons are authored, not coded.**
`geography.rightsPolicy.blackoutReasons[]` carries `label` and `labelEn` — text
authored inside the data — whereas all the rest of the vocabulary goes through
`enums.*` and `A.enumLabel()`. `helpers.blackoutReason()` indeed reads those fields
directly. It is an i18n leak in the model, and exactly the kind the "i18n by
codes" decision exists to forbid.

**5. A date's public object carries ticketing and studio data.** A generated date
exposes `prices[].sold`, `prices[].revenue`, `seats.sold`, `publication` and
`publishedBy`. That is coherent for a generator that builds studio-first, but
these are revenues and gallery references on the object a public client reads. The
storefront contract must not carry them.

**6. The editorial ranking of sub-genres is computed on the surface.** The TV's
discipline page orders its rows by an "interest" score it computes itself from
`viewers`, `replayViews` and `seats.sold`. That is an editorial ranking produced
by a client — against "no value computed twice" — and it relies on ticketing data
(point 5). The server must deliver the order.

**7. `devices` has two shapes under one name.** `catalogue.json` declares
`accounts[].devices` as a **number** (3, 2, 1, 1); `fixtures.js` replaces it with a
**list** of objects. `helpers.devicesOf()` only works on the second. Two shapes
under one identifier, which is precisely the kind of collision the port must
settle.

**8. The code validity period exists only in a copy string.** "CODE VALID FOR 15
MINUTES" is an interface label. No shared data carries that duration, and the
displayed code is a literal (`H4T9RD`, `K7QM2P`). The duration is a policy: it
belongs to the contract, served in the pairing response.

**9. The short code's alphabet is declared nowhere**, and the mockup's two codes
contain confusable glyphs (`0`/`O`, `1`/`I`, `5`/`S`, `8`/`B`). See the pairing
section: it is a contract requirement.

**10. The Share action leads nowhere.** On a date's page it is wired to the
payment screen. Of no design consequence, but it reveals that **no share command
was ever defined** — and on a TV, sharing can reasonably only mean a QR to the
date's public URL, hence a canonical URL served by the contract.

**11. House opening and preview delay are data constants.**
`roomOpensBeforeMin: 30` and `previewIdleSec: 4` live in `catalogue.json`, which is
right. The TV mockup, though, copies 30 minutes into several labels and 480,000 ms
for the screensaver. These constants must arrive through the contract
(`ViewerContext`), or they will diverge across five surfaces the day one of them
changes.

---

## What I cannot obtain on my own

Questions addressed to the backend. Each one blocks a decision on my surface.

**Q1 — How does the TV learn that a pairing has completed?** RFC 8628-compliant
periodic polling, the shared real-time channel, or a dedicated stream? My
requirement is a flip within two seconds at most and a polling rhythm the server
can slow down. If it is the real-time channel, it must accept a **device**
identity — because during sign-in the TV does not yet have a session. *Blocks: the
architecture of the waiting screen, and the surface's connection budget.*

**Q2 — A television is shared: what is the pairing bound to?** If the phone that
scans is signed in under a different identity from the profile that opened the
pairing on the TV — a common case in a living room — what happens? Refusal with a
distinct code, or switching the profile on the TV? *Blocks: the behaviour of `pay`
and `signin`, and the message displayed.*

**Q3 — Does the TV have a device identity before any session?** It needs one to
open a sign-in pairing, to name itself under "connected devices", to be revoked,
and to carry a rate limit. Is that a notion in the contract, or are the pairing
endpoints anonymous with the code as the only secret? *Blocks: first launch, and
`revokeDevice`.*

**Q4 — What validity period, and what carries it?** A single duration for all five
intents, or one per intent? Fifteen minutes for a payment seems long to me: the
gauge shown at booking is no longer true. In every case it must be served, not
coded. *Blocks: renewal behaviour and the expiry message.*

**Q5 — The 21 disciplines: does the contract carry an editorial top-of-page
selection?** The rank in `taxonomy.json` is enough to order them, but 21 tiles do
not fit on a screen the way 9 do. Either the TV groups by universe and is
traversed vertically, or the contract additionally carries a short selection,
**written as a rule and served**. I prefer the first, with the second as an
optional field. *Blocks: the shape of `categories`.*

**Q6 — Do per-viewer fields make a row non-shareable?** The card must carry "holds
a seat", "can watch now" and "resume position", otherwise the TV cannot honour the
principle "never offer a seat to someone who already has one" — and learning it
would require a second call, which my budget forbids. But those fields are
specific to the viewer, so a composed row is no longer cacheable at the edge.
Three ways out: accept a per-viewer cache; split a public body and a thin
per-viewer overlay (at the cost of a second round trip, which I refuse by
default); or compose at the BFF with a short cache. Which one? *Blocks: the shape
of `DateCard` and the whole call budget.*

**Q7 — Who composes the rows, and where?** The home rows, the evening grid grouped
by the **viewer's local hour**, the already-ordered sub-genre rows, the ordering of
My seats: I ask for all of it to arrive ready-made. That presupposes read models
projected where the BFF reads them — or a BFF that composes on the fly. The handoff
states that the use of gRPC will be decided on evidence, by counting the
synchronous BFF → service calls: here is my contribution to the count. On reads, if
the models are projected, the TV requires **none**. *Blocks: `home`, `live`,
`category`, `tickets`.*

**Q8 — Are preferences carried by the profile or by the device?** Interface
language, subtitles on by default, subtitle size, audio description, reduced
motion, automatic video preview. Subtitle size and reduced motion depend on the
television and the room; language depends on the person. One scope, or two?
*Blocks: `updatePreferences` and `ViewerContext`.*

**Q9 — The playback token: what shape, what interval, what release?** Three precise
points: (a) does the renewal produce a URL adoptable **without restarting
playback**? (b) is the interval short enough — ≤ 60 s — for the concurrent-session
limit to be effective? (c) does releasing a session rest on a lease that expires,
rather than on an end-of-playback call the TV will not always be able to make?
*Blocks: the player's architecture.*

**Q10 — What canonical URL for sharing a date?** On a TV, sharing can only be a QR
to the public page. That URL must be served by the contract and not built by the
surface. Does it exist? *Blocks: the Share action, which today is wired nowhere.*

**Q11 — What rate cap on the chat served to a TV, and what reaction quota?** I ask
for a cap enforced **server-side** — the TV cannot absorb a stream in order to
throw away 95% of it — and a reaction quota **returned in the response**, so that
the TV disables the control instead of letting it fail. *Blocks: the player's chat
panel.*

**Q12 — Does the contract declare the expected behaviour in the face of an unknown
enumeration value?** This is the question the fleet's survival depends on: strict
validation fails a whole page when the catalogue gains a 22nd discipline or a new
outcome. I need the contract to write "keep and treat as neutral", and the
strictness to bear on the shape and not on the member. *Blocks: the client
validation strategy, and indirectly the zod question.*

**Q13 — Can `@arthome/contracts` expose a barrel-free entry point for constrained
clients?** With the measurement to back it: `import { z } from 'zod'` costs 92 KB
compressed (453 KB to parse at start-up) and that cost is **fixed**; the same
schemas via `zod/mini` cost 7.7 KB. On the most constrained surface of the project,
that is the difference between a comfortable cold start and a laborious one — for a
library of which the TV uses only the decoding. The "zod everywhere" decision is
not disputed; it is the **packaging** I am asking to adapt. *Blocks: the surface's
start-up budget.*

**Q14 — Are the domain constants served?** House opening (30 min), billboard
preview delay (4 s), the "last seats" threshold, the booking cancellation deadline
("up to 1 h before"), the refund credit delay ("3 to 5 business days"). All of them
are today copied into screen labels. If they do not come from the contract, they
will diverge across five surfaces. *Blocks: `ViewerContext`, `tickets`, `book`.*

---

## Confrontation

> Time 3. Read: `answers-to-surfaces.md`, `adr-auth.md`, `adr-stream-entitlement.md`,
> `context-map.md` §10, `data-model.md` §3.2, `events.md`, `realtime.md`, `transport.md`,
> `critical-rules.md`, `openapi/storefront.yaml` (5,072 lines), `DECISIONS.md`.
>
> Overall verdict: **my fourteen questions are answered, none dodged**, and several are answered
> better than I asked. I dispute **four points**, three of which produce a defect visible on
> screen and a fourth that breaks the fleet on a delay. My call budget **holds**.

### What is satisfied

Briefly, because it is long and the substance is elsewhere.

- **The pairing.** One primitive, five intents, `signin` the only true RFC 8628 and the other four
  as transaction rendezvous: the analysis is taken up and improved on. The five outcomes are
  there, `approved_with_failure` included. `pollPairing` works **with the device token alone**, so
  reattachment after a restart works by construction. A replayed `cancelPairing` returns the
  original outcome. The alphabet is declared (28 symbols, `B`, `S`, `Z`, `G` removed), the
  duration is **per intent and served**, the rate cap is per `device_id` rather than per address —
  the NAT of a living room was the right argument. `PAIRING_IDENTITY_MISMATCH` with no implicit
  profile switch. And `account-deep-link` is **separated by name**, not by an option: the
  hand-off / pairing distinction I asked for is written in.
- **The seat hold.** `SeatHold` is placed **when the pairing opens**, `seats_available` is served
  **net of active holds**, and expiry republishes
  `ticketing.date_sales.availability_changed.v1` (`data-model.md` §3.2, points 1 and 2). The
  invariant "a single instant carried by both objects" is written down. It is the argument my five
  minutes were missing, and it is better than mine: I was reasoning about the display, it reasons
  about the commitment.
- **The player.** `POST /v1/playback/{dateId}/open` carries everything: protocol, DRM, quality cap
  chosen by the server from `capabilities`, chapters, tracks, chat mode, incident, resume, live
  edge. A 120 s token, 45 s renewal, a 90 s lease that **expires**, `edgeRenewalMode: query_token`
  and "nothing that would force a manifest reload". `CONCURRENT_LIMIT_REACHED` carries the list of
  active sessions. `Cache-Control: no-store`. My four requirements from *Real time* are met, the
  third with margin.
- **Tolerance of the unknown.** Critical rule no. 10, and it is **applied**: 59
  `x-arthome-vocabulary` on response fields against 25 `enum:`, all of them in a request,
  parameter or header. A discipline held over 5,072 lines, with **one** exception (see C4).
- **The rest.** `EnvelopeMeta` with `servedAt`/`validUntil`/`degraded`; `DomainConstants` served
  (all eleven); `emptyReason` + `emptyActionCode` instead of a sentence; `canonicalUrl` served and
  explicitly intended for the share QR; the geo-blocking `reasonCode` as a **code**; `viewers`
  absent and never zero; `rights.reasonCode` coded; no ticketing or gallery field on `DateCard`;
  an `ETag` on the date page so that my prefetch is not paid for twice; the reaction quota **in
  the response**; a chat cap of 2 msg/s for the TV; every command returning the projected state.
  D-012 records the barrel-free entry point.

### What is not satisfied

#### C1 — The `replays` page is not served. Twenty-one screens out of twenty-two.

**On the evidence.** `openapi/storefront.yaml` exposes no public replays endpoint. The only path
carrying the word is `/v1/me/replays` (line 2226): `tags: [account]`,
`summary: My replays`, `x-arthome-upstream: [ticketing, catalog, streaming]`,
`'401': Unauthorized`.

**Why it is not the same thing.** "Replays" is the **eighth entry in my sidebar**, and it is a
discovery page, just like "Live" or "Categories". It is not prefixed "My", unlike "My seats" and
"My list", which explicitly are. Its content is the catalogue of replays online, ordered by
increasing remaining window — "expiring soon" first — not the replays I hold.

Three consequences, all visible:

1. **A signed-out visitor gets a 401 on a permanent menu entry.** The `visitor` profile is one of
   the contract's four. On a TV the sidebar is always there: you cannot hide an entry depending on
   the session without the menu changing size under the focus, which breaks focus memory.
2. **Even signed in, it is not the right content.** `/v1/me/replays` comes up from `ticketing`: it
   returns what I have bought. My page returns what is **on sale or included**, including replays
   I have never seen — it is a discovery page, that is the point of it.
3. **`/v1/search?tab=replays` is no substitute**, on three counts: `q` is `minLength: 2`, so there
   is no empty search; the paginated unit is the **show** (`ShowGroup`), not the date; and a
   replay window expires **per date**, so grouping by show makes the "expiring first" sort
   impossible to express.

**What I ask for.** A `GET /v1/replays`, public, cursor-based, `items: DateCard[]`, sorted by
`replay.expiresAt` ascending, with the same `CursorPageInfo`. It is the twin of `/v1/live`: a
discovery page over a date state. The cost is one read model that `catalog` already projects for
the home screen's `replay_expiring` rail — the material exists, it is missing a door.

#### C2 — `Rail` can express only six of my nine home rows, and does not carry its counter

This is the heaviest objection, because it touches the most-watched screen on the surface.

**On the evidence.** The `Rail` schema carries exactly five properties: `id`, `titleCode`, `kind`,
`items`, `nextCursor`. `kind` has seven values:
`[resume, live_now, upcoming_tonight, followed, editorial, category, replay_expiring]`.
`items` is typed `array of DateCard`, with no alternative. `Rail` is referenced once, in
`HomeScreen.rails`.

**Three rows from the specification have nowhere to go.**

| Row (order imposed by the specification) | `kind` available | Expressible? |
|---|---|---|
| 1. Resume | `resume` | yes |
| 2. On air right now | `live_now` | yes |
| **3. Your seats** | — | **no**: no `kind` |
| 4. Tonight on Arthome | `upcoming_tonight` | yes |
| 5. Because you follow *[artist]* | `followed` | yes |
| 6. Replays expiring soon | `replay_expiring` | yes |
| 7. Two or three rows per discipline | `category` | yes |
| **8. Posters** (2/3 vertical format) | — | **no**: no card form declared |
| **9. Artists to follow** (round portraits) | — | **no**: `items` accepts only `DateCard` |

Row 9 is the clearest: `ArtistSummary` **exists** in the contract (line 4279) but no row can carry
it. Row 3 has no `kind` — and `editorial` does not fit, since it is precisely the row that is not
editorial but personal, and its behaviour is its own (the card becomes "Enter the house" thirty
minutes before curtain). Row 8 is the least serious: `MediaSet` carries `wide` **and** `poster`, so
the TV could pick the poster — but pick it on what basis? On the row id, that is to say on a
constant copied into the surface. That is a parallel literal, and principle no. 1 forbids it.

**And this is not cosmetic.** The specification is explicit about the reason: *"the variety of
format is what stops the screen looking like a spreadsheet"*. Nine rows of identical 16/9 cards is
exactly pitfall no. 1 of my document — "the website shown large".

**The counter is missing too.** Every row displays a count to the right of its title. `Rail`
carries neither `total`, nor `approximateTotal`, nor `CursorPageInfo` — whereas `CursorPageInfo`
carries `approximateTotal` and `totalIsLowerBound`, and every paginated list in the contract
benefits from it. A row served as a slice of twenty out of sixty can therefore only display
`items.length`, that is **twenty**, or a wrong figure. It was written in black and white in my
*Pagination and volumes* section: "`total` is a requirement, not a comfort". It fell through the
cracks because `Rail` does not use the common page envelope.

**What I ask for**, in order of severity:
1. `Rail.total` (or adopting `CursorPageInfo`) — without it the counter is a literal;
2. `items` as a discriminated union `DateCard | ArtistSummary`, with an `itemKind` carried by the
   row — otherwise the artists row does not exist;
3. `kind: my_seats` added to the vocabulary;
4. a card form declared by the row (`cardForm: wide | poster | portrait`) — that is an editorial
   choice, and it belongs to the server just as the row order does.

All four are additive and affect no other surface.

#### C3 — The race between `cancelPairing` and `decidePairing` can orphan a real purchase

This is the case the lead asked me to look for, and it exists.

**On the evidence.** Two statements of the contract, taken together:

- `POST /v1/pairings/{pairingId}/decision`, the description of `outcomeRef`: *"the opaque pointer
  to what the phone's normal journey produced — **placed by the BFF after `ticketing` has
  executed**, with its own `Idempotency-Key`"*. Execution therefore precedes the decision.
- The same endpoint, first check: *"the pairing is `pending` and not expired"*. A `cancelled`
  pairing no longer is, and the response is `410 Gone`.

**The sequence.** The viewer picks their tier, the TV shows the QR. They scan, they pay on their
phone. While the payment is executing, they press **Back** — the most used key on a remote, and my
own surface contract says that Back goes up one level from any screen. The TV sends
`DELETE /v1/pairings/{id}`. Three instants: `ticketing` has taken the money; the `DELETE` arrives;
`decision` arrives and gets a `410`.

**Result: the seat is bought and paid for, and neither screen says so.** The phone shows a failure
(`410`), the TV is back on the booking screen. The money is gone.

The contract does handle the reverse order — "Cancelled, or already decided: a second call returns
the original outcome" covers the case where approval precedes cancellation. It is **that order**
which is not covered, and it is the more likely of the two: executing the payment takes seconds,
pressing Back is instantaneous.

**Three remarks that aggravate the case rather than soften it.**

- My own document wrote "the TV often leaves without waiting for the response", and the contract
  carried it over verbatim into the description of `cancelPairing`. So we both saw that the TV
  cancels fast; neither of us looked at what was happening on the other side.
- The recovery path exists but is not armed: `/v1/changes` does carry `account:tickets`, but
  nothing in the contract says the TV must poll it after an abandoned pairing — and on the home
  screen it has no reason to.
- `SeatHold` offers no protection here: it guarantees the gauge, not the reconciliation of a
  payment that has already gone through.

**What I ask for.** That `cancelPairing` **not cancel a pairing whose execution is engaged**.
Concretely: an intermediate state — the pairing becomes non-cancellable as soon as the phone
enters the payment journey — and a `DELETE` on that state answering `409` with an explicit code,
the TV then staying on the waiting screen instead of leaving. It is the same family of guard as
`PAIRING_IDENTITY_MISMATCH`: it protects money against a gesture of the interface. Failing that,
it must be written down who wins the race, and what becomes of the purchase that loses.

#### C4 — `Error.nature` is the only hard `enum` on a response, and it is in the worst place

**On the evidence.** Over 5,072 lines, critical rule no. 10 is held with a rigour I want to
acknowledge: 59 closed response vocabularies as `x-arthome-vocabulary`, 25 `enum:` **all** in a
request, parameter or header. One exception, line 3616:

```
nature:
  type: string
  enum: [refused, unavailable, offline_forbidden]
```

`Error.nature` is `required` in `Error`, which is `required` in `ErrorEnvelope`, which is the body
of **every** error response in the contract.

**Why it matters more here than elsewhere.** If a fourth nature appears — `degraded`,
`rate_limited`, `needs_reauth` — a television on an earlier version, applying the contract as
written, rejects the envelope. It does not lose a card: it loses its ability to **read errors**,
that is to say precisely at the moment when something is already going wrong. The defect shows up
as a cascade, on the recovery path, and on a fleet I cannot update. It is the exact scenario rule
no. 10 exists to prevent, at the place where it does the most damage.

**What I ask for.** An `x-arthome-vocabulary` like the other 59, and an unknown nature treated as
`unavailable` (retryable) rather than as nothing. The fix costs one line.

### What is satisfied differently, and whether that suits me

- **Q1, pairing by polling rather than by the channel.** I had left the three mechanisms open while
  asking for ≤ 2 s. The choice made is polling, with a **served decay** (2 s for sixty seconds,
  then 5 s), on the grounds that bringing a device identity into the WebSocket namespace at
  `signin` time would widen its attack surface. **That suits me, and the argument is better than
  mine**: I was weighing latency, it weighs attack surface, and the served decay gives me the two
  seconds where they count — the first minute. One point to watch: the interval is served, so my
  surface must **re-read it on every response** and not capture it at creation. The contract says
  so; holding to it is on me.
- **Q6, cacheability.** My third way out is the one adopted — composition at the BFF, a public
  body in a short Redis cache, overlays merged by **batch of ids**. An addition I had not asked for
  and which is better than what I did ask for: `EnvelopeMeta.degraded`, which names the overlays
  that could not be composed. An overlay that fails **degrades** the card instead of sinking the
  screen. That is exactly the right trade-off at three metres: better a card without a progress
  badge than an empty screen.
- **Holding a seat is not a field.** `viewerRelations` carries `inWatchlist`, `reminderSet`,
  `followsArtist` — not `owned`. Holding is inferred from `watchVerdict.reasonCode != NO_SEAT`.
  **That passes**, because the refusal vocabulary is the same on both sides and `fallbackAction`
  gives me the action without my having to choose it. But it is an inference, and principle no. 3
  of the handoff ("a held seat opens the show, never offer a seat to someone who already has one")
  deserves better than an inference by negation. I note it without making it an objection: if the
  "Your seats" row gets its `kind` (C2), the question closes by itself.
- **Q12 and validation.** The rule is set at project level and applied in the OpenAPI, but the
  translation into zod remains to be written — `answers-to-surfaces` says so itself: "a bare
  `z.enum()` does not do it". With D-012 and the `zod/mini` entry point, that lands on
  `@arthome/contracts` at stage 1. **That suits me**, on one condition: that it be a **test**, not
  a convention. A schema that rejects an unknown value passes every review and breaks in
  production six months later.
- **`previewUrl` is bare.** `HomeScreen.billboard.previewUrl` is a URL with no metadata. I had
  asked for the billboard preview to be served as a **light rendition and declared as such**,
  because a television decoder often decodes only one high-definition stream and the preview must
  be torn down before opening the player. Serving a URL with no height or bitrate leaves me
  guessing. **It is minor and I can live with it** — I can treat every `previewUrl` as tearable
  down by default — but a declared height would cost one field and would spare me capping blind on
  devices I cannot test.

### My call budget: it holds

The lead points out that `backend-domain` announces "1 to 4 calls per screen". **That is not the
same axis, and there is no conflict.** `context-map.md` §10.1 counts the **synchronous
BFF → service** calls, internal, *"all parallel"*, behind **a single** surface request. My budget
counted **surface → BFF** round trips. The two hold together, and the document says so explicitly:
*"the count `storefront-tv` announced is therefore confirmed"*.

Screen-by-screen verification, against the paths actually published:

| Screen | Budget announced | Path served | Verdict |
|---|---|---|---|
| `boot` | 1 | `GET /v1/viewer-context` | ✅ |
| `gate` | 0 | profiles in `ViewerContext` | ✅ |
| `signin` | 1 + wait | `POST /v1/pairings` + polling | ✅ |
| `home` | 1 | `GET /v1/home` | ✅ (4 parallel internal calls, 1 to 2 in steady state) |
| `search` | 1 per state | `GET /v1/search`, cancellable, ≤ 200 ms | ✅ |
| `live` | 1 | `GET /v1/live`, **server-side** hour grouping | ✅ |
| `categories` | 1 | `GET /v1/categories` | ✅ |
| `category` | 1 | `GET /v1/categories/{id}` | ✅ |
| `artists` | 1 + cursor | `GET /v1/artists` | ✅ |
| `artist` | 1 | `GET /v1/artists/{id}` | ✅ |
| `title` | 1 | `GET /v1/dates/{id}`, with `ETag` | ✅ |
| `book` | 0 or 1 | `GET /v1/dates/{id}/availability` | ✅ |
| `pay` | 1 + wait | `POST /v1/pairings` | ✅ |
| `confirm` | **0** | complete `PairingOutcome` | ✅ **confirmed, 0 internal calls** |
| `player` | **1** | `POST /v1/playback/{id}/open` | ✅ **1 internal call, budget ≤ 1 s** |
| `dateinfo` | 0 | derived from the `PlaybackTicket` | ✅ |
| `tickets` | 1 | `GET /v1/me/tickets` | ✅ |
| `list` | 1 | `GET /v1/me/watchlist` | ✅ |
| `replays` | 1 | **no public path** | ❌ **C1** |
| `plans` | 1 | `GET /v1/plans` | ✅ |
| `account` | 1 | `GET /v1/me/account` | ✅ |
| `help` | 0 | embedded | ✅ |
| `ambient` | **0** | posters in hand, no pushed transition | ✅ **confirmed by `realtime.md` §2.4** |

**Twenty-one screens out of twenty-two at the announced budget. Only one is not served.**

Two wins I want on the record, because they were the most fragile:

- **The zero-call screensaver is explicitly defended.** `realtime.md` §2.4 refuses to push state
  transitions and delivers the instants instead, with the conclusion written out:
  *"a screensaver that runs for eight hours makes no request"*. That was the point I feared losing
  first, because it is counter-intuitive: pushing is the reflex.
- **`confirm` at zero calls is held by the shape, not by a promise.** `PairingOutcome` carries
  `ticket`, `order`, `subscription` and, for `signin`, a complete `viewerContext` — *"the TV does
  not have to re-bootstrap"*. That is more than I asked for.

### The questions that remain

1. **Who wins the C3 race, and what becomes of the purchase that loses?** It is the only one of the
   four whose answer involves real money.
2. **Is `GET /v1/replays` added, or is the page removed from my sidebar?** Both are acceptable
   answers — but not silence, because a menu entry that answers 401 to a visitor is worse than no
   entry.
3. **How is the home screen's artists row served?** `ArtistSummary` exists and no row can carry it.
   If the answer is "the TV makes a second call for that row", I dispute it in advance: it would be
   the only screen at two round trips, and for the least important of the nine rows.
4. **Will tolerance of unknown enumeration values be a test?** The rule is written, the OpenAPI
   applies it; what is missing is the guard rail that will stop a `z.enum()` getting in at stage 1.
   I ask for a contract test that sends an unheard-of value into every closed vocabulary and checks
   that the response is **rendered**, not rejected.
