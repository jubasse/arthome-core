# Corrections to the handoff folder

> **Eighty-two discrepancies** found in `arthome-design/design_handoff_arthome/` over the course
> of the "interface contracts, backend architecture, authentication" session (21 September 2026):
> **27 in phase 0**, by the lead, reading the folder against the decisions already taken;
> **52 at time 1**, by the five surface specialists, reading their mockup against `shared/`;
> **3 more** during the English translation of the imported copy, the same day.
>
> **Status of the corrections.**
>
> | Family | Nature | Treatment |
> |---|---|---|
> | **A** (7) | the folder contradicts a decision taken since it was written | **corrected** in the folder |
> | **B** (4) | the folder contradicts itself | **corrected** in the folder |
> | **C** (9) | the folder is silent where the contract must decide | section added or cross-reference placed |
> | **D** (7) | `shared/` carries data that is wrong, incomplete or misleading | to be corrected **at the port** |
> | **E** (15) | discrepancies found by the surface specialists at time 1 | to be corrected **at the port** |
> | **F** (3) | found by translating the imported copy into English | **corrected** in `docs/` |
>
> Families A, B and C were corrected in the folder's documents on the project owner's decision; the
> originals are kept beside them as `*.pre-corrections.md`.
> Families **D** and **E** bear on `shared/` and on the mockups, which remain **read only**: they
> constitute the shopping list for the `@arthome/core` port (stage 1), and the material the time 2
> agents must have read. None of these discrepancies should be discovered a second time.

---

## How to read this document

Four families, by the nature of the discrepancy:

| Family | Nature | Treatment |
|---|---|---|
| **A** | The folder contradicts a decision already taken since it was written | corrected in the folder |
| **B** | The folder contradicts itself | corrected in the folder |
| **C** | The folder is silent where the contract must decide | section added or cross-reference placed |
| **D** | `shared/` carries data that is wrong, incomplete or misleading | to be corrected at the port |

A family **D** discrepancy deserves particular attention: `shared/` is authoritative on
**vocabulary and rules**, not on **shapes**. Several entries below are shapes that *look like*
tested rules. Copying them across would carve a mockup convenience into the contract.

---

## A — The folder contradicts a decision already taken

### A1 — Monorepo versus multiple repositories

**Where**: `README.md` §3 in full (title, tree, "Monorepo" paragraph), §8 stage 0;
`PROMPT.md` stage 0 point 1 and ADR-002.

**The discrepancy**: the folder describes a single `arthome/` repository carrying `docs/`,
`prototypes/`, `packages/`, `services/`, `apps/`, `infra/`. The project has moved to **multiple
repositories** since.

**The correction, and the precision that was missing.** "Multiple repositories" does **not** mean
"one repository per service". The chosen shape is:

- `arthome-core` — the showcase, the domain (`@arthome/core`), the contracts
  (`@arthome/contracts`), the art direction, the ADRs;
- `arthome-platform` — **the seven services together**, plus the infrastructure;
- then **one repository per application** (storefront web, storefront mobile, storefront TV, studio
  web, studio mobile).

This precision is not cosmetic: it is because the seven services stay in a single repository that
the turbo cache and the "run only the touched service" of `definition-of-done.md` keep any meaning.
With seven repositories, both devices would collapse.

### A2 — `packages/core` versus two packages in `arthome-core`

**Where**: `README.md` §3, subsection "`@arthome/core` — the domain" and the tree.

**The discrepancy**: the folder puts the domain in the monorepo's `packages/core` and envisages
only **one** package.

**The correction**: the domain lives in the `arthome-core` repository, and there are **two**
separately published packages:

- `@arthome/core` — the domain, **zero framework dependencies**, ported from `shared/`;
- `@arthome/contracts` — the boundary DTOs and the generated code.

The separation is imposed, not aesthetic: generated Protobuf code ships a **runtime**, and the
domain forbids itself any runtime dependency. Mixing them would contaminate `@arthome/core` and
break the very rule that makes the package worth having.

### A3 — "Avro or Protobuf" versus Protobuf alone

**Where**: `README.md` §3, subsection "Events", first bullet; `PROMPT.md` stage 2 point 3.

**The discrepancy**: the folder leaves the choice open between Avro and Protobuf.

**The correction**: **Protobuf alone**, tooled with `buf` (`buf lint`, `buf breaking`), with a
schema registry owning the format. The choice is no longer open — and it has a consequence for the
contracts: an event decoded from Kafka is **never** revalidated by zod, the registry being
authoritative.

### A4 — Full OpenTelemetry versus simple observability

**Where**: `README.md` §3, "Infrastructure" table (the "OpenTelemetry + Grafana … from the first
service" row) and the paragraph "Distributed tracing from the first service";
`PROMPT.md` stage 2 points 1 and 3.

**The discrepancy**: the folder requires a full OpenTelemetry chain from the first service.

**The correction**: **simple observability** for now. What *is* required from the first producer, on
the other hand, is non-negotiable: **`traceparent` (W3C) propagated**, in HTTP headers **and** in
Kafka headers. Full OpenTelemetry comes later, and it will come far cheaper if `traceparent` is
already circulating.

The nuance matters: the tooling can be deferred, the **propagation** cannot. An event published
without `traceparent` is orphaned for good.

### A5 — `node-linker=hoisted` has become moot

**Where**: `README.md` §3, paragraph "The known friction point"; `PROMPT.md` stage 0 point 2.

**The discrepancy**: the folder prescribes an `.npmrc` with `node-linker=hoisted` per mobile
workspace, to work around Metro's poor support for pnpm's symbolic links.

**The correction**: with multiple repositories, each mobile application has **its own repository,
its own `node_modules` and its own lockfile**. The Metro/pnpm friction disappears along with the
shared workspace that caused it, as does the documented conflict between `react-native-tvos` and
the other Expo projects of a single workspace. The paragraph is deleted.

### A6 — "Why a modular monolith first"

**Where**: `README.md` §9, third bullet.

**The discrepancy**: §9 proposes writing an ADR "why a modular monolith first", in head-on
contradiction with §3 ("demonstrating a distributed architecture is a goal of the project"), §4
(seven services) and the whole of stage 2.

**The correction**: the bullet is deleted. No modular monolith is planned at any point.

### A7 — "Why multiple repositories" in a document that prescribes a monorepo

**Where**: `README.md` §9, third bullet (the same list as in A6).

**The discrepancy**: §9 calls for an ADR "why multiple repositories" while §3 of the **same
document** prescribes a monorepo, and `PROMPT.md` names its ADR-002 "Monorepo".

**The correction**: §9 is the one that is right — it carries the trace of an arbitration handed down
while the document was being written, which §3 never received. §3 is aligned on §9, not the other
way round.

This discrepancy is the most instructive of the lot: it shows that a long document desynchronises
from itself the moment a decision changes, and that it is its **late sections** that carry the most
recent state.

---

## B — The folder contradicts itself

### B1 — "The nine disciplines" when there are twenty-one

**Where**: `Prompt - Storefront TV.md` (imported here as `docs/storefront-tv.md`), "Screen by
screen" §8, entry **Categories**.

**The discrepancy**: "the nine disciplines as typographic tiles". The real count is **21**
(`taxonomy.json`: 14 in the Music universe, 7 in the Stage universe), confirmed by `README.md` §3
("facets over 21 disciplines, 176 genres, 205 tags") and by `Taxonomie - projet.md`
(`docs/taxonomy.md`).

**The correction**: the TV's Categories page is designed for **21 disciplines**, grouped by the two
universes (Music, Stage) that exist precisely to give a long list structure. If a shorter editorial
selection is wanted at the top of the page, it must be written as a rule — an editorial rank already
exists in `taxonomy.json` (`rank`, from the most popular to the most specialist) and no surface has
the right to recompute it.

**Why it matters for the contracts**: nine tiles fit on a television screen, twenty-one do not. That
is a layout constraint that travels all the way up to the read model served to the TV — and
therefore to the contract.

### B2 — Wrong discipline vocabulary at the head of the TV brief

**Where**: `Prompt - Storefront TV.md` (`docs/storefront-tv.md`), first paragraph.

**The discrepancy**: "theatre, dance, **ballet**, **concerts**, comedy, classical, opera, jazz,
circus". `ballet` (precisely `ballet classique`) is a **subgenre** of the Dance discipline;
`concerts` is not a discipline but a format.

**The correction**: the sentence uses `taxonomy.json`'s vocabulary. This is exactly the slippage
`Taxonomie - projet.md` (`docs/taxonomy.md`) sets out to prevent — a discipline is a **form**,
never a format nor a
period.

### B3 — Redis's uses, incomplete

**Where**: `README.md` §3, "Infrastructure" table, Redis row: "cache, sessions, WebSocket fan-out
(Socket.IO pub/sub)".

**The discrepancy**: **BullMQ** is missing, and above all the constraint that bears on sessions.

**The correction**: four **separate** uses, and two rules:

- **sessions** — at the BFF **only**. No service reads the session store;
- **cache** — per service, never shared between services;
- **Socket.IO adapter** — fan-out to connected clients;
- **BullMQ** — jobs **internal to one service**, never a channel between two services.

The rule that was missing most is the last one: BullMQ between two services would reopen through the
back door the synchronous coupling Kafka exists to forbid.

### B4 — The mockups cannot load `shared/` — and the folder promises the opposite

**Where**: the folder's layout (`mockups/` and `shared/` side by side) against `README.md` §1,
subsection `mockups/`: "These files open directly in a browser".

**The discrepancy**: each of the five mockups carries its own `loadArthome()` method, which resolves
its dependencies **relative to its own HTML file**:

```js
const at = (p) => new URL(p, document.baseURI).href;
const [helpers, fixtures] = await Promise.all([
  import(at('helpers.js')), import(at('fixtures.js'))
]);
const [catalogue, taxonomy, index] = await Promise.all([
  get('catalogue.json'), get('taxonomy.json'), get('i18n/index.json')
]);
```

So it looks for `helpers.js`, `fixtures.js`, `catalogue.json`, `taxonomy.json` and `i18n/` inside
`mockups/`. But `mockups/` holds only the five `.dc.html` files and `support.js`: those files are in
`shared/`. The import fails, and the `try { … }` swallows it — the mockup renders in a **degraded
state, without saying why**.

**The correction**: `shared/` must be placed **beside the `.dc.html` files**, by copy or symbolic
link. The README has been corrected to say so, and to add that a local server is required (ES
modules and `fetch` do not work under `file://`).

**Why this is blocking at stage 0**: the GitHub Pages gallery is stage 0's deliverable and its best
signal-to-time ratio. Published as is, it would show five empty interfaces. This is a **packaging**
discrepancy, not a design one — but it would ruin the demonstration.

**Consequence for this session**: the five surface specialists **cannot open the mockups in a
browser** to observe their states. They read the source, which the mission asks of them anyway — so
nothing is blocked here.

---

## C — The folder is silent where the contract must decide

These nine points are not errors: they are **silences**. The folder was written to frame an
interface design, not a distributed contract. Each is now flagged in the folder by a cross-reference
to the document that will handle it.

### C1 — No authentication

The word appears **nowhere** in the four documents. Yet we need: 2FA, password reset, **sign-in on a
television**, social sign-in (Google, Facebook) and by email, across five surfaces, two of them with
no usable keyboard.
→ `architecture/adr-auth.md`.

### C2 — No BFF, no entry topology

The folder goes from the applications to the services with nothing in between. Missing: the
infrastructure gateway (TLS, routing, rate limiting), **one BFF per product**, and the exchange of
the session for a short-lived signed token — that is, the mechanism by which no service ever calls
the identity service.
→ `architecture/context-map.md`, entry topology section.

### C3 — No payments

`README.md` §3 describes `ticketing` as carrying "seats, orders, payments, outcomes" and leaves it
there. Nothing on the provider, the PCI scope, webhook handling, reconciliation, or the split of
responsibilities with `payouts`.

The silence is all the more notable in that `shared/catalogue.json` **already** fixes the commercial
parameters: `commissionRate: 0.12`, `payoutDelayDays: 14`, and three billing markets with their VAT
rates.
→ `architecture/adr-payments.md`.

### C4 — No ORM, no validation library

Two structuring decisions, absent: **TypeORM ^1.1** (the `relations`/`select` string-array syntax
disappeared in 1.0 — object syntax only) and **zod 4** as the single validation tool, from
configuration to boundary DTO.

zod deserves an explicit mention in the folder because it becomes a **runtime dependency shared by
seven services and five applications**: `peerDependency`, version pinned in `VERSIONS.md`, and a
major bump treated as a contract change.
→ `architecture/definition-of-done.md` and `architecture/critical-rules.md`.

### C5 — No identifier policy

**UUIDv7**, provided natively by PostgreSQL 18's `uuidv7()`. Still to settle: **where** it is
generated (database default, or domain — often preferable with the outbox, since the aggregate knows
its identifier before insertion), and the fact that **a UUIDv7 reveals its creation date**, which is
debatable for a user identifier exposed in a URL.
→ `architecture/data-model.md`.

### C6 — Dynamic i18n: an unwritten change of model

The folder treats copy as **compiled at build time** (`i18n-compile.js`, "compiles the dictionaries
into each surface, with an integrity check"). The decision taken since adds a **dynamically served
label catalogue**, so a typo can be fixed without waiting for a store review on mobile and TV.

That is a change of model, not a detail: `core` keeps the keys and the reference catalogue, a
service serves updates on top, reads go through immutable versioned artefacts on a CDN, and every
application embeds a **build-time snapshot** as a mandatory fallback — never a raw code displayed if
the service is unavailable.
→ `architecture/context-map.md` (the owning context is still to be settled) and `data-model.md`.

### C7 — Subscriptions have no owning context

`shared/catalogue.json` declares three plans (`free`, `pass`, `premium`) with their entitlements
(`opens[]`: `replays`, `one-live-month`, `all-lives`, `multi-screen`, `archive`, `no-ads`) and a
discount on seats (`seatDiscount`). They are displayed on the web storefront, on mobile and on TV,
and they **gate access to playback**.

None of the seven announced contexts owns them.
→ to be settled in `architecture/context-map.md`.

### C8 — The store has no owning context

`merch` carries stock, sales, a state (`on-sale`, `out-of-stock`), and the web storefront's cart
handles **shipping costs**. Same observation as C7: present everywhere, owned by nobody.
→ to be settled in `architecture/context-map.md`.

### C9 — The people directory and the channels

Two notions central to the studio, absent from the context map:

- **`people`** — a directory of contributors, including freelancers who work across several
  channels, with their real activity (`channels[]`, `runsCalled`);
- **`channels`** — one channel per artist, the studio's unit of work, with its members, their roles
  and the `grants` table that says **who may invite whom**.

Both notions straddle `identity` (people, roles, rights) and `catalog` (the artist, their shows,
their dates). The boundary must be drawn explicitly.
→ `architecture/context-map.md`.

---

## D — `shared/`: the shopping list for the port

**Not corrected in this session.** `shared/` is read only: it is the source the five surface
specialists are going to read. These seven points are to be handled at the **`@arthome/core` port**
(stage 1), and to be taken into account right now in the design of the contracts.

### D1 — `languageDependency`: the closed vocabulary is wrong

`shared/taxonomy.json` declares three values: `none | light | helpful`.

Yet the value **`essential`** — absent from the vocabulary — is used everywhere:

- `shared/catalogue.json`: five shows carry it;
- `shared/fixtures.js:458-462`: it is assigned by discipline (`theatre`, `comedy`, `rap`,
  `chanson`);
- `shared/i18n/storefront.json:1472`: the key `enums.languageDependency.essential` exists and is
  translated;
- `shared/helpers.js:437`: `hasLanguageBarrier` **makes it its test** —
  `languageDependency(show) === 'essential'`.

Conversely, `light` is used nowhere in the project.

**The real vocabulary is `none | helpful | essential`.** A closed vocabulary that does not contain
the value the surface's most visible rule depends on is not a closed vocabulary. To be corrected in
`taxonomy.json` at the port, and written that way in the contract.

### D2 — Two vocabularies for a publication's state

Two tables describe the same state machine, with different names:

| `shared/catalogue.json` (`publicationStates`) | `mockups/Studio.dc.html` (`EV_MOVES`) |
|---|---|
| `draft` | `draft` |
| `reserve` | `hidden` |
| `scheduled` | `sched` |
| `technical` | `tech` |
| `live` | `live` |
| `ended` | `done` |
| `replay-online` | `replay` |

So the studio mockup keeps a **parallel table**, and rejoins the shared vocabulary in exactly one
place (`Studio.dc.html:2798`, via `A.enumLabel('publicationState', …)`).

That is precisely what the folder's principle no. 1 forbids — "every display derives from the data,
never from a parallel literal" — and it is also the demonstration of its cost: two teams reading two
tables will write two contracts.

**The contract must fix a single set of names.** `catalogue.json`'s is authoritative: it is explicit
(`replay-online` says what `replay` does not — the replay is **on sale**), and it is the one the
i18n carries (`enums.publicationState.*`).

### D3 — Time zones are frozen as fixed offsets

`shared/catalogue.json` stores `venue.utcOffsetMin` — a frozen offset — and `helpers.js` derives the
summer or winter abbreviation from it by comparing that offset against the zone table's.

The **rule** is right and must be ported as is: the viewer's time first, the venue's time second
when it differs. The **shape** is a mockup convenience: a fixed offset does not survive a clock
change, and a date scheduled six months out will be displayed at the wrong time.

**In the contract**: an **IANA** zone identifier (`Europe/Paris`) and a **UTC instant**. The offset
is derived, it is not stored.

### D4 — Only one billing market actually exercised

`shared/catalogue.json` declares three markets: `eur` (VAT 5.5 %), `chf` (2.6 %), `cad` (14.975 %) —
the last marked `live: false`.

But `shared/fixtures.js:498` takes `billingMarkets[0]` for **every** date, and `fixtures.js:1300`
takes `billingMarkets[0].vatRate` for **every** payout. Multi-currency and multi-VAT are declared in
the data and **never exercised** by the generator.

Consequence for the contracts: no screen has ever displayed two currencies, no rule has ever been
exercised on two rates. What `shared/` carries here is an **intention**, not a tested rule. The
contract must decide whether to honour it — amount in canonical unit + currency code, which is
already the decision — and `adr-payments.md` must say what becomes of a cross-border payout.

### D5 — The payout formula is not a tax rule

`shared/fixtures.js:1297-1324` computes:

```
commission = round(gross × 0.12)
vat        = round(gross × vatRate)
net        = gross − commission − vat
```

So VAT is applied to the **gross ticketing amount**, and deducted from the artist's net.

**What `shared/` does not settle**: who owes the VAT, on what base — the ticket or the platform's
commission — and who is liable, the platform or the artist. Those are three distinct questions, and
the formula above answers none of them: it produces a plausible number for a mockup.

**This is the costliest "shape versus rule" trap in the folder.** The calculation *looks like* a
domain rule tested screen by screen — it has the position, the tone and the to-the-euro precision.
It is not one. `adr-payments.md` must research it from the applicable law and the Stripe Connect
model, **without assuming the fixture is authoritative**.

What *is* authoritative and must be ported: the commission is **12 %**, the payout delay **14 days**,
rounding is **to the unit** on each component taken separately, and a payout is **held** (`held`) as
long as an outcome is open — postponed or interrupted — and **refunded** (`refunded`) if the date is
cancelled.

### D6 — Two levels of sanction, unconnected

Moderation exists at two scales, with two vocabularies and two possible owners:

- **on the message** — `catalogue.json.messageStates`: `ok`, `removed`, `muted`, `banned`;
- **on the person, within a channel** — `fixtures.js` `audience[].state`: `ok`, `muted`, `banned`,
  with its history (`datesAttended`, `messages`, `firstSeenDaysAgo`).

Nothing says how the two compose, nor which prevails. `studio-data.js` in fact reduces the whole
thing to two states for the control room (`ok` / `held`), which is a third scale.

To be settled: the message belongs to `chat`, but does a person banned from a channel fall under
`chat` or under `identity`? A single badge is displayed on screen; there can be only one owner of
the truth.

### D7 — Offsets in minutes are a mockup convenience

`shared/catalogue.json` says so itself (`time.note`): *"startOffsetMin, atMin and
rescheduledToOffsetMin are offsets from the moment the app is opened: negative means already
started. **Nothing here expires.**"*

That is an excellent choice for a mockup — every state exists at any hour, and the five surfaces see
the same thing. It is unusable on a contract.

**On the wire, these are ISO 8601 instants in UTC.** The zod decision already imposes it by another
route: `z.date()` is inconvertible to JSON Schema, so dates travel as **ISO strings**. Storage is in
`timestamptz`, in UTC.

`fixtures.js` keeps its second life after the port — a deterministic data set for tests and the
demonstration — but it will produce **instants**, and the conversion to relative offsets, if still
useful, will become a presentation convenience and not a transported shape.

---

## E — Discrepancies found by the five surface specialists (time 1)

**Fifty-two new discrepancies**, found independently by the five specialists reading their mockup
against `shared/`. Consolidated here by theme and not by surface: several were found by two, three
or four agents separately, and that convergence is itself information — it distinguishes an accident
from a structural fault.

None is corrected: they bear on `shared/` and on the mockups, which remain read only. This is the
continuation of the shopping list for the port (stage 1), and the material the time 2 agents must
have read.

### E1 — Subscriptions are broken, and they gate access to playback

*Found by `storefront-web`, `storefront-tv`, `storefront-mobile`.*

**Four disjoint vocabularies** for the same notion:

| Source | Values |
|---|---|
| `catalogue.json` → `plans[]` | `free` (0 €) · `pass` (12 €) · `premium` (24 €) |
| `catalogue.json` → `accounts[].plan` | `season` · `monthly` · `none` |
| `i18n/storefront.json` → `enums.plan.*` | all six together |
| web mockup | `free` · `unit` (7 €) · `sub` (14 €) |
| TV mockup | `saison` (14 €) · `mécène` (39 €) |

**The consequence is an authorisation defect, verified.** `helpers.planOf()` does
`plans().filter(p => p.id === account.plan)[0] || plans()[0]`. None of the four reference accounts
carries an identifier present in `plans[]`: **all of them fall back silently to `free`**. Yet
`plan.opens[]` carries `replays`, `one-live-month`, `all-lives`, `multi-screen`, `archive` — that
is, the playback entitlements. The i18n translates all six values, which hides the problem entirely
on screen.

On top of that: the `opens[]` entitlements do not coincide across sources, and there are **two
discounts on two different bases** (`seatDiscount` 10/20 % on seats in the data, 15 % on the store
in the mobile mockup).

### E2 — Fault D2 repeats across eight fields

*Found by all five. `storefront-mobile` files 7 of its 11 discrepancies under this family alone.*

D2 reported two competing vocabularies for a publication's state. That was not an accident: it is
the folder's dominant failure mode. A mockup keeps a literal table parallel to `shared/`, and the
two diverge.

| Field | Competing vocabularies |
|---|---|
| publication state (D2) | `catalogue.json` against both studio mockups |
| chat regime | **three** — including a `chat.*` copy family (`free`) doubling `enums.chatMode.*` (`open`) |
| replay policy | **three** — `sub`/`unit` in the mobile mockup against `subscription`/`none` |
| replay window | **three** wordings, one of them inside translatable copy |
| chat filter severity | two, **in the same file** |
| pre-publication checklist | two — 4 entries in the fixtures, 7 on the date sheet |
| currencies | `eur`/`usd`/`chf` offered, `cad` declared and missing |
| account subscription | entirely literal in the mobile mockup |

**Consequence for the contracts**: every boundary enumeration must be declared once, in
`@arthome/core`, and typed. An enumeration value hard-coded in an application is this project's most
frequent fault, and it is silent.

### E3 — Sanctions: four scales, and the i18n follows none of them

*Found by `studio-web` and `studio-mobile`. Extends D6, which counted only three.*

`catalogue.messageStates` (`ok`…) · `audience[].state` (the person within a channel) ·
`moderation[].state` (which introduces **`reported`**) · `studio-data.js` (`ok` / `held` for the
control room) · and `i18n/studio.json` → `enums.moderationState.*`, which says `published` where the
catalogue says `ok`, and matches none of the four.

The underlying fault: **`reported` is a triage state lodged in the sanctions field**. Three axes to
separate in the contract — the nature of the row (reported, taken up, decided), the state of the
message, the state of the person.

On top of that, a rule of conduct that only the mockup carries: *"Taking a case up is not deciding
it: until your colleague has returned a verdict, your sanction applies."* That is a **supersession**,
hence a lease on a queue row and a precedence rule — to be carried into the contract, and the reason
why moderation commands must be **conditional** and not blindly idempotent.

### E4 — Three state axes on one date, with no written hierarchy

*Found by `studio-web` and `studio-mobile`.*

`publication.state` (seven values), `run.state` (six), `date.outcome` (three). A date's displayed
state is the **composition of all three**, and none of them carries it. So every surface recomposes
the hierarchy its own way — the very definition of a value computed twice.

### E5 — The lock is on states, the mockup puts it on transitions

*Found by `studio-web`.*

The fixtures encode `lockedTransitions: ['scheduled', 'replay-online']` — a list of **states**. The
mockup treats those two passages as **transitions with no way back**. It is the second semantics
that is right: publishing commits the price, putting the replay online puts it on sale. The server
must **refuse** the reverse with a code and the commitment it has made.

### E6 — Roles: the fallback to six destroys a right

*Found by `studio-web` and `studio-mobile`.*

`studio-data.js` collapses the eight `memberRoles` into six personas, crushing `director`, `video`
and `sound` into `regie`. But `grants` distinguishes them: `director` may invite `video` and
`sound`, the other two may invite nobody. **The projection to six is not safe for authorisation** —
it is a label, never a right.

Two navigation faults in the same family: `TAB_PREF.regie` names a page that `ACCESS` refuses; and
**`team` is a dead page**, absent from the access table of all six personas (the line that has it
absorbed by `crew` is itself dead code).

### E7 — The viewer's time zone has no carrier

*Found by `storefront-tv` and `studio-mobile`.*

"Two time zones: the viewer's time first, the venue's time second" is a principle of the folder. Yet
the TV mockup reads `fixtures.geography.viewerUtcOffsetMin`, which **exists nowhere** in `shared/`:
it is `undefined`, and the venue's time is therefore computed against UTC. The surface has no input
at all for the viewer's time zone. Crosses D3 (time zones frozen as fixed offsets).

### E8 — The public model leaks control-room data

*Found by `storefront-tv`.*

The date object a public client reads carries `prices[].sold`, `prices[].revenue`, `seats.sold`,
`publication`, `publishedBy`: revenue figures and studio references. Two neighbouring leaks:
geo-blocking reasons carry `label`/`labelEn` — prose written **inside the data**, when everything
else goes through `enums.*`; and the editorial ranking of subgenres is **computed on the surface**,
from that ticketing data.

### E9 — The taxonomy is declared richer than it is carried

*Found by `storefront-web`.*

The subgenre is declared "optional, multiple" and carried in the singular; a date's `attributes`
field in fact carries **tags**; **six of the seven attribute groups** are declared and never carried
— including `accessibility`, which the folder presents as a front-rank filter that must "not depend
on a stage manager's vigilance"; and `shows[].tags` is empty throughout the hand-written catalogue.

### E10 — The i18n contradicts itself on its own counts

*Found by `storefront-web`, completed by the lead.*

`i18n/index.json` presents itself as copy's integrity check. It is wrong on half its entries, **and
in both directions**:

| File | Announced | Real |
|---|---|---|
| `storefront.json` | 243 | **671** |
| `taxonomy.json` | 627 | **437** |
| `studio.json` | 61 | 61 |
| `system.json` | 18 | 18 |

On top of that: merchandise labels exist only in French (`merchPool` with no English field), on a
product declared bilingual.

### E11 — Domain constants are copied out as literals

*Found by `storefront-tv` and `storefront-mobile`.*

`roomOpensBeforeMin: 30` and `previewIdleSec: 4` live in the data — and the mockups copy them out as
literals. These constants must arrive **through the contract**, otherwise they will diverge across
five surfaces. It is the "no value computed twice" principle applied to constants.

### E12 — Device pairing: its policy is nowhere

*Found by `storefront-tv`.*

"CODE VALID FOR 15 MINUTES" exists only in a **copy string**, and the codes themselves are literals
(`H4T9RD`, `K7QM2P`). The validity period is a policy: it belongs to the contract and must be served
in the response. Likewise, **the code's alphabet is declared nowhere** — which is a contract
requirement and not a typographic one, since a code read at three metres and retyped on a phone must
not mix `0/O`, `1/I`, `5/S`, `8/B`.

### E13 — `devices` has two shapes under one name

*Found by `storefront-tv`.*

`catalogue.json` declares `devices` as an **integer** (3, 2, 1, 1). `fixtures.js` then turns it into
a **list of objects**. Two shapes, one identifier.

### E14 — External orders have no owning context

*Found by `storefront-web`.*

"My orders" merges Arthome orders with those placed on the artist's own store (Shopify,
WooCommerce, PrestaShop, Drupal, API), with a merchant reference and a domain, with no invoice, no
tracking and no refund on our side. To be attached to the same arbitration as C8 (the store).

### E15 — Mockup discrepancies with no direct contractual bearing

Useful for the port, without consequence for the contracts: the **Share** action is wired to the
payment screen (and reveals that **no share command has ever been defined** — on TV it can only mean
a QR code to a **served canonical URL**); the TV's `plans` page is specified and absent from the
mockup; occupancy rate and remaining seats are two independent values; chat throughput is measured
in one unit and compared in another; two different bitrates carry the same name on the broadcast
screen; the third notification channel is named nowhere; devices and sessions are treated as two
different things.

### What family E teaches

Three lessons that go beyond the list:

1. **The project's dominant fault is the parallel literal table** (E2). It was committed on at least
   eight fields, by five mockups, despite an explicit principle forbidding it. A principle is not
   enough: the enumeration must be **typed from `core`** and a CI gate must check it.
2. **What is never called has never been tested.** `storefront-mobile` checked sixteen functions of
   `helpers.js`: **fourteen are never called** by its mockup — territorial rights, language barrier,
   remaining seats, resume, devices, subscriptions, chat moderation. Their contract must be
   **designed, not observed**. A silence is not an agreement.
3. **Four agents found E1 separately**, and none had been pointed at it. The convergence of
   independent readings is the only reliable way to tell a detail from a structural defect.

---

## F — Found by translating the imported copy into English

Three more, found the same day by the agent translating `docs/`. They are recorded in their own
family rather than folded into A, B and C, because **how a discrepancy was found is part of what it
teaches** — and these were found by a reading nobody had planned, of documents that had already been
corrected once and read by five specialists.

Translating a document is the most attentive reading it will ever get. That is the general lesson,
and it is why the family exists.

### F1 — A7, a second time, in the same document

**Where**: `docs/README.md` §3 lists NativeScript among the runtimes `@arthome/core` must support;
§7 rules NativeScript out explicitly, and `PROMPT.md` stage 1 gives the same runtime list without
it.

**The discrepancy**: two sources against one, and the one is a list rather than an argument. §3 is
the stale line.

**The correction**: §3 is aligned on §7. Exactly as in A7 — a decision changed during writing, and
only the later section received it. A7 was called the most instructive of its lot on the grounds
that a long document desynchronises from itself; it did it twice, in the same file, and the second
time survived a correction pass and five specialist readings.

### F2 — A count asserted above a list that does not reach it

**Where**: `docs/taxonomy.md` enumerates **196** tags, while it and six other documents in the
repository assert **205**.

**The verification**: `prototypes/shared/taxonomy.json` holds exactly 205 tags across 21
categories. So 205 is right and the document's illustrative list is nine short. The French original
listed the same 196 — this was carried in, not introduced.

**The correction**: the list is marked **illustrative and not exhaustive**, and names
`shared/taxonomy.json` as the count's source. Completing the list was rejected: it would put a
second copy of the vocabulary into a document, which is fault E2, in the one document written to
warn against it.

Critical rule 15 in its textbook form — count it or reference it, do not assert it. The number was
true, the list below it was not, and nothing in the document connected the two.

### F3 — Three archives referenced and never imported

**Where**: the dated notes in `docs/README.md`, `docs/PROMPT.md` and `docs/storefront-tv.md` point
at `*.pre-corrections.md`.

**The discrepancy**: those three archives exist — in `arthome-design/design_handoff_arthome/`,
beside the originals, as D-004 says — but they were never imported here. A reader inside this
repository follows the reference and finds nothing.

**The correction**: the references say so, rather than being deleted or satisfied. The archives stay
with the source folder; the note now states it. Same family as the two broken pointers `auth` found
in `adr-auth.md` on the same day — a table row citing a "§8.2.5 c" that has no item c, and a
three-column row carrying two cells. A reference that looks plausible is never followed, so it never
reports that it is broken.

---

## What remains open

Three points raised in phase 0 that are not corrections but **questions put to the team**, recorded
here so they do not get lost:

1. **The dynamic label catalogue (C6): subdomain or separate service?** One more service costs
   operations, for a single person.
2. **Subscriptions and the store (C7, C8): attached, or an eighth context?** Attaching them forces a
   debatable boundary; isolating them costs a service.
3. **The TV's short code.** The mockup uses it for four distinct flows — signing in, buying a seat,
   subscribing, buying merchandise. It is the same mechanism as the **OAuth device flow (RFC 8628)**.
   If it is designed twice — once by `auth`, once by `ticketing` — it will be implemented twice. To
   be treated as a single primitive.

---

## What this list cost, and what it saves

The twenty-seven of phase 0 were found without opening a single mockup in full. Seven of them
(family D) would have been discovered only when writing the code — that is, too late for the
contract. Another (**B4**) would have been discovered only on publishing the stage 0 gallery, in
front of five empty interfaces.

The most instructive remains **A7**: a document that contradicts itself between its §3 and its §9,
because a decision changed while it was being written and only the late sections received it. That
is the strongest argument in favour of short `critical-rules.md` files copied into every repository:
a long document always ends up lying about itself.
