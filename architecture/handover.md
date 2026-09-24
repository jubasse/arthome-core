# Handover notes

> What would otherwise die with the agents. Each item answers one question only: **what would a
> fresh agent get wrong, or waste a day rediscovering?** Anything already written in another file
> is deliberately left out.

**Seven agents were stood down on 24 September 2026 and each wrote its own file first.** They are
separate files rather than sections here for a mechanical reason worth keeping: six agents appending
to one document is six conflicts, and six agents committing into one repository contends on
`.git/index.lock`. Each wrote a file and committed nothing; the lead committed the set.

| | |
|---|---|
| [`handover/storefront-tv.md`](handover/storefront-tv.md) | the mockup is not organised by screen; the parked generator and the one anchor fix it needs |
| [`handover/storefront-mobile.md`](handover/storefront-mobile.md) | why the web's line numbers do not transfer; the 2000-seat gauge trap is a **mobile** bug too, at line 5431 |
| [`handover/studio-web.md`](handover/studio-web.md) | twelve of nineteen screens share one markup block; the extraction is indexed by line number |
| [`handover/studio-mobile.md`](handover/studio-mobile.md) | **the grep advice here is the inverse of `storefront-web`'s**; why `regie`/`sanct`/`ov`/`q` keep their names |
| [`handover/auth.md`](handover/auth.md) | §12.5 is closeable and the ADR does not know it; two routes that must NOT be relayed |
| [`handover/translator-docs.md`](handover/translator-docs.md) | **`check-language` is structurally blind to the product's vocabulary and passes either way** |
| [`handover/backend-contracts.md`](handover/backend-contracts.md) | registry mode exactly; **which of the emit gate's equivalences to refuse**; what holds `paths` and what does not |
| [`handover/backend-domain.md`](handover/backend-domain.md) | rules that live where you would not look; **the one misdeclared block among the 114 exempt ones** |
| [`handover/conventions.md`](handover/conventions.md) | how to build the repository map (D-061); **where §5.3.1 does *not* substitute** for the D-055 detector |

**Three of the six correct something already committed**, which is the reason they were worth the
cost. `studio-mobile` contradicts the one section written before them; `storefront-mobile` shows
that a trap recorded as a web finding is in the mobile mockup too, at line 5431; and
`translator-docs` finds that a gate the lead wrote cannot see the thing it was written for.

**A fourth was claimed and withdrawn, which belongs here rather than nowhere.** `storefront-mobile`
section 6 warns that D-012's 7.5 KB is conditional on tree shaking the React Native bundler does not
enable by default. The lead read that as a correction to D-012. **D-012 already says it**, under
*Reservation recorded*, four lines past the window the lead had read — and `code-conventions.md`
cites it correctly. What is genuinely open is the propagation rather than the finding: four files
quote the two numbers with none of the condition attached.

*That is D-055 in its own words — the only reliable detector all week was a teammate disagreeing
with something.* These notes were the last chance to run it.

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
