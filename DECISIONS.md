# Arbitration log

> The decisions handed down by the lead over the course of the session, with their reason.
> A decision that is not here was not handed down.

---

## Phase 0 — 21 September 2026

### D-001 — Orchestrator where one exists, otherwise specialised skills case by case

**The rule, set by the project owner.** Every teammate loads **the orchestrator for its technology
before deciding or writing anything at all**. Where none exists, it loads **specialised skills case
by case**, justifying its choice.

This is a general rule, not an exception: it will hold for any future stack whose skill bank has no
front door.

**Applied to the eight teammates.**

| Teammate | Orchestrator | State |
|---|---|---|
| `storefront-web` | `nextjs-how-to` | exists |
| `studio-web` | `angular-how-to` | exists |
| `studio-mobile` | `ionic-capacitor-how-to` + `angular-how-to` | exist |
| `backend-domain`, `backend-contracts`, `auth` | `nestjs-how-to` | exists |
| `storefront-mobile`, `storefront-tv` | depends on the stack — see below | **conditional** |

**The case of the two React Native surfaces.** The mission prompt expected `react-how-to`. It is
indeed installed, but it excludes itself from React Native: "Router for React 19 **on the web — no
Next, no React Native** […] Not for Next.js (→ nextjs-how-to), Expo or React Native
(→ expo-overview)". The next door, `expo-overview`, sets its own condition: "a bare React Native
project with no `expo` dependency is not Expo work".

Inventory of the bank, verified:

| Family | Skills installed | Orchestrator |
|---|---|---|
| React web | 6 | `react-how-to` |
| Expo / EAS | 26 | `expo-overview` |
| **Bare React Native** | **8** | **none** |

So: under **Expo** (including Expo TV), `expo-overview` applies and the rule holds normally. Under
**bare React Native**, no orchestrator exists and we fall back to case by case. The Expo / bare RN
choice **is not made** and is out of scope for this session.

**The skills selected for time 1, case by case.** Most of the React Native bank is about *building
and shipping*; at time 1 a specialist **expresses a data need** and writes no code at all. Four
skills only, each because it bears on the contract:

- `react-core` — React semantics;
- `react-native-tv-best-practices` — focus engine, ten-foot UI, constrained memory, playback. It
  explicitly targets "react-native-tvos, Expo TV", so it holds under either stack hypothesis;
- `react-native-best-practices` — list virtualisation and memory, which drive pagination and the
  expected volume;
- `react-server-state` — freshness, cache, invalidation: what the client expects from the contract
  in real time and offline.

Set aside as out of scope: testing, version upgrades, brownfield, EAS, library scaffolding.

**Left open, to be settled before the mobile stage**: Expo or bare React Native.

### D-002 — The `backend` agent is split in two

**The observation.** As planned, a single teammate produced nine long deliverables:
`context-map.md`, `data-model.md`, `events.md` with `proto/`, `realtime.md`, two OpenAPI documents,
`definition-of-done.md`, `critical-rules.md`, `adr-payments.md`, `adr-stream-entitlement.md`.
Single point of failure, and a real risk of degradation on the last documents.

**The decision.** Two teammates relaying each other on the same stage:

- **`backend-domain`** — context map, per-service data model, event catalogue and `proto/`, real
  time, persistence, plus the two ADRs (`adr-payments`, `adr-stream-entitlement`);
- **`backend-contracts`** — the two BFF OpenAPI documents, the contract for synchronous
  BFF → service calls and the chosen transport, `definition-of-done.md`, `critical-rules.md`.

`backend-contracts` starts by reading what `backend-domain` produced: the order is imposed,
contracts follow from the model and not the other way round.

**What does not change.** Total scope, expected depth, and the two-stability-regimes rule (`stable`
for `identity`, `catalog`, `ticketing`; `provisional` for the rest).

### D-003 — All five surfaces in round one

**The context.** The phase 0 estimate gives 2.3 to 3.3 million agent tokens and three to four
sessions for five surfaces. A cut to three surfaces (storefront web, studio web, storefront TV) had
been recommended by the lead, on the grounds that mobile and studio mobile are variations of
surfaces already covered and would contest layout rather than the **shape** of the contracts.

**The project owner's decision: all five surfaces.** No decision is dropped, no context left aside.

**Cadence, arbitrated by the project owner: all five at once.** Five teammates in parallel, five
tmux panes. Time 1 lasts as long as the slowest. A two-wave cadence had been proposed to allow an
early read; it is set aside in favour of the clock.

### D-004 — The handoff folder is corrected in this session

**The context.** The mission prompt reserved the rewrite for stage 0, when the folder would enter
`arthome-core` as `docs/`: "not in this session". Phase 0 was only meant to produce the list of
discrepancies.

**The project owner's decision: correct now.** The five surface specialists will therefore read a
correct folder, not a wrong one accompanied by an erratum.

**The scope of the correction, arbitrated by the lead.** The folder's **documents** are corrected
(`README.md`, `Prompt - Storefront TV.md`, `PROMPT.md` — imported here as `docs/`, where the
first two were renamed `storefront-tv.md` and `taxonomy.md`) — families A, B and C of
`architecture/corrections-handoff.md`. **`shared/` is not touched**: the prompt declares it read
only, and it is the source the specialists are going to read. The seven data discrepancies
(family D) remain the shopping list for the port at stage 1.

**Reversibility.** `~/Dev/arthome-design` is not a git repository. The originals were copied to
`*.pre-corrections.md` alongside the corrected documents, before any modification.

### D-005 — `corrections-handoff.md` is written before time 1

**The decision.** The `arthome-core` repository is created (`git init`, no remote, no push) and the
list of twenty-seven discrepancies is written into it immediately. It serves three times: phase 0
deliverable, source of the corrections applied to the folder, and shopping list for the port at
stage 1.

**What is not created.** Nothing else. No `package.json`, no TypeScript, no populated `proto/` or
`openapi/` — only the empty directories the structure expects.

### D-006 — Exhaustive coverage, deduplicated writing

**The observation.** Applied literally, "every screen, seven dimensions" yields a hundred-odd
screens across five surfaces, many of them repeating the same data — the Account section of the web
storefront and that of mobile carry the same eleven sub-screens and the same data.

**The decision.** **Exhaustive coverage, deduplicated writing.** Every screen is enumerated, nothing
is forgotten. But the seven dimensions are written out in full only where the screen introduces a
new **data shape**, a new **command**, a new **real-time need** or a new **surface constraint**.
Elsewhere, a one-line cross-reference to the screen that already described it.

**Why.** What makes a contract is the set of shapes and commands — not the enumeration. And the
enumeration remains necessary so that time 3 can contest: "this screen is not served" requires that
the screen have been named.

### D-007 — The time 3 challenge stays in its own surface's file

**The observation.** The prompt has the five specialists contest the offer at time 3, but its list
of deliverables knows only `needs/<surface>.md`. The challenge had no destination.

**The decision.** Each specialist adds a **"Confrontation"** section to its own
`needs/<surface>.md`. It remains **sole author** of it, and the file carries the complete history of
a surface: what it asked for, what it was answered, what it contests. The arbitrations handed down
by the lead go in this log.

**Set aside**: a single synthesis written by the lead. That would make the lead the filter for what
gets escalated, which is precisely what a confrontation phase exists to prevent.

### D-008 — One commit at every stopping point

**The decision.** `arthome-core` is committed at the end of phase 0, then at the end of each of the
three times. Messages in English. **No remote, no push, ever** — as the prompt requires.

**Why.** Eight agents write into this repository across three to four sessions. Commits give
recoverability if two agents collide, and make legible what each time produced.

### D-009 — This session defines contracts, it does not design screens

**The reminder, set by the project owner.** The object of this session is to define **the interface
contracts, the backend architecture and authentication**. Not to build the screens, nor to describe
them.

**The real risk.** Five agents reading high-fidelity mockups screen by screen drift naturally into
interface description: layout, components, tokens, animations, focus order. That work is already
done — the mockups *are* the design — and redoing it in prose would produce five long documents,
useless to the contract.

**The test, to be copied into every teammate's prompt.** An observation enters `needs/<surface>.md`
**only if it changes what the contract must carry or guarantee**.

| Does not enter | Enters |
|---|---|
| "the card is 320 × 180, radius 4 px" | "the card shows a viewer counter that must be real time to within N seconds" |
| "focus scales to 1.08" | "the TV accepts no input beyond six characters: payment must be a device pairing" |
| "loading skeletons use the `skel` animation" | "this screen must distinguish *your connection* from *our servers*: the error envelope must carry that distinction" |
| "chat is a 420 px side panel" | "a chat message carries its position in the media, not its send time" |

Put another way: the surface specialist **expresses a need**, it does not describe an interface
solution. If it catches itself writing a pixel, a colour or a component name, it has left the scope.

**What remains legitimate**: the constraints proper to the surface, when they constrain the
contract — the TV and its five keys, Capacitor and its deep links, Next and the server rendering
that makes the session its business, React Native and its lifecycle.

---

## Time 1 — 21 September 2026

### D-010 — Pagination stays chosen by the interface pattern, with two named exceptions

**The original decision, confirmed.** Storefront = **cursor** (infinite scroll, smoother for the
viewer); studio = **page + total** (you pin a page and send it to a colleague). The reason is an
interface affordance, not a property of the data.

**What the research confirmed.** The framework the industry recommends is exactly that one: choose
first by **interface pattern**, then by the data, last by the cache. Cursor for feeds and infinite
scroll; offset for back-office tables where you want page numbers and bookmarks. Slack only
migrated from offset to cursor once its volumes exploded. And the trade-off is precisely the one
that was weighed: a cursor gives **neither a total nor page jumps**, which the literature flags as
problematic for a back office. Pinning and sharing a page is `?page=3`.

**Correcting an error of the lead's.** The lead had announced "four agents contest this decision
along four paths". On re-reading, **only two** bear on cursor versus offset:

| Agent | Objection | Does it bear on the mechanism? |
|---|---|---|
| `studio-web`, `studio-mobile` | moderation queue and chat grow while you read | **yes** |
| `storefront-web` | search groups dates under a show card | no — that is the paginated **unit** |
| `storefront-mobile` | a cursor must survive overnight | no — that is the cursor's **lifetime** |

Four objections had been filed under a label that covered only two of them.

**The two exceptions, and not one more.** The **moderation queue** and **live chat** move to cursor.
Reason: these are feeds, not tables, even when hosted in the studio — offset pagination there
mechanically duplicates and skips, since rows are inserted while you read. The rule remains "by
interface pattern"; these two collections have the pattern of a feed.

**The audit log stays on page + total.** `studio-web` asked for cursor, on account of deep offset
over 24 months of retention. Set aside: nobody paginates to the 50,000th entry of a log, you filter
by period first. **Offset + mandatory period filter** keeps the page numbers — hence the intended
affordance — and stays fast. Moving to cursor would trade a problem we do not have for the loss of
what we wanted.

**Two orthogonal subjects, referred to the backend as questions** and not settled here: the
pagination **unit** for search (shows or dates), and the **lifetime of a cursor**, with an explicit
code meaning "too old, reload everything".

**A practice confirmed**, which meets a decision already taken: Stripe, GitHub and Slack encode the
cursor as **opaque Base64** over a composite sort key (`created_at` + identifier). That is the
"deterministic sort with tie-break on identifier" already settled.

### D-011 — Two distinct orders: seats and merchandise

**The observation.** The lead had given the specialists a false instruction — a cart carrying "seats
**and** merchandise". `storefront-web` verified rather than believe it: `ticketing.cart.head` and
`.title` read "Panier merch", the empty state says "Le merch s'ajoute depuis la boutique d'un live",
and buying a seat is a separate flow in a modal.

**The decision.** The contract carries **two distinct orders**. That is what the design actually
shows on all three storefronts, and the two have neither the same guarantees (a seat has a capacity,
a code, a cancellation window), nor the same shipping provider, nor the same payout recipient.

**Set aside**: the mixed order. It is doubtless inevitable one day — buying a seat and the show's
t-shirt in one payment — but **no mockup shows it**. Carving it now would be putting into the
contract an intention nothing has tested, which the mission explicitly forbids.

**To be connected**: external orders (E14) and the store (C8) are still waiting for an owning
context.

### D-012 — `@arthome/contracts` exposes a barrel-free entry point

**The measurements.** Two agents measured independently, and converge:

| Entry point | `storefront-mobile` | `storefront-tv` |
|---|---|---|
| classic `zod` | 93 KB gzip | 92 KB gzip |
| `zod/mini` tree-shaken | 7.5 KB | 7.7 KB |

**The cause, identified by `storefront-mobile`**: the classic entry point makes **64 translation
files** of error messages reachable (341 KB of source), entirely dead weight for a project using
**i18n by codes** — which forbids displaying a library message anyway. `storefront-tv` adds that the
cost is **fixed, not marginal**: 267 bytes of difference between a trivial schema and a
twenty-field schema. So you cannot get out of it by limiting the number of schemas on the
constrained surfaces; the culprit is the `z` namespace, a barrel import.

**The decision.** `@arthome/contracts` **exposes an entry point with no barrel file**, and that is a
requirement of `definition-of-done.md`. Neither agent reopens the zod decision itself, and it is not
reopened.

**Reservation recorded**: both measurements are on an isolated schema compiled by esbuild, not on a
real application bundle, and the `zod/mini` gain is **conditional on tree shaking that the React
Native bundler does not enable by default**. To be re-verified on a real bundle at the mobile stage.
The two measurements agreeing to within 1 KB makes the order of magnitude safe.

### D-013 — Common development conventions, and the tooling that holds them

**Requested by the project owner**, in addition to the mission. The mission said "nothing else"; the
project owner widens it, and it is recorded as such. The reason is scheduling: five application
repositories plus `arthome-platform` are about to be born, and conventions written after the fact
are never applied.

**Deliverable**: `architecture/code-conventions.md`, written by a seventh teammate launched at
time 2, in parallel with `backend-domain` and `auth` — the work depends on neither.

**Tooling: ESLint + Prettier, across the seven repositories.** Biome was set aside despite its speed
and its single-tool appeal: the project wants to demonstrate quality, and it is the framework
plugins — Angular template lint, React hooks and compiler rules, `eslint-config-next` — that catch
the real faults. Biome does not have that ecosystem.

**Constraint no. 1, set by the project owner: ESLint and Prettier must never contradict each
other.** The answer is established and was verified online for September 2026:

1. `eslint-config-prettier` turns off every ESLint rule that touches formatting, and it is the
   **last element** of the flat config array — placed earlier, it turns off nothing that follows;
2. **`eslint-plugin-prettier` is banned.** Running Prettier as an ESLint rule is explicitly
   discouraged today: it slows ESLint down and produces incomprehensible errors. That setup is what
   *creates* the conflicts we want to avoid;
3. a **local gate**: `npx eslint-config-prettier <file>` enumerates the rules still in conflict and
   must return an empty list, in every repository;
4. two rules get in the way even so — `arrow-body-style` and `prefer-arrow-callback` — and are named
   in the document.

The split, written in black and white: **Prettier owns formatting, ESLint owns only code quality.**
Zero overlap, verified by a command and not by discipline.

**This document is not `critical-rules.md`.** That one stays under twenty lines and carries the
imperative domain rules, because beyond that it stops being read every session. Style conventions
have no place there.

### D-014 — `@arthome/tooling`, third published package of `arthome-core`

**The decision, and its name, come from the project owner.** A package alongside `@arthome/core` and
`@arthome/contracts`, published on GitHub Packages, carrying the base configuration that every
repository **extends**: ESLint, Prettier, **TypeScript** and Vitest.

**Set aside**: copying with an anti-drift gate, and full autonomy for each repository. With seven
repositories and one person, autonomous configurations will diverge — that is exactly fault E2 (the
parallel literal table) applied to tooling.

**⚠ The TypeScript constraint — version corrected on 21 September 2026, after verification against
the npm registry by the `conventions` teammate.**

The first draft of this decision asserted a **fracture** between repositories: Angular on TS 6.0.x,
React on TS 7.x, and shared `.d.ts` files having to serve both majors at once. **That was false.**
The lead had read `react-how-to`'s `verified-versions: typescript 7.0.2` as a constraint, when it is
a **registry observation** — what was current on the day the skill was verified.

What the registry actually says:

| Package | Real constraint on `typescript` |
|---|---|
| `@angular/compiler-cli@22.1.7` | `>=6.0 <6.1` — **peer dependency, hard** |
| `react-native@0.87.1` | **no `typescript` peer** |
| `@types/react@19.3.0` | **no `typescript` peer** |
| `@nestjs` (`nest build`) | **gives up on TS 7.0** (`UNSUPPORTED_TYPESCRIPT_VERSION`) — TS 7.0 ships no programmatic API |
| **`typescript-eslint@8.70.0`** | **`>=4.8.4 <6.1.0`** — and the TS 7 support request is closed "not planned" |

**The conclusion inverts.** There is no fracture between repositories: there is a **single ceiling at
TS 6.0.x across all seven**, imposed by `typescript-eslint` — that is, by the very tool that
justified setting Biome aside in D-013. Typed lint is the reason for the choice; it is also its
ceiling.

**The decision: TypeScript 6.0.3 on the seven repositories, pinned exact.** Nothing pushes upward
today.

**The fracture is a future event, not a present state** — `latest` is already 7.0.2. It is made
**survivable** rather than denied: the two shared packages compile against the **floor** of their
consumers, with `stableTypeOrdering: true` (TS 7's deterministic ordering backported to TS 6 — the
published `.d.ts` are therefore *already* what 7 would emit) and above all
**`isolatedDeclarations: true`**, which forces the whole public surface to be annotated. That is a
far better guarantee than a syntax ban — all the more so since **there is no syntax proper to
TS 7**: 7.0 is a Go port at checking parity. The real danger is in the **options** (TS 6 changed
`types`, `rootDir`, `module`, `strict`) and in the **emission order**.

**The proof**: `tools/dts-check/` compiles the published contract under `typescript@6.0.3` then
under `7.0.2` (`tsgo`), with **`skipLibCheck: false`** — without which the gate always passes — plus
a `git diff --exit-code` on the `.d.ts`. When Angular moves up, the `.d.ts` will not change and the
gate will invert, repository by repository.

**What the package carries, and how** — established by `conventions`: `eslint`, `prettier` and
`typescript` as **peers** (they are the binaries the repository executes); `typescript-eslint`,
`eslint-config-prettier`, `import-x` and `globals` as **dependencies**, pinned exact — in flat
config a plugin is an *object passed by value*, no longer a name to resolve, hence no ambiguity.
Stack plugins (`angular-eslint`, `eslint-config-next`, react-hooks, RN) **nowhere**, otherwise the
seven repositories would have to move framework together. `vitest` neither as peer nor as
dependency: the entry point exports a bare object and never a `defineConfig`, otherwise Angular
(Vitest 4) and the others (Vitest 5) cannot coexist.

**Propagation**: turning a rule on is a **MAJOR** change — otherwise seven repositories go red on a
`pnpm update`. Every rule goes through `warn` in minor N, then `error` in major N+1, one repository
in transit at a time. `arthome-core` consumes its own package before publication.

### D-015 — Tax model: commissionaire, to be validated by an adviser

**The problem (D5).** The fixture computes `net = gross − 12 % − VAT(gross)` at a single rate; the
payouts mockup breaks VAT down **by billing market**. The two are incompatible and **neither is
researched**. `backend-domain` researched rather than assume.

**The decision.** The **commissionaire model**: Arthome acts in its own name, the base is the
**whole ticket**, the rate is that of the **viewer's country**, the liable party is **Arthome**.
Grounded in six converging indications from the design — Arthome displays the price, collects,
invoices, holds the cancellation policy, refunds, issues the credit note; the viewer never contracts
with the artist.

**And the commission is on the net-of-tax amount, not the gross.** On the tax-inclusive amount, the
12 % announced to artists would vary with the buyer's country — a commission that changes with the
buyer is not a commission.

**⚠ This is not tax advice.** `adr-payments.md` must carry it at the top: the model is **to be
validated by an adviser before any real collection**. The risk is nil today — Stripe in test mode,
no real money.

**What is certain in both models, and is the real stake**: the **per-market breakdown**. A single
scalar `vat_amount` would have been the only genuinely irreversible choice, and it is precisely the
one the fixture invited.

### D-016 — The display-currency preference is withdrawn at stage 1

**The observation.** `backend-domain` refuses to honour `storefront-web` Q29. It is the only place
in the whole session where an agent asks **design** to back down, and the argument is right:
displaying a converted price you cannot charge is a lie, and D4 showed that **no rule has ever been
exercised on two rates** — three markets are declared, one is exercised.

**The decision.** The currency preference **disappears from the screens** at stage 1. Prices are
displayed in the currency of the billing market for the date, formatted client-side by locale.

**Reversible**: the preference can come back the day a real conversion rule exists — rate source,
exchange date, rounding, who bears the difference. The immediate cost is one fewer box in the
account settings.

### D-017 — Four secondary arbitrations, accepted as proposed

Raised by `backend-domain`, accepted with its reasoning:

- **Credit-note scope: the issuing channel.** A credit note usable anywhere would force the platform
  to fund another artist's share out of its own money. Bounds the cash commitment.
- **Third notification channel: `in_app`, not `sms`.** Cost per message, its own regulation, one
  more provider — for a value nothing has tested.
- **Single-vendor merchandise order.** A cart spanning two channels splits at payment; the domain
  reason and the Stripe reason are independent and agree.
- **Discount and promotion do not stack**: whichever favours the viewer applies.

### D-018 — `answers-to-surfaces.md` is kept

`backend-domain` added an eighth file outside the delivery table, an index of the 99 answers to the
surfaces' questions, and asks whether it should merge it.

**It stays.** Reason: at time 3 the five surfaces will check that their questions were answered —
that is exactly what an index is for. Melting 99 answers into `context-map.md` would make it
unreadable for `backend-contracts`, and an index that points elsewhere duplicates nothing.

### D-019 — WHEP control-room return is not promised on the native shell

`studio-mobile` Q8. Reserved for the **web** studio at stage 5; the mobile studio gets LL-HLS with
its **real latency stated**, never a sub-second promised and not kept.

Reason: `capacitor://localhost` as a **secure context** in WKWebView is not verified, and it also
gates `getUserMedia` and Web Crypto. **To be measured on a real device before any promise** — that
is a verification, not an opinion.

---

## Times 3 and 4 — 21 September 2026

### D-020 — The playback token stays at 120 s

`backend-domain` raised this point **with no answer**, and it was right: shortening to 60 s would
bring the revocation window back but would **double the renewal frequency on the hottest path in the
system**, which nobody has measured.

**The fault was never the window, it was the promise.** Five documents announced ≤ 60 s and the
contract served the number (`playbackCutWithinSec: 60`) while the token lasts 120 s. The correction
is the truth, not the mechanism.

The decisive reason came from `backend-domain` afterwards: **the security property that matters is
held at issuance, not at revocation.** Revocation deals with a right that existed and then ceased —
lapsed subscription, disconnected device, screen limit, refund. None of those cases justifies
doubling the load on the hot path.

**Addition**: a `playback:stop` signal pushed over the existing channel, **labelled a courtesy and
not a security boundary** — a modified client ignores it, the edge serves for up to 120 s, the
guarantee stays 120 s. The ADR rejects "any bypassable heuristic" outright; it would be incoherent
to then sell one as a protection.

**Reopening threshold, numeric and not intentional**: if renewal at 45 s costs less than 5 % of
`streaming`'s CPU time at peak and less than 2 % added latency on `OpenPlayback`'s p95 —
**measured** — then shortening becomes free.

### D-021 — The tax model confirmed, and the shape corrected

**Confirmed after verification across three jurisdictions**: `on_behalf_of` removed, commissionaire
model kept. Stripe's documentation is explicit — *"indirect charges using the `on_behalf_of`
parameter: the merchant of record is the connected account"* — so the parameter put the
configuration in head-on contradiction with the model it executes.

The three regimes converge, and **the intermediary model exonerates nowhere**: in Europe Article 28
catches you **on the facts** (a captured live performance is not an electronically supplied service,
so Article 9a's automatic presumption does not apply); in the United States marketplace facilitator
laws require collection in **46 states plus the District of Columbia**, whatever the contractual
position; in the United Kingdom HMRC has not aligned its rules with Directive 2022/542, so the
supplier is taxed by establishment. Eventbrite's 10-Q publicly describes the same arrangement.

**And the shape that had been carved was wrong, which was graver than the arbitration.**
`backend-domain` had made "the per-market breakdown" its irreversibility argument. Its own
diagnosis: **a billing market is a pricing notion — what currency you sell in — never a tax
notion.** The `skeptic` corrected "market" to "country"; country is no more sufficient — about
9,000 jurisdictions in the United States, and in the United Kingdom a rate that depends on the pair
jurisdiction × nature of the supply (Derby Quad: the theatre-ticket exemption **does not extend** to
a live stream).

**The shape adopted**: `BuyerTaxLocation` (country, subdivision, postal code, city) carried by the
order, `TaxEvidence[]` with source and timestamp, an `evidence_conflicting` flag, and `VatLine`
keyed on `jurisdiction_code` / `jurisdiction_level` / `supply_kind` with the **rate applied to the
sale**. Ten-year retention, an IP address kept as tax evidence resting on a legal basis distinct
from consent.

**The evidence rule cannot be delegated to Stripe**: Stripe Tax favours a single address where
Europe requires **two non-contradictory items**. This is not a preference, nobody does it for us.

**KYB/KYC and tax location are not about the same person**: Connect verifies **the artist** so it
can pay them, location concerns **the viewer** so we know which rate to apply and can justify it for
ten years. Having one gives you nothing of the other.

**The accepted cost**: Stripe **requires** `on_behalf_of` outside the common region, so a Swiss or
Canadian channel will have to be handled differently or wait. The warning about validation by an
adviser stands in full.

### D-022 — What has no source does not enter the contract

**Viewer attribution is withdrawn**, not served empty. `studio-web` established that the mockup
supplies **five labels and nothing else**: hard-coded values, and no attribution source in `shared/`,
`fixtures.js` or `catalogue.json`. Writing it would have been letting one screen's layout dictate
the structure of an API — the fault the mission forbade on its first page.

`backend-contracts` added what was not asked for and does count: **what it would take for the data to
exist**, because a gap without its remedy gets rediscovered.

**Same treatment for the two dead tiles** of `dashboard`: they test the principal role and neither
`mod` nor `regie` opens the page. Four tiles served, the product question recorded — open the page to
those two roles, or drop the tiles.

### D-023 — Authentication goes through the BFF

**The BFF exposes `/v1/auth/*` as a documented relay, cookie on the BFF's domain.** Three
constraints determined it: critical rule 1 forbids a browser calling `identity` directly; Next does
not see a cookie set on another domain, which would empty of its meaning the surface chosen for its
server rendering; and `capacitor://localhost` is a third-party context on iOS 14+, so the mobile
studio can carry no cookie.

**`auth` found the argument that makes the relay mandatory rather than preferable**: the OpenAPI is
generated from zod, so **a transparent relay would not appear in the OpenAPI** and the six missing
contracts would stay missing.

**Invariant**: a response never carries a cookie **and** a token — two bearers for one session means
two revocations to hold and one we will forget. Carried as a `oneOf` discriminated by the mode, the
mode being an explicit parameter validated by zod, never inferred from the `User-Agent`.

**What this breaks, accepted**: better-auth's official client becomes unusable. Unforeseen
compensation — with `@better-auth/expo` no longer installed, **authentication becomes indifferent to
the Expo / bare React Native choice**, which stays open (D-001).

### D-024 — A gate reads the contract, never a list kept beside it

Two hardenings of `tools/check-openapi.py`, and **both times the checker was caught at its own
game**.

**R14** only fired if `enum` **and** `x-arthome-vocabulary` coexisted: a bare `enum` in a response
passed, and it is `storefront-tv` that found it by hand on `Error.nature` — in the body of **every**
error, where a fourth value would have had the whole envelope rejected by a fleet we do not update.
The proposed hardening ("every `enum` under `components/schemas`") was **tried and then rejected**:
it shouted at `SearchCriteria`, referenced only `in: query`, and an input vocabulary is legitimately
closed. The right criterion is **reachability from a response**. A gate that shouts wrongly gets
disabled.

**R11** carried a hard-coded exemption list — that is, **a literal table parallel to the contract,
kept inside the very tool that exists to forbid them**. `backend-contracts` refused the easy fix and
diagnosed the shape. The exemption is now read from the document, with its motive mandatory.

Removing the list revealed **six operations exempted without anyone ever having written why**, plus
two the list did not cover. All legitimate — and that is what makes the discovery useful: *a list of
names without motives is indistinguishable from a list of names without reasons.*

---

## After the session — 21 September 2026

### D-025 — Expo for both React Native surfaces

**Project owner's decision: Expo**, for `storefront-mobile` and `storefront-tv`.

**What this closes.** D-001 left the Expo / bare React Native choice open, and noted that the
orchestrator gap depended on it. It is filled: **`expo-overview` is the orchestrator** for both
surfaces, and the rule "orchestrator where one exists, otherwise specialised skills case by case"
recovers its first term. All eight teammates now have a front door.

The bank holds **26 Expo/EAS skills** behind that orchestrator, against 8 bare React Native skills
with no front door. The choice therefore also improves coverage.

**What this does not change.** `react-native-tv-best-practices` remains the TV's primary skill — it
explicitly targets "react-native-tvos, **Expo TV**", so it already held under both hypotheses. And
authentication stays indifferent: `auth` established that better-auth's official client becomes
unusable since the BFF projects the session as `ViewerContext`, so `@better-auth/expo` is not
installed and risk R4 is extinguished whatever this choice.

**What must be verified at the mobile stage.** The handoff folder reported a documented conflict
between `react-native-tvos` and the other Expo projects of a single workspace. Under multiple
repositories the question no longer arises in that form (A5), but **Expo TV and its support for
`react-native-tvos` are to be verified on the chosen version** before committing to the TV surface.

### D-026 — Reminder: gRPC was set aside, `proto/` serves the events

Recorded because the question came up afterwards, and because `proto/` can mislead.

**The chosen transport is HTTP/JSON described in OpenAPI.** `transport.md`: *"One OpenAPI document
per service, alongside the two BFF documents. No gRPC."*

**`proto/` carries 109 types and zero `service`**: these are the **Kafka event** schemas, tooled with
`buf`. Protobuf serves the event log, never synchronous calls. `backend-domain` deliberately left
`service` empty so as not to pre-empt a decision that was not its to make.

**The number that settled it is not 192 but 1 and 4**: gRPC's two real advantages — deadline
propagation, multiplexing — pay off on the **depth** of a chain, and that depth is **1 by
construction**, since no call goes between services. A deadline has nobody to propagate to.
Confirmed by the `skeptic`, including through a projected read model: that is a local table of the
called service, it adds no network hop.

---

## The English pass — 22 September 2026

### D-027 — The navigation vocabulary diverged, and the contract must move

**Found by `studio-web`, then verified rather than believed.** It reported that `team` had
disappeared from the studio's navigation vocabulary and that a reader of this journal could not
find out why. Checking the two artefacts turned one finding into two:

| | `@arthome/core` — `people.ts:61` | `openapi/studio.yaml:6282` |
|---|---|---|
| entries | **15** | **14** |
| `team` | present | **absent** |
| the moderation page | `moderation-page` | **`moderation`** |

**The second difference is the worse one.** A missing member is visible the first time anyone
compares; a value that differs by name inside a vocabulary both sides believe they share is the
parallel literal table (E2), between the two artefacts that exist to prevent it, with five gates
green.

**The direction is not open**: critical rule 2 says any value displayed twice comes from
`@arthome/core`. So the contract follows the domain, or the domain changes and the contract follows
— never one of each. Which name wins was `backend-domain` and `backend-contracts`' to settle on the
evidence, not mine to guess.

**The ruling, from `backend-domain`, with the reason I did not have.**

`moderation-page` wins and **the contract moves**. The reason is not aesthetic: `'moderation'` is
**already a member of `MEMBER_ROLES`** (`people.ts:24`). Two closed vocabularies cannot share a
value here, because `arthome-check-enums` discovers *values*, not *vocabularies* — a file writing
`'moderation'` would be attributed to whichever vocabulary declared it first, and the gate would
either flag a legitimate use or wave through an illegitimate one. The same disambiguation is applied
visibly elsewhere: `DATE_PANES` carries `pane-tickets`, `pane-chat`, `pane-crew`, `pane-replay`
because `tickets`, `crew` and `replays` are navigation entries; `CREW_ROLES` carries `crew-director`
rather than `director`; `AUDIENCE_SANCTIONS` carries `none-sanction`. Moving *core* instead would
collide with `MemberRole`.

**And `team` comes back, making 15 on both sides — which retracts what this entry first said.**

### D-027b — Retraction: I wrote a good-sounding reason for a removal that was wrong

The paragraph this replaces claimed `team` had been removed because E6 established it is a **dead
page**, and called that "a good reason". It is not, and I should not have written it.

**E6's finding was about the mockup**: `team` is absent from the access table of the six personas
*in `studio-data.js`*, with the line that has it absorbed by `crew` itself dead code. That is a
**mockup defect**. Treating it as grounds to drop the concept from the **contract** is the fault the
mission forbids on its first page — letting the state of a prototype dictate the structure of an API.

**`team` and `crew` are two different pages, and the distinction is already written down in `core`.**
`crew` is the per-**date** crew: who is on the run desk tonight, `CREW_ROLES`, `DateAccessGrant`,
expiry served as an instant. `team` is the per-**channel** membership: who belongs to this channel,
`MEMBER_ROLES`, `grants`, invitations. `CREW_ROLES`' own doc comment carries the consequence —
*"two scales, two lifecycles: confusing them would turn revoking a stand-in into exclusion from the
channel."* Collapsing the vocabulary to 14 erases exactly that.

**What this failure was.** I was asked why a decision had no record. Rather than find out, I
reconstructed a reason that fitted the facts I had, and it fitted well enough to stand. A journal
that exists because *a plausible claim gets copied and never reread* had just produced one — in the
entry complaining that a decision was taken without a record.

*A decision taken in passing is indistinguishable from an oversight. A reason invented afterwards is
worse than both, because it stops anyone looking.*

**One more thing `backend-domain` found while translating**, and it belongs here: the French comment
above `NAVIGATION_ENTRIES` read *"les quatorze entrées de navigation"* while the list has held
fifteen. Stale prose, not a disagreement with the contract. It now reads "The studio's navigation
entries", with no number — a count written beside the list it counts is a parallel table waiting to
happen.

### D-028 — A repository-wide rewrite is a stop-the-world operation

**The incident.** `conventions` ran `prettier --write` across the whole repository while
`backend-contracts` had `openapi/storefront.yaml` open mid-translation. The harness held line
numbers between an extract and a reinject; the reformat moved every one of them by up to 835, the
next batch wrote sixty blocks of English into the wrong places, and **151 keys were destroyed** —
`DateCard.outcome`, `DateDetail.rights`, `DateDetail.media`, most of `PriceTier`. The document
stopped parsing.

**Each agent reported the other's damage as the other's fault**, and both were describing the same
collision from opposite ends. Neither was careless. **The process fault is mine**: I put nine agents
in one working tree and never said that a repository-wide rewrite is not an ordinary edit.

**The rule.** A repository-wide `--write`, codemod or reformat is **announced, everyone stops, one
agent runs it, everyone resumes**. Never while another agent is mid-file. It lives in
`code-conventions.md`, where it will be read.

**And a second rule the incident exposed, which is about ownership rather than timing.** `openapi/`
goes into `.prettierignore`. These two documents are the **target** that `@arthome/contracts` must
emit, and the moment of truth for that package is `contracts:emit` producing an **empty diff**
against them. That makes their byte-level formatting a property of the **emitter**, not of the
formatter: if Prettier restyles them, the emitter must learn to reproduce Prettier's YAML style or
the diff is never empty.

**What came out better than it went in**: the harness is now keyed on a **token signature** — the
backticked identifiers, the numbers, the error codes — instead of on line numbers. A reformat
mid-flight can no longer misplace anything; it fails to match and says so.

### D-029 — *garde* is **duty**, never **shift**

**Raised by `studio-mobile`**, which found `/v1/me/push-registrations` rendering it as *shift*
while all five `needs/` files use *duty* — and `openapi/studio.yaml` contradicting itself, with
`/v1/me/duties` at one line and "a stage manager's shift page" at another.

**Its reason decides it: "on duty" carries the on-call sense that "on shift" does not.** A show
caller is not rostered for a period, they are answerable for a date. And *shift* collides with the
ordinary verb, which a contract description cannot afford.

It is a load-bearing term for the studio surfaces, so it is one word. The translation of a term of
art is a vocabulary decision, and a vocabulary decision belongs here rather than in whichever file
happened to need it first.

### D-030 — `/v1/changes` keeps its `401`, and the public gap is named

**Raised by `backend-contracts`, which refused to decide it.** The feed requires a credential, yet
three of its twelve tags are public catalogue tags that an anonymous surface needs: Next's server
rendering revalidates `date:{id}` for a page it serves to signed-out readers. Making the path answer
anonymously with the public subset changes who may call it, what `Vary` it carries and whether it
can be cached at all. It was right not to take it — it is not a translation and nobody had decided
it.

**The decision: the `401` stays.**

**They are two resources, not one resource with two audiences.** A session-scoped pull feed answers
*what changed for you since your cursor*; a public invalidation stream answers *what changed in the
catalogue since T*. Their cacheability requirements are opposite — the first must `Vary` on the
credential and can never be edge-cached, the second is worthless unless it is. Serving both from one
path gives the public half the private half's `Vary`, so a revalidation check hits origin every
time, which is most of what the path exists to save.

**Reversibility decides the remainder, which is the mission's own criterion.** Making a path
anonymous cannot be undone — once clients call it without a credential, the credential cannot come
back. Adding a separate public path later is purely additive. When one direction is reversible and
the other is not, and neither is clearly right, take the reversible one.

**The accepted cost**: public pages fall back to time-based revalidation at stage 1. That is a
performance property, not a contract property, and a measurement can reopen it.

**What must not happen is designing the public path now.** Nobody has designed it — keyed on time or
on entity, what window, what a client that has been away a week receives, whether it is a feed at
all rather than an `ETag` on each catalogue read. D-022 applies exactly: what has no source does not
enter the contract. The gap is written down with what it would take to fill it, and the shape is
left alone.

**And a recount that corrected me.** I had passed on "three listed-but-unemitted against four
emitted-but-unlisted" as one defect in two directions. `backend-contracts` established that
`x-arthome-invalidates` names what the **caller caused**, so a catalogue tag reaching this feed
because the *studio* published is listed-and-unemitted **by construction**. Counting the two lists
against each other proves nothing. Only the other direction was ever a defect — four account tags a
Next server would have revalidated on keys it never receives — and it is closed.

### D-031 — E2 is a rule about documents, not about data

**Arrived at by `auth`, from the other end, and it generalises past its file.**

Critical rule 15 was written for operational constants: one owning document, reference it, never
copy it. `adr-auth.md` then committed the fault about its **own alphabet** — a precise scoped
sentence at line 240, a summary fifty-nine lines below that generalised past it, and a third line
underneath having to explain the exception, which only makes sense if the others are not exceptions.
Three rows, two of them disagreeing with the one between them, in the section whose entire subject
is not restating values.

**So the project's dominant fault is not bad data. It is the same thing said twice.** E2 found it on
eight data fields, and a CI gate can catch it there. **Prose has no gate.** The only defence is the
same one: state a fact once, reference it afterwards.

**And `auth`'s diagnosis of why one copy drifted is the part worth keeping**, because it appeals to
neither care nor competence: *the measured table was computed; the contrast table was adopted.* Both
were in one file, forty lines apart, by one author with one set of facts. The difference is
provenance.

**Rule 15 is therefore extended in practice, not in wording**: it already says an operational
constant has one owning document. It turns out to say the same of any fact stated precisely once —
including a fact about the document's own subject, restated in a summary two tables away.

*Extended to this journal as well. Two of the entries above are corrections of reasons the lead
wrote without the facts to write them: D-027b, and the specimen carried in `adr-auth.md` §9.4.
Having the facts is no protection, because the gap being filled is the one the author cannot see.*

### D-032 — Four instances, and the fourth was inside the correction

**A postscript to D-031, because the mechanism it names kept operating while it was being written.**

Over two days the same failure occurred four times, in descending order of excuse:

| # | Who | What | What caught it |
|---|---|---|---|
| 1 | the lead | D-027: a reason invented for a removal, after being asked why there was no record | `backend-domain` went and read `core` |
| 2 | the lead | "your alphabet excludes both members of each confusable pair" — true of one class in seven | arithmetic on the alphabet string |
| 3 | `auth` | adopted 2 into `adr-auth.md` §5.1, fifty-nine lines below its own correct scoped sentence | arithmetic, again |
| 4 | the lead | **inside the message correcting 3**: two false facts and a third omission | two `git show`s by `auth` |

**The fourth, in full, because it is the best specimen.** In a message whose entire subject was that a
plausible account is not a checked one, I wrote *"I committed 924 lines as `c63b6a2` and have not
committed since"* and closed with *"966 lines"*. Verified since:

- `c63b6a2` is **933** lines, not 924;
- there had been **three** commits since — `4895102`, `c681f4f`, `8ac8e5b`;
- **966 matches no revision of the file.** The sequence is 846 → 896 → 900 → 933 → 992 → 1015.

**Where 924 and 966 came from is the whole diagnosis.** Both are numbers `auth` reported in earlier
messages. I did not invent them; I **relayed reported figures as verified ones**, in a message
arguing against exactly that. `auth`'s own formulation covers it without appealing to anyone's care:
*the measured table was computed; the contrast table was adopted.* I adopted its line counts.

**And a fifth thing neither of us noticed at the time**: `8ac8e5b`, whose message is about
`check-vocabulary`, also committed `adr-auth.md` at 1015 lines. Named path, not `git add -A`, so
nothing was swept in by accident — but the commit message does not describe what the commit
contains, which is the same fault in the one place a future reader will look for it.

**The remedy, arrived at by `auth` and then withdrawn in favour of a stricter one.** "Quote the SHA"
only covers the case where a SHA exists. **The working tree has no name.** Two `rg` runs two minutes
apart are reads of a thing that cannot be cited, and in a tree with nine writers a statement about
file state decays between the checking and the sending — `auth`'s own closing report, *"HEAD
`c681f4f`, 992 lines, working tree clean"*, was accurate when written and stale on arrival.

So: **a sweep whose result will be acted on runs against a named revision** — `git show <sha>:path`,
never `rg` over the tree. Which also means committing a teammate's work before reporting on it.

**What this does not mean.** Not that anyone was careless, and not that more care would have helped:
instance 3 sat forty lines from its own refutation in a file its author had reread twice, and
instance 4 was written by the person who had just named the mechanism. The only thing that worked,
all four times, was **running something short** — a `git show`, a division, a grep against a commit.

*The check that settles it is almost always shorter than the argument about it.*

### D-033 — The spelling reversal holds, on a population I had counted wrong

**`backend-domain` accepted the ruling and refused to execute it silently**, which is the right
order. Its objection: §5.2's count was taken on the **contracts**, and the job lands on **`core`**.

**Recounted, and my original figures were wrong in composition though not in direction:**

| | |
|---|---|
| contract members, lowercase `snake_case` | **112** |
| contract members, `SCREAMING_SNAKE` (error codes — a different class, wrongly counted before) | 14 |
| contract members, `kebab-case` | **10** |
| **`@arthome/core` kebab literals** | **~124** (103 vocabulary members) |

So "12 exceptions" was the wrong shape of the job by an order of magnitude, and 14 of my 125 were
error codes that never belonged in the comparison.

**The ruling holds, and the recount strengthens it rather than weakening it.** The criterion was
*which side is expensive to change*. Those 103 core members are the ones that have **not yet reached
a contract** — cheap today, expensive the moment they are published. Deferring converts exactly the
population the criterion is about from cheap to expensive.

**Timing, which is the decisive part and which nobody had raised.** `packages/` holds `core` and
`tooling`. **`@arthome/contracts` does not exist yet.** Every day it does not is a day the
conversion is 103 members; the day after it does, it is 103 members plus every zod schema and the
OpenAPI they must emit. **This is the last cheap moment**, and that is the whole reason to do it now
rather than schedule it.

**The `shared/` objection, answered rather than dismissed.** Nine of the 103 are `shared/`'s own
spelling — `multi-screen`, `co-production`, `off-topic`, `read-only`, `replay-online`, `free-dates`,
`no-ads`, `one-live-month`, `all-lives` — verified present in both. D2 makes `catalogue.json`
authoritative, so converting them makes `core` diverge from the read-only handoff.

**D2's authority is over the vocabulary, not over its lexical form** — over *which names exist and
what they mean*, which was the question when two tables competed. And **the port is already not
verbatim by design**: D1 drops `light` and adds `essential`, D7 turns relative offsets into ISO
instants. A port that already corrects the vocabulary and the shape is not made unfaithful by
normalising the separator. `shared/` is a mockup; it will never be a wire.

**What `backend-domain` did with `data-model.md` §0 is the model for this class of situation.** That
section asserted kebab-case "to the letter", which the ruling made flatly false. It did not convert
the code and it did not leave the document lying: it replaced the rule and **recorded the reversal
with a note that the code has not converted yet.** *A document that says what the code does not do is
worse than either spelling.*

### D-032 (amended) — the short check must be able to fail

**`auth` produced a fifth instance and it is not the same fault as the other four.**

I reported *"your file is at 1015 lines in HEAD"*. It was **true, measured, against a named
revision — and useless.** Its deduplication fix was uncommitted, so HEAD carried the alphabet twice
while its tree carried it once; the fix was a same-line substitution, so **the line count was
identical on both sides**. The proxy was invariant under the exact defect it was being used to rule
out.

Instances one to four were plausible claims **adopted** without checking. This one **was** checked,
honestly, and reported correctly. The failure was in **what was measured**.

**So the rule gains its second half**: *run something short* is necessary, and **the short thing has
to be able to fail for the reason you care about**. A check that cannot distinguish the two states
you are choosing between is decoration, however honestly it was run.

**And `auth` took the half that is its own**, which completes the diagnosis: 924 and 966 were
relayable as facts because they had been reported **without a revision attached**, in a file changing
under both of us. *A number stated without its revision is an invitation to be quoted back.*

### D-034 — `displayState` is two vocabularies, and the `shared/` port is a migration not a codec

**Two findings from `backend-contracts`, one of which is not a spelling question at all.**

**1. `displayState` — verified, and worse than reported.**

| | |
|---|---|
| `@arthome/core` `DISPLAY_STATES` | `draft` `reserve` `scheduled-soon` `technical` `room-open` `on-air-live` `replay-available` `finished` `postponed` `cancelled` `interrupted` — **11** |
| both contracts | `scheduled` `room_open` `live` `replay` `ended` `postponed` `cancelled` `interrupted` — **8** |

**Three members match. Three exist only in core** (`draft`, `reserve`, `technical`). One differs by
separator (`room-open`). **Four differ by word**: `scheduled-soon`/`scheduled`,
`on-air-live`/`live`, `replay-available`/`replay`, `finished`/`ended`.

This is not a separator divergence. It is **two independently authored vocabularies for the same
field**, and it is the field critical rule 2 was written for — *any value displayed twice comes from
`@arthome/core`*. `displayStateOf` can return a value neither contract can express. Rule 10 means a
client degrades rather than breaks, so it will never announce itself; the contract simply lies about
its own vocabulary.

**`backend-contracts` filed it as "probably harmless by construction, since a draft date never
reaches the storefront" and then said the thing that makes it a finding**: *"probably harmless by
construction" is the sentence that precedes every one of these.* It is right. And note the **studio**
contract carries the same eight — yet `draft`, `reserve` and `technical` are studio states by
definition.

**To reconcile, not to patch**: either the contracts declare what `displayStateOf` can actually
return, or `displayStateOf` is not the wire value and something else is. `backend-domain` and
`backend-contracts` together; core is the source, so the wire moves unless the domain is wrong.

**2. `co-production`, and the distinction that resolves it.**

`backend-contracts` unified the twin on **kebab**, against D-033, and **flagged it rather than
complying** — which is the right order and the reason it gets a ruling instead of a correction. Its
argument: K6 pins that family's spelling to `shared/` "to the letter", so converting the wire while
the source stays kebab is the transform D-033 forbids.

**The argument is good and the conclusion is wrong, because two different things were being called a
transform.**

- **`shared/` → `@arthome/core` is a one-time port.** It already normalises by design: D1 drops
  `light` and adds `essential`, D7 turns relative offsets into ISO instants. A port that corrects
  the vocabulary and the shape is not made unfaithful by normalising a separator.
- **`core` ↔ the wire is a live boundary.** *That* is where a transform becomes a parallel table
  with a codec's costume, because both sides run at the same time and both can drift.

`shared/` is a mockup fixture. It is not a runtime participant and never will be. So: **`shared/`
does not convert, `core` converts, both contracts converge on `snake_case`, and the whole
entitlements family moves in one commit.**

**What K6 actually established is untouched by this.** K6's defect is the **divergence** —
`opens.includes('multi-screen')` against a payload carrying `multi_screen` returns false in silence,
and `adr-auth.md` §7.1 calls that an authorization defect rather than a display defect. It is closed
by the two sides agreeing, and D-033 decides which way. K6 never required kebab; it required one
spelling.

**And the same defect is live in a second family.** `CHAT_MODES`: core exports `'read-only'`, both
contracts carry `read_only`, so `mode === ChatMode.READ_ONLY` is **false in silence** and chat falls
to the else-branch. It gates what a viewer may do in a live chat. Neither side knew until a gate
compared them — which is the whole argument for gate 18 in one line.

**The count of this job has now been wrong three times**: mine at 12, `backend-domain`'s at 103,
`backend-contracts`' machine-produced 54 across 20 vocabularies. Only the last was measured on the
right population by the right method. *Take the machine's number.*

### D-035 — The suffix premise was empirically false, and `displayState` resolves mechanically

**`backend-contracts` answered `displayState` by comparing every core vocabulary against every
other, rather than by arguing about names. I re-ran the comparison and it is larger than it
reported.**

**Twenty values of 183 are already shared across two or more of the 44 vocabularies**, and
`arthome-check-enums` is green on all of them:

| value | vocabularies |
|---|---|
| `cancelled` | `SUBSCRIPTION_STATES` `DATE_OUTCOMES` `DISPLAY_STATES` `INCIDENT_KINDS` |
| `interrupted` | `RUN_STATES` `DATE_OUTCOMES` `DISPLAY_STATES` `INCIDENT_KINDS` |
| `scheduled` | `PAYOUT_STATES` `PUBLICATION_STATES` `DISPLAY_STATES` |
| `none` | `REPLAY_POLICIES` `LANGUAGE_DEPENDENCIES` `AUDIENCE_SANCTIONS` |
| **`moderation`** | **`MEMBER_ROLES` `CREW_ROLES`** |
| `director` `video` `sound` | `MEMBER_ROLES` `CREW_ROLES` |
| …twelve more | |

**So D-027's premise was false, and I accepted it without checking.** It records `moderation_page`
winning because *"two closed vocabularies cannot share a value here, since `arthome-check-enums`
discovers values rather than vocabularies"*. The codebase shares twenty, the gate is green, and
**`moderation` itself is one of them** — shared between `MEMBER_ROLES` and `CREW_ROLES`, which is
the exact collision the suffix was invented to avoid.

**The conclusion survives on a different argument, and it is `backend-contracts`' one.** Inside
`EffectiveRights`, `roles: [moderation]` and `navigation: [moderation]` would sit **in the same
payload meaning two different things**. That is a fact about the wire, not about a gate, and it
passes the criterion set in D-033: a suffix goes on the wire only if it reads correctly on its own
merits, and disambiguating two fields of one payload is a merit.

*A conclusion that survives the failure of its stated reason was reached for a reason nobody wrote
down.* The right record is the surviving argument, not the comfortable one.

**`displayState`, resolved.** `DISPLAY_STATES` already shares six of its eleven members with other
vocabularies and disambiguated the other five — so the disambiguation was a **habit**, and this very
vocabulary broke the supposed rule six times over. Two of the four also failed on their own merits:
`on_air_live` says live twice, and **`scheduled_soon` was factually wrong** — `displayStateOf`
returns it whenever `now < roomOpensAt`, which includes a date six months out. *A card that says
"soon" about next spring is a card that lies.*

Core has converted: `draft` `reserve` `scheduled` `technical` `room_open` `live` `replay` `ended`
`postponed` `cancelled` `interrupted`. **What remains is the defect underneath the naming
question** — both contracts declare eight and cannot express `draft`, `reserve` or `technical`,
which a **studio** date is in by definition. The contracts gain the three.

**And the method is the transferable part.** `backend-contracts` put it better than the finding:
reading both sides **as data** — core's `as const` arrays parsed out of TypeScript, the contracts
parsed out of YAML — and comparing sets. *A grep finds what you thought to look for; a set
difference finds what nobody thought to look for.* Six shared values and two factually wrong names
fell out of a question that was only ever about hyphens.

### D-036 — Four rulings from the conversion, and my surface-name exemption was wrong

**1. `SURFACES` converts on the wire. My exemption was wrong and core was right to move past it.**

I ruled the five surface names *"plainly justify themselves"* because they are repository names.
`backend-contracts` left them kebab on that basis; `backend-domain` converted core anyway; and the
two now disagree on a value that is **a required header validated on every request to both BFFs**:

| | |
|---|---|
| core | `storefront_web` `storefront_mobile` `storefront_tv` `studio_web` `studio_mobile` |
| wire | `storefront-web` `storefront-mobile` `storefront-tv` `studio-web` `studio-mobile` |

`X-Arthome-Surface`, `required: true`. If the BFF validates the header against core's `SURFACES`,
**every request from every surface is a 400, from the first deploy.** Not a display defect.

**The exemption was reasoned from resemblance, not from function.** Nothing requires the header
value to equal a directory name — the resemblance is a coincidence, and I turned it into a rule. A
required input enum is a wire vocabulary in the fullest sense there is. **The wire converts.**

`account:payment-methods` keeps its exemption, and on a different basis that survives the same test:
it carries a colon and belongs to Next's `revalidateTag` namespace, not to ours.

**2. Error and failure codes are a named third family, not a minority exception.**

`conventions` asked whether `WatchVerdict.reasonCode` and `PairingOutcome.failureCode` — entirely
`SCREAMING_SNAKE` — are a family or a divergence, and flagged that "the minority is the exception"
was the reasoning that got reversed in D-033.

It was right to flag it, and this is not that. **D-033 reasoned from a count; this reasons from a
kind.** The test is predictive: what would a *new* error code be? Obviously `SCREAMING_SNAKE`. What
would a new domain value be? Obviously `snake_case`. Two rules, each of which decides the next case
without being consulted. A count decides nothing about the next case.

So §5.2 names three families: `snake_case` for domain vocabulary, `SCREAMING_SNAKE` for error and
failure codes, and the declared exemptions.

**3. The gate is blind to exactly the half that fails hard.** Measured by `backend-contracts`:

| | blocks | distinct values | seen by `check-vocabulary` |
|---|---|---|---|
| `x-arthome-vocabulary` (output) | 149 | 374 | **yes** |
| `enum` (input) | 77 | 191 | **no** |
| values existing only in an `enum` | | **60** | **no** |

And the asymmetry runs the wrong way. An **output** vocabulary degrades gracefully — critical rule
10 keeps an unknown value raw and treats it as neutral. An **input** enum **rejects**: a 400 on
every request from the first deploy, which is precisely how `SURFACES` would have failed.

**The gate covers the half that fails softly and misses the half that fails hard.** The fix is not
to make inputs into vocabularies — that would destroy the strict-on-input, tolerant-on-output
asymmetry the contract is built on. `check-vocabulary.py` reads `enum` as well, under the same
annotation.

**4. `check-enums` has lost a capability, and the trade is accepted deliberately.**

The debranding collapsed twenty values onto ones that already existed, so it now reports 182 rather
than 202. The 44 vocabularies are intact and it still passes — but it maps a value to the **first**
vocabulary that declared it, so **it still catches a copied literal and can no longer name where the
literal came from.**

Accepted, because `check-vocabulary` compares per vocabulary and is the replacement. But it is a
real loss in the anti-E2 gate and it is recorded as a choice rather than discovered later — and
there is a **gap in the meantime**: `check-vocabulary` covers 3 of 149 blocks today and no input
enums at all. Until both close, the anti-E2 coverage is thinner than it was a week ago.

**5. `automatic_filter` stays**, and not on forward-compatibility grounds, which D-022 would refuse.
The project owner stated automatic moderation as a direction — *"nous on pourra faire de la
modération automatique à terme aussi"* — so it is a **stated** intention rather than an untested
one. And the distinction `backend-domain` draws is real and not a synonym: **`automatic_filter`
decides at ingestion, `retroactive_filter` reclassifies what already exists.** Two moments, not two
names. What matters is not the enum member, which rule 10 makes additive and safe; it is the three
constraints it carries — an automatic moderator takes no lease, precedence is one-way, and the
origin survives settlement so *"removed by the filter, confirmed by X"* does not collapse into
*"removed by X"*.

### D-037 — `DATE_CANCELLED` / `date_cancelled` is not a twin, and the twins check must learn the families

**The gate is red on a false positive**, which is the one state a gate must not stay in for long:
*a gate that shouts wrongly gets disabled.*

It flags the same value spelled two ways across the contracts. Read as data, the two blocks are not
the same vocabulary:

| block | members |
|---|---|
| `WatchVerdict.reasonCode` (storefront) | `NO_SEAT` `ROOM_NOT_OPEN` `OUT_OF_TERRITORY` `SUBSCRIPTION_REQUIRED` `NO_REPLAY` `REPLAY_EXPIRED` `REPLAY_NOT_ON_SALE` `PREVIEW_EXHAUSTED` `CONCURRENT_LIMIT_REACHED` `DATE_CANCELLED` |
| refund `reasonCode` (studio) | `goodwill` `date_cancelled` `duplicate` `dispute` |

One answers **why a viewer is refused playback** — a refusal code, and `SCREAMING_SNAKE` is the
family D-036 named. The other answers **why a refund is being issued** — a domain reason, and
`snake_case` is its family. *The same fact appears in two vocabularies, spelled correctly in each.*

**So the twins check is comparing across families, and it must compare within one.** Two values are
twins when they differ only by separator or case **and belong to vocabularies of the same family** —
never otherwise. A check that flattens case cannot tell a family from a typo.

This is not a retreat from the twins check, which found three real defects. It is the same
correction this gate has taken twice already: **judging a value by its shape without asking what it
belongs to.**

**And it surfaced a question nobody had asked, which is worth more than the false positive.** The
two blocks share the field name **`reasonCode`** while carrying unrelated vocabularies. Different
schemas, so nothing collides on the wire — but a generated client may well produce one `ReasonCode`
type from both, and a human reading the two contracts will assume one vocabulary and be wrong.

That is the `displayState` shape and the `la surface` shape a third time: **one name, two meanings,
disambiguated only by where you are standing.** It is a question for `backend-contracts`, not a
ruling: either the two names differ, or the contract says in both places that they are unrelated.

### D-038 — `decideWatch` diverges in case, and the conversion was scoped by a directory

**Found by `backend-contracts` annotating the 78 blocks that did not match. Verified before ruling.**

**1. The whole refusal vocabulary is `read_only` again, in upper case.**

| | |
|---|---|
| wire, `WatchVerdict.reasonCode` | `NO_SEAT` `ROOM_NOT_OPEN` `OUT_OF_TERRITORY` `SUBSCRIPTION_REQUIRED` `NO_REPLAY` … |
| core, `WATCH_DENIAL_REASONS` | `no_seat` `room_not_open` `out_of_territory` `subscription_required` `no_replay` … |

**Ten concepts, ten matches, every one differently cased** — so `reasonCode === WatchDenialReason.NO_SEAT` is false for all ten. This is `decideWatch`, whose refusal codes are the entire refusal experience of the storefront, and the contract's own text promises that *"a card announcing 'subscription required' and a player refusing for the same reason say the same code."* They do not. Core also carries an eleventh, `not_published`, that the wire never serves.

**The ruling follows from two decisions already made and does not need a third.** D-036 names `SCREAMING_SNAKE` the family for refusal and failure codes, and D-037 places `WatchVerdict.reasonCode` in that family by name. D-033's floor rule says `@arthome/core` exports exactly the value that goes on the wire. **So core moves up**, and the wire gains `NOT_PUBLISHED` — because `decideWatch` returning a value no contract can express is the `displayState` defect with a different field.

*That is the third silent equality failure in the same shape* — `multi_screen`, then `read-only`, now a whole vocabulary at once. The first two differed by a separator; this one differs only by case, which no separator-insensitive check would ever have caught.

**2. `fallbackAction` is two independently authored lists, and the merge has a rule rather than a taste.**

Wire: `buy_seat` `join_waitlist` `none` `see_replay_policy` `subscribe` `watch_preview`.
Core: `buy_seat` `none` `release_a_screen` `see_other_dates` `subscribe`.
Three shared, three wire-only, two core-only — on the field that decides **which button a dead-end
screen offers**.

Neither side is simply right, so the union is not the answer either. **A fallback action exists to
answer a denial reason**, which makes the two vocabularies coupled and the merge checkable: every
denial reason must have an action that answers it, and every action must answer at least one denial
reason. `concurrent_limit_reached` wants `release_a_screen`; `date_cancelled` wants
`see_other_dates`; `no_seat` wants `buy_seat` or `join_waitlist`. Any member surviving that pass
without a partner is the one to argue about.

**3. THE SYSTEMATIC CAUSE, AND IT IS THE FINDING OF THE ROUND.**

Nine vocabularies live outside `packages/core/src/vocabulary/` — in `entitlement/`, `moderation/`,
`catalog/`, `replay/`, `i18n/`, `format/`, `kernel/`. **The suffix and separator pass covered the
directory; the gate discovers the whole tree.** So `MODERATION_BADGES` still reads `badge_banned`
against a bare wire, on a field *named* `badge` — the `crew_director` fault, still standing, because
its file sits in `moderation/` rather than `vocabulary/`.

`backend-contracts` named it better than I can: **location is not a property anyone intended to
matter, which is exactly why it did.** A conversion scoped by a directory is a conversion scoped by
where someone happened to put a file, and nothing announces the omission — the gate that would have
caught it was being written at the same time.

**4. The publication checklist: one vocabulary of nine, blocking as a property of the item.**

Core splits `PUBLICATION_CHECKLIST_ITEMS` (7) from `PUBLICATION_WARNING_ITEMS` (2); the contract
serves nine with blocking as a field. Both are defensible and `backend-contracts` asked for a pick.

**The contract's shape wins, on two grounds.** Promoting a warning to blocking is a product decision
that will happen; under the split it moves an item between vocabularies, which is a breaking change
for anyone matching on either, while under one vocabulary it flips a boolean. And a client rendering
the checklist wants all nine with their status — two lists force it to concatenate, which is a value
composed twice on every surface. Core moves.
