# Handover — backend-domain

`@arthome/core`, `proto/`, `tools/check-core-entry.mjs`, the domain documents in `architecture/`.
What follows is only what you cannot get from the code, `git log` or `DECISIONS.md`.

## 1. A correction to my own last report, first

I reported a gate suite green when part of it was red. I had run each gate piped into `tail` and
read `$?`, which is the **exit code of `tail`**, not of the gate. `check-language` had crashed with
`MODULE_NOT_FOUND` and I reported it passing. The lead independently made the same mistake twice the
same week, so treat it as a property of the shell rather than of one agent: never read an exit code
through a pipe.

**Where my area actually stands, re-measured rather than recalled:** `pnpm run verify` is green,
339 tests across 29 files. Two things differ from my last report and neither is mine:
`LocaleSchema` no longer exists — it is now `LocaleIn` / `LocaleOut` (`caec3ed`), because a response
field used the strict one; and `vocabularyOutNullable` joined the exports after it. If you read an
older message of mine listing the `./schema` exports, it is stale by those three names.

## 2. Rules that live where you would not look for them

**The `no z.transform()` / `no z.date()` boundary rules are in `tools/check-core-entry.mjs`, not in a
test.** I wrote them as a spec first; `tsc` refused it, correctly. `packages/core` sets `types: []`
precisely so a Node API is unreachable, and a source scan needs `fs` — the test would have had to
open a hole in the wall it was testing. They are scoped to **the modules reached from the `./schema`
entry point**, not to the `src/schema/` directory: a file sitting there that nothing imports is at no
boundary, and a boundary schema placed elsewhere and re-exported is at one. If you add a third rule
of that kind, it belongs in the same walk for the same reason.

**`WATCH_DENIAL_REASONS`, `WATCH_FALLBACK_ACTIONS` and `WATCH_SCOPES` are in
`src/vocabulary/entitlement.ts`, not in `src/entitlement/`.** Not tidiness: `replay/` is wave 3 and
`entitlement/` is wave 5, and `replay/` needs the denial reasons. Leaving them in `entitlement/`
would have made a wave-3 module import a wave-5 one and inverted the porting order. A side effect
worth knowing: moving them made `entitlement/index.ts` **scannable by `arthome-check-enums`**, which
excludes declaring files — and it immediately found three inline `scope` literals nobody had seen,
because that file had never once been swept in its own right.

**`WATCH_DENIAL_REASONS` is SCREAMING_SNAKE against `code-conventions.md` §5.2.** Deliberate, noted
at the declaration. Do not "fix" it.

## 3. Couplings that are data, and pairs that only look coupled

**Genuinely coupled, as exhaustive tables keyed on a vocabulary** — add a member to the key
vocabulary and TypeScript fails the build with TS2741, which is the whole point of writing them as
`Record` rather than as a `switch`:

- `WATCH_FALLBACK_FOR` — `WatchDenialReason` → `WatchFallbackAction[]` (`entitlement/index.ts`)
- `GRANTS` — `MemberRole` → `MemberRole[]` (`permissions/grants.ts`)
- `NAVIGATION`, `PANES` — `MemberRole` → entries / panes (`permissions/rights.ts`)
- `BLOCKING` — `PublicationChecklistItem` → `boolean` (`catalog/publication.ts`)

**`WATCH_FALLBACK_FOR` is the function's RANGE, not a menu of what a screen may offer.** Today all
seven actions happen to appear in it, which makes it *look* like a menu — that is a coincidence of
the current eleven rows, not a property. The value side is not checked for exhaustiveness and must
not be: if you need an action the table never returns, the question is which denial reason yields it,
not how to add it to the list.

**Pairs that share values and are NOT coupled.** Core has 20 such pairs; these are the ones that will
actually mislead you:

- `DISPLAY_STATES ∩ PUBLICATION_STATES` = six shared values. **Different axes** (E4). The sharing is
  deliberate and documented at the declaration: when no later axis takes over, the displayed state
  *is* the publication state. That is a statement about three of eleven members, not an equivalence.
- `DATE_OUTCOMES ∩ DISPLAY_STATES ∩ INCIDENT_KINDS` = `cancelled`, `interrupted`, `postponed`. Three
  vocabularies, three axes, one set of words. An outcome is what happened, a display state is what a
  card shows, an incident is what the run desk logs.
- `AUDIENCE_SANCTIONS ∩ MODERATION_BADGES` = `banned`, `muted`. The badge members are **bare** by
  decision — `banned`, not `badge_banned` — and the note at the declaration says why.
- `CREW_ROLES ∩ MEMBER_ROLES` = four shared. Different spaces; a crew role is per date.
- `none` appears in five unrelated vocabularies. It is never the same `none`.

## 4. Absences that are decisions

- **`Money` carries no tax semantics** (`{ amountMinor, currencyCode }`) and that is right for the
  domain: rounding, summing and commission arithmetic do not care. Tax is a **boundary** concern —
  under D-056 a displayed price is tax-inclusive and VAT is disclosed per jurisdiction via `VatLine`,
  never carried on the catalogue, which is publicly cacheable with no `Vary` on buyer country. If a
  response shape carries a bare `Money` where a viewer sees a price, that is the defect.
- **`WatchVerdict.fallback` is never null.** `none` is a member precisely so the absence is *spelled*.
  An **allowed** verdict can carry a real action — `scope: preview` returns `buy_seat` — so a null
  would collapse "no action" into "not denied" and silently drop the preview-to-purchase path. The
  wire was nullable here until this week; it is not any more, and it must not become so again.
- **No `LocaleSchema`**, deliberately, and no alias for it. An alias would keep the trap open under a
  familiar name; a removed export forces every call site to choose a direction.
- **`decideWatch` does not validate its input with a schema.** It receives types already checked at
  the boundary and decides. Putting zod there would charge the dependency to every entitlement
  evaluation, on the hottest path in the system.

## 5. The 114 exempt vocabulary blocks — I checked, and there is one

`check-vocabulary` exempts a block that declares `x-arthome-vocabulary-source: none` with a reason.
The gate enforces that a reason **exists**; it cannot enforce that the reason is **true**. So the
exemption is the one place a silent equality failure can hide, and the lead was right to ask.

I compared all 114 exempt blocks' members against every vocabulary core exports:

- **Zero are exact duplicates of a core vocabulary.** The 114 are sound in the sense that matters
  most — none is a copy wearing an exemption.
- **One is misdeclared**, and it is worth fixing:
  `storefront.yaml → SearchCriteria.displayStates.items`, five members
  (`scheduled`, `room_open`, `live`, `replay`, `ended`), all five of which are in core's eleven-member
  `DISPLAY_STATES`. Its reason text *says so in words* — "a narrowing of a vocabulary named elsewhere
  in this document". But `check-vocabulary` has a first-class **narrowing** mechanism
  (`x-arthome-vocabulary-narrowing`) which declares the source and then verifies every member is in
  core. Declared as `source: none`, those five members are never compared to anything. Rename
  `room_open` in core tomorrow and this filter keeps the old spelling, silently, forever.

  It is honest in prose and wrong in mechanism, which is the hardest kind to see: a reader who checks
  the reason will be satisfied. Fix is one block, and it converts an exemption into a checked
  narrowing. It belongs to whoever owns the contracts, not to core.

The remaining 113 fall into two groups: contract-local vocabularies with no domain counterpart
(`drmSystem`, `failureCode`, `promiseCode`, `invitationState`, `emptyReason` — these describe what an
endpoint offers, and a new member is an endpoint change), and narrowings already declared as such.
I would re-run the comparison above after any wave that adds vocabularies; it is a dozen lines and it
is the only thing standing between 114 unchecked blocks and a silent divergence.
