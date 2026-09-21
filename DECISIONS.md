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
(`README.md`, `Prompt - Storefront TV.md`, `PROMPT.md`) — families A, B and C of
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
