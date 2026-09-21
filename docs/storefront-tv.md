# Prompt — Storefront TV (Arthome)

> **Corrected on 21 September 2026.** Two taxonomy vocabulary errors were put
> right (the count of disciplines, and the use of "ballet" and "concerts" as
> disciplines). Details in
> `arthome-core/architecture/corrections-handoff.md`, family B; the original
> version is kept under `Prompt - Storefront TV.pre-corrections.md`.

## Overall project context

Arthome is a live-broadcast platform for the performing arts: théâtre, danse, cirque, humour, opéra, comédie musicale, performance, and every musical discipline — from rock to classique by way of jazz, rap and musiques du monde. Integrated ticketing, merch shop, chat, replays. The existing surfaces:

- **Storefront Web** (`Storefront Web.dc.html`) — the public site, desktop, 1440 px
- **Storefront Mobile** (`Storefront Mobile.dc.html`) — the same, adapted for mobile, 430 px
- **Studio** (`Studio.dc.html`) — the professional control room, desktop
- **Studio Mobile** (`Studio Mobile.dc.html`) — the control room, 430 px

To be created: **Storefront TV** (`Storefront TV.dc.html`) — the living-room application, for connected televisions, operator set-top boxes, consoles and HDMI sticks. It is the same platform, the same account, the same catalogue — driven with the remote control, three metres from the screen, often with several people in the room.

The storefront and the studio remain two separate products: **the studio does not exist on TV**. No control room, no moderation, no payouts. The TV is a viewer surface, nothing else.

---

## Visual direction — inherit from the storefront, not the studio

The storefront is warm and editorial; the studio is a working tool. The TV follows the **storefront**, amplified: more black, more photography, less text.

### Exact palette (taken from the storefront)

- Deep background `#0B0A09`, panels `#100F0D`, `#17140F`, `#1A1815`
- Raised surfaces `#1F1C19`, `#221F1B`, `#262320`
- Borders `#2E2A24`, `#332E28`, `#4A423A`, `#575047`
- Primary ink `#EDE7DC`, secondary `#C9C0B2`, tertiary `#9B948A`, muted `#857E73`, `#8B857C`, extinguished `#6B6459`
- **LIVE** `oklch(0.62 0.21 27)` — the on-air red, never used for anything else
- **ACCENT** `oklch(0.78 0.13 42)` — the warm amber of reminders and replays
- **GOLD** `oklch(0.9 0.07 84)` — seats held, mentions of scarcity
- **OK** `oklch(0.7 0.13 150)` — confirmations, valid seat

On TV, the background must be **darker than on the web**: OLED panels pull the greys towards black and the room is often dark. No pure white, no flat tint above `#EDE7DC`.

### Typography

- **Instrument Serif** — show titles, artist names, editorial hooks. This is the Arthome signature.
- **Archivo** — body text, buttons, descriptions.
- **JetBrains Mono** — times, durations, prices, counters, codes, section labels (9→14 px on the web, **never less than 18 px here**).

**10-foot scale — absolute floor:**

| Role | Size |
|---|---|
| Billboard title | 72 → 96 px (Instrument Serif) |
| Page title | 48 → 56 px |
| Card title | 26 → 30 px |
| Body text, synopsis | 26 px minimum, 28 px recommended |
| Mono metadata | 18 px minimum, letter-spacing 0.12em |
| Button label | 24 px minimum |

No text below 18 px, ever, not even in legal small print. A synopsis line does not exceed 68 characters. Three lines maximum, then truncate.

### Shape vocabulary

The storefront has soft corners; the TV keeps them: 4 px radius on cards and buttons, circles for avatars. Crisp drop shadows under focused elements only. State badges identical to the storefront: 1 px border in the state's colour, text in the same colour, background veiled at 14 % via `color-mix(in oklch, <colour> 14%, transparent)`.

### Safe area (overscan)

Nothing useful outside a **60 px** frame on all four edges (5 % of 1920×1080). Background images may happily run to the edge, never the text or the targets.

---

## Technical constraints

A single Design Component, `Storefront TV.dc.html`. Inline styles exclusively — no classes, no stylesheet; only `@font-face`, `@keyframes` and resets are allowed inside `<helmet>`. `$preview` at **1920 × 1080**.

No value hole (`{{ }}`) for static text or fixed styling. Every list goes through `<sc-for>` with `hint-placeholder-count`, every condition through `<sc-if>` with `hint-placeholder-val`.

A single source of truth: every display derives from the data, never from a parallel literal. This rule cost about ten corrections on the other surfaces — do not replay it.

---

## The heart of the matter: the remote control

This is what separates a real TV app from a website displayed large. **Everything is driven with five keys.**

### Focus engine

- One and only one focused element at any instant, **always visible without scrolling**.
- Focus moves on a cross: ↑ ↓ ← →. No diagonal, no arbitrary jump — the target is the nearest geometric neighbour on the requested axis.
- **OK / Enter** activates. **Back / Esc / Backspace** goes up one level; from the home screen, Back does nothing (or offers to quit).
- **Play/Pause** (Space) acts anywhere something is playable, even without opening the controls.
- No state reachable by hover alone: `:hover` does not exist on TV. Everything the web does on hover is done **on focus**.
- No cursor, no visible scrollbar.

### Visual expression of focus

Three simultaneous signals, never just one:

1. **Scale** — the focused card goes to 1.08, its neighbours stay at 1.0, 160 ms transition `cubic-bezier(.2,.7,.2,1)`.
2. **Ring** — 3 px `#EDE7DC` border (or LIVE if the card is on air), plus a `0 18px 48px rgba(0,0,0,.7)` shadow.
3. **Reveal** — the title and the metadata appear in full only under the focused card; the others stay in muted ink.

Focus does not blink, does not pulse. Only the on-air badge pulses (`pulseLive`, 1.6 s).

### Focus memory

On returning to an already-visited page, focus **finds the card you left**, and the carousel its position. That is the difference between an app you can move through and an app that punishes you.

### Scrolling

- Vertical: the focused row settles at the same place on the screen ("sticky row"), the others slide beneath it. Never an abrupt jump.
- Horizontal: the focused card stays on the left of the screen after the first three, with a peek of the next one overhanging the edge — the viewer must see that there is content left.
- Scrolling animated over 220 ms. On a held key, acceleration and removal of the animation (otherwise it falls behind the finger).

### Shortcuts to honour

`↑ ↓ ← →` navigate · `OK` activate · `Back` go up · `Play/Pause` · `◀◀ ▶▶` back/forward 10 s, hold = ×4 ·  `Red` open the live chat · `Green` subtitles · `Yellow` quality and tracks · `Blue` information about the date. A key help panel opens on a long press of OK and closes with Back.

**On mobile and desktop these shortcuts have no reason to exist: here, they are the interface.**

---

## Structure of the application

### Left sidebar, collapsed by default

72 px wide, icons only. When focus enters it (via ←), it expands to 320 px in 180 ms and reveals the labels, with a gradient veil over the content on the right. Entries: Search, Home, Live, Categories, Artists, My seats, My list, Replays, Subscriptions, Account. No submenu: one level, ten entries maximum.

The profile avatar is at the top of the bar, the account cog at the bottom — the same conventions as the other surfaces.

### Pages

`home` · `search` · `live` (the live broadcast, a dedicated page) · `categories` · `category` · `artists` · `artist` · `title` (the page for a date or a show) · `player` (full-screen player) · `tickets` (my seats) · `list` (my list) · `replays` · `plans` · `account` · `help`

The player is a page in its own right, not a modal: it takes the whole screen and Back exits it.

---

## Screen by screen

### 1. Home

**Billboard** at the top, full frame, 62 % of screen height: the show's image as background, a `linear-gradient(90deg, #0B0A09 0%, rgba(11,10,9,.82) 42%, transparent 78%)` gradient to the right and a second one downwards. On top of it:

- Mono kicker — `LIVE IN 42 MIN` / `ON AIR` / `NEW` / `LAST SEATS`
- Title in Instrument Serif 88 px
- Metadata line: discipline · duration · venue · viewer's time zone
- Three lines of synopsis maximum
- Two or three buttons: **Watch** / **Book a seat** / **More information**, plus a "+ My list" icon
- If the date is on air: a pulsing LIVE badge and a viewer counter

After 4 seconds with no interaction, the billboard starts a **muted video preview** (an extract or an archive recording) that fades in over the image. Any key press interrupts it. The `autoplayPreview` setting turns it off.

**Carousels** next, in this order:

1. **Resume** — what has been started, with the progress bar and the time remaining
2. **On air right now** — 16/9 cards with a red badge and a counter
3. **Your seats** — upcoming purchased dates, with the countdown; the card becomes "Enter the auditorium" 30 min before curtain-up
4. **Tonight on Arthome** — the day's schedule, ordered by the viewer's local time
5. **Because you follow [artist]** — a named recommendation, never an anonymous one
6. **Replays expiring soon** — with the remaining window in amber
7. Two or three rows per discipline

Each row carries its title in Archivo 30 px and, on the right, a discreet mono counter. 16/9 cards of 320 × 180 px, except the artist rows (round 160 px portraits) and the "posters" row (2/3 vertical, 240 × 360 px) — the variety of formats is what keeps the screen from looking like a spreadsheet.

### 2. Search

On-screen keyboard **on the left** (QWERTY or AZERTY grid depending on the language), results in a grid **on the right**, updated on every letter. A search with the remote control is expensive: offer, straight away and under the keyboard, the recent searches and the disciplines, plus a "Search by voice" entry (microphone button, animated listening state). No "Submit" button: the results are live.

### 3. Live

The page of the live broadcasts on now and today. At the top, the one that is on air, large, with a video preview. Below, the **evening's schedule grid**: one line per hour, in the viewer's local time, with the venue's time zone mentioned when it differs ("21:00 your time · 22:00 at the venue"). Sold-out dates carry "SOLD OUT", those with a waiting list "WAITING LIST · 340".

### 4. The page for a date

Full screen, background image, content on the left half:

- Title, artist (focusable → artist page), discipline, duration, day and time **in the viewer's time zone**, with the venue time second
- State of the date, taken from the studio: `SCHEDULED`, `LIVE`, `ENDED`, `REPLAY ONLINE`, plus the outcome states `CANCELLED AND REFUNDED`, `POSTPONED · SEATS STILL VALID`, `INTERRUPTED · CREDIT NOTES ISSUED` — these last take precedence over everything else, in red, with the explanation in plain words and what the viewer must do about it
- Full synopsis, cast, language and subtitles
- **Action bar**: Watch / Book / Trailer / + My list / Share
- What the seat gives: access to the live broadcast, replay included or not, length of the window — the replay policy must be **readable before purchase**, it is what justifies the price difference
- An "Other dates for this show" row (the run), with the sold-out dates marked
- A "By the same artist" row

### 5. Book a seat — the QR journey

**You do not type a card number with a remote control.** Payment happens on the phone:

1. Booking screen: summary of the date, choice of price tier (full, reduced, supporter) with the remote, choice of the number of seats
2. Payment screen: **QR code** on the left, to be scanned; on the right, a six-character short code and the address `arthome.fr/tv` for those who prefer to type
3. The screen waits, with an animated waiting state and no anxiety-inducing countdown; when the payment goes through on the phone, the TV switches to the confirmation on its own
4. Confirmation: "Your seat is booked", a reminder of the local time, an "Add to My list" button and "Back to home"

The same mechanic for signing in (`Sign in` = QR + short code), for subscribing, and for buying merch. On TV, anything that requires writing goes through the phone.

> **Architecture note, added on 21 September 2026.** These four journeys — signing in, buying a seat, subscribing, buying merch — use **the same mechanism**: a short code displayed on one screen, picked up on another device, and a screen that waits and then switches on its own. That is exactly the **OAuth device flow (RFC 8628)**.
>
> It must therefore be designed **once only**, as a device-pairing primitive, and not four times by four teams. It is also the criterion that will separate the authentication candidates: which one implements the device flow **natively**. See `architecture/adr-auth.md`.

### 6. Player

Full screen, no permanent element except, when live, the red badge and the counter at the top right (opacity 0.6).

**Controls**: hidden by default, revealed by OK or by an arrow, hidden again after 4 seconds. They fit in a bottom strip:

- A progress bar with the **chapters set in the control room** (overture, scenes, interval, curtain call) — on a live broadcast, the bar shows the portion already elapsed and the latency
- Elapsed time / duration, in mono
- Buttons: Play/Pause, −10 s, +10 s, Chapters, Subtitles, Audio tracks and quality, Chat, Information
- When live, a **Back to live** button appears as soon as the viewer has scrubbed back

**Live chat**: a 420 px right-hand side panel, opened with the red key, which shrinks the video instead of covering it. **Read-only on TV** — you do not type on a virtual keyboard during a show. Two gestures are possible: **reactions** (six emojis chosen with the directional cross) and "Write from my phone" (QR). The chat mode comes from the date: open, emojis and prepared phrases, read-only, off — and the screen says so when it is restricted.

**Incidents, taken from the studio**: when the control room shows a standby screen, the player displays it full frame, with the message written by the control room, free of technical jargon, and what it means for the seat. Three possible outcomes, announced as such: resumption, postponement (seat still valid), cancellation (refund in 3 to 5 days). Never a mute spinner: the viewer must always know whether the problem comes from their end or from the venue.

**End of the show**: an exit screen with the curtain call in the background, the replay if it is included ("Available for 41 h"), the show's shop (QR), and the next date in the run.

### 7. My seats

The seats held, upcoming first, as wide cards: poster, title, day, local time and venue time, state. Three access states: **upcoming** (countdown), **doors open** (Enter button, 30 min before), **past** (replay if one exists). A postponed seat says so and shows the new date; a refunded seat says so and shows the credit delay.

### 8. My list, Artists, Categories

- **My list** — a simple grid, sorted by when it was added, removal by a long press on OK
- **Artists** — a grid of round portraits, with the number of upcoming dates; the artist page has its own billboard, its biography, its dates, its replays, and a Follow button that triggers notifications
- **Categories** — the **21 disciplines** as typographic tiles (no photo: the name in Instrument Serif on a tinted flat), grouped by the two universes — **Musique** (14 disciplines) and **Scène** (7) — which exist precisely to give structure to a long list. The tiles come out in the **editorial rank** declared by `taxonomy.json` (`rank`, from the most mainstream to the most specialised, families mixed): no surface recomputes it. Then the subgenres in rows.
  Twenty-one tiles do not lay out on a television screen the way nine do: this is a layout constraint that reaches all the way back to the read model served to the TV. If a shorter editorial selection is wanted at the top of the page, it must be written as a rule, never hard-coded.

### 9. Subscriptions

Three plans maximum, in columns, with what each one opens up. The purchase goes through QR. Never display a dense comparison table: three columns, five lines each, everything above 24 px.

### 10. Account and profiles

Profile selection **when the app opens** (up to five, round avatars, a child profile possible with a filtered catalogue). Inside the account: identity, current subscription, payment methods (read-only, editable by QR), connected devices, language, default subtitles, subtitle size, audio description, reduced motion, and sign-out.

### 11. Idle

After 8 minutes with no interaction outside playback, an **ambient mode**: catalogue posters full screen, slowly cross-fading into one another, a discreet clock at the bottom, the show title in Instrument Serif. Any key exits it and returns focus where it was.

---

## States not to forget

- **Loading** — card skeletons (`skel` animation), never a blank page nor a lone spinner
- **Empty** — "Nothing in My list for the moment", with an action that gets out of the dead end
- **Network lost** — a top banner, a message that distinguishes "your connection" from "our servers"
- **No seat** — the card says so before the player opens, never after
- **Geo-blocked content** — said in plain words, with the reason

---

## Settings to expose (component props)

`lang` (fr, en) · `profile` (visitor, subscriber, seat holder, child profile) · `onAir` (boolean) · `autoplayPreview` (boolean) · `focusScale` (1.0 → 1.12) · `chatMode` (open, emojis, read-only, off) · `replayPolicy` (included, subscription, single purchase, none) · `incident` (none, standby screen, postponed, cancelled) · `safeArea` (boolean, to visualise the overscan frame) · `remote` (plain cross, cross + colour keys)

---

## Traps to avoid

1. **The website blown up** — if the screen looks like the web storefront zoomed in, it has failed. Fewer elements, bigger, further apart.
2. **Hover** — no information, no action must depend on `:hover`.
3. **Typing** — anything that requires writing more than six characters goes through QR or voice.
4. **Small text** — 18 px is a floor, not a target.
5. **Lost focus** — at every instant, one focused element, visible, and a way out with Back.
6. **Forgotten focus** — going back must bring focus exactly where you left from.
7. **Density** — no more than three rows visible at a time, no more than six pieces of information per card.
8. **Modals** — on TV, a modal is a page. No floating window to close with an X.
9. **Parallel literals** — every counter, every badge derives from the data.
10. **Hexadecimal colours in the state tables** — everything in oklch, or `color-mix` for the veil.
11. **Decorative red** — the LIVE red is only ever used for on-air. A promotion is never red.
12. **Inert actions** — an interface state must respond. The only things that stay inert are calls to an external service: a real payment, sending an email, contacting support.
