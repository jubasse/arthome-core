# Arthome — handover dossier

Live-broadcast platform for the performing arts: ticketing, live, chat,
replays, shop, artist payouts.

This dossier is the starting reference for the real implementation. **To be
committed at the root of `arthome-core`**, under `docs/` — every Claude Code
session must be able to re-read it.

> **Corrected on 21 September 2026.** This document was written before several
> structuring decisions, and it contradicted them. The discrepancies are
> detailed in `arthome-core/architecture/corrections-handoff.md`; the original
> version is kept under `README.pre-corrections.md`, which lives with the source
> folder `design_handoff_arthome/` and is not part of this repository.
> The corrections cover: the multi-repository layout (§3, §8), the two packages
> of `arthome-core` (§3), Protobuf alone (§3), observability (§3), the uses of
> Redis (§3), and the ADRs still to be written (§9). Three sections were added
> to fill silences: authentication, entry topology and payment (§3).

---

## 1. What this dossier contains, and how to treat it

Two clearly distinct natures. Confusing them would cost weeks.

### `shared/` — to be carried over, not rewritten

Framework-free JavaScript, already in production in the five mockups as the
**single source of truth**. These files carry the taxonomy, the written
content, the domain rules and all the bilingual copy.

| File | Role |
|---|---|
| `taxonomy.json` | 21 disciplines, 176 subgenres, 205 tags, editorial rank |
| `catalogue.json` | Written content: artists, venues, reference shows, photo pool, directory of contributors, commission scale |
| `fixtures.js` | Deterministic generation of the complete dataset, studio → storefront direction |
| `helpers.js` | Accessors, formatting, timestamping, i18n |
| `studio-data.js` | Reshaping into the forms the two control rooms expect |
| `i18n/` | fr/en copy, split by domain + mapping plans |
| `i18n-compile.js` | Compiles the dictionaries into each surface, with an integrity check |

**The expected work**: port these files to typed TypeScript in
`@arthome/core`. Not reinvent them. The rules they carry — the state of a date,
replay window, payout computation, per-role permissions — have been proven
screen by screen.

⚠ **`shared/` is authoritative on the rules and the vocabulary, not on the
shapes.** A fixture generator is optimised to display mockups, not to hold a
model spread across seven contexts. Audit fields, versions, intermediate
states, the real cardinality of relations, nullability, media, seating plans:
all of that is absent from it, and reality will be more complex. **We port the
rules, we reshape the forms.**

Seven points where `shared/` carries data that is wrong, incomplete or
misleading are listed in `corrections-handoff.md`, family D. Two are worth
knowing before opening the file:

- the closed vocabulary of `languageDependency` does not contain `essential`,
  even though that is the value `hasLanguageBarrier` depends on and five shows
  carry it;
- the payout formula (`net = gross − commission − VAT`) **looks** like a proven
  tax rule. It is not one: it produces a plausible number for a mockup. What is
  authoritative is the 12 % commission, the 14-day delay and the withholding
  policy — not the VAT base.

`fixtures.js` has a second life after the port: it remains the **test and
demonstration dataset**. Being deterministic, it produces the same catalogue on
every run — a solid base for integration tests and acceptance environments.

### `mockups/` — visual references to recreate

Five HTML files that show the intent: layout, behaviours, states, exact copy.
**These are not components to port.** Each application recreates them with the
conventions of its own stack.

Fidelity: **high**. Colours, typography, spacing and transitions are final. The
expected rendering is pixel-faithful.

⚠ **In the current layout of this dossier, the mockups do NOT open.** Each one
resolves `helpers.js`, `fixtures.js`, `catalogue.json`, `taxonomy.json` and
`i18n/` **next to its own HTML file** (`new URL(p, document.baseURI)`), whereas
those files are in `shared/`. The import fails and the `try/catch` swallows it:
the mockup renders in a degraded state, without saying why. **`shared/` must be
placed next to the `.dc.html` files** — a copy or a symlink — otherwise the
stage 0 gallery will have no data. To be handled when moving the mockups to
`prototypes/`.

Once `shared/` sits next to them, these files open directly in a browser
(through a local server: ES modules and `fetch` do not like `file://`). They
are destined for
`prototypes/`, published on GitHub Pages (see §3 and §8).

---

## 2. The five surfaces

| Surface | File | Target stack | Particularity |
|---|---|---|---|
| **Storefront Web** | `Storefront Web.dc.html` | Next.js | 1440 px. Search engine visibility and server rendering are decisive: this is a ticketing catalogue |
| **Storefront Mobile** | `Storefront Mobile.dc.html` | React Native | 430 px. Portrait and landscape, five bottom tabs |
| **Storefront TV** | `Storefront TV.dc.html` | react-native-tvos | 1920×1080. **Everything is driven with five keys** — see §6 |
| **Studio** | `Studio.dc.html` | Angular | 1440 px. Control room, moderation, ticketing, payouts |
| **Studio Mobile** | `Studio Mobile.dc.html` | Angular (see §7) | 430 px. On-call tool, portrait and landscape |

The storefront and the studio are **two separate products**. The studio does
not exist on TV: television is a viewer surface, nothing else.

---

## 3. Architecture: multi-repository, microservices, events

The split is deliberately ambitious: **demonstrating a distributed
architecture is one of the project's goals**, not a means. A modular monolith
would be faster to deliver but would not show what there is to show.

### Multi-repository

Three kinds of repository. **"Multi-repository" does not mean "one repository
per service"**: the seven services stay together.

```
arthome-core/              the domain, the contracts, the showcase
├── README.md              system diagram, gallery, 30-second read
├── docs/                  this handover dossier, corrected
├── prototypes/            the five mockups, published on GitHub Pages
├── architecture/          context map, data model, events, ADRs
├── proto/                 event schemas and gRPC services
├── openapi/               one contract per BFF
└── packages/
    ├── core/              @arthome/core — the domain, zero framework dependency
    └── contracts/         @arthome/contracts — boundary DTOs and generated code

arthome-platform/          the seven NestJS services and the infrastructure
├── services/
└── infra/                 docker-compose, Kubernetes, observability

arthome-storefront-web/    Next.js          one repository per application
arthome-storefront-mobile/ React Native
arthome-storefront-tv/     react-native-tvos
arthome-studio-web/        Angular
arthome-studio-mobile/     Angular + Ionic + Capacitor
```

**Two packages, not one.** The domain and the contracts are published
separately on GitHub Packages, because the generated Protobuf code carries a
**runtime** that `@arthome/core` forbids itself. Mixing them would contaminate
the domain and break the rule that gives it all its value.

**Why the services stay together.** That is what still gives meaning to the
task cache and to "running only the services touched": with seven
repositories, both mechanisms would collapse, and one person alone would pay
for seven CI pipelines for a single system.

Package manager: **pnpm**. Minimal tooling — pnpm workspaces inside
`arthome-core` and `arthome-platform`, turborepo only for the task cache. **No
Nx**: its generators, executors and migrations become a project inside the
project.

> The Metro/pnpm friction documented in the original version of this document
> — poorly supported symlinks, a conflict between `react-native-tvos` and the
> other Expo projects in the same workspace — **disappears with the
> multi-repository layout**: each mobile application has its own repository,
> its own `node_modules` and its own lockfile. The `.npmrc`
> `node-linker=hoisted` no longer has any purpose.

### `@arthome/core` — the domain

```
arthome-core/packages/core/src/
├── taxonomy/      disciplines, genres, tags, editorial rank
├── catalog/
├── fixtures/      deterministic dataset (tests and demonstration)
├── i18n/          fr/en keys + compilation
└── domain/
    ├── booking/       state of a date, outcomes, capacity, seat code
    ├── replay/        replay window, hours remaining
    ├── payout/        commission, VAT, net payable, withholding
    ├── permissions/   per-role rights, invitations
    └── timezone/      venue time versus viewer time
```

**Strict rule: zero framework dependency.** No React, no Angular, no Nest, no
browser API, no Node-specific code in the business rules. The package must work
under Node, Next, Metro, `react-native-tvos` and Angular. Sophistication goes
into the domain, never into the `package.json`.

> **Corrected on 21 September 2026.** This list named NativeScript, although §7
> rules it out. The decision changed while this document was being written and
> only §7 received it — the same pattern as the corrections listed in the note
> at the top, occurring a second time inside the same document.

That is what makes the story readable at a glance: **the domain belongs to
Arthome, not to the frameworks.** React, Angular and NestJS are only consumers
of it.

This project demonstrated it during design: **most of the defects corrected
were values composed in two places** — a seat code, an audience counter, a
state label, an order total. If a value appears on two screens, it comes from
`@arthome/core`. Without exception.

### The services

Seven services, split by **business context** and not by entity. A separate
`artist-service` and `venue-service` would be exactly the misreading to
avoid: they belong to the same context.

```
identity        accounts, sessions, roles
catalog         artists, shows, venues, dates — a single context
ticketing       seats, orders, payments, outcomes
streaming       broadcast sessions, keys, incidents, playback tokens
chat            messages, moderation, modes
payouts         commission, VAT, payouts, treasury
notifications   alerts, reminders, emails
```

⚠ **Three families of data have, to this day, no owning context** — they exist
in `shared/`, are displayed on several surfaces, and fit into none of the seven
contexts above:

- **subscriptions** (`plans`: free, pass, premium, with their `opens[]` rights
  and the `seatDiscount` discount), which **govern access to playback**;
- the **shop** (`merch`: stock, sales, state, and shipping costs in the web
  storefront's basket);
- the **directory of contributors** (`people`, including freelancers working
  across several channels) and the **channels** (`channels`, one per artist,
  with their members and the `grants` table that says who may invite whom) —
  straddling `identity` and `catalog`.

To be attached or isolated in `architecture/context-map.md`. One more service
is paid for in operations, for a single person.

### No synchronous call between services

Kafka is the **only** inter-service channel. If a synchronous call exists, it
can only go **from the BFF to a service** — that is entry traffic. **Never
between services**, whatever the transport (HTTP, gRPC, Nest TCP).

### Events

**Kafka** as the backbone, with the practices that make the split credible
rather than recited:

- **Versioned event schemas** — **Protobuf**, tooled with `buf`
  (`buf lint`, `buf breaking`), with a Schema Registry. The choice between Avro
  and Protobuf is settled: it is Protobuf. The consequence to hold to: an event
  decoded from Kafka is **never** revalidated by zod — the registry is
  authoritative. That is the real technical signal, far more than the number of
  services.
- **Outbox pattern** for consistency between the database write and
  publication: the business write and the outbox row in the **same
  transaction**, published by Debezium. Never a Kafka send from application code
  after a commit.
- **Idempotent consumers**, with a deduplication key.
- **Kafka Connect with Debezium** for PostgreSQL change capture and
  synchronisation to the search index. That is where it earns its place — not
  as a mere pipe between two services.
- **Two distinct dead-letter mechanisms**, not to be conflated: Kafka Connect's
  native DLQ (`errors.deadletterqueue.topic.name`) for connector failures, and
  a consumer-specific pattern — a retry topic with increasing delay, then a
  dead-letter topic — for business failures.

### Infrastructure

| Component | Role |
|---|---|
| **PostgreSQL 18** | one database per service. ORM **TypeORM ^1.1** — object syntax only for `relations`/`select`. Identifiers in **UUIDv7** (native `uuidv7()`) |
| **Kafka + Kafka Connect** | event log, Debezium CDC, DLQ |
| **Redis** | **four separate uses** — see below |
| **OpenSearch** | catalogue search and facets |
| **MinIO** | S3-compatible object storage — recordings, replays |
| **Observability** | simple for now. **`traceparent` (W3C) propagated from the very first producer**, over HTTP **and** over Kafka. Full OpenTelemetry later |

**The four uses of Redis, never to be confused:**

```
sessions              at the BFF ONLY — no service reads the store
cache                 per service, never shared between services
Socket.IO adapter     broadcast to connected clients
BullMQ                jobs INTERNAL to a service, never between two services
```

The last rule is the easiest to break: BullMQ between two services would
reopen through the back door the synchronous coupling that Kafka exists to
forbid.

**Validation: zod, everywhere.** Configuration, DTOs, form input, server side
as well as client side. Split by nature and not by layer: the domain invariants
stay pure TypeScript in `@arthome/core`; the shared base schemas (Money,
ShowId, Locale) live in `core` as zod; the boundary DTOs live in
`@arthome/contracts`; configuration is validated at startup **in each
service**, never by a centralised env schema.
zod thereby becomes a runtime dependency shared by seven services and five
applications: `peerDependency`, pinned version, and a major bump treated as a
contract change.

**Why OpenSearch** rather than Elasticsearch: Apache 2.0 licence, genuinely
free, and Kafka Connect's Elasticsearch *sink* connector works as is —
decisive since the synchronisation goes through Connect. Its aggregation model
fits the taxonomy: facets over 21 disciplines, 176 genres, 205 tags, plus city,
date, price and availability. **Remember the `french` analyser** (elisions,
stems), without which "l'opéra" and "opéra" will not find each other.

Meilisearch would be better in search quality per hour invested, but has no
official Kafka Connect connector.

**Propagating `traceparent` from the very first producer.** Observability
tooling can be deferred; **propagation** cannot. An event published without
`traceparent` is orphaned for good — you do not reattach it after the fact.
OpenTelemetry will come later, and it will come far cheaper if `traceparent` is
already circulating. The complete trace
`POST /tickets → ticketing → payment → payout computation → database` impresses
a reader more than a folder of Kubernetes manifests.

### Entry topology, and the two BFFs

Nothing in the original version of this document connected the applications to
the services. Two components were missing:

- an **infrastructure gateway** (Traefik, Envoy) for TLS, routing and rate
  limits. Routing is infrastructure work; rewriting it in code would mean
  redoing, less well, what a standard reverse proxy does in configuration.
  **Ruled out in advance**: a NestJS application gateway that would do nothing
  but re-dispatch;
- **one BFF per product** (storefront, studio). It keeps only what is business:
  composing the responses, adapting per surface, and **exchanging the session
  for a short-lived signed token**. It is this mechanism that ensures no service
  ever calls the identity service or reads the session store — the token is
  verified via JWKS, locally.

The use of gRPC is decided **on evidence**: count, from each surface's needs,
how many synchronous BFF → service calls are really necessary. On reads, often
none — if the read models are projected where the BFF reads them. On writes,
often yes: "buying a seat" demands an immediate response. A handful of commands
calls for HTTP/JSON described in OpenAPI; many calls, or schemas already in
Protobuf, call for gRPC.
→ `architecture/context-map.md`.

### Authentication

Absent from the original version of this document. The real needs: 2FA,
password reset, **signing in on a television**, social sign-in (Google,
Facebook) and by email — across five surfaces, two of which have no usable
keyboard.

The decisive point: **on a television, the magic link is the wrong tool**. The
standard is the **OAuth device flow (RFC 8628)** — a short code displayed on
the screen, typed on the phone. It is, moreover, the mechanism the TV mockup
already uses for four distinct journeys: signing in, buying a seat, subscribing
and buying merch. **A single primitive**, not four.
→ `architecture/adr-auth.md`.

### Payment and payouts

The original version described `ticketing` as carrying "seats, orders,
payments" and not a word more — whereas `shared/catalogue.json` already fixes
the commission (**12 %**) and the payout delay (**14 days**).

The canonical case is **Stripe Connect**: the platform collects on behalf of
artists, takes a commission, pays out. Handled in **test mode**, free and with
no real money. The split: `ticketing` collects, `payouts` computes the
entitlement, and **Stripe remains the source of truth for the movement of
money** — we never rebuild its ledger, we **reconcile**. PCI scope avoided
(Checkout or Elements, no card number passes through). One port in the domain
and two adapters: a **fake one by default**, so that the public demonstration
and the tests run without a key or a network, and a **Stripe one in test mode**.
→ `architecture/adr-payments.md`.

### Internationalisation: a label catalogue served dynamically

`i18n-compile.js` compiles the dictionaries into each surface at build time.
That remains true, but is no longer enough: fixing a typo on mobile or on TV
would mean waiting for a store review.

The model chosen: `core` keeps the **keys** and the reference catalogue, a
service serves the **updates on top**, reads go through **immutable versioned
artefacts** on a CDN (`/i18n/<locale>/v<N>.json`) and not through a call on
every page, and each application embeds a **build-time snapshot** as a
mandatory fallback — never a raw code displayed if the service is unavailable.
The keys are typed from `core`, the catalogue is **additive**, with ICU
validation at publication and systematic escaping: a translation is an
injection vector.

**i18n by codes**: the API returns codes and their parameters, never sentences
— error envelope included. A zod validation failure is translated into a
**code**, never into zod's English message, otherwise i18n leaks at the very
first form error. Dates, amounts and plurals are formatted client-side with
`Intl`.

**Amounts**: one canonical unit (integer cents + currency code) in the database
and in the contracts. The rounding rule is domain and lives in
`@arthome/core`; formatting is presentation. Never a formatted string stored or
transported, except inside a document (an invoice).

### Video broadcasting

See `streaming.md`, in this dossier. In summary: control plane in NestJS, media
plane delegated (MediaMTX in development and in demonstration, managed provider
in production), behind ports. Three points where the domain touches the
infrastructure are dealt with there: signed playback at the CDN edge, the
standby screen as a client-side overlay, the replay window owned by the domain.

## 4. Design tokens

Two distinct palettes, deliberately so: the storefront is warm and editorial,
the studio is a working tool.

### Storefront (web, mobile, TV)

```
Background    #0B0A09
Panels        #100F0D  #17140F  #1A1815
Surfaces      #1F1C19  #221F1B  #262320
Borders       #2E2A24  #332E28  #4A423A  #575047
Ink           #EDE7DC (primary)  #C9C0B2  #9B948A  #857E73  #8B857C  #6B6459
LIVE          oklch(0.62 0.21 27)   the on-air red — never decorative
ACCENT        oklch(0.78 0.13 42)   amber for reminders and replays
GOLD          oklch(0.9 0.07 84)    seats held, scarcity
OK            oklch(0.7 0.13 150)   confirmations
```

### Studio

```
Background    #0E0F10
Panels        #15171A  #111316
Borders       #23272C  #2A2F35  #1D2126
Ink           #E6E9EC (primary)  #C6CDD4  #98A0A8  #8B949E  #6E7681  #5B636B  #4A535C
OK            oklch(0.72 0.14 155)
WARN          oklch(0.78 0.13 75)
LIVE          oklch(0.7 0.19 27)
INFO          oklch(0.72 0.11 235)
MUTE          oklch(0.75 0.12 300)
```

**The red rule**: `LIVE` is only ever used for on-air. A promotion is never
red. An on-air badge is displayed only if there actually is a live broadcast —
never "0 LIVE".

### Typography

- **Instrument Serif** — show titles, artist names, editorial hooks. The Arthome signature.
- **Archivo** — body text, buttons, descriptions.
- **JetBrains Mono** — times, durations, prices, counters, codes, section labels.

### Shapes

4 px radius on cards and buttons, circles for avatars. State badges: 1 px
border in the state's colour, text in the same colour, background veiled at
14 % via `color-mix(in oklch, <colour> 14%, transparent)`.

### Size floors

| Surface | Minimum |
|---|---|
| Storefront web / studio | 12 px, mono 9 px for section labels |
| Mobile | touch targets 44 px minimum |
| **TV** | **18 px absolute**, body text 26 px, card title 26→30 px, button 24 px |

---

## 5. Design principles not to be lost

They were expensive to establish. Reintroducing them would be a regression.

1. **A single source of truth.** Every display derives from the data, never
   from a parallel literal. No counter, no badge, no code written by hand.
2. **The on-air red is only ever used for on-air.**
3. **A seat held opens the show.** Never offer "get my seat" to someone who
   already has one. The preview lock applies only to non-holders.
4. **Outcome states take precedence over everything else**: cancelled and
   refunded, postponed with valid seats, interrupted with credit notes. In red,
   with the explanation in plain words and what the viewer must do about it.
5. **The replay policy is readable before purchase** — it is what justifies the
   price difference.
6. **Never a mute spinner.** An incident always says whether the problem comes
   from the viewer or from the venue.
7. **Loading skeletons**, never a blank page.
8. **Explicit empty states**, with an action that gets out of the dead end.
9. **Two time zones**: the viewer's time first, the venue's time second when
   they differ.
10. **Inert actions are forbidden.** An interface state always responds. The
    only things that stay inert are calls to an external service.

---

## 6. The TV storefront — the subject apart

`storefront-tv.md` (in this dossier) contains the full specification. The
essentials:

**Everything is driven with five keys.** That is what separates a real TV
application from a website displayed large.

- One and only one focused element, always visible without scrolling
- Movement on a cross, to the nearest geometric neighbour on the requested axis
- Three simultaneous focus signals: scale 1.08 · 3 px ring + drop shadow ·
  revealing the title and the metadata
- **Focus memory**: returning to a page finds the card you left
- `:hover` does not exist. Everything the web does on hover is done on focus
- No input beyond six characters: QR code to the phone
- Colour keys: red chat · green subtitles · yellow quality · blue information
- The player is a page, not a modal. On TV, a modal **is** a page
- Safe area: nothing useful outside a 60 px frame on all four edges

The mockup's focus engine is functional and documented in the file. That is the
part to study closely before writing the `react-native-tvos` version.

---

## 7. The mobile studio

**Angular + Ionic + Capacitor.** NativeScript is ruled out: investing in a
sixth toolchain to demonstrate a sixth framework, when Next, React Native,
Angular and Nest already establish the technical signal, has a poor return.

Capacitor provides the native wrapper, Ionic the shell — navigation, gestures,
transitions. The `Studio Mobile.dc.html` mockup already handles portrait and
landscape.

**Impose the Arthome tokens through Ionic's CSS variables.** Without that, its
default theme will override the visual identity, and the mobile studio will no
longer look like the web studio. Ionic provides the mechanics, not the
appearance.

---

## 8. Order of work — deliver in presentable stages

The main risk is not technical: it is spending six months with nothing
publishable. Each stage must stand on its own.

**Stage 0 — the showcase, before a single line of application code**
`arthome-core`: its README with the system diagram, this handover dossier under
`docs/`, the first ADRs, and the five mockups published on GitHub Pages as a
clickable gallery. An afternoon's work for a living demonstration — including a
TV interface driveable by remote control. **The best signal-to-time ratio
available today.**

Two clarifications added since: the mockups must be **split by screen** before
they can be used by an agent — the current files run to 560 KB, far more than a
context pack can carry. And `corrections-handoff.md` serves as the shopping
list for finishing the alignment of this dossier.

**Stage 1 — the domain**
`@arthome/core`: port to typed TypeScript, tests on the rules that hurt (time
zones, replay expiry, permissions, VAT and rounding, payouts, seat codes, state
transitions), CI. **We port the rules, we reshape the forms** — see family D of
`corrections-handoff.md`, which lists the seven points where `shared/` must be
corrected along the way.

**Stage 2 — the distributed foundation**
A complete `docker-compose`: PostgreSQL, Kafka, Kafka Connect with Debezium,
Redis, OpenSearch, MinIO. Two services only — `identity` and `catalog` — but
the event path end to end: outbox inside the transaction, versioned Protobuf
schema, CDC to the index, and `traceparent` propagated from the HTTP request
all the way to indexing.

This is the stage that costs the most and proves the most. Once it is behind
you, every following service is fast.

**Stage 3 — one product end to end**
`ticketing`, then `storefront-web` in Next.js. One deployment, one living link.
The complete use case: buying a seat, from the storefront through to the payout.

**Stage 4 — the architecture demonstration**
`studio-web` in Angular, consuming the same `@arthome/core`. Two heterogeneous
stacks, a single domain. This is the stage that sets this project apart.

**Stage 5 — broadcasting**
`streaming` and `chat`, MediaMTX in docker-compose, the interactive
demonstration mode with WHIP publishing from the browser. See `streaming.md`.

**Stage 6 — Kubernetes, then mobile if the appetite holds**
The surfaces that are not developed are not a gap: the stage 0 mockups show the
design work without committing months of development.

## 9. What signals quality to a recruiter

To be treated as deliverables, not as decoration.

- **A demonstration reachable in under thirty seconds** — screenshots, a living
  link, a product understood at a glance.
- **A readable architecture diagram**, with the dependencies *and their reasons*.
- **Short ADRs** on the debatable choices: why React on the public side and
  Angular on the studio side, why multi-repository, why a shared domain, why the
  TV is an interface apart, why no synchronous call between services, and the
  authentication choice.
- **One use case followed vertically** — buying a seat: storefront → API
  contract → ticketing domain → seat code → payment → commission and VAT →
  artist payout → database → studio. With the corresponding tests.
- **A "what I deliberately did not build" section**, with the trade-offs owned.
  That is what most clearly distinguishes a senior profile.

---

## 10. Other documents in this dossier

- `PROMPT.md` — the texts to paste into the first Claude Code sessions
- `streaming.md` — media plane, protocols, providers, demonstration mode
- `storefront-tv.md` — the complete TV specification
- `taxonomy.md` — the reasoning behind the split of disciplines and genres
