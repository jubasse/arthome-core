# Handover notes

> What would otherwise die with the agents. Each item answers one question only: **what would a
> fresh agent get wrong, or waste a day rediscovering?** Anything already written in another file
> is deliberately left out.

---

## storefront-web

*Written 24 September 2026 by the `storefront-web` agent before being stood down. Its work is in
`needs/storefront-web.md` (needs, Confrontation, outcome notes), the 52 extractions under
`prototypes/screens/storefront-web/`, and D-010 / D-011 / D-016 in `DECISIONS.md`.*

### 1. The extractions hide the shape of the file they came from

`renderReady()` in the mockup is **one function, lines 4897–7442**, ending in a single object
literal of **426 keys** (6238–7441) that are **interleaved by screen, not grouped** — the cart's
keys sit between the category's and the plans'. Each extraction file looks like a tidy,
self-contained screen, which is the point, but the source does not look like that. If you need a
key that is not in your file, **grep the key name**; do not go looking for a per-screen block,
there are none.

Rough map of the 7 465 lines: markup 9–3282 · script 3283–7463 · FR dictionary 3317–3767 · EN
3771–4220 · component class from 4250 · local computations 4897–6237 · returned object 6238–7441.
Every extraction header carries its own exact source ranges under `SOURCE`, so the full screen map
is recoverable from the 52 files without re-deriving it.

### 2. The extractions are deliberately not self-contained — `SEE ALSO` is the warning

Dependencies were resolved **one level deep**: each file carries the view-model keys its markup
binds, plus the local constants those keys name. Constants that *those* constants need are **named
in the header's `SEE ALSO` line and not copied in** — 28 of the 52 files have one. That was the
only way to stay under 40 KB per file; a transitive closure drags in the whole catalogue generator
every time.

The three unwritten `_shared-*.html` files were meant to hold exactly the two sets every screen
touches and nothing else: **layout, locale and grid helpers** (`A`, `s`, `t`, `fr`, the `rowGrid*`
family, `colsOf`, `narrow`) in `_shared-runtime`, and the **generated catalogue** (`catalogue`,
`roster`, `artist`, `currentDate`, `RAW`, `SLOTS`, `dateAt`) in `_shared-catalogue`. That cut is
the reason the per-screen files are small. Re-cut it differently and they will not be.

### 3. `jauge`: which field answers which question

One French word covered capacity, seats-still-on-sale and fill rate at once — recorded as V1 in
`needs/storefront-web.md`. The operational trap that follows is not recorded there:

- **`fillRateBps` answers "is this almost sold out"** — compare against
  `DomainConstants.scarcityThresholdBps`, served at 8500;
- **`seatsAvailable` answers "how many can I buy"**.

They are independent values and **neither is derivable from the other**. The mockup proves it by
disagreeing with itself: `soldPct` uses the real `venue.capacity`, while the "seats left" label
applies a hardcoded 2000 regardless of venue. Compute either number from the other and you ship
that bug.

### 4. Rebuilding `browse` or `category` takes three files, not one

Both pages have **holes**, marked by comments in the markup: the side rail with its filter panel,
and the sort menu nested inside it, were lifted into `overlay-filters-rail.html` and
`overlay-sort.html`. Verified rather than assumed — the two copies of each are **byte-identical**
(mockup 735–812 against 1694–1771, and 741–758 against 1700–1717). They are one component with one
view model; building them twice is the mistake the extraction exists to prevent.

### 5. The eleven account sections are not in the router

`page` has twelve values and `account` is one of them. The eleven sections are `sc-if` blocks at
**indent 6** inside `isAccount`, keyed on `accTab`. Probing the markup at indent 2 or 4 finds
nothing and makes the account page look like one undifferentiated screen. It is eleven, each with
its own markup — which is why there are eleven files and not one.

### 6. The promotions in the mockup are fabricated; the vocabulary is not

`PROMO_DEFS` is built at load time from `A.liveNow()` and `A.upcoming()` by heuristic: a 0.7
multiplier for anything live, then "last of the run" or "more than 20 days out" for the rest.
**The five reasons are authoritative** and are in the contract. **The prices, and which date
carries a promotion at all, are invented by the mockup** and are not. Read that code as a
demonstration of the five states, never as a pricing rule.
