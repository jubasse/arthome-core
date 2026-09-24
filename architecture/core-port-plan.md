# Porting plan for `@arthome/core`

> **A plan, not code.** No TypeScript is written here: the package will compile with the
> `tsconfig` files `@arthome/tooling` is currently laying down. All the **design** work can be
> done now, and it is the design that will decide whether the package stays importable under Metro.
>
> Sources: `shared/helpers.js` (810 lines, **153 functions**, ~130 exported members),
> `shared/fixtures.js`, `shared/studio-data.js`, `shared/catalogue.json`, `shared/taxonomy.json`,
> and my own `data-model.md`, `context-map.md`, `events.md`.
>
> **We port the rules, we reshape the forms.** Families D and E of `corrections-handoff.md` are
> the shopping list: §4 says, rule by rule, what is corrected on the way through.

---

## 0. The four constraints that govern everything else

| Constraint | Immediate consequence |
|---|---|
| **Zero framework dependencies** | no React, no Angular, no Nest, **no browser API**, nothing Node-specific. The package runs under Node, Next, **Metro** and Angular |
| **`isolatedDeclarations` under TS 6.0.3** | **every public surface is annotated explicitly** — §6. That is not style, it is a compilation condition |
| **zod must not contaminate the domain** | **two package entry points**, `.` with no dependency and `./schema` with zod — §2. That is the structuring decision |
| **No value computed twice** | a rule lives **once** here and is evaluated everywhere; what is forbidden is two **implementations** (`context-map.md` §0) |

**And one constraint `shared/` violates everywhere, to be dealt with up front.** `helpers.js`
carries three mutable global states — `locale`, `viewerCountry`, and an implicit `now()` clock —
plus a global `byId` index over the fixture set. In one file loaded by a mockup, that is
convenient. **In a package imported by seven services and five applications it is a defect**: two
concurrent requests of one NestJS service would share the same language and the same country.

> **Porting rule no. 1: no global state. Every function receives its context as an argument.**

It is the most mechanical reshaping of the lot, and the most pervasive: it touches nearly all 153
functions. It is paid for once.

---

## 1. The tree — nineteen modules

The handover file proposes `taxonomy/`, `catalog/`, `fixtures/`, `i18n/` and
`domain/{booking, replay, payout, permissions, timezone}`. **I am correcting it**: it predates the
context map, it files under `booking` things that do not belong there (the right to watch,
moderation), and it has nowhere to put the closed vocabularies — which are nonetheless the written
remedy to the project's dominant fault (E2).

```
@arthome/core/src/
├── kernel/          injectable clock · domain errors · base types
├── vocabulary/      ALL the closed vocabularies + tolerance of the unknown
├── money/           Money · roundMinor · arithmetic in minor units
├── time/            instants · VenueClock · windows · IANA
├── taxonomy/        universes · disciplines · genres · tags · attributes · rank
├── catalog/         date · publication · displayState · territorial rights · language
├── ticketing/       capacity · SeatHold · prices · promotions · discounts · seat code
├── entitlement/     decideWatch · preview · concurrent sessions
├── replay/          policy · window · expiry · hours left
├── payout/          commission · VAT by jurisdiction · net · withholding
├── permissions/     roles · grants · effective rights · navigation
├── moderation/      three axes · derived badge · precedence · two counters
├── notification/    thresholds · quiet hours
├── search/          criteria normalisation · signature
├── media/           declared renditions
├── format/          formatting without Intl, explicit locale
├── i18n/            the KEYS and the reference catalogue
├── schema/          ← THE ONLY ONE THAT DEPENDS ON ZOD (§2)
└── fixtures/        deterministic set — fixtures.js's second life
```

### What each module exports

| Module | Exports | Does not contain |
|---|---|---|
| `kernel` | `Clock` (port), `SystemClock`, `FixedClock` · `DomainError` + its code · `Result` · `Brand<T>` for typed identifiers | any business rule |
| `vocabulary` | the **22 closed vocabularies**, typed, each with its list, its type and `parseTolerant()` which **keeps the unknown as neutral** | labels |
| `money` | `Money` · `money()` · `add` · `sub` · `mulRate` · **`roundMinor`** · `compareCurrency` | formatting |
| `time` | `Instant` (ISO UTC) · `VenueClock` · `offsetForInstant` · `isWithin` · `expiresAt` · `seasonBounds` | display |
| `taxonomy` | the typed artefact · `rankOf` · `familyOf` · `genresOf` · `matchTag` · `resolveTerm` | queries over a catalogue |
| `catalog` | **`displayStateOf`** · `outcomePrecedence` · `isRoomOpen` · `progressOf` · `isAvailableIn` · `blackoutReasonOf` · `languageProfileOf` · `hasLanguageBarrier` · `isUnderstandable` · **`nextPublicationTransitions`** · `publicationChecklist` · `isTransitionLocked` | the data |
| `ticketing` | `seatsAvailability` · `fillRate` · `isScarce` · **`holdExpiryFor`** · `priceFor` · `applyBestDiscount` · `serviceFeeFor` · **`seatCode`** · `capacityTierRules` · `cancellationDeadline` | Stripe |
| `entitlement` | **`decideWatch`** · `WatchVerdict` · `previewBudgetOf` · `concurrentLimitOf` | issuing tokens |
| `replay` | `replayWindowOf` · `replayExpiresAt` · **`replayHoursLeft`** · `isReplayOnSale` | the file |
| `payout` | **`payoutOf`** · `commissionOf` · `vatBreakdownOf` · `netOf` · `payoutStateFor` · `dueAtFor` | Stripe, reconciliation |
| `permissions` | `MemberRole` (8) · **`effectiveRightsOf`** · **`assignableRolesOf`** · `canRevenue` · `canDecide` · `navigationFor` · `openPanesFor` · `tabPreferenceFor` | authentication |
| `moderation` | **`moderationBadgeOf`** · `precedenceOf` · `canSettle` · `claimLeaseDuration` · `settlementGuard` | the queue |
| `notification` | the **five thresholds** · `quietHoursApply` · `reminderLeadFor` | sending |
| `search` | **`normalizeSearchCriteria`** · `criteriaSignature` · `migrateCriteria` | the index |
| `media` | `renditionsFor` · `pickRendition` | provider URLs |
| `format` | `formatMoney` · `formatNumber` · `formatCompact` · `formatClock` · `formatDuration` · `formatTimecode` · `formatDayLabel` — **all with `locale` as an explicit argument** | global state |
| `i18n` | the `MessageKey` type · the reference catalogue · `keysFor(surface)` | translated sentences served dynamically |
| `schema` | the base zod schemas — §2 | rules |
| `fixtures` | `buildFixtures(seed, clock)` — deterministic | nothing exported to production |

**Nineteen modules, and two package entry points.**

**Why `vocabulary` is a module of its own and not a file inside each domain.** E2 is the project's
dominant fault: eight fields, five mockups, a parallel literal table every time. The remedy is not
a principle, it is **one single place where a vocabulary is declared**, and a place you can quote
in a review. The twenty-two:

```
publicationState · runState · dateOutcome · displayState · replayPolicy · chatMode
messageState · moderationItemState · moderationVerdict · moderationReason · audienceSanction
filterSeverity · stateChangeOrigin · memberRole · crewRole · priceTier · planTier · planOpening
payoutState · incidentKind · incidentCause · blackoutReason
```

**Thirty-six in total, and not twenty-two.** This list's count was the one `data-model.md` named;
writing the code brought fourteen more to light, all already used by a contract or a screen: the
studio's navigation entries, the six panes of a date sheet, the six surfaces, the three
notification channels, the four order kinds, the subscription states, the moderation verdicts, the
rights scope, the device kinds, the crew roles, and the three tax vocabularies temps 4 added.
**None is new: they were written out in full and declared nowhere.**

**And each carries `parseTolerant()`**, which keeps an unknown value and treats it as neutral —
never a rejection. That is `storefront-tv` Q12's requirement, and it is the one thing in the
contract which, done badly, produces a black screen for people who can do nothing about it.

---

## 2. The pure-TypeScript / zod split — the structuring decision

It is not only "which ones are in zod". **It is a package boundary**, and it is what decides the
mobile client's bill.

```json
"exports": {
  ".":        { "types": "./dist/index.d.ts",        "import": "./dist/index.js" },
  "./schema": { "types": "./dist/schema/index.d.ts", "import": "./dist/schema/index.js" }
}
```

> **The `.` entry point imports zod nowhere, at no depth.** A surface that needs only the rules —
> the TV deriving a `displayState`, mobile computing hours remaining — **pulls in not one line of
> zod**.

It is the same lesson as D-012, applied one notch earlier: zod's cost is **fixed and tied to the
import**, not marginal and tied to the number of schemas. If `@arthome/core` imported zod from its
main entry point, no barrel-free entry point of `@arthome/contracts` could claw the bill back. **A
CI gate verifies it**: `arthome-check-core-entry` walks the import graph of the sources from
`src/index.ts` and fails if any path reaches `zod` or a `node:` specifier.

Stated as the mechanism rather than as the guarantee, because the two are not the same size. The
gate reads **imports**, so anything arriving another way is invisible to it — and one such route
was live here: the root tsconfig carried `types: ["node"]` against an uninstalled `@types/node`,
which would have put a Node global in scope across the package with the gate still green, since a
global is not an import. What closes that hole is `types: []` on the shared base, not this tool.

### What stays pure TypeScript — zero dependencies

**Everything that decides.** An invariant does not need to be validated, it needs to be true.

| Family | Functions |
|---|---|
| rounding and money | `roundMinor`, `add`, `sub`, `mulRate` — rounding **to the minor unit, on each component taken separately** |
| seat code | `seatCode` — **issued by the server**, never derived client-side |
| replay window | `replayExpiresAt`, `replayHoursLeft`, `isReplayOnSale` |
| payout | `payoutOf`, `commissionOf`, `vatBreakdownOf`, `netOf`, `payoutStateFor`, `dueAtFor` |
| rights by role | `effectiveRightsOf`, `assignableRolesOf`, `canRevenue`, `canDecide`, `navigationFor` |
| state and transitions | `displayStateOf`, `nextPublicationTransitions`, `isTransitionLocked`, `publicationChecklist` |
| the right to watch | `decideWatch`, `previewBudgetOf`, `concurrentLimitOf` |
| capacity and prices | `seatsAvailability`, `fillRate`, `isScarce`, `priceFor`, `applyBestDiscount`, `holdExpiryFor` |
| moderation | `moderationBadgeOf`, `precedenceOf`, `settlementGuard` |
| time | `offsetForInstant`, `isWithin`, `seasonBounds`, `isRoomOpen`, `progressOf` |
| search | `normalizeSearchCriteria`, `criteriaSignature` |
| formatting | all of `format/` — without `Intl`, locale as an argument |

### What lives in zod, inside `./schema`

**Only what crosses a boundary and must be checked on arrival.** The **base** schemas, the ones
`@arthome/contracts` extends with `.extend()` and `.pick()` rather than redeclaring.

| Schema | Why here and not in `contracts` |
|---|---|
| `MoneyOut` / `MoneyIn` | seven services and five applications exchange it; redeclaring it would be E2 on the most manipulated value in the system. **Two forms because it is the one shape that crosses both ways** — served in responses, and accepted as `expectedTotal` on `POST /v1/orders/seats` |
| `InstantSchema` | **ISO 8601 UTC string** — `z.date()` is inconvertible to JSON Schema, so never a `z.date()` at a boundary |
| `VenueClockSchema` | `{ venueTimezone, venueUtcOffsetMin }` — the two always travel together (D3) |
| `IanaTimeZoneSchema` | shape validation, not existence: the IANA database is not bundled |
| the **22 vocabularies** | strict `z.enum` on the **way in**, `z.union([z.enum, z.string])` on the **way out** — `backend-contracts`'s rule R14 |
| branded identifiers | `AccountId`, `ProfileId`, `DateId`, `ShowId`, `ArtistId`, `VenueId`, `ChannelId`, `SeatId`, `OrderId` — UUIDv7 validated by shape |
| `SlugSchema`, `LocaleIn`/`LocaleOut`, `CountryCodeSchema`, `CurrencyCodeSchema` | boundary vocabularies |
| `PageCursorSchema` | opaque Base64 over `(created_at, id)` |
| `BuyerTaxLocationSchema`, `TaxEvidenceSchema` | §5 — new, and they cross |
| `ErrorEnvelopeSchema` | `code`, `params`, `traceId`, **`nature`** |

**Three boundary rules, written into the package — and each one says where it is held:**

1. **no `z.transform()` in a boundary schema** — inconvertible to JSON Schema, so the generated
   OpenAPI would lie, and lie in the one direction nobody checks: the document still generates
   cleanly. Held by `arthome-check-core-entry`, which scans the sources of the modules **reached
   from the `./schema` entry point** for `.transform(` and `z.date(`.

   It is a rule about what may be *written*, so the honest assertion is a scan rather than a
   behavioural test — and the first draft was a spec using `node:fs`, which `tsc` refused: the
   package sets `types: []` so a Node API is unreachable from it, and the spec shares that project.
   The test would have had to open a hole in the wall it was testing. Scoped to what the entry
   point **reaches**, not to the directory: a file in `src/schema/` that nothing imports sits at no
   boundary, and a boundary schema placed elsewhere and re-exported sits at one.

2. **`io: "input"` describes a request, the output describes a response** — those are two schemas,
   not one read twice. Held by `vocabularyIn` / `vocabularyOut` in `src/schema/vocabulary.ts`: the
   asymmetry is the signature, so it cannot be forgotten at a call site. A bare `z.enum()` on a
   response does the wrong thing by default — it fails the whole payload the unknown value sits in,
   not the one field — which is why this is a constructor and not a note. Pinned by
   `schema.spec.ts`, "the in / out asymmetry".

3. **a validation failure translates into a code**, never into a zod message in English — otherwise
   i18n leaks at the first form error, and it is the payment form that leaks it. Held by
   `issueToCode` in `src/schema/error.ts`, pinned by `schema.spec.ts`, "failures leave as codes".

**What is NOT in zod, and what one would be tempted to put there**: the rules. `decideWatch` does
not validate its input with a schema — it receives types already checked at the boundary and
**decides**. Putting zod there would charge the dependency to every entitlement evaluation, on the
hottest path in the system.

---

## 3. The porting table — where each thing comes from

**Of ~130 exported members of `helpers.js`**: 38 carry a rule, 24 are formatting, 31 are queries
over the fixture set, 19 are i18n resolution, and the rest is indexed access. The proportion
matters: **less than a third of the file is domain**, and it is that third we port.

### 3.1 Ported as it stands — the rule is right, and so is the shape

| `helpers.js` | `@arthome/core` | Note |
|---|---|---|
| `isRoomOpen` | `catalog.isRoomOpen` | the `roomOpensBeforeMin` constant is served, no longer copied (E11) |
| `progressOf` | `catalog.progressOf` | clamped 0–1 |
| `isSoldOut` | `ticketing.seatsAvailability` | becomes a **discriminated union**, not a boolean |
| `matchTag`, `resolveTerm` | `taxonomy.*` | unchanged |
| `categoryOfShow`, `genreOfShow` | `taxonomy.*` | unchanged |
| `number`, `compact`, `duration`, `timecode` | `format.*` | **without `Intl`, verified**: the port stays free of `Intl`, which is exactly what Metro needs |

### 3.2 Ported with a correction — the rule is right, the data is wrong

| `helpers.js` | Becomes | What is corrected |
|---|---|---|
| `stateOf` | **`catalog.displayStateOf`** | **E4**: three axes with no hierarchy. The new function composes `publication.state`, `run.state` and `outcome` with the written precedence — `outcome` > `run` > `publication` — and returns **`{ state, validUntil }`** |
| `replayHoursLeft` | `replay.replayHoursLeft` | **E2**: `sub`/`off` from the mobile mockup are not vocabulary; `helpers.stateOf` tested `policy !== 'none'`, so a date created with `off` would never have been recognised as having no replay |
| `languageDependency`, `hasLanguageBarrier` | `catalog.languageProfileOf`, `hasLanguageBarrier` | **D1**: the declared vocabulary `none \| light \| helpful` does not contain `essential` — the value the rule depends on, carried by five shows and translated in the i18n. `light` is used nowhere. The real vocabulary is **`none \| helpful \| essential`** |
| `availableIn`, `blackoutReason` | `catalog.isAvailableIn`, `blackoutReasonOf` | **E8**: `blackoutReasons[]` carries `label`/`labelEn` — prose written **into the data**. The function returns a **code**, never a sentence |
| `venueClock`, `venueDiffers`, `zoneAbbr` | `time.offsetForInstant`, `VenueClock` | **D3**: `venue.utcOffsetMin` is a **frozen** offset; the abbreviation was derived by comparing it against a table. A frozen offset does not survive a daylight-saving change, and a date six months out displays wrongly. **IANA** identifier + UTC instant, offset **recomputed at serve time** |
| `plans`, `planOf` | `vocabulary.PlanTier` + `entitlement.planOpeningsOf` | **E1, the gravest**: four disjoint vocabularies, and `planOf()` does `filter(...)[0] \|\| plans()[0]` — **no reference account finds its own, all fall back to `free`**. Since `plan.opens[]` conditions access to playback, it is an **authorisation defect**, not a display one. One single set: `free \| pass \| premium`, in **kebab-case on the wire** |
| `canInvite`, `invitableRoles` | `permissions.assignableRolesOf` | **E6**: `studio-data.js` folds eight roles onto six personas and **destroys `director`'s invitation right**. The domain carries the **eight**; the six are a label |
| `messageState`, `isVisible` | `moderation.moderationBadgeOf` | **E3 / D6**: four scales, and `reported` — a **triage** state — lodged in the sanctions field. Three separated axes, written precedence, derived badge |
| `publicationState`, `isLocked` | `catalog.nextPublicationTransitions`, `isTransitionLocked` | **E5**: the fixtures lock **states**, the mockup locks **transitions**. It is the second that is right — publishing commits the price, putting a replay online puts it on sale. The lock is on a **`from > to` pair** |
| `payoutOf`, `balanceOf` | `payout.payoutOf` | **D5**: `net = gross − 12% − VAT(gross)` is **not a tax rule**, it is a plausible number for a mockup. Reshaped in §4 |
| `imageUrl`, `seededImage` | `media.renditionsFor` | The `{id}?w={w}` recipe is a **mockup convenience**. A 4K background decoded for a thumbnail costs as much as a full screen: the contract carries **declared renditions** at the sizes actually displayed |
| `seatsLabel` | `ticketing.seatsAvailability` + i18n | the function returned a **sentence** ("86 seats", "Sold out"); it now returns a state, and the label is a key |
| `devicesOf` | `permissions` / outside the domain | **E13**: `devices` is an **integer** in `catalogue.json` and a **list** in `fixtures.js`. Two shapes, one name. Settled: `Device` + `DeviceSession` |

### 3.3 Reshaped, not ported — the shape does not survive

| `helpers.js` | Why the shape falls |
|---|---|
| **`isWatchable(account, date)`** | assumes the client **holds the complete list of the account's seats**. Untenable: it grows, it changes while the application sleeps, and the territorial decision does not belong to the client. Becomes **`decideWatch(inputs): WatchVerdict`** — five inputs, one verdict, a refusal code, a fallback action, an expiry |
| `ownedDates`, `owns`, `follows`, `resumeOf` | reads over a global set. Become **inputs** to `decideWatch` or service read models |
| `catalogueFor` | the child-profile filtering happens **server-side**: otherwise a child's TV downloads the adult catalogue in order to hide it |
| `t`, `label`, `enumLabel`, `content`, `title`, `synopsis`, `bio`, `chatText` | **i18n resolution** over a global language state. `core` keeps the **keys**; resolution is surface-side, over the versioned artefact |
| `now`, `nowMinutes`, `dateAt` | **D7**: `startOffsetMin` and `atMin` are offsets relative to the moment the application opens, and `catalogue.json` says it itself: *"nothing here expires"*. Excellent for a mockup, **unusable in a contract**. Become **ISO instants** + an **injectable clock** |
| `setLocale`, `setViewerCountry` | mutable global state — see §0 |
| `show()`, `artist()`, `date()`, `datesOfShow`, `liveNow`, `tonight`, `datesInCategory`… (31 members) | **queries over the fixtures**. They are not domain: they become repository queries in the services, and they survive as they are in `fixtures/` for the tests |
| `publicationOf`, `payoutOf` (access), `healthOf`, `moderationOf`, `merchOf`, `inboxOf` | same — indexed access, not a rule |

### 3.4 `fixtures.js` — its second life

`buildFixtures(seed, clock)`: **deterministic**, the same catalogue on every run, but it now
produces **instants** and not offsets. Converting back to relative offsets, if a demonstration
still needs it, becomes a **presentation convenience** and not a transported shape.

Three uses: the seven services' integration tests, the public demonstration set, and the
`FakePaymentAdapter` mode which must run **with no key and no network**.

---

## 4. What is new — nothing in `shared/` carries it

These rules were **designed** during this session, not observed. They have no fixture behind them,
and that is a warning as much as a list.

| New | What it is | Why it did not exist |
|---|---|---|
| **`displayStateOf`** | the fourth value, derived and unique, from the three state axes | each surface recomposed the hierarchy its own way — the very definition of a value computed twice (E4) |
| **`decideWatch`** | the five-input playback verdict | `isWatchable` assumed an omniscient client |
| **`holdExpiryFor`** | **`SeatHold.expiresAt` is the SAME instant as the purchase intent's expiry** — 15 min for a checkout, 5 min for a TV pairing | nothing held the capacity: the TV showed "12 seats" for the whole time the phone was awaited |
| **`seatCode`** | server-side issuance of the seat code | the mockup **hashed it client-side**: three surfaces, three hash functions, three codes for the same seat |
| **`vatBreakdownOf` + `BuyerTaxLocation`** | breakdown by **jurisdiction**, location evidence, **rate applied at the sale** | the fixture applies `billingMarkets[0]` to everything. And a billing market is a **pricing** notion, never a **tax** one |
| **`payoutOf` reshaped** | commission on the **net of tax**, VAT at the viewer's country rate, liable party = the platform | D5: the fixture's formula produces a plausible number and answers none of the three tax questions |
| **the two moderation counters** | `version` carries the **lease**, `decisionVersion` carries the **settlement** — only a verdict increments it | a single counter cannot express "refuse if settled, accept if merely claimed", and it cancelled out mobile's offline queue |
| **`precedenceOf` (automatic moderation)** | a human overturns an automatic decision, **never the reverse**; the origin **survives** the settlement | nothing to build today; the shape must be able to accommodate a non-human actor without a contract change |
| **`normalizeSearchCriteria` + `criteriaSignature`** | the "already saved" deduplication, computed **once** | the mockup computed it client-side, on two screens, and it triggers a write |
| **`migrateCriteria` + `criteriaVersion`** | a saved search **replays or declares itself stale**, never vanishes in silence | nothing versioned the filter grammar |
| **`seasonBounds`** | 1 September → 31 August | a domain notion five surfaces would have guessed |
| **the five notification thresholds** | 30 min · 85% · 6 h · queue > 10 · post unassigned at D-1 | written into screen copy, copied per surface |
| **`capacityTierRules`** | monotonic tiers, provisioning threshold (10,000), revision deadline (72 h), priority window (2 h) | absent from `shared/`; six shapes displayed by the mockup with no owner |
| **`parseTolerant`** | keeping an unknown enumeration value and treating it as **neutral** | the TV fleet's survival depends on it |
| **`concurrentLimitOf`** | `multi_screen` is an **execution constraint**, not a marketing line | no count existed |

---

## 5. The tests that hurt — and the invariant each one protects

**The rule I imposed in the definition of done applies here first: a test names the invariant it
protects.** A test that describes what the code does is useless the day the code changes; a test
that names a promise survives the refactoring.

### 5.1 The ones the original file named

| Test | Invariant protected | The case that hurts |
|---|---|---|
| **Time zones** | *a date scheduled six months out displays at the right hour* | a date **the day after a daylight-saving change**, in a venue in a different zone from the viewer, with a day shift ("the day before" / "the next day"). It is the case that made D3 fail, and a frozen offset still misses it |
| **Replay expiry** | *the window is computed from the end of the live show, never from the start* | an **interrupted** date: does the window run from the interruption or from the announced end? Plus a 200 h window crossing a daylight-saving change |
| **Rights by role** | *the fold onto six personas never creates a right* | a person holding `video` **and** `moderation` on the same channel: the navigation is the **union**, and `assignableRolesOf` must return **empty** — neither `video` nor `moderation` can invite |
| **VAT and rounding** | *each component is rounded separately, to the minor unit* | a basket of three seats at a price that does not divide evenly, in **two jurisdictions** — the sum of the roundings is not the rounding of the sum, and that is where a cent is lost |
| **Payouts** | *the commission is taken on the net of tax, never on the gross* | the **same seat sold in France and in Switzerland**: the commission must be **identical**, otherwise the 12% announced to artists varies with the buyer's country |
| **Seat codes** | *the server issues, the client never invents* | the same `seatId` handled by three surfaces must return the **same served code** — and the test must fail if somebody reintroduces a client-side hash |
| **State transitions** | *two transitions are one-way* | `scheduled → draft` and `replay-online → ended` must be **refused** with the promise made as a parameter; and the **attempt** must be journalled |

### 5.2 The ones this session brought out

| Test | Invariant protected | The case that hurts |
|---|---|---|
| **Precedence of the three axes** | *`outcome` outranks `run`, which outranks `publication`* | a date with `publication: live`, `run: on_air`, `outcome: cancelled` — the outcome must win. A combination that looks absurd, **produced by a Kafka consumption order** |
| **`displayState`'s `validUntil`** | *a served state carries the instant at which it stops being true* | a state served **one second before** the room opens: `validUntil` must be that instant, not `now + 60 s` |
| **`decideWatch`, the five inputs** | *one verdict, the same refusal vocabulary on both sides* | the **complete truth table**: holding × state × territory × replay policy × plan. And the case that matters: a seat holder, **out of territory** → `OUT_OF_TERRITORY`, not `NO_SEAT` |
| **`SeatHold` and pairing** | *one instant, carried by two objects* | a `seat` pairing that expires must free the capacity **at the same instant**, and `seatsAvailable` must **go back up** without any surface asking for anything |
| **The two moderation counters** | *a verdict is accepted while another holds the lease* | `claim` → `release` → an offline verdict at the previous `expectedVersion`: **accepted**. Then a verdict after a verdict: **refused, with the winner** |
| **`parseTolerant`** | *an unknown value is kept and neutral, never rejected* | a **22nd discipline** and an unheard-of outcome in the same payload: the whole page must render. It is the one thing which, done badly, produces a black screen for people who can do nothing about it |
| **`criteriaSignature`** | *the same search produces the same signature, whatever the order of the filters* | two disciplines and three tags **in two different orders** → one single signature. Otherwise "already saved" lies and we create two alerts |
| **Discount against promotion** | *the one most favourable to the viewer, never both* | a preview at a discovery rate for a `premium` subscriber: stacking would give a **negative price** |
| **`roundMinor` and the credit note** | *a credit note never creates money* | a partial refund followed by a credit note on the remainder: the sum must be **exactly** the amount paid, to the cent |
| **Consumption order** | *a consumer never sees an outcome before the publication that creates it* | `publication.engaged` and `date.scheduled` on the **same partition**, replayed out of order → the projector must stay correct |
| **Injectable clock** | *no rule reads the system clock* | every function in `time/`, `replay/` and `catalog/` must be **deterministic under `FixedClock`**. A test that passes at 23:59 and fails at 00:01 has found a forgotten `Date.now()` |

---

## 6. `isolatedDeclarations` — what it imposes in practice

The published `.d.ts` files are compiled with `isolatedDeclarations` under **TS 6.0.3**, the common
ceiling of the seven repositories. The compiler must be able to write the declaration **file by
file, with no inference between files**. Three consequences, all mechanical:

1. **Every exported function annotates its return type.** `export function payoutOf(…)` without an
   annotation **does not compile**. Over ~90 public functions, that is mechanical work to do up
   front rather than to catch up on.
2. **No public type inferred from a function's BODY.** That is the correct phrasing, and it
   corrects what this document said when it was written.

   > **Correction reported at writing time.** This paragraph forbade
   > `export const ROLES = [...] as const`. **It was wrong on both counts.**
   > First, `isolatedDeclarations` **allows** an `as const` assertion on a literal: the type is
   > syntactically computable there, no inference crosses a function body.
   > Second and above all, `arthome-check-enums` **requires that exact form** — it discovers the
   > vocabularies by the pattern `export const NAME = ['a','b'] as const`. Forbidding the form
   > would have **disabled the project's anti-E2 gate**.
   >
   > The form adopted is therefore, for each vocabulary, **three declarations**: the list in
   > `as const` (which the gate discovers), the derived type, and an object of **named members** so
   > the rules never write a string literal — without which the gate would be unbearable in use.
3. **No anonymous type exported.** Every shape returned by a public function is a **named and
   exported** type: `WatchVerdict`, `PayoutBreakdown`, `SeatAvailability`, `PublicationTransition`,
   `DisplayStateResult`. The package gains from it — a named type can be quoted in a review, an
   anonymous one gets copied.

**The proof expected, and it is local** (the Actions quota is exhausted): compile the published
`.d.ts` files and type-check them from a project on TS 6.0.3. A package whose declarations can only
be read by the version that produced them is not finished.

---

## 7. The porting order

The modules depend on one another; porting them out of order forces you to write stubs. The order
that needs none:

```
1. kernel · vocabulary · money · time          no dependencies, everything depends on them
2. taxonomy · media · format · i18n            depend on 1
3. catalog · replay · permissions              depend on 1 and 2
4. ticketing · moderation · notification · search
5. entitlement · payout                        depend on 3 and 4 — the most exposed
6. schema                                      the ONLY one that adds zod
7. fixtures                                    depends on everything, depended on by nothing
```

**`entitlement` and `payout` last among the rules**, and that is deliberate: they are the two that
compose the most — five inputs for one, a jurisdiction and a tax model for the other — and the two
where a defect costs the most. Writing them last means writing them on foundations already tested.

**`schema` after all the rules**, because a boundary schema describes a shape the domain has
already fixed. The reverse — drawing the schemas first — would produce rules dictated by the shape
of a payload, which is exactly the defect this project spends its time correcting.
