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
| **`zod/mini`, tree shaking OFF** | **85 KB** | not measured |

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

**The third row was added on 24 September 2026, and it is the row that makes the reservation
legible.** The reservation above has always said the gain is *conditional*; it never said what the
conditional case costs. **85 KB — the classic entry's level, so the saving is not smaller, it is
zero.** That number was measured the same day as the other two and recorded in
`needs/storefront-mobile.md`, and it reached neither this table nor any of the four places that
quote this table: `packages/contracts/package.json`, `packages/contracts/README.md`,
`tools/check-core-entry.mjs`, `code-conventions.md` §5.5. **All five now carry it** — see D-066,
which exists because the first version of this entry fixed only the table and `skeptic` caught it
with one grep. All four carry the word *conditional* or
the Metro caveat, and a reader of any of them would price the risk as a reduced saving rather than
as no saving at all.

> ***"Conditional" is not a number, and the four documents that repeated it were repeating the
> hedge rather than the measurement.***

*Surfaced because `storefront-mobile`'s handover note restated the caveat on its last turn, and the
lead first mistook the restatement for a correction — D-012 said it already. Checking that
accusation is what found the row that was genuinely missing.*

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

### D-039 — A coded field names its own vocabulary, and how a family is decided

**1. `reasonCode` was five fields over four unrelated vocabularies, and the breadth chose the fix.**

I had asked for one of two things: either the names differ, or the contract says in both places that
they are unrelated. `backend-contracts` went looking and found the question was wider than the two
blocks I had:

| where | vocabulary |
|---|---|
| storefront `WatchVerdict.reasonCode` | ten refusal codes |
| storefront `DateCard.rights.reasonCode` | `co_production` `broadcaster` `festival` |
| storefront `cancelSeat` request | `viewer_request` |
| storefront `CartQuote.discount.reasonCode` | **bare string, open** |
| storefront `SeatQuote` line | **bare string, open** |
| studio `rights.reasonCode` | `co_production` `broadcaster` `festival` |
| studio `refund` request | `goodwill` `date_cancelled` `duplicate` `dispute` |

**At that spread the second option stops being a fix**: it is seven notes saying the same thing, and
the eighth field added next month will not have one. Two of the seven were not even closed
vocabularies — open strings carrying `plan_pass` and `plan_shop_discount`.

**So every coded field names its own vocabulary**: `denialCode`, `blackoutReasonCode`,
`refundReasonCode`, `cancelReasonCode`, `discountReasonCode`.

**And the part that makes this a convention rather than a rename**: `failureCode`, `originCode` and
`emptyReason` were already doing it. **The generic name was the exception, not the rule** — written
seven times by an author who had followed the rule everywhere else without noticing they had one.

*A convention you can violate seven times without noticing is a convention nobody has written down.*

**The one bare `reasonCode` left is inside `error.params`, and it is not an exception.** `params` is
a bag whose keys are defined **per error `code`**, so the code carrying it is the disambiguator —
**stated rather than inferred**, which is the distinction the whole item turns on.

**2. How a vocabulary's family is decided, because D-036 sharpened this rather than settling it.**

`backend-contracts` was right that D-036 did not classify `WATCH_DENIAL_REASONS`: it says refusal
codes are `SCREAMING_SNAKE` and domain reasons are `snake_case`, but *one vocabulary spelled both
ways* is precisely the case where the families do not tell you which one applies. Either core's list
is misfiled as a domain vocabulary, or the wire should carry it in snake.

**The test is D-036's own, applied to the concept rather than to the spelling**: does a member answer
*why something was refused*, or does it state a *domain fact*? `no_seat`, `room_not_open`,
`subscription_required` are refusals — they exist only inside a verdict that says no. `goodwill`,
`duplicate`, `dispute` are facts about a refund that exist whether or not anything was refused.

So `WATCH_DENIAL_REASONS` is the refusal family, core moves up, and D-038's ruling stands on a
reason rather than on an assertion.

### D-040 — The non-public states keep falling out, and acting ahead of a document was right

**1. `backend-domain` asks whether moving core ahead of §5.2 was wrong. It was right, and the order
is the point.**

§5.2 prescribes lowercase `snake_case`, so core was arguably conformant and the wire was not. It
moved core anyway, because **D-036 had already created the refusal-code family** — §5.2 simply had
not been updated yet, and `conventions` was asked for the row on the same day.

*A decision precedes the document that records it.* Waiting for §5.2 would have left ten values
comparing false in silence in order to respect a sentence already superseded — which is the
`data-model.md` §0 fault inverted: not a document saying what the code does not do, but code waiting
for a document to catch up.

What makes it safe rather than reckless is what it did next: **it wrote the reasoning into the
module, so nobody silently "corrects" it back**, and it flagged the missing row rather than assuming
someone would notice. Act on the decision, then make the document catch up, and leave a trace where
the next reader will stand.

**2. THE PATTERN, AND IT IS A BLIND SPOT RATHER THAN THREE ACCIDENTS.**

Two core vocabularies carry `draft`, `reserve`, `technical` — `PUBLICATION_STATES` and
`DISPLAY_STATES`. Both wire counterparts had lost them, and `WATCH_DENIAL_REASONS`' `NOT_PUBLISHED`
— the value returned **for** exactly those three states — is also missing from the wire.

So it is one blind spot expressed three times, not three incidents: **the three non-public states
are invisible to whoever authored the wire vocabularies, because they are invisible to a viewer.**
The author was picturing what a spectator sees, and a date in `draft` is not something a spectator
sees. But the **studio** sees it, the domain returns it, and a contract that cannot express what the
domain returns is the `displayState` defect wherever it appears.

**The remedy is a gate, not vigilance.** Every member of a domain vocabulary must be expressible
somewhere in the contracts, or carry a named exemption saying why it is domain-only. That is the
inverse of what `check-vocabulary` does today — it compares annotated blocks against core; nothing
asks whether core has members the wire can never carry. *A vocabulary's members are checked in one
direction only, which is why the gap ran three deep before anyone saw it.*

**3. `fallbackAction` is not a vocabulary merge, it violates a written requirement.**

`adr-stream-entitlement.md` §3.3 requires that a `CONCURRENT_LIMIT_REACHED` refusal be served **with
the list of active sessions**, because a bare refusal *"would leave the viewer with no way out,
which the file's principle no. 8 forbids"*. The contract carries the refusal and has no action
expressing its remedy.

So the pairing rule of D-038 — every denial reason gets an action, every action answers a reason —
is not a tidiness principle I invented. **An independent document had already required it for the
hardest case**, and the divergence is a contract failing an ADR rather than two lists disagreeing.

**4. A fourth form of the same fault, and it is the subtlest so far.**

`backend-domain` reported "separator divergence 0" while its check compared **only separators**.
Case-divergent values fell into a bucket its script labelled *"absent from the wire"*, which it read
as *"domain-only, not yet published"*. Ten of them were in a list it printed and read.

Its own words: ***asserting against my own tool's output without re-reading what the tool
measured.*** Not a transcription, not the wrong text — a correct measurement of the wrong quantity,
whose label invited the wrong reading.

That is D-032's fifth instance with a different surface: I reported "1015 lines in HEAD", true and
measured and invariant under the defect it was ruling out. **The short thing has to be able to fail
for the reason you care about** — and a bucket named for what it contains, rather than for what put
things in it, will be read as the first and used as the second.

### D-041 — A check is scoped by something, and the scope is invisible unless the output says so

**`backend-contracts` wrote the sentence that unifies every measurement failure of this week**, and
it generalises further than the finding it came from:

> *A check is scoped by something, and the scope is invisible in the output unless the output says
> so.*

Every one of these was an honest measurement read as an answer to a question it never asked:

| the check | scoped by | what fell outside |
|---|---|---|
| ~~the separator conversion~~ | ~~a directory~~ | **retracted — see D-043.** The conversion globbed the whole tree; the row was my own unchecked inference |
| `backend-domain`'s divergence check | **a separator** | ten values differing only by case, in a bucket labelled *"absent from the wire"* |
| my *"1015 lines in HEAD"* | **a line count** | a same-line substitution, invariant by construction |
| my read of a gate's status | **the last command in a pipe** | the gate's own exit code |
| my `verbatim` rule for quotations | **existence, not narrowness** | a quotation of `"e"`, which skips every line and passes the whole file |

**And the counter-example is the one that proves the rule.** `backend-contracts`' comparison is a
**set difference**, and *"only the third announces its scope, by construction, because a set
comparison has nowhere to hide a narrowing."* That is the design principle: **prefer a check whose
scope is structurally visible** over one whose scope lives in the author's head and in a label
nobody rereads.

**Two agents read one number wrongly, which is what makes it structural rather than careless.**
`backend-domain` reported *"divergence 0"* from a separator-only check; `backend-contracts` read
that number as *"no divergence"* and reported the case divergence two days later as a fresh finding,
without asking what could have produced a zero. Neither was wrong to trust the other. **The number
had no scope attached, so it could not be trusted correctly.**

**MY `verbatim` RULE DID NOT DO WHAT IT SAYS, AND `conventions` FOUND IT.**

I designed the quotation exemption so that the text must appear verbatim in the file, *"so an entry
cannot widen into a blanket pass"*. Verbatim guarantees a quotation **exists**. It guarantees
nothing about how **narrow** it is. A quotation of `"e"` appears on nearly every line, skips every
line, and passes the entire file — **a blanket pass through the front door**, defeating exactly the
property the rule was written to provide. Demonstrated, then fixed, then verified: a single-letter
entry now fails.

**And its first fix was worse than the hole, for a reason worth more than either.** It required the
quotation to contain a word from the gate's `FRENCH` list — which rejected *"les quatorze entrées de
navigation"*, manifestly French, because that list is deliberately **narrow**: it holds only words
that cannot be English or an identifier.

> **Detection wants few false positives, so its list is narrow. Validation wants few false
> negatives, so it would need a broad one. Not the same instrument.**

The bound that works is **structural** — a quotation may cover a quotation, not a document: at most
three lines. It has no view about language, refuses `"e"` on the ground that actually matters, and
**cannot be wrong about French**. The floor rule: *when a rule can be enforced by counting instead
of by judging, count.*

**A RULING THAT CREATES A FAMILY CREATES WORK IN EVERY GATE THAT ASSUMED THERE WAS ONE.** D-036
created the `SCREAMING_SNAKE` family a day after the twins check was written, so the check's
case-insensitive grouping began merging a refusal code with a refund reason — a false positive
manufactured by a correct ruling arriving after the tool. Now grouped separator-insensitively but
**case-sensitively**, with a case difference reported as a **note**: legitimate across families,
suspicious within one, and *the gate cannot tell while a human can.*

**AND THE GATE IS DELIBERATELY RED, WHICH IS THE RIGHT ANSWER.** `backend-contracts` annotated
`WATCH_FALLBACK_ACTIONS` knowing it disagrees, rather than leaving it undeclared until core catches
up: *"un-annotating it would hide a real divergence behind 'undeclared', which is widening the
allowance by another name."* A gate red on one named divergence in live work is worth more than a
gate green because nobody declared the thing it would have caught.

### D-042 — A rule expressed by an omission, and the third verdict an input needs

**`backend-contracts` followed the generic-name tell and found a class rather than a defect: six
blocks are a strict subset of a domain vocabulary, every one an input, and what each one leaves out
IS the rule.** Two verified against the documents:

| | accepted | domain vocabulary | omitted |
|---|---|---|---|
| `PUT /run/state` | `idle` `rehearsal` `on_air` `ended` | `RUN_STATES` | **`interrupted`** |
| `POST …/publication/transitions` | `draft` `reserve` `scheduled` `technical` `replay_online` | `PUBLICATION_STATES` | **`live` `ended`** |

**`interrupted` is absent because an interruption is *declared by `raiseIncident`*, never asked
for** — a control room able to set it directly would have two ways into one state and only one of
them raises the incident viewers see. **`live` and `ended` are absent because they are *caused by a
`streaming` event*** — publication does not command the broadcast, it learns of it, and offering
them would let a studio declare a date on air that is sending nothing.

Those are two of the most important sentences in either contract, and **neither is written
anywhere. Both are expressed by an omission.**

**THIS IS THE EXACT INVERSE OF E2, AND IT IS WORSE.**

E2 is a fact stated **twice**, the copies drifting apart — and every remedy this project has built
attacks that shape: one owning document, reference it, a gate that compares two artefacts. This is a
fact stated **zero times**, carried entirely by an absence.

An absence has no owning document. There is no line to reread, no copy to compare, nothing for a
gate to point at, and **no way to tell a deliberate omission from an oversight** — which is exactly
what the six look like today. `backend-contracts` put it in the form of D-039's sentence: *nobody
wrote down that an input enum may narrow its vocabulary, so six of them did it silently, correctly,
and unverifiably.*

**THE GATE HAS TWO VERDICTS WHERE AN INPUT NEEDS THREE.** A narrowing is not `source: none` — it is
not *"no domain counterpart"*, it **is** the domain vocabulary, restricted, and the restriction is
the contract's content. Today it can only be recorded as **undeclared**, which is indistinguishable
from a block nobody has looked at. *Six of the 47 undeclared inputs are the most reviewed blocks in
the document.*

**Adopted, in the shape proposed:**

```
x-arthome-vocabulary-source:    RUN_STATES
x-arthome-vocabulary-narrowing: interrupted is declared by raiseIncident, never commanded.
```

checked as **every member is a member of the source**, with a **mandatory reason** — the same
discipline `source: none` already carries, and for the same reason: *an omission that does not say
why is not a rule, it is a gap.*

**And this is the input asymmetry a second time.** An output vocabulary is tolerant, so a missing
member degrades under rule 10. An input enum is strict, so a missing member is a **refusal**. Which
is why the interesting inputs are precisely the ones that deliberately refuse something — and why
they are the ones the gate cannot currently classify.

**`backend-contracts` did not add the keys**, because annotating with a source the gate compares by
equality would have turned one deliberate red into three. Correct: the gate learns the third verdict
first. It wrote the reason into the four blocks that had no description meanwhile, so the rule is at
least *stated* where it is enforced even before it is checkable.

### D-043 — Retraction: the directory theory was wrong, and I endorsed the judgement that replaced it

**`backend-domain` checked the claim I had built two entries on, and it does not hold.**

D-038 attributed the untouched vocabularies to a conversion *"scoped by a directory"*, and D-041
made that the first row of its scope table. **The conversion passes globbed `packages/core/src/**`,
not `vocabulary/`.** Verified: zero kebab-case literals remain in `entitlement/`, `replay/`,
`kernel/`, `moderation/` or `catalog/`. They were all reached. `WATCH_DENIAL_REASONS` was converted
twice; `REPLAY_UNAVAILABILITY_REASONS` and `FAILURE_NATURES` already agreed with the wire.

**So `MODERATION_BADGES` was never missed. It was kept deliberately, on a reason I endorsed in the
strongest terms I have used for anything this week** — that a badge is a **derived** fact, so
`badge_banned` is not the sanction `banned`, and the suffix carried a distinction rather than
dodging a collision. I called it the sharpest application of the criterion anyone had made.

**It was wrong, and one look at the wire shows it.** The field is named `badge` and carries
`[published, removed, muted, banned]`. So `badge_banned` says *badge* twice — the `crew_director`
fault exactly, which is the fault the criterion exists to catch.

**The real cause is worse than location, and it is shared.** *A judgement made from the value alone,
without looking at the field that carries it.* Nothing reads a value without reading the field it
arrived in, and neither of us fetched that context before ruling. `backend-contracts`' sentence
still applies, one level in: **location was not the property that mattered — context was, and nobody
went and got it.**

**And the instruction I gave would have made it worse.** I told `backend-domain` to re-run the pass
over the whole tree. Had it done so mechanically it would have converted `badge_*` **and recorded my
wrong reason for it** — a correct change filed under a false explanation, which is the one outcome
this log is least able to detect later.

*A retraction is cheap; an endorsement is not. I spent more force on that judgement than on any
ruling of the week, and force is what stops the next person checking.*

**THE INVERSE CHECK, RUN RATHER THAN COMMISSIONED, FOUND A DUPLICATE VOCABULARY INSIDE THE DOMAIN.**

`backend-contracts` did not wait for the gate. Parse every `as const` out of core, parse every
vocabulary and `enum` out of both contracts, subtract. First run: three vocabularies, eight members.

**`REPLAY_UNAVAILABILITY_REASONS` duplicates two members of `WATCH_DENIAL_REASONS`.**
`no_replay_policy` / `NO_REPLAY` are the same fact — the date never had a replay. `replay_window_expired` /
`REPLAY_EXPIRED` are the same fact — it had one and the window closed. **Two vocabularies, two
spellings, two cases, one pair of facts** — and its own doc comment reads *"Why the replay is not
watchable — as a CODE"*, which is the other vocabulary's job description.

**What surfaced it is the point**: only one of the two reached the wire. The forward check compares
what the contract **declared**, so a domain vocabulary nothing declares is invisible to it **by
construction**. That is the fourth instance of the missing direction, found in the first minute of
looking.

**THE TELL, SHARPENED BY `backend-contracts` AND BETTER THAN MINE.** I had it as *"anything a viewer
never sees"*. `LOCALES` breaks that — nobody omitted it for being studio-only. The common factor in
all four instances is the one named for `reasonCode`: **the author was picturing a screen.**

> *`draft` is not on a screen, a locale is not on a screen, a replay-unavailability code is not on a
> screen. **The wire is short wherever the value is not something you can imagine reading.***

**AND THE PAIRING RULE WENT AGAINST ITS OWN AUTHOR TWICE, WHICH IS WHY IT WAS WORTH HAVING.**
`join_waitlist` did not add a member — it exposed a defect: `decideWatch` offered `buy_seat` on a
sold-out date, *a button that leads nowhere*, which is principle no. 8's dead end wearing an
action's costume. And `see_replay_policy` answers a better question than `see_other_dates` did: the
viewer is not looking for another date, they are asking why **this** one has no replay.

The coupling is now **data** — `WATCH_FALLBACK_FOR` maps every reason to its permitted actions, and
the spec asserts both directions *and* that `decideWatch` never returns a pairing the table forbids.
The table cannot drift from the function.

### D-044 — The field was the defect, and a gate that lost the ability to name a source is naming one anyway

**1. `watch_preview` is withdrawn, and what it was hiding is the finding.**

`backend-domain` asked which refusal it answers. The answer is none: a viewer who can still watch a
preview is not refused, the verdict **allows** them. `backend-contracts` could not name a reason
because there is none.

**What it was compensating for**: `WatchVerdict` had no way to say *"allowed, but only as a
preview"*. `PlaybackTicket` — the binding verdict — has carried `scope: full | preview` since it was
written; the **advisory** verdict a card is painted from carried `allowed: boolean` and nothing
else. So a card for a subscription-required date with budget remaining had to infer preview-ness
from `previewSecondsLeft > 0` — **a rule evaluated on three storefronts instead of served once**.

`WatchVerdict` now carries `scope`. In its own words: ***the field was the defect, not the value.***
A vocabulary member had been reached for because it was the only field that could hold the
information — which is a shape worth naming, because the symptom appears in the vocabulary and the
cause is a missing field.

**2. `backend-contracts` found its own parallel literal table, and it had already drifted.**

Its contract description restated the eleven-row pairing table row by row — *"written to prevent
drift, in a document that cannot be executed, beside a table that can"* — and it had **drifted on
two rows within the hour**. It conceded one (`ROOM_NOT_OPEN` should offer `buy_seat`, *"I had
written the dead end I spent this round removing"*) and disputed the other.

E2 committed by the agent removing E2, in the document arguing against it, detected by the copy
disagreeing with its source inside sixty minutes. The description now states the invariant and
points at `WATCH_FALLBACK_FOR`. Only `release_a_screen` keeps its prose argument, because it
discharges an **ADR obligation** rather than a domain preference.

**3. `scope` is an undeclared vocabulary, and that closes two findings at once.**

`WatchVerdict.scope` is an **inline union** — `'full' | 'preview' | 'none'` — declared nowhere.
`backend-contracts` found the mirror from the wire side: `[full, preview]` exists in both contracts
and in no core vocabulary. *The inverse check running the other way: a wire vocabulary the domain
computes and does not declare.*

**Declare `PLAYBACK_SCOPES` in `core` and import it.** One fix, both findings, and it is the shape
every other vocabulary already has.

**4. AND `check-enums` IS NOW MISATTRIBUTING, WHICH IS WORSE THAN THE CAPABILITY IT LOST.**

It fails on six literals in `entitlement/index.ts` and says:

```
'full'  -> belongs to PRICE_TIERS.     Import the constant; do not copy the value.
'none'  -> belongs to REPLAY_POLICIES. Import the constant; do not copy the value.
```

**Both attributions are wrong.** `'full'` there is a playback scope, not a price tier. `'none'` is a
playback scope, not a replay policy. The gate maps a value to **the first vocabulary that declared
it**, and since the debranding collapsed twenty values onto shared ones, that first declarer is now
frequently not the owner.

D-036 accepted that loss deliberately — *"it still catches a copied literal and can no longer name
where the literal came from."* **What it does instead is worse than staying silent: it names one,
confidently, and instructs the author to import a constant that would be semantically wrong** —
precisely the case `enum-literals.allow.json` was written to describe.

**A gate that has lost the ability to name a source must stop naming one.** Where a value is
declared by more than one vocabulary, say so and list them; the author knows which they meant, and a
gate that guesses teaches people to ignore its reasons while obeying its verdicts.

### D-045 — Not all scope is a hazard: incidental scope versus intrinsic scope

**I told `backend-contracts` its generic-name tell was *"scoped by names"* and that a subset test
was *"scoped by nothing"*, as though unscoped were the goal. It ran the unscoped version and the
negative result corrects me.**

| | hits | of which |
|---|---|---|
| scoped by **a name** | — | missed eight |
| scoped by **nothing** | **14** | 6 real · **8 noise** |
| scoped by **the right predicate** | **6** | 6 real, all documented |

**What the eight noise hits were**, and none is a defect:

- **four vocabularies that legitimately nest.** `CREW_ROLES ⊂ MEMBER_ROLES` is true and means
  something — a crew role *is* a member role. Verified. That is a fact about the domain, not a rule
  about the wire. `MESSAGE_STATES ⊂ MODERATION_BADGES` is the three-axes doctrine appearing as set
  inclusion;
- **three artefacts of where it looked** — the description sat one level up, on the array rather
  than on its `items`, so a documented narrowing read as undocumented. *Incidental scope inside the
  check built to expose incidental scope;*
- **one pure coincidence.** `filterSeverity` `[low, medium, high]` nests inside `defaultQuality`
  `[auto, low, medium, high]`. Two unrelated vocabularies, one happening to contain the other.
  Verified.

**THE PREDICATE THAT PUTS IT RIGHT IS ONE SENTENCE: the subset must be *unannotated*, and the
superset must be *named*.** A block carrying its own `x-arthome-vocabulary-source` is not narrowing
anything — it is its own vocabulary, and containment is then a domain fact. A superset that is
nobody's declared vocabulary is a coincidence. With that predicate the test returns **exactly the
six narrowings, all six documented**.

**SO D-041 NEEDED A SECOND HALF, AND THIS IS IT.**

> **Incidental scope** is a property of the instrument, or of where you happened to look — a
> directory, a separator, a line count, the last command in a pipe, a naming convention. It is
> invisible in the output and everything outside it is a silent miss.
>
> **Intrinsic scope** is a property of the question being asked — *"narrows something that has a
> name"*. It is visible because it **is** the question, and what falls outside it is genuinely not
> being asked about.

*Scoped by nothing is not the goal; it is the other failure mode.* An unscoped check finds
everything including the noise, and **noise is how a gate gets switched off** — D-024, which this
project learned by nearly disabling R14. `backend-contracts`' formulation: the useful scope was
neither, *"it is scoped by a property of the thing being looked for rather than by a property of
where you happened to look."*

**That is the difference between a scope that is an accident of the instrument and a scope that is
part of the question** — and it is the sentence I should have written instead of "scoped by
nothing".

### D-046 — The anti-E2 gate was scoped by an invisible property, and it hid three literals

**`backend-domain` found the scope fault inside the tool built to catch the fault it is an instance
of.** Verified at `check-enums.mjs:185`:

```js
listFiles(CWD, SCAN).filter((f) => !SKIP.test(f) && !declaringFiles.has(f))
```

**A file that declares a vocabulary is excluded from the scan entirely.** Sensible on its face — a
file should not be reported for using its own values — so `entitlement/index.ts` **had never been
scanned since it was written**, because it declared two vocabularies of its own.

Moving those two out, for an unrelated reason, made the file visible for the first time and the gate
immediately found three inline literals on `WatchVerdict.scope`. They had been there since the
module was written.

**And the output says nothing.** It prints *"42 file(s) swept"* — not how many it declined, not
which, not why. Incidental scope, invisible in the output, in the gate whose whole purpose is
finding copies. D-041 in its purest form.

**THE FIX IS NOT TO ANNOUNCE THE SCOPE, IT IS TO NARROW IT CORRECTLY.** The skip is too coarse:
**a file should be exempt from its own declared values, not from the scan.** `entitlement/index.ts`
legitimately used `WATCH_DENIAL_REASONS`' members; it was also copying `PRICE_TIERS`' and
`REPLAY_POLICIES`' — and the second is exactly what the gate exists to catch. Scan every file,
ignore the values that file declares.

*That is D-045 applied to the gate itself: scope by a property of the thing you are looking for — a
copied value — not by a property of where it sits.*

**`MESSAGE_DOMAINS` IS NOT EXEMPTED. THE CONTRACT GAINS A FIELD.**

`backend-domain` was asked which core members are deliberately domain-only and **claimed none**,
arguing the single open item is a defect rather than an exemption. It is right. The served
`labelCatalog` carries `{ locale, version, url }` and the theme survives **only inside the URL**, so
a client wanting to know which theme it holds must take a path apart.

Its own framing decides it: ***a value recoverable only by parsing a string is a value the contract
did not serve*** — `imageUrl(kind, key, width)` in another costume, the fault the media renditions
exist to prevent. And this is not D-022 territory: `LabelCatalogRef` in core **already carries
`domain`**; the wire dropped it. One field, restored rather than invented, and it removes a parse
from every client caching by theme.

**TWO AGENTS SWAPPED POSITIONS SIMULTANEOUSLY ON `watch_preview`.** The gate said *contract only*,
then *domain only* — `backend-domain` added it on `backend-contracts`' argument at the same moment
`backend-contracts` removed it on `backend-domain`'s. Each was persuaded by the other and neither
knew.

**And the rejection had been right only on the path it was looking at.** On a live date a preview is
an **allowed** verdict, never a way out of a refusal. On a **replay** nothing offered a preview at
all, so it genuinely had no entry point in the refusal vocabulary. *Two correct arguments about two
different paths, each stated as a fact about the vocabulary.*

**THE COUPLING-AS-DATA DECISION PAID IMMEDIATELY.** `backend-domain` took the pairing table verbatim
and its own assertion — *`decideWatch` never returns a pairing the table forbids* — failed at once:
the table omitted `join_waitlist` from `PREVIEW_EXHAUSTED`, and preview-spent-and-sold-out is
reachable, where `buy_seat` is the button-that-leads-nowhere just removed from `NO_SEAT`. **The test
was worth more than the review** — which is the whole argument for writing a coupling as data rather
than as prose.

**Two smaller things worth keeping.** `DashboardReminder.targetPage` was **two vocabularies merged
in one field**, carrying `moderation` where everything else says `moderation_page` — so a surface
routing on it matched nothing for the destination `moderation_backlog` points at, which is the most
frequent reminder the dashboard produces. The generic-name tell found it on the first pass.

And 38 exemptions were written with **four family reasons rather than thirty-eight**: transport and
media capability, sort and filter keys, external provider vocabularies, presentation choices. *A
family reason is stronger than a per-block one because it says what the whole class has in common* —
and it is the difference between an exemption list and thirty-eight separate excuses.

### D-047 — The chain nobody runs, and three agents reporting a gate red that was already green

**Nine gates pass. `check-vocabulary` compares 113 of 234 blocks with zero disagreements, the
inverse check is at zero, and `typecheck` passes for the first time — because it had never passed.**

**1. `verify` HAD A STEP NOBODY HAS EVER RUN.**

The root `tsconfig.json` declared `types: ["node"]` against an `@types/node` that was never
installed, so `pnpm run typecheck` had been failing with TS2688 **since the day it was written**.

It was invisible for a reason that is the week's lesson in its most consequential form:
**`verify:offline` is the chain everyone actually runs, and it does not include `typecheck`.** The
subset did not announce itself as a subset, so it was quoted as the whole.

> ***A broken step in a chain nobody runs is indistinguishable from one that works.***

And it was wrong on the merits as well as broken: the root project includes `packages/*/src`, so
pulling Node's globals into the program that checks `@arthome/core` would have let a platform API in
**with nothing noticing** — in the package whose entire premise is that it has none.
`verify:offline` now prints what it did not run.

**2. A NEAR-MISS I HAVE COMMITTED TWICE MYSELF.** `conventions`' first version of that notice put
`` `pnpm run verify` `` in backticks inside a double-quoted shell string — **command substitution,
`verify` invoking itself.** It never fired only because the chain failed earlier.

I did the same thing twice this week, in commit messages, and repaired both. Three instances across
two agents of one shell fault, each caught by accident rather than by a rule. *The remedy is not
attention: it is never to put prose in a double-quoted shell string.*

**3. `watch_preview` CROSSED THE BOUNDARY THREE TIMES.**

```
round 1   contracts had it,  domain dropped it   -> contract only
round 2   contracts dropped it, domain added it  -> domain only
round 3   contracts added it,  domain dropped it -> contract only
```

**Each was answering the other's last *message* rather than the other's *code*** — and both had a
correct argument for the position they were leaving. What broke it was both sides independently
going back to `decideWatch` and asking a question that does not depend on whose message arrived
last: ***does a function return it?***

It does not. `entitlement/index.ts:233` returns `allowed: true, scope: PREVIEW, fallback: BUY_SEAT`
on **both** the live and the replay path, so the replay gap was closed by the **field**, not by a
fallback action. The original argument was right for a reason neither of them had at the time.

**And the copy deleted two rounds earlier is what ended it.** `backend-contracts`: *"removing my
eleven-row copy of their table cost me the ability to disagree, and losing it was correct — the copy
I deleted is the copy that would have had me arguing this a fourth time."*

**4. `PREVIEW_EXHAUSTED` SETTLED ON A PRINCIPLE, NOT A PREFERENCE.** `subscribe` genuinely is a way
out of a spent preview — a plan granting `all_lives` opens the date — but `decideWatch` never
returns it there.

> **The table is the function's RANGE, not a menu of everything a screen might offer.**

A table listing what the function cannot produce stops being checkable against the function, which
is the entire reason the coupling was written as data.

**5. I SPECIFIED A NAME WITHOUT CHECKING WHETHER ONE EXISTED.** I told `backend-domain` to declare
`PLAYBACK_SCOPES`. It had already declared **`WATCH_SCOPES`** two rounds earlier, for the reason I
gave, and the wire was already annotated against it. Renaming would have **broken a live annotation
to gain a better name, turning the gate red on the rename rather than on a defect.** It refused, and
was right.

`PlaybackTicket.scope` carrying `[full, preview]` is a **narrowing** of that same vocabulary rather
than a second one — a ticket is only issued for a granted verdict, so `none` is unreachable there.
The D-042 shape, correct for the same reason.

**6. AND THREE AGENTS REPORTED A GATE RED THAT WAS ALREADY GREEN.** `backend-contracts` reported 20
literals, I reported 6, `backend-domain` had already fixed the table and declared the vocabulary
before either message was written. **All three reports were true when measured.**

*The staleness hazard is no longer a hazard, it is the working condition.* It is why the only
reports worth acting on are the ones that name what they measured and when — and why both agents
converged, in the end, not by exchanging conclusions but by going back to the same function.

### D-048 — A tell that only fires on defects would have found none of them

**Closing the vocabulary arc. 193 of 234 blocks declare what they are, against 7 when the gate was
written; zero disagreements on either side; the inverse check at zero with no exemptions claimed by
the domain.**

**1. THE TELL FOUND SOMETHING TRUE BY POINTING AT SOMETHING FALSE.**

`SessionEstablishedBearer.mode` carried `[bearer, device]` where its sibling carries `const: cookie`
and the studio's pair carry two constants. That asymmetry looked exactly like a broken discriminator.

It was not. `device` is a real third mode, token-shaped, and the discriminator deliberately maps two
values to one schema. What the field **is** is a narrowing of `SessionMode` — **and the missing
member carries the rule**: `cookie` cannot appear there because a cookie response carries *nothing
in the body*, which is the whole reason the shape is two schemas rather than one with an optional
field.

> ***A tell that only fired on defects would have missed all seven narrowings.***

That is the epistemics of a detector, stated properly: its value is not its precision. It is that it
points at places where **something is unstated** — and an undocumented deliberate choice and a
defect look identical from outside, which is the whole reason D-042 exists.

**2. THE RECURSION DOES NOT BOTTOM OUT, AND THAT IS THE ANSWER RATHER THAN A PROBLEM.**

`backend-contracts` closed the scope thread better than D-041 or D-045 did. Its subset test read the
description on the block rather than on its parent, so three documented narrowings read as
undocumented — *incidental scope inside the check built to expose incidental scope*. It fixed that
by making the check parent-aware, **which is itself a scope decision it made and did not announce.**

> ***What it argues for is not a perfect instrument but the habit of reporting what a check looked
> at.***

That is the terminus of the whole thread. Scope cannot be eliminated — every fix introduces a new
one, and the check that exposes the fault commits it. It can only be **made visible**, which is the
one thing that lets the next reader see the next narrowing.

**3. AND THE EXEMPTIONS ARE WRITTEN AS TWELVE REASONS FOR EIGHTY BLOCKS.** *"Eighty individual
reasons would have produced eighty sentences nobody reads; a family reason says what the class has
in common and is therefore falsifiable."* — *a state machine local to this resource*; *mirrors the
payment provider's, theirs to change and ours to reflect*; *the two answers this one command
accepts, a third answer would be a third command*.

**A per-item reason cannot be wrong. A family reason can**, which is what makes it worth writing.

### D-049 — A ruling implemented as a literal list, and the gate that checks must never fix

**1. MY OWN RULING SURVIVED ONE LEVEL DOWN AS THE THING IT FORBADE.**

D-038 merged the publication checklist into one vocabulary of nine, *"blocking as a property of the
item"*, on the grounds that promoting a warning to blocking should **flip a boolean** rather than
move an item between vocabularies.

Twenty-eight lines below that declaration sat `BLOCKING_ITEMS` — **seven of the nine members written
out again as a literal array.** So promoting `chapters_planned` meant editing a literal list: *the
same edit, in the same shape, as moving it between two vocabularies.*

> ***The merge changed what is exported without changing what has to be edited — which is the part
> the argument was about.***

**And it drifted in the direction nothing catches.** A tenth item added to the vocabulary was
**silently non-blocking**, because `includes` on a list that never heard of it returns `false`. No
type error: the union admits the member and the array simply lacks it.

It is now `Readonly<Record<PublicationChecklistItem, boolean>>`, which makes a missing member a
**compile error** — the boolean flip the ruling promised, checked by `tsc` rather than by a
reviewer. *A ruling is not implemented until the thing it makes cheap is actually cheap.*

**It was invisible for the reason D-046 found**: the file declares a vocabulary, and `check-enums`
excludes a declaring file from the sweep entirely rather than excluding it from its own values.
`backend-contracts` scanned the other nine skipped files by hand — **seven hits, all this one list;
the rest came back clean.**

**2. THE STOPGAP WAS WORSE THAN ITS OWN AUTHOR REPORTED, AND THE PROOF IS THE POINT.**

`backend-domain` flagged its ambient `vitest.d.ts` as a shape its package does not own and reasoned
about **drift**: if the tooling object grew a field, the copy would be stale. `conventions` replaced
the real declarations with `{ deliberatelyWrong: number }` **and the package still type-checked.**

An ambient `declare module` **shadows** a package's types rather than supplementing them. There was
never going to be a disagreement to notice.

> ***That is the difference between "this copy may drift" and "this copy cannot be corrected", and
> only the second is unrecoverable.***

**And it is its own shape, distinct from the four measurement faults**: *the right file reported as a
defect for the wrong reason, where the wrong reason was less serious than the truth.* Flagging it
with an exit condition is what got it looked at — but had nobody **constructed the test**, it would
have been deleted for tidiness and the mechanism never recorded.

**3. A HOLE UNDERNEATH THE ZERO-DEPENDENCY RULE, WHICH NEITHER THE TOOL NOR ITS AUTHOR COULD SEE.**

The root `tsconfig.json`'s `types: ["node"]` would have pulled Node's globals into the program that
checks `@arthome/core` — and **`check-core-entry` would not have seen a thing**, because it walks
the **import graph** and a global is not an import.

The gate that guarantees the domain has no platform dependency had a blind spot directly under it,
and the configuration that was about to open it had been failing since the day it was written. *Two
invisible things cancelling to look like a working system.*

**4. THE FLOOR QUESTION, RULED: A GATE CHECKS. IT NEVER FIXES.**

`backend-domain` found that `eslint --fix` and `prettier --write` **do not converge in one pass** —
fixing `import-x/order` reorders imports, which changes line lengths, which leaves fresh Prettier
diffs in the files just fixed. It needed prettier → eslint → prettier.

This is the project owner's founding constraint — *ESLint and Prettier must never contradict each
other* — in a form D-013 did not anticipate. `eslint-config-prettier` stops the two **disagreeing
about a rule**; it cannot stop **a fixer producing text the formatter then reflows.** Nothing is
misconfigured; the two are simply sequential transformations that do not commute.

**The ruling: `verify` runs `--check` and `--list-different` only, and never a fixer.** A gate
reports; it does not edit. Convergence then cannot affect it, because nothing changes underneath.

Fixing is a **separate, ordered, human-invoked script** — prettier, eslint, prettier — and it is
allowed to run the formatter twice, because that is what a non-commuting pair costs.

*A gate that fixes cannot fail honestly: it either reports a defect it has already removed, or fails
on a tree that was correct before it touched it.* `backend-domain` is right that the second is a red
gate on no defect, which is the thing this week has been spent removing.

### D-050 — Measured before fixing, and the gate that names its own blind spot

**234 blocks, 6 undeclared. Eight gates, `verify:offline` green. The vocabulary migration is
effectively complete.**

**1. `check-enums` STOPPED GUESSING, AND THE MEASUREMENT CAME FIRST.** `conventions` did not take my
word that misattribution mattered — it counted: **25 of 179 values are declared by more than one
vocabulary, and `'none'` by five.** So naming the first declarer was not an edge case, it was the
common case for any literal the gate catches.

It now lists **every** declarer and says it cannot tell which was meant. The reason is in the code:
*a wrong reason attached to a correct verdict is worse than no reason, because it teaches people to
obey the verdict and skip the reasoning.*

**2. THE NARROWING PREDICATE CORRECTED THE ASYMMETRY THAT COMMISSIONED IT.**

`conventions`' input/output rule said *only outputs require equality*. The predicate's seventh hit
is an **output**: `PlaybackTicket.scope` omits `none` from `WATCH_SCOPES`, because **a ticket that
grants nothing is never issued**. A real rule, on the safe side of its own asymmetry.

So the rule gains its qualifier: **equality holds for a block that *mirrors* a vocabulary; a block
that *restricts* one declares the narrowing and is checked as a subset.** Without it the rule would
have been right about six inputs and wrong about the first output it met.

**And the predicate gets quieter as the migration progresses** — stripping annotations from a
fixture produced 23 hits including the legitimate nestings; on the real documents annotation
suppresses all of them. `conventions` declined to hardcode the nesting pairs, correctly: *a list of
those would itself be a parallel table.*

**3. `backend-domain` PROVED THE FIX INSTEAD OF SHIPPING THE ARGUMENT.** It added a tenth member to
the checklist union and ran `tsc`:

```
TS2741: Property 'tenth_item_probe' is missing in type '{ … }'
```

then reverted. Its reason: *"After this week I didn't want to ship it on the strength of the
argument alone."* And it ran `backend-contracts`' hand-scan itself rather than relay it: **10
declaring files the gate has never swept, 0 remaining literals** — a number that **bounds the blind
spot** its own finding opened, which is the part a report usually leaves out.

**Its diagnosis of the drift direction connects two findings a week apart**: a tenth item would have
been non-blocking by default, because `includes` on a list that never heard of it returns `false`.
The same shape as `helpers.planOf()` dropping every account to `free` — ***a default arriving by
omission rather than by decision.***

**4. AND `check-core-entry` NOW NAMES ITS OWN BLIND SPOT, IN ITS VERDICT LINE.**

```
✓ no import path from the "." entry point reaches zod or a Node API
  (scope: the import graph only — ambient types and tsconfig `types` are not walked)
```

*The verdict says what was walked, not what is true of the package.* That is D-041 implemented
rather than recorded — and it is there because `types: ["node"]` would have put a Node global in
scope throughout `@arthome/core` while this gate stayed green, since **a global is not an import**.

> ***A gate's guarantee is only as wide as its mechanism, and a gate that does not say where its
> mechanism stops will be read as covering the whole of what its name suggests.***

**5. ONE UNPLANNED OBSERVATION, WORTH MORE THAN THE GATE.** Five of gate 18's eight checks need **no
annotation** — and `conventions` notes that this was not foresight: *"the annotation-free
formulation usually exists, but it tends to be found by being forced to look."*

Each time the gate had to grow, the cheap version was reachable only because waiting for data was
not an option. **The constraint produced the better design**, which is an argument for building
under one rather than before one.

### D-051 — A log is read by someone already looking; a verdict is read by everyone

**`backend-domain` closed the week by putting a correction where it would be met rather than where
it would be filed.**

I asked `conventions` to record that a gate's guarantee is only as wide as its mechanism. It
recorded it. But `check-core-entry` is `backend-domain`'s tool, and it made the same point **in the
output**:

> *A log is read by someone already looking for the answer. A verdict is read by everyone.*

And it fixed an overclaim I had not noticed. The old line read *"the entry point reaches neither zod
nor a Node API"* — **a statement about the package.** It now reads *"no import path from the entry
point reaches them"* — **a statement about what was walked** — with the scope on the next line.

*This log is subject to the same rule.* Fifty-one entries are worth something to a reader who comes
looking; they are worth nothing to the person running a command. **Where a decision here has a
corresponding line of output, the output is the better home** — and this entry exists to say so
rather than to be the exception.

**THE WEEK'S THROUGH-LINE, AS `backend-domain` NAMED IT, AND IT IS TIDIER THAN MY SCATTERED VERSION.**
Four defects, one shape — ***asserting against a description rather than against the structure***:

| | |
|---|---|
| a transcribed alphabet | rather than the imported constant |
| a contract's **prose** | rather than its `x-arthome-vocabulary` blocks |
| a gate's **name** | rather than its code |
| a tool's **output** | rather than what the tool measured |

To which mine belong: a reported line count rather than a `git show`, a directory inferred rather
than a glob read, a pipe's exit code rather than the gate's, and a vocabulary name specified rather
than grepped.

**And the one I was asked to carry is the one I would least have arrived at alone**: an endorsement
does not only stop the next reader checking — **it stops the author checking**, because someone
senior has now agreed. `backend-domain` wrote the `badge_*` reasoning from the value without the
field it travels in, and the force I put behind it is what kept it from rechecking its own argument.

*That is the cost of a strong opinion stated by whoever arbitrates, and it is paid by someone else.*

### D-052 — State the bound, not the hit; and do not claim a reproduction you did not get

**`pnpm run verify` — the full chain, not the subset — passes for the first time in the project's
life.** Nine gates, `typecheck`, 313 tests. Zero undeclared blocks. The ratchet is deleted, because
its own comment said to at zero and its author confirmed the gate passes without it **before**
removing it.

**1. THE BEST FORM OF A RESULT IS THE BOUND, NOT THE HIT.**

`backend-contracts` found seven copied literals by hand-scanning the files `check-enums` had never
swept. `backend-domain` re-ran the same scan independently and reported it differently:

> ***The gate has never swept ten declaring files, and exactly one of them had something to find.***

That states **how much was never looked at**, not how much was wrong. A hit count tells you what a
search found; a bound tells you what the search space was — and only the second lets the next reader
judge whether the absence of further findings means anything.

*Every "we found N" in this log would have been more useful as "we looked at M and found N".*

**2. DO NOT CLAIM A REPRODUCTION YOU DID NOT GET.**

`conventions` set out to answer `backend-domain`'s report that `eslint --fix` and `prettier --write`
do not converge. Its **first test was invalid** — it passed `--config /dev/null`, so ESLint loaded
no rules, fixed nothing, and both orders "converged" trivially. **Fourth broken fixture this week**,
and the tell was not a failure: *its result contradicted a teammate's direct observation.*

With the real configuration it still could not reproduce the symptom. So it **documented the
mechanism and said it had not reproduced it** — ESLint changes *structure*, Prettier reflows the
result and never does the reverse, so ESLint-first converges and Prettier-first needs a third pass,
which is exactly what was observed.

*A mechanism that explains an observation is not the same as having reproduced it, and saying which
one you have is the whole of the claim's value.* The rule follows either way, and `pnpm run fix`
now runs structure-then-formatting, verified across the repository.

**3. `backend-contracts` SHARPENED WHY `BLOCKING_ITEMS` WAS THE DANGEROUS KIND.**

> ***A duplicate that drifts is a nuisance; a duplicate whose drift silently picks a side is the one
> that ships.***

A tenth checklist item would not have produced a disagreement to notice — it would have been
**non-blocking by omission rather than by decision**, the same shape as `planOf()` dropping every
account to `free`. And the fix was **demonstrated** rather than asserted: a tenth member added, the
`TS2741` observed, the member reverted. *The right standard for a claim whose entire content is
"this becomes a type error".*

**4. AND TWO RESIDUE FINDINGS WERE NAMED RATHER THAN EXEMPTED.** `JournalEntry.nature` carries `mod`
and `air` — the only abbreviated members in either contract, where everything else spells
`moderation` out, so a reader who writes `moderation` gets nothing back in silence. Kept as **a wart
with an expiry**: they become `moderation` and `on_air` the first time that path changes, because
fixing them today breaks a shipped query parameter for a defect that has not bitten.

And `cancelReasonCode` has **one member** — a field whose enum has a single value carries no
information, since every request says the same thing. Not exempted quietly: the description names
what would make it a vocabulary and names the candidate. *A placeholder that is honest about being
one is worth more than an exemption that is not.*

### D-053 — The week in one line, and a member that sits outside a vocabulary while reasoning about it

**`backend-contracts` wrote the honest summary of the whole exercise, and it belongs at the end of
this log rather than in a message:**

> ***The two artefacts built to prevent the parallel literal table were themselves diverging in
> eleven vocabularies, in four different shapes — separator, case, suffix, and pure absence — and
> none of the five gates then standing could see any of them.***

That is why the gates matter more than the fixes. Eleven divergences are a morning's work to repair
and were invisible for a month; the instruments that make the next eleven visible are the
deliverable.

**AND THE LAST DISPUTE OF THE WEEK WAS THE RIGHT SIZE.**

`backend-domain` challenged an exemption reason rather than the exemption. `JournalEntry.nature`
carried `source: none` with *"the domain neither produces nor consumes these values"* — and of the
five members, `money` is one the domain **reasons about**: `data-model.md:624` and
`context-map.md:402` key the **redaction rule** to it, the rule that makes the field absent rather
than null when a role may not see revenue.

It did not ask for the vocabulary to move. `source: none` is right — the other four really are
endpoint concerns. It asked for one clause in the reason, so that **a future rename has one place to
look** instead of leaving two domain documents describing a rule keyed to a string that no longer
exists, with every gate green.

**`backend-contracts` then named what its own phrasing had hidden**, and that is the rule worth
keeping: *"neither produces nor consumes" is two facts with different owners, and writing them as
one clause is exactly what hides the second half.*

> ***A member can sit outside a vocabulary and still be load-bearing in reasoning about it.***

One of 115 exemptions needed that distinction. The other fourteen family reasons cover values
nothing outside the contract reasons about at all — which is worth knowing, because it says the
exemptions were not lazy.

**TWO SMALLER THINGS, BOTH INVERSIONS OF THEIR OWN AUTHOR'S POINT.**

An exit condition was improved from *"the first time that path changes"* — an event that might not
arrive for a year — to *"the day anything compares this field against `RUN_STATES.on_air`"*. **An
exit condition tied to the comparison that would break beats one tied to a file that might not be
touched.**

And `mod` turned out to be a **collision rather than an inconsistency**: `moderation` survives bare
in `MEMBER_ROLES` because the field name disambiguates it, but here the field is `nature` and the
value abbreviates a *different* concept, so that protection does not apply. `backend-domain` offered
it as reinforcement for keeping the abbreviation; `backend-contracts` inverted it correctly. **It
makes the rename more urgent, not less.**

### D-054 — Six attempts to measure one thing, and the decision to record the failure instead

**`conventions` tried to settle whether `eslint --fix` first converges in one pass. It failed six
times, stopped, and wrote the six failures into the document in place of the answer.** That is the
last and best entry of the week.

**Each failure was an invisible scope, and none of them looked like a failure:**

| attempt | what actually happened | what it looked like |
|---|---|---|
| `--config /dev/null` | ESLint loaded **no rules** and fixed nothing | both orders converged |
| files outside the config's base path | ESLint **silently ignored them** | both arms converged |
| a fixture whose imports did not resolve | permanent unfixable errors masked the fixable ones | neither order converged |
| files no tsconfig claimed | typescript-eslint **refused to parse**, type-aware rules never ran | parse refusals wearing the shape of findings |

**And the diagnostic was the same every time, and it was never the output**: *the result looked like
an answer, and what exposed it was noticing the answer disagreed with someone else's observation.*

That is the fifth, sixth and seventh broken fixture of the week. **A tool that is misconfigured
reports the same shape as a tool that found nothing** — and the only signal available was a
teammate's contradictory report.

**IT STOPPED RATHER THAN TAKE A SEVENTH RUN, AND RECORDED WHY.** §3.7 now carries the six failures
as *what could not be measured*, and the reason is the part worth keeping:

> *A reader who sees only the three-pass form deserves to know it was not chosen by measurement.*

**A decision's provenance is part of the decision.** The three-pass fixer is safe under either
mechanism, the optimisation was worth nothing, and the document says so — rather than letting a
conservative choice acquire the authority of a measured one by silence. *That is the opposite of the
fault this log spent the week finding: not a claim asserted without evidence, but a claim correctly
refusing the evidence it does not have.*

**THE MECHANISM-WIDTH RULE, GENERALISED PAST THE CASE THAT PRODUCED IT:**

> ***A gate's name states an intention; its mechanism states its coverage. Where the two differ, say
> so in the gate — because the name is what people will rely on.***
>
> ***A guarantee everyone trusts one level wider than it holds is worse than no guarantee, because
> nobody looks where they believe a gate already is.***

`check-core-entry` walks imports, and a global is not an import, so `process` and `Buffer` would
have type-checked clean inside the package premised on never reaching them.

**AND THE TECHNIQUE OF THE WEEK, NAMED BY THE AGENT WHO USED IT BEST.** On proving that an ambient
`declare module` shadows rather than supplements: *"the reason it worked is that I had no argument,
only a suspicion that 'no conflict' was too easy an answer. Constructing the case where the
difference would show was cheaper than reasoning about TypeScript's resolution order."*

**Construct the discriminating case rather than reason about the mechanism.** It is cheaper, it
settles what argument cannot, and it is the one habit from this week to reach for first rather than
last.

### D-055 — The detector that does not survive this session

**`conventions` stood down with three observations it had deliberately left out of the document.
The third is the most important thing produced this week, and it is the one thing that does not
transfer.**

> ***The teammate disagreement was the only reliable detector. Four of my false answers were caught
> because a result contradicted something a teammate had observed, not because I re-read my work.
> On a solo project that signal does not exist.***

Count the week against that claim and it holds. The directory theory fell because `backend-domain`
read a glob. The `both members excluded` generalisation fell to arithmetic someone else ran. Six
confounded fixtures were exposed because an answer disagreed with a colleague's report. `924` and
`966` fell to two `git show`s by the agent whose file it was. **Almost nothing was caught by
rereading, and nothing at all by care.**

**This is a solo project.** Eleven agents were a scaffold for one session; the scaffold comes down
and the detector goes with it. `code-conventions.md` §5.3.1 is an attempt to leave a substitute —
and its author's own assessment is the honest one: *"I would not claim it fully does."*

**What actually substitutes, on this week's evidence, is not a rule but a habit**: build the
discriminating case instead of rereading, and run something short that can fail for the reason you
care about. Those worked without a second party. Rereading did not.

**THE SECOND OBSERVATION EXPLAINS WHY CARE WAS NEVER THE VARIABLE.** Of `conventions`' own defects —
the file-level skip, the case-insensitive grouping, the ambient declaration, the backticks,
`types: ["node"]`, six confounded fixtures — ***not one was a logic error.*** Every one was *"this
instrument measures something adjacent to what I mean."* A logic error yields to attention. **A
scope error is invisible from inside the instrument, which is why more care never reached any of
them.**

**AND THE FIRST IS AN ARGUMENT FOR WORKING UNDER CONSTRAINT.** Five of gate 18's eight checks need
no annotation, **and not one was designed that way** — each came from being unable to build the
version that needed data. Its own verdict: *"Given a cooperative contract I would have built the
annotated-only version, and it would have found none of the three real divergences."*

*The constraint produced the design. Comfort would have produced a gate that found nothing.*

**A NOTE ON WHAT THIS LOG IS.** Fifty-five entries, and its author wrote several of them to correct
himself. `conventions`' closing line is the right standard to judge it by:

> *If it earns anything, it will be because almost every rule in it is a mistake with its evidence
> attached rather than a principle — including the three I committed inside the sections warning
> against them.*

---

## The contracts stage — 24 September 2026

### D-056 — The artist sets a tax-inclusive price, and the variance is disclosed rather than hidden

**The project owner's decision: TTC.** The price an artist sets is **what the viewer pays**, and it
has been open since the `payoutOf` test raised it. Both options were laid out with their costs; this
one was chosen knowing them.

**What it buys.** One displayed price per date per billing market, identical for every viewer. The
catalogue stays **publicly cacheable** — no `Vary` on a buyer's country, no price computed per
request, and the ten catalogue reads that D-022 put behind `security: [{}]` keep their point.

**What it costs, and the cost is real.** VAT comes out of a fixed gross, so **the artist's net varies
with the buyer's country** — the same displayed price yields a different payout for a French buyer
and a Belgian one. Nothing about the sale tells the artist why.

**So the ruling has a second half, and it is not optional: the variance is disclosed, not absorbed.**
A payout breakdown carries its **`VatLine` per jurisdiction** — the shape D-021 already chose,
keyed on `jurisdiction_code` / `jurisdiction_level` / `supply_kind` with the rate applied to the
sale. *A net that moves for a reason the artist cannot see is the `planOf()` fault with money
attached: a default arriving by omission rather than by decision.*

**D-015 SURVIVES AND BECOMES DERIVED RATHER THAN DECLARED.** The 12 % commission is computed on the
**net-of-tax** base, because a commission that changes with the buyer is not a commission. Under HT
that base was the price; under TTC it is `gross − vat`. **The rate is constant, the absolute amount
varies, and that is exactly what D-015 required** — the invariant was always the rate.

**Consequences for the schemas, which is why this was blocking:**

- a **price** field is tax-**inclusive** and must say so where it is declared — `MoneySchema` is
  unchanged (minor units + currency code), but a price is not a bare `Money`;
- the VAT is **computed at sale** from `BuyerTaxLocation`, never carried on the catalogue;
- checkout shows the VAT as a **line** even though the total does not move — the artist needs it and
  EU invoicing requires it;
- a payout response without a per-jurisdiction breakdown is incomplete, not merely terse.

**Reversibility, stated because it is the expensive direction.** TTC → HT later changes **every
displayed price**. This is the harder decision to undo, and it was taken with that written down
rather than discovered afterwards.

### D-057 — `@arthome/contracts` opens, and `core/./schema` goes first

**The project owner's decision: open it.** The vocabulary migration is closed — 234 blocks, zero
undeclared — so the two artefacts the schemas must satisfy now agree with each other.

**The order is not mine to choose; `core-port-plan.md` §2 and §7 already fixed it.**

1. **`@arthome/core` `./schema` — wave 6, the only wave that adds zod.** The **base** schemas, and
   only what crosses a boundary and must be checked on arrival: `MoneySchema`, `InstantSchema`,
   `VenueClockSchema`, the vocabularies, the branded identifiers, `BuyerTaxLocationSchema`,
   `ErrorEnvelopeSchema`.
2. **`@arthome/contracts` extends them** with `.extend()` and `.pick()` rather than redeclaring —
   *redeclaring `MoneySchema` would be E2 on the most manipulated value in the system.*

**Schemas come after all the rules**, because a boundary schema describes a shape the domain has
already fixed, and drawing them first produces rules dictated by a payload.

**The three boundary rules are written into the package itself**, not into this log: no
`z.transform()` in a boundary schema, since it is inconvertible to JSON Schema and the generated
OpenAPI would lie; `io: "input"` and the output are **two schemas, not one read twice**; and a
validation failure becomes a **code**, never a zod message in English — otherwise i18n leaks at the
first form error, and it is the payment form that leaks it.

**The moment of truth is `contracts:emit` producing an empty diff** against the two hand-written
documents. They are the target precisely because they were written first and reviewed as prose.

### D-058 — The empty diff is scoped to `components/schemas`, because that is where the second copy is

**`backend-contracts` measured the emit gap before anyone wrote a schema, and the measurement
changes the question. Verified on both documents:**

| | storefront | studio |
|---|---|---|
| `paths` | 4,814 lines — **65 %** | 5,797 — **71 %** |
| `components` | 2,354 — 32 % | 2,124 — 26 % |
| `#` comments | 78 | 31 |

`z.toJSONSchema()` emits **schemas**. Two thirds of each document is `paths` — operations,
parameters, security, the maturity and upstream extensions on 174 operations — and **none of it has
a zod source**. Of ~38,600 words of prose, roughly two thirds hangs off nothing a schema could carry:
an operation's `summary`, the motive for an idempotency exemption, the reason `/v1/changes` keeps its
`401`. And **109 comments that JSON Schema cannot represent at all** — not hard to emit, impossible
to derive.

**THE RULING: EMIT `components/schemas`. THE EMPTY DIFF IS SCOPED THERE AND SAYS SO.** `paths` stays
hand-written and keeps being checked by `check-openapi.py`'s nineteen rules and by
`check-vocabulary`.

**This is not a retreat from "zod is the source, OpenAPI is generated" — it is that decision applied
to where its purpose lives.** The purpose was to eliminate **a second copy of the shapes services
validate against**: a service validates against `MoneySchema` and the contract publishes a `Money`
schema, which is one fact in two artefacts. **`paths` has no second copy to eliminate.** An
operation's summary exists once, in one place, and nothing anywhere duplicates it.

*The scope of "generated" follows the scope of the duplication, not the scope of the file.*

**And `backend-contracts`' argument is the one that decides it**, because it is about what a test is
worth rather than what it costs:

> ***The empty diff is a test, and a test is only worth what it asserts.*** Over `components/schemas`
> it asserts that the schemas the services validate against are the schemas the contract publishes.
> Over `paths` it would assert that a generator reproduces prose a human wrote — **which is not a
> property anyone needs true.**

**THE OPTION I AM REFUSING IS THE ONE THAT SOUNDED MOST PRINCIPLED.** Emitting everything would put
38,600 words of English inside `@arthome/contracts` and turn the two documents into build output.
*"The documents stop being reviewable as prose, which is how every finding this week was made — I
found `targetPage` and `reasonCode` by reading, not by diffing."*

That lands on D-055 directly. The only reliable detector this week was **a reader disagreeing with
something**, and the substrate for that is readable prose. This project has one person; the detector
is already thin. **Trading the artefact that produced every finding for a property nobody needs true
is not a trade.**

**WHAT IT GIVES UP, STATED RATHER THAN GLOSSED.** `paths` is hand-written for good, so an operation
added to a service has no mechanical link to an operation added to the contract. Nothing catches
that but `check-openapi.py` and the BFF's own tests. *That gap is real, it is narrower than the one
option 2 would open, and it is named here so nobody discovers it as a surprise.*

### D-059 — What is already inside a total cannot sit in the list of things added to it

**Three applications of TTC, and the second is a finding rather than an application.**

**`Money` stays neutral and says so.** It carries credits, refunds, commissions and payouts as well
as prices. **A price is tax-inclusive, and every field that is one says so where it is declared** —
`Money` is not the place that can warn a reader, *and a reader on the wrong side of a rate is wrong
by exactly that rate.*

**`SeatQuote` gains `vatIncluded` as a separate field, not a fifth line.** `lines` are **addends**. A
VAT line among them would be summed by somebody eventually, and the total would be wrong **in the
direction nobody checks, because it would look larger.**

> ***What is already inside a total cannot sit in the list of things added to it.***

That is a shape, not a detail — the same family as a rule carried by an omission (D-042) and a
member that answers nothing (D-044): *a value placed in a structure whose semantics contradict it.*

**`PayoutLine.grossTtc` is named as fixed and the breakdown as the explanation.** Under TTC the gross
is constant and the net moves with the buyer's country, so a payout without per-jurisdiction lines is
**incomplete rather than terse**: the artist sees a number that changed and no reason for it.

### D-060 — Four emit findings, and the union that buys nothing

**`backend-contracts` ran the first emit against real installed zod rather than predicting it. Three
of four differences are semantic.**

**1. `additionalProperties: false` on every object — refused on outputs.** `z.object()` emits a
**closed** schema; the contracts never say that anywhere. On a **response**, a client generated from
a closed schema **rejects a server that added a field** — the TV-fleet failure one level up from
enums, on the shape instead of the member.

**Ruling: `z.looseObject()` on output shapes, `z.object()` on input.** Same asymmetry the
vocabularies already have, and it puts the rule in the source rather than in a post-processing step.

*This sharpens critical rule 10 rather than contradicting it.* Rule 10 says strictness applies to
the shape and never to the member; `backend-contracts` supplies the missing half — **strictness
belongs to the shape's *required fields*, never to its *extensibility*.**

**2. `vocabularyOut` emits a union that buys nothing, and `.meta()` is strictly better.** Measured,
not argued:

```
z.union([z.enum(V), z.string()])  ->  anyOf: [ {type: string, enum: [...]}, {type: string} ]
z.string().meta({'x-arthome-vocabulary': V})  ->  {type: string, x-arthome-vocabulary: [...]}

union accepts "anything"?  true
meta  accepts "anything"?  true
```

**They are validation-equivalent.** The second branch accepts everything, so the enum branch
constrains nothing — forty lines that assert what `type: string` asserts. And a generator turns
`"open" | "emoji" | string` into `string`, so the union loses the autocomplete it was written for in
TypeScript too.

`backend-contracts` proposed the emitter special-case it into the documented shape. **`.meta()` is
better, because it needs no emitter logic at all** — it emits the documented shape directly, the key
`check-vocabulary` already compares 119 blocks against. *Emitter logic is where the imitation risk
lives; this removes it rather than justifying it.*

**3. `z.int()` and `InstantSchema` lose their formats.** `z.int()` emits ±2⁵³−1 — JavaScript's safe
range, not the contract's — and drops `format: int64`, which every generator reads. `InstantSchema`
emits its regex as `pattern` where the documents carry `format: date-time`. **Fixed in the source
with `.meta()`**, not in the emitter.

**4. Structural, and mechanical.** Single-schema mode inlines everything; the two documents hold
**1,458 `$ref`s**. Registry mode with a `uri` callback restores them. Every schema needs an `id`;
`$schema` and `$id` are stripped.

**AND THE FORMATTING WORRY I RAISED WAS MISPLACED, WHICH IS WORTH SAYING.** I told
`backend-contracts` the documents were written as prose and the emitter would have to reproduce a
hand-written style. Its answer retires the question: ***key order, block style and quoting are a
normaliser — parse both sides to a tree and compare trees***, which is what `check-openapi.py`
already does. **The empty-diff gate compares trees, not text.** The large part of the first diff is
not the interesting part.

### D-061 — The map is generated, because a hand-written map is a parallel table of the repository

**The project owner's requirement**: every repository's `README.md` links to a complete map — what
lives where, what each directory is for, the functions available — and **whatever is shared
(contracts, helpers, utilities) must be documented in the repositories that consume it**, because a
future agent working in `arthome-storefront-web` cannot guess what `@arthome/core` exports.

**The requirement is right and the obvious implementation is the fault this project spent a week
removing.** Documenting `@arthome/core`'s surface by hand in five application repositories is **five
copies of one fact** — E2, on the artefact whose whole purpose is to stop E2. And it drifts in the
worst direction: a map that is subtly wrong is more expensive than no map, because it is trusted.

**So the map is generated and its freshness is gated.**

- a tool reads the **installed** `@arthome/core` and `@arthome/contracts` — their published `.d.ts`,
  which `isolatedDeclarations` already guarantees is complete — and emits the consuming repository's
  map from the version actually installed there;
- the map is **committed** so an agent reads it without running anything;
- a gate **fails when the committed map does not match what regenerating would produce**, which is
  `check-tsconfig`'s shape: read the *resolved* result, never the file that claims it.

*A generated map is a projection with a checker. A written one is a claim with nobody behind it.*

**On the LSP**: an agent with the published `.d.ts` and a working `tsc` already has the export list
and go-to-definition, and `isolatedDeclarations` is why those declarations are readable rather than
inferred. The LSP is worth revisiting once a map exists; it is not the cheap half.

### D-062 — The tax basis rides on the field, not on the value, and not in the name

**`backend-contracts` answered a question `@arthome/contracts`' own first module addressed to it by
name — *"the wire representation must carry the basis in the data"* — before writing a price schema.
It measured first.**

**Exactly two money-typed fields in either document said their basis**, and both were written this
week under D-056: `grossTtc` and `grossHt`. `price`, `total`, `currentPrice`, `unitPrice`,
`revenue`, `commission` and `net` said nothing.

**Two implementations refused, and the second refusal is the finding.**

**The naming convention** — `currentPriceTtc`, `totalTtc` — was refused because renaming sixty-odd
fields is a breaking change to every consumer, bought for a suffix on the one field that already had
one.

**A per-value field in the payload** was refused for a reason worth keeping: the basis of `grossTtc`
**never varies**, so carrying it beside every amount puts **a schema fact in the data.**

> ***That is the exact inverse of `vatIncluded` (D-059), where a datum sat in a structure whose
> semantics contradicted it. Same fault, opposite direction.***

**The ruling: `x-arthome-tax-basis` on the field, three values.**

| | |
|---|---|
| `inclusive` | what a viewer pays or sees — price, total, fee, `grossTtc` |
| `exclusive` | the payout chain below `grossTtc` — `grossHt`, base, commission, net |
| `inherited` | a movement rather than a price — refund, credit, discrepancy |

**`inherited` is what made the classification honest.** A refund's basis is that of the thing it
refunds; `inclusive` would invent a fact and `exclusive` would be wrong. **Nothing was left
unclassified**, which is the check that three is the right number — a fourth would have surfaced as
something fitting nowhere.

**And the brand-versus-extension argument cites D-054's rule correctly.** `Taxed<Money,'inclusive'>`
is a TypeScript brand: mutually unassignable, a compile error, **erased at runtime**. Its mechanism
is the compiler, so it does not reach a generated Python client, a webhook recipient or a partner
reading the document. *The extension reaches all of them, at zero payload cost, in the artefact they
actually read.*

**R20 gates it, with both branches proven by injection**, and its residual risk is disclosed rather
than glossed: **it checks that a basis is *declared*, not that it is *right*** — `total` marked
`exclusive` would pass. The mitigation is the family-reason argument: three values are few enough to
review by eye, and the classification lives in one place rather than in sixty readers' heads.

**THE COUNT WAS OPEN FOR AN HOUR AND IS NOW CLOSED, WHICH IS WHY IT WAS NOT WRITTEN DOWN.** The
report said sixty-five classified; walking both documents I counted **fifty-five**, the gap entirely
in `inherited`, and I recorded the number as open rather than picking one.

**Resolved by construction rather than by waiting.** R20 already prints what it counted — *"a gate
that reports what it counted can be argued with"*, in its own comment — and it says **55**, agreeing
with my walk. Then:

```
$ref to Money, total                                    55
of those, BARE refs inside a list (allOf[0], one key)   10
```

A bare `$ref` in an array **cannot carry a sibling extension key** — there is nowhere to put it
without breaking the reference. So the detector excludes it and matches **its `allOf` parent
instead**, which is where the annotation lives. Forty-five direct refs plus ten `allOf` wrappers is
exactly fifty-five, counted once each.

**So the detector is sound and complete, and the sharper reading I feared is false**: there is no
set of money fields the gate cannot see. The ten are not missing, they are *unannotatable at that
node and annotated at their parent*.

*The check that settled it took two minutes and was shorter than the round trip I had already
started.* Recorded here because a number left open in a log is a number someone will later quote as
though it were closed.

### D-063 — One change in one place, and the first time the generated artefact beat the written one

**`backend-contracts` received opposite instructions from `backend-domain` and from me on the same
call, and raised it once rather than writing either silently.** That was right, and its reason is
the ruling:

> *Writing `.meta()` directly in `@arthome/contracts` while core exports a union would be a second
> implementation of the same rule — in the package built to prevent exactly that.*

**So the change is inside `vocabularyOut` itself, in `@arthome/core`. One change, one place, call
sites untouched.** My ruling was about the emitted shape, never about bypassing the helper; it was
right to read it as ambiguous and stop.

**AND IT MEASURED THE HALF I HAD NOT.** I measured the JSON Schema side. It measured TypeScript,
which is the half the union was presumably for — and I re-ran it:

```ts
type U = 'open' | 'emoji' | string;
type Verdict = string extends U ? 'collapses' : 'keeps the literals';
const v: Verdict = 'collapses';     // tsc --strict: passes
```

**`string extends U` is true, so `U` *is* `string`.** No autocomplete, no exhaustive switch, no
narrowing. **The union is validation-equivalent on the wire and type-equivalent in the editor** —
it buys nothing in either artefact, which neither of us knew when the helper was written.

**`.nullable()` AND `.meta()` ARE ORDER-SENSITIVE, AND THAT IS THIS WEEK'S SHAPE AGAIN.**

```
.meta({format}).nullable()   ->  anyOf: [{…, format}, {type: null}]    format buried in a branch
.nullable().meta({format})   ->  { anyOf: […], format }                format on the field
```

The contracts carry the format on the field, so the second is the match — and the first loses it
where **no generator looks**. *Two spellings that read identically and emit differently, with the
difference visible only in the output.* Into the module, not the log.

**THE NORMALISER TAKES THE EQUIVALENCES; THE DOCUMENTS AND THE EMITTER BOTH STAY IDIOMATIC.**

zod collapses a nullable union into `type: [T,'null']` **only when the branches are bare** — a
`format` is precisely what blocks it. Both contracts write `type: [string,'null']` with
`format: date-time`, a form zod cannot produce.

**The documents do not move.** `type: [string,'null']` is the 3.1 idiom and what a generator reads.
The rewrite `anyOf: [{X}, {type: null}]` → `type: [X.type,'null']` is **lossless and mechanical** —
a two-branch `anyOf` whose second branch is exactly `{type: null}` has one meaning — and it is a
**comparison** concern, so it belongs in the normaliser rather than the emitter.

**Four equivalences so far, and the distinction that governs what may join them**: `$schema`/`$id`
stripped, `additionalProperties: {}` ≡ absent, `anyOf:[{X},{type:null}]` ≡ `type:[X,'null']`, key
order. *None is about style. All four are two artefacts saying the same thing two ways* — and that
is the test for the fifth.

**AND THE FIRST CASE THIS WEEK WHERE THE GENERATED OUTPUT BEAT THE HAND-WRITTEN DOCUMENT.**
`InstantSchema` emits **both** its `pattern` and `format: date-time`; the documents carry the format
alone. The pattern is **stricter** — it refuses a `+02:00` spelling that the format permits, and
`backend-domain` built it to refuse exactly that.

**So the documents gain the pattern.** Not the emitter dropping it. *`backend-contracts` said so
plainly about its own artefact, which is the harder direction to argue in.*

**AND A FINDING FROM `backend-domain` WORTH KEEPING ON ITS OWN.** It wrote the `no z.transform()`
rule as a spec using `node:fs`, and `tsc` refused it — `packages/core` sets `types: []` precisely so
a Node API is unreachable, and the spec shares that project.

> ***The test would have had to open a hole in the wall it was testing.***

It moved into `check-core-entry.mjs`, which already walks that import graph in Node, **scoped to the
modules reached from the entry point rather than to the directory** — a file in `src/schema/` that
nothing imports sits at no boundary, and a boundary schema placed elsewhere and re-exported sits at
one. Proved by planting a transform, which also exposed a line-number drift in its own gate.

### D-064 — The lead was the cost, and the fault was rule 15 applied to himself

**The project owner observed that a reloaded session was exhausted in under thirty minutes and asked
whether tmux or Opus was to blame. Measured instead of guessed:**

```
messages sent to teammates    162
total                         487,669 characters  (~122,000 tokens)
average                         3,010 characters
```

**Neither hypothesis was the cause.** A tmux pane is a terminal and costs nothing. Opus is the
most expensive model per token, so it **multiplies** volume rather than creating it.

**The cause was the volume, and the volume was mine.** And the real cost is not those 122,000
tokens — it is their **re-billing**: a message lands permanently in its recipient's context, and
every subsequent turn that agent takes re-sends it. Long-lived agents turn one essay into thousands
of re-sends.

> ***I wrote the reasoning into every recipient's permanent context instead of referencing the log —
> rule 15, violated a hundred and sixty-two times by the person enforcing it.***

**Four changes.**

1. **A ruling is ~400 characters, not 3,000.** The reasoning lives in this log, which is read **on
   demand, once**. Stating a fact once and referencing it afterwards is the project's own rule.
2. **Agents are short-lived.** One task, then closed. A two-day-old agent re-sends two days of
   context every turn — and D-055 already established that a **fresh** agent disagrees better than a
   stale one agrees. The instinct to keep them warm for their context was wrong on both counts.
3. **Model by role.** Opus for arbitration; the mechanical work — extraction, translation,
   annotation — does not need it. 175 screen extractions did not need Opus.
4. **Three in parallel, not eleven.**

### D-065 — The empty-diff gate, and the nine families it found the first time it ran

**It was built and it was pointed at what already exists. Fourteen schemas have a zod source;
fourteen disagree with the document they must emit.** Nothing was agreeing before, and nothing said
so — `verify` was green the whole time, because no gate compared the two artefacts.

```
storefront   65 schema(s) ·  8 sourced · 57 not yet written
studio       46 schema(s) ·  6 sourced · 40 not yet written
                            14 sourced · 14 disagree · 0 agree
```

*That is D-055 again and it is the cheapest possible demonstration of it: not one of these was found
by rereading the schemas, and all of them were found by something short that could fail.*

**The gate is two halves for one reason.** `tools/emit-contracts.mjs` imports the built packages and
prints JSON; `tools/check-emit-diff.py` holds the normaliser, beside `check-openapi.py`'s. The Node
half resolves zod **from `packages/contracts` rather than from the root**: a root copy would work,
and it would be the second copy that manifest argues against at length. It is load-bearing rather
than tidy — the `instanceof` test compares class identity, so under two copies the gate reports
every export as "not a zod schema" instead of quietly measuring the wrong one.

**THE LOOKUP RUNS FROM THE DOCUMENT TO THE CODE, AND THE FIRST VERSION HAD IT BACKWARDS.** It began
by reading every export named `XSchema` as a claim on the document's schema `X`. The first run
refuted it: `WireInstantSchema`, `SlugSchema`, `DeviceIdSchema` name nothing in either document and
none of them is a defect — most schemas are building blocks the document **inlines**. A tool cannot
tell a building block from a typo. So the document indexes and the code answers, which is D-058's
ruling about authority applied to the direction of a loop.

---

#### A · `z.object()` where the document is open — five schemas, and the rule already existed

`MoneySchema`, `TaxEvidenceSchema`, `VenueClockSchema`, `BuyerTaxLocationSchema` and core's error
schema all emit `additionalProperties: false`. **D-060 §1 ruled `z.looseObject()` on output shapes
three days ago. It was applied in `@arthome/contracts` and never in `@arthome/core/schema`.**

**The documents settle it without an argument: 110 of the 111 schemas are open.** The single
exception is `SearchCriteria`, which is a **parameter of `/v1/search` and the body of
`SavedSearch.criteria`** — an input. *The one closed schema in either document is the one input
published as a schema, which confirms D-060's asymmetry rather than excepting it.*

**Ruling: every output schema is `looseObject`. A schema that crosses in both directions needs both
forms and gets both** — the strict one is not a variant of the loose one, it is a different
obligation.

#### B · `vocabularyOut` omits `x-arthome-vocabulary-source`, and that defeats the other gate

```ts
return z.string().meta({ 'x-arthome-vocabulary': values });   // and nothing else
```

`check-vocabulary` compares 120 blocks **indexed on `x-arthome-vocabulary-source`**. A generated
document would carry the members and not the provenance, so the gate that currently proves the
domain and the contracts share one vocabulary would find **nothing to compare** and say PASS.

*A gate silenced by a generator is worse than a gate that fails, because its verdict does not
change.* This is the emit path's version of reading an exit code through a pipe.

**The obvious fix is the fault this project exists to prevent.** `vocabularyOut(EMPTY_REASONS,
'EMPTY_REASONS')` transcribes an identifier into a string beside itself — E2 in one line.

**Ruling: the name is attached where the vocabulary is DECLARED, not where it is used, and a gate
asserts the string equals the exported identifier.** One transcription, on the line that already
carries the name, mechanically checked. `arthome-check-enums` already reads these declarations.

> **CORRECTION, on implementing it the same day: there is no transcription, so there is no gate.**
>
> The ruling assumed the name had to be *written down* somewhere and then checked. It does not.
> `Object.entries` on `@arthome/core`'s `.` entry namespace yields `['WATCH_SCOPES', [...]]` —
> **the export identifier is already the name**, and a map keyed by ARRAY IDENTITY hands it back
> from the array alone. Rename the export and the emitted source name follows, because they are one
> string rather than two that agree.
>
> *A ruling that prescribes a checked duplicate is still a ruling that accepts a duplicate.* The
> gate it ordered would have been an instrument guarding a copy that did not need to exist — and
> this project has spent a week removing exactly those.
>
> **Two details that are load-bearing rather than incidental.**
>
> It reads the **`.` entry point**, not `vocabulary/`. `check-vocabulary`'s universe is *every
> vocabulary exported by every published package*, so the set this map must cover **is** the
> published surface, by definition; any narrower import is a second definition of the same set and
> will drift from it. The first attempt read `vocabulary/` and threw on `LOCALES`, which is declared
> in `format/` and published all the same — the narrower definition failed inside a minute.
>
> And an unknown vocabulary **throws** rather than emitting `none`. `none` is a real value in these
> documents, meaning *local to this contract*, so defaulting to it would convert "I could not find
> the name" into a legitimate-looking declaration — the false declaration this family is about,
> reintroduced by the fix for it. A contract-local vocabulary passes its own name explicitly;
> anything else fails where it is written rather than in a document nobody diffs.

#### C · `.meta({ format: 'int64' })` adds the format and does not remove the bounds

D-060 §3 ruled this **fixed in the source with `.meta()`**. The emitted schema carries
`format: int64` **and** `minimum: -9007199254740991, maximum: 9007199254740991` — JavaScript's safe
range, which is not the contract's and is in no document.

*The remedy was verified to add the format. It was never verified to remove what it was replacing.*

**Ruling: core gains an `int64()` helper that emits what the documents carry, and no call site
writes `z.int()` directly.** The same applies to `InstantSchema`, which emits its regex as `pattern`
beside the `format: date-time` the meta added — see E.

#### D · The zod source is stricter than the contract it publishes

`maxLength: 128` on a city, `maxLength: 64` on an evidence source, `pattern` on an IANA zone and on
a page cursor, `minimum: -720 / maximum: 840` on a UTC offset, `minLength: 1` on a trace id. **None
of it is in either document.**

This is not symmetrical with a missing description. A constraint in the code that the contract does
not publish means **a generated client will send what the document permits and the server will
refuse it** — the contract lying in the direction nobody checks, which is the same shape as a closed
schema on a response, inverted.

**Ruling: the DOCUMENT gains the constraint.** A bound worth enforcing is worth publishing, and
`-720`/`+840` is a fact about timezones rather than a local precaution. This also settles the
instant `pattern` the same way, and it is the direction already agreed before this gate existed.

#### E · Descriptions and examples live in the document and nowhere in the source

Six schema-level descriptions and a dozen `examples` — `2400`, `EUR`, `Europe/Paris`, `120`,
`edge.geoip` — exist only in the YAML. **Ruling: they move into the source**, because after the
migration the YAML is output and prose that lives only in output is prose that gets regenerated
away. This is the part of D-058 that costs real work and it was priced in there.

#### F · `ErrorEnvelopeSchema` in `@arthome/core` is the document's `Error`

The document: `ErrorEnvelope = { error: $ref Error, servedAt }`. Core's export:
`{ code, params, traceId, nature }` — **the payload, under the envelope's name.**

A service importing `ErrorEnvelopeSchema` to validate an error response validates the inner object
against the outer name and passes. **Ruling: rename it `ErrorSchema`; the envelope is written and
takes the name back.** The gate found it only because it indexes by the document's names, which is
the second thing the direction of the loop bought.

#### G · One name, two shapes, two documents

`EnvelopeMeta`, `CursorPageInfo` and `LocalizedText` each exist in both documents **with different
shapes**: studio's `EnvelopeMeta` carries `rightsVersion` and storefront's does not; studio's
`CursorPageInfo` carries `pendingCount` for the moderation badge and none of the storefront's
fourteen empty reasons. One zod export cannot emit both, and the shared modules in
`@arthome/contracts` currently claim to.

*That is D-039's shape a fourth time — one name, two meanings, disambiguated only by where you are
standing.* Harmless to two separately generated clients; not harmless to a reader, and not harmless
to anything that indexes by name.

**Ruling: the gate's index is `(document, name)`, and the export name carries the product when the
shapes differ** — `StorefrontEnvelopeMetaSchema`, `StudioEnvelopeMetaSchema`, with the shared
`EnvelopeMetaSchema` kept for the shapes that genuinely are one. Derived, still: the gate looks for
`<Product><Name>Schema` and falls back to `<Name>Schema`, so there is no table anywhere.

#### H · A strict vocabulary on a response, and the missing export that caused it

`LocalizedTextSchema.contentLanguage` is `LocaleSchema`, which is `vocabularyIn(LOCALES)` — **strict,
on an output shape.** It emits `enum: [fr, en]`, so the day a third content language is authored,
**a television rejects the whole payload the text sits in.** That is critical rule 10, broken on the
member while honoured on the shape, in a module written two days after the rule.

**And the cause is an absence rather than a careless call site.** Of the four `vocabularyIn` call
sites in `@arthome/core/schema`, three are in `tax.ts` and every one of them is named for its
direction — `TaxEvidenceKindIn`, with `TaxEvidenceKindOut` beside it. The fourth is
`LocaleSchema`. **It is the only strict vocabulary in the package that does not say it is strict,
it has no `Out` counterpart at all, and it is the one that got used on a response.**

> ***The convention that would have prevented this was already in the package. It was applied in one
> module and not the other, and the defect landed in exactly the gap.***

**AND THERE WAS A TEST ON IT, ASSERTING THE DEFECT.** `text.spec.ts` carried
`expect(...contentLanguage?.enum).toEqual(['fr', 'en'])` under the name *"constrains contentLanguage
to the two the product has"*, with this reason written out:

> *"a third **product** language is a catalogue, a build and a store review — never a value that
> turns up unannounced in a payload."*

Every word of that is true of the viewer's locale and none of it is true of this field.
**`contentLanguage` is the language an author typed** — an artist can write a hold-screen message in
Spanish tomorrow afternoon with no catalogue, no build and nobody's permission.

*The module header opens by naming that exact conflation — "`contentLanguage` IS NOT THE VIEWER'S
LOCALE, AND THE TWO ARE EASY TO CONFLATE" — and the test committed it in the file next door.*

**So the test did not miss the defect. It stated the case for it, and passed.** That is worth more
than the bug: a test pins a bug exactly as firmly as it pins a guarantee, and nothing in a green
suite distinguishes the two. What distinguished them here was an artefact that had never seen the
test — the document.

**Ruling: every vocabulary-derived export in `@arthome/core/schema` is named `…In` or `…Out`, with
no `…Schema` spelling available for either.** A name that does not state the direction is a name
that will be used in the wrong one.

---

**The gate is committed and is NOT in `verify` yet.** It would fail, and a gate wired in red is a
gate switched off within a day. It goes into `verify` in the commit that turns it green, and the
README's gate count goes from eight to nine in that same commit and not before.


### D-066 — An entry that diagnoses a propagation failure, whose fix propagated nowhere

**`skeptic`'s last act was to check this log, and the first thing it checked was the entry written
twenty minutes earlier.**

D-065's companion, the D-012 correction, says in its own words that the 85 KB figure *"reached
neither this table nor any of the four places that quote this table"* — and names all four. **The
table was fixed. The four files were not.** `rg "85 KB"` on each: nothing, four times.

> ***The diagnosis landed in the place that records diagnoses, and nowhere else. One grep.***

Now propagated, with the reason attached rather than just the number: *with tree shaking off the
saving is zero, so `93 → 7.5` must never again be quoted without the third figure beside it.* The
rule those four files defend is unharmed, because it rests on the cost being **fixed and tied to the
import**, which holds under every bundler.

**And the pattern generalises past this entry, which is why it gets its own number.** `skeptic`
checked two entries closely and both were wrong the same way — *an entry that correctly diagnoses a
defect and whose fix lands only in the log.* Two of two is a hit rate rather than a survey, and the
standing instruction it leaves is: **take any entry that names the files it says must change, and
check the files.**

---

#### D-055 is corrected, and this is the correction that matters most

**D-055 concludes that a teammate disagreeing was the only reliable detector, and that it does not
survive a solo project.** `skeptic` shows the premise is drawn too narrowly, and the objection is
sharper than a caveat:

> ***"None of K1–K7 came from a teammate disagreeing. Two detectors found all of them, and both work
> alone."***

**Detector A — make an OUTSIDE AUTHORITY contradict the document.** K1 came from fetching Stripe's
page, not from thinking harder about Stripe. `adr-payments.md` was internally coherent and wrong
about the world, *and no internal review reaches that.* The rule: **every sentence of the form
"vendor X does Y" is a URL nobody has opened yet.**

**Detector B — RECOUNT what a document says about itself.** K4's topic count, G1's fan-out of four
and R3's fifteen OpenAPI rules all came from running the count the document asserted. Two came back
false and one true, *which is what makes it a detector rather than a hunt.* The rule: **any sentence
carrying a number about this repository is a script, usually a one-liner.**

**Detector B is what caught the failure above**, on the same day, against the entry that had just
been written — which is as close to a demonstration as this log is going to get.

**Why the correction is urgent rather than tidy.** D-055 is *advice*, not a fact, and it will be
read at exactly the moment there is nobody left to disagree. As written it tells a solo reader the
detector is gone. What is gone is **one** kind — the scope error inside an instrument, invisible from
within the instrument. Two kinds are not gone, both are cheap, and both are the ones that work
without a second party.

*D-055's own surviving half said it already: construct the discriminating case rather than reason
about the mechanism. A and B are what that looks like when written down as procedures instead of as
a disposition.*

### D-067 — Two error-code families, no mapping between them, and nothing that could report it

**Found while propagating `ErrorSchema`'s `code` pattern into the two contracts — which would have
written a contradiction into them, because the pattern refuses the examples the contracts publish.**

```
core   ErrorSchema.code   ^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$
docs   Error.code         examples: TRANSITION_IRREVERSIBLE · PUBLICATION_CHECKLIST_INCOMPLETE
```

**Every error-code example in either contract is `SCREAMING_SNAKE`, and the boundary schema in
`@arthome/core` refuses all of them.** Measured, not sampled: the dotted examples in the documents
are rail identifiers and locale codes, not error codes.

**D-036 §2 already ruled on this and the ruling favours the documents.** *"§5.2 names three
families: `snake_case` for domain vocabulary, `SCREAMING_SNAKE` for error and failure codes, and the
declared exemptions."* Its test was deliberately predictive rather than statistical: *what would a
NEW error code be? Obviously `SCREAMING_SNAKE`.*

**But the interesting half is not the regex, and changing it would have hidden the finding.**

`@arthome/core` declares **24 distinct `DomainError` codes**, every one of them dotted lowercase —
`publication.transition_irreversible`, `moderation.already_settled`, `hold.quantity_invalid` — and
they are internally consistent. `issueToCode`, the only sanctioned way out of a zod failure, returns
`validation.${issue.code}`, also dotted.

So there are two coherent families, and **`TRANSITION_IRREVERSIBLE` is `publication.transition_irreversible`.**
Same refusal, two spellings, one on each side of a boundary.

> ***Nothing in this repository converts between them, and nothing could report that it is
> missing.***

**That is the fault the whole project is organised against, arriving one level up from where the
defences are.** `check-enums` compares literals, `check-vocabulary` compares member sets — both work
on a vocabulary's VALUES. This is a mapping between two vocabularies that do not share a value by
construction, so every instrument here reads it as two unrelated lists agreeing with themselves.
*The only reason it surfaced is that a gate compared a REGEX to an EXAMPLE.*

**AND ONE INSTRUMENT HAS BEEN PRINTING THIS FINDING ON EVERY RUN FOR DAYS.** `check-vocabulary` ends
each pass with:

> *case differs for `DATE_CANCELLED` / `date_cancelled` — legitimate if these are an error code and
> a domain value in two different vocabularies (D-036), a defect if they are one vocabulary. Not
> failed, because this gate cannot tell and a human can.*

That is this entry, on one pair, offered as a question every single time `verify` runs. **It was
read as an ambiguity about two values and it is a symptom of a missing conversion between two
families.** The gate was right to refuse to decide and right to say so; what it could not do is
notice that the same relationship holds twenty-four times over.

> ***An instrument that hands a question to a human on every run is only as good as the human
> reading it, and this one had been answering "not now" by default.***

**And the consequence is the README's first surprising convention, inverted.** *A value displayed
twice comes from `@arthome/core`.* There is no conversion in core, so the first service to catch a
`DomainError` and serve an `Error` will write one — and so will the second, differently. Seven
services, seven transliterations of twenty-four codes, and the one that is wrong produces a code no
surface has a translation for, at the moment something is already failing.

**NOT DECIDED HERE, deliberately.** Three options exist and they are not equivalent — core exports
the mapping; the domain adopts the wire's family; or the wire adopts the domain's and D-036 §2 is
reopened. The first looks obvious and the third is the only one that removes the two-families
problem rather than managing it. It is a product-wide naming decision with twenty-four call sites
and a ruled arbitration behind one of the answers, so it goes to the project owner rather than being
settled by whoever happened to be propagating a regex.

**What was done meanwhile: nothing, and that is the point.** The pattern was NOT propagated into the
documents. Writing it there would have encoded core's spelling as the contract's, in the one place a
generated client reads — converting an open question into a published answer, silently, as a side
effect of a tidy-up.

### D-068 — No LSP, and the measurement that closes the question D-061 left open

**D-061 deferred it in one sentence**: *"an agent with the published `.d.ts` and a working `tsc`
already has the export list and go-to-definition… the LSP is worth revisiting once a map exists; it
is not the cheap half."* The map exists now, so the question is live, and the project owner asked it.

**Measured on this repository, today:**

| | |
|---|---|
| `pnpm run typecheck` | **2.1 s**, cold and warm alike |
| `pnpm run check:emit-diff` | 5.3 s |
| `pnpm run verify` | **29 s** |

**A language server buys nothing an agent here lacks.** Its three offers are answered already:
the export list with kinds, signatures and a first documentation sentence is `REPOSITORY_MAP.md`,
535 names, generated and freshness-gated; find-references is `rg`; diagnostics are a two-second
`tsc`. *The cost of adding one is a client, a lifecycle and a second source of truth about types —
against a saving of two seconds.*

**WHAT ACTUALLY COST TIME TODAY WAS NONE OF THAT, AND ALL THREE CAUSES ARE FIXED.**

1. **Type resolution went through `dist`.** `@arthome/core` is a symlink whose `exports` point at
   build output, so an editor read a moving artefact and lit every contracts file red. Each package
   now offers an `@arthome/source` condition and the shared tsconfig asks for it. *Proven by
   deleting core's entire `dist`: typecheck and eslint both exit 0.*
2. **Concurrent gates raced on the same `dist`.** Two workers each running a gate that builds first
   produced torn declaration files and a wall of `no-unsafe-*` in correct code. The build takes an
   exclusive lock now. *Proven: three simultaneous runs, one distinct output.*
3. **The loop was fourteen times too slow.** Workers iterated on `verify` at 29 s when `typecheck`
   answers in 2. Nothing told them otherwise, and nothing about `verify` says it is the wrong tool
   for finding a missing import.

> ***The instrument was never the bottleneck. What an agent needed was to be told which of the
> instruments already there answers the question it is actually asking.***

**Ruling: no LSP. `code-conventions.md` gains the fast loop instead** — `typecheck` while writing,
`check:emit-diff` when a schema is meant to be finished, `verify` before handing back. Revisit only
if a measurement changes, and record the measurement rather than the impression.

### D-069 — The validation boundary is decided during implementation, and authentication is the exception

**D-067 left a question open and flagged it as blocking: where does validation stop?** A badly
filled field either dies at the door as `api.schema_invalid` or reaches a rule that refuses it by
name. The whole published/guard split of the error codes rests on the answer, and no service exists
to have made it.

**The project owner's ruling: it depends on the case, and it is settled as the code is written.**
Three reasons, and the second is the one that makes deferring safe rather than lazy.

1. **Arthome does not have fifty thousand business rules.** The population is small enough that
   classifying it wholesale, in advance, would be inventing a taxonomy for cases nobody has met.
2. **The codes will move during implementation anyway.** A classification made now would be
   re-litigated by the first service that disagrees with it — so the honest artefact is one that
   expects to move, not one that pretends to be final.
3. **Where rules actually live is the studio**, not the storefront. A viewer browses and buys; a
   control room decides. The refusals that need naming cluster on one side.

**THE ONE STANDING EXCEPTION: AUTHENTICATION STAYS DELIBERATELY VAGUE.** Its codes do not explain
themselves, and that is a security property rather than an omission — a refusal that says *which*
check failed is an oracle, and answers a question the caller was not entitled to ask. So
`identity.*` is the one family where a generic code is the correct one, and where "be more
specific" is the wrong instinct.

**What this changes in practice.** The 15/10 split in `error-codes.ts` stops being a decision
awaiting ratification and becomes **a starting position that the first service may move**. The
instrument that makes that safe already exists and needs nobody to remember it: `check-vocabulary`
runs the inverse check, so a member declared domain-only that reaches a contract fails on the day it
does.

> ***A classification nobody can verify yet is better held as a default with a detector behind it
> than as a decision with a signature under it.***

---

### D-070 — Three documents travel to the consuming repositories, and the third is generated rather than committed

**The rules were already travelling; what existed nowhere was a list of what exists.**
`critical-rules.md` and `code-conventions.md` say how to write. Neither says which helper is
already written. The evidence that this is a real gap and not a hypothetical one is in this
repository's own history: on the day the contracts were written, **ten modules independently wrote
the same `instant()`, and four wrote the same local-vocabulary helper.** Their authors were not
careless — nothing told them.

So `available-surface.md` joins them: 543 exported names under 16 subpaths, with a sentence per
subpath saying what it is for, in 128 lines against `REPOSITORY_MAP.md`'s 705.

**It is derived from the long map, not from the TypeScript.** Re-reading the declarations would
have produced a second extractor that could disagree with the first — the parallel table again, in
the tool that exists to prevent parallel tables. One source, and one freshness check: `check:map`
already fails when the long map is stale, so a short map generated from it *cannot be fresher or
staler than the thing already guarded.*

**And it is regenerated on every build rather than committed.** A committed copy would have needed
its own gate, or would have been a third thing to remember. Build output cannot drift.

**The preamble names subpaths, never individual symbols.** A hand-written list of helpers is
precisely the artefact that goes quietly wrong when one is renamed.

**⚠ THE FAULT THIS NEARLY SHIPPED WITH, because it is the one this document cannot survive.** The
first parser read the entry kind as `\w+`. The kind `type+const` does not match `\w+` — and
`type+const` is not an exotic case, it *is* the vocabulary pattern: `ChatMode`, `CrewRole`,
`ApiErrorCode`. Fifty-five names were dropped, **every one of them an enumeration**, from the
document whose entire purpose is stopping somebody from writing a second one. It was caught only by
comparing two counts that had no reason to be compared: 488 here against `check-map`'s 543.

> ***An incomplete list of what exists reads exactly like a complete one.*** That is the whole
> danger of this artefact — it cannot be wrong in an interesting way, only short, and short is
> invisible. So the generator now refuses to write a map at all when any entry line under a subpath
> heading fails to parse, and says which line. Proven by injecting `(type & const)`: exit 1, the
> offending line printed.
