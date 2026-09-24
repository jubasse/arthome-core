# Handover — storefront TV

> Written 24 September 2026 by the `storefront-tv` specialist, before shutdown.
> Only what cannot be recovered from the code or from `git log`.

## The mockup is not organised by screen, and two things follow

`Storefront TV.dc.html` — 3,257 lines, 253 KB, roughly 63,000 tokens. Never open it whole.

The script is one class, `Component extends DCLogic`, L1607–3256. `renderReady()` is L2668–3255
and ends in a **single return object at L3170–3254** whose ~90 keys are **interleaved, not grouped
by screen**: `pgGate`, `pgHome` and `pgLive` sit scattered between `signin:`, `railW:`, `hints:`,
`hero:` and `profiles:`. Grep the key; do not go looking for a per-screen block. (Same shape as
storefront-web's `renderReady()`, different function.)

The **markup** is not grouped by screen either, and this one is worse because it looks as though it
is. Page blocks are top-level `<sc-if value="{{ pgX }}">` at two-space indent — except **six**
rail-based pages (`home`, `title`, `artist`, `live`, `category`, `replays`) which are nested inside
a `railPage` wrapper at L186–528 and **share** the rows block at L441–528. So `home` markup is
L189–233 **plus** L441–528. A fresh agent will hunt for a contiguous home block, fail to find one,
and conclude the file is a mess. It is not; it is factored.

## The parked generator, and the anchor fix it needs

The 15 files in `prototypes/screens/storefront-tv/` were produced by a Python slicer, not by hand.
The slicer lived in a session scratchpad and dies with this session. Rebuilding it is an hour;
rediscovering *why* it was built that way is the expensive part.

- It slices by line range **with an assertion on the first line** — `sl(a, z, expect)`. Every
  extraction asserts its own anchor. That is what turns "verbatim extraction" into a checkable
  property rather than a promise, and it caught three wrong line numbers before they became
  silently-wrong files.
- **Regenerate, never hand-edit.** When the headers had to be translated, regenerating through the
  same `sl()` calls kept all 47 extracted payload blocks byte-identical. Editing 15 files by hand
  would not have, and nothing would have told you.

**The anchor fix.** The run stopped at `category.html` because the `pageRails()` branch line
numbers had been guessed rather than looked up. The verified ones:

| branch | first line |
|---|---|
| `home` | 2591 |
| `title` | 2592 |
| `artist` | **2602** |
| `category` | **2611** |
| `replays` | **2648** |

`title` happened to be right; `artist`, `category` and `replays` were off by 2, 3 and 1. Sixteen
screens remain: `category`, `artists`, `artist`, `title`, `dateinfo`, `player` (plus four
sub-files), `tickets`, `list`, `replays`, `plans`, `book`, `pay`, `confirm`, `account`, `help`,
`ambient`, and `_index.md`.

**Split the player even though the size rule says not to.** 20.1 KB of markup plus 10.1 KB of view
model is 30 KB, under the 40 KB threshold. Split it anyway: it carries four independent overlays —
controls and panels L950–1036, incident L1039–1059, end-of-show L1061–1095, chat L1098–1138 — that
different people will work on separately. And `plans` has no markup at all: the page does not exist
in the mockup, so its file is a documented absence, not an extraction.

## What must replace `buildCatalogue()`

`buildCatalogue()` (L1660–1774) is the adapter between `shared/` and the flat row shape the screens
consume. That it loads all 1,814 dates (1.79 MB) and filters client-side is recorded. What it must
become is not.

It should be a **thin mapper over the served read models** — one per screen: `HomeScreen`,
`LiveScreen`, `CategoryScreen` — and it must map, never compute. Everything it currently derives is
now served: row order, the evening grid's hour grouping, the sub-genre interest ranking, the
billboard choice, the child-profile filter. If its replacement computes any of those, the surface
has quietly taken back a server responsibility and **nothing will fail** — it will simply be wrong
on one surface out of five, which is the failure mode this whole contract exists to prevent.

## Read `shared/helpers.js` end to end before anything else

40 KB, and it is the rules engine the entire handoff rests on. Reading it whole — not grepping it —
produced most of the findings that reached the contract: `stateOf()`, which is why the contract
carries instants and never labels, and `planOf()` silently falling back to `free` for every account
because three plan vocabularies disagree. Neither is visible from a search. Both come from reading
a function next to the data it is given.

## Two traps

**Attributing a mockup bug to `shared/`.** `fx.geography.viewerUtcOffsetMin` is read by the TV
mockup and exists nowhere in `catalogue.json` or `fixtures.js`. It is a mockup defect, not a
`shared/` one — and `shared/` is the file everyone arrives already primed to distrust. Check which
side a defect is on before filing it: family D of `corrections-handoff.md` is the shopping list for
the `@arthome/core` port, and a mockup bug filed there sends the port chasing something that is not
there.

**Quotes rendered from French that no longer match their source.** `needs/storefront-tv.md` quotes
`context-map.md` and `realtime.md`. Those quotes were rendered from the French originals on
21 September; both documents have since been translated, and the official English differs in
wording — *"the count … is therefore confirmed"* against *"So the count … is confirmed"*. The
quotes are faithful to what was read and are deliberately left as the record of that day, but do
not paste one into a new document expecting it to match its source. This is family F.

## One practice worth copying

A reference to a file another agent reports as renamed should be a **runtime existence check**, not
a literal. `docs/storefront-tv.md` was announced as existing, did not exist, and landed 22 minutes
later while the generator was running. The check resolved to the right target either way. A literal
would have produced four dangling references, or four stale ones — and a plausible-looking
cross-reference is never followed, so neither would have been noticed.
