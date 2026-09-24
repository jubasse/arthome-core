# storefront-mobile

*Written 24 September 2026 by the `storefront-mobile` agent before being stood down. Its work is in
`needs/storefront-mobile.md` (needs, Confrontation, outcome notes), the 46 extractions under
`prototypes/screens/storefront-mobile/`, and D-012 in `DECISIONS.md`. None of that is repeated
here; this is only what a fresh agent cannot recover from the files.*

---

## 1. The shape of `Storefront Mobile.dc.html`, and why the web's numbers do not transfer

6,889 lines. Markup **9–2299**, script **2300–6889**, FR dictionary **2334–2783**, EN **2787–3236**
(448 keys each side), component class from **3299**, `renderReady()` **4284–6867** — one function
of 2,584 lines, with **225 local constants** (4285–5636) and then a single returned object literal
of **311 keys** (5637–6866).

Same disease as the web mockup, different numbers: its `renderReady()` is 2,545 lines and 426 keys.
**Do not reuse the web's line ranges here** — the two files share an author and a structure but not
a single offset. The keys are interleaved by screen in this file too, so the web's advice holds:
grep the key name, there are no per-screen blocks.

Worth knowing before you go looking: `page` has **exactly the same twelve values** as the web
mockup — `home browse categories category artists artist following live replay account plans help`.
The surfaces genuinely agree on the router. They do not agree on much else below it.

## 2. The extractions are generated output, and the generator is gone

The 46 files under `prototypes/screens/storefront-mobile/` were **not written by hand**. A Python
script derived them, and it lived in session scratch, which is destroyed. What it did, so you can
rebuild it in an hour instead of a day if you need to re-cut the split:

1. parse the return object, the local constants, the class methods and the module constants into a
   symbol table of (name → line range), by brace counting with strings and comments stripped;
2. for each screen, take its markup slice, collect every `{{ identifier }}` it binds, then walk the
   **full transitive closure** of what those symbols reference;
3. any symbol landing in the closure of **≥ 20 of the 44 screens** goes to the shared file — that
   threshold produced 76 symbols and is the only tuned number in the whole thing;
4. emit, then diff every emitted block back against the source by line range.

**Hand-editing any of those 46 files silently voids the property that makes them worth having.**
Every markup and view-model block is byte-identical to the mockup, which was verified, not
asserted: 53 markup blocks (2,274 lines) and 512 view-model blocks (2,458 lines), zero mismatches.
If you must change one, change the generator and re-emit, or the next person cannot trust any of
them.

## 3. The two extraction directories look alike and follow opposite conventions

This is the trap most likely to cost a day. `prototypes/screens/storefront-web/` and
`prototypes/screens/storefront-mobile/` have the same file naming, the same header layout and the
same banners. They were cut on **incompatible rules**:

| | web | mobile |
|---|---|---|
| dependency depth | **one level**, remainder named in `SEE ALSO` | **full transitive closure** |
| shared constants | three `_shared-*.html` files, **never written** | one `_viewmodel-shared.html`, **written, 39.6 KB, 76 symbols** |
| what a footer lists | what is *missing* from the file | what is *shared*, and where it already lives |

So on the web side a header pointing elsewhere means *go and find it*; on the mobile side it means
*it exists, in that file*. Read the wrong way round, you will either duplicate the catalogue
generator into every screen or hunt for files that were never created.

## 4. The "fourteen of sixteen helpers are never called" finding is not about mobile

`needs/storefront-mobile.md` says, in *Inconsistencies found*, that the mobile surface *"exercises
far fewer shared rules than the web storefront will"*. **That sentence is wrong and I only proved it
after the file was committed.** Measured across both mockups:

- both call exactly **39 distinct `A.*` helpers**, and the top 28 are the same names in almost the
  same frequency order;
- all fourteen of `isWatchable availableIn rightsNote languageLine hasLanguageBarrier seatsLabel
  progressOf viewersOf messageState devicesOf alertsOf resumeOf plans chatOf` are called **zero
  times in the web mockup as well**;
- the only two that survive — `isRoomOpen` and `replayHoursLeft` — appear in both, at identical
  counts (1 and 2).

`helpers.js` exposes about 50 public names. Roughly a quarter of it — every rule about
**territorial rights, language barrier, seats remaining, playback resume, devices, plans and chat
moderation** — has never been exercised by any storefront mockup. So *designed, not observed* is
wider than the file states: not a mobile weakness, a hole in the design evidence for the whole
storefront family. `context-map.md` §13 marks `chat` provisional for it; the same argument was
never made for the other six.

## 5. The mockup's data is regenerated against the wall clock on every load

`fixtures.js` builds the catalogue at load time. The *draw* is deterministic (`seededRandom`,
default seed 20260909), so the same shows and venues come back every time — but the *placement in
time* is not: dates anchored `now` are positioned relative to `nowFloor()`, and everything is
resolved against `builtAtMs`.

Consequence, which cost me real time: **two renderings of the same file at two different hours are
not comparable.** A date that was `live` in the morning is `replay` by evening and `ended` the next
day, and nothing in the file changed. Do not diff two renderings, do not treat a state you saw once
as reproducible, and do not conclude the extraction broke something because the screen looks
different. Pin `now` if you need a stable rendering.

## 6. The zod measurement in D-012 is a proxy, and re-running it naively will contradict it

The 93 KB / 7.5 KB figures were measured with **esbuild**, not with Metro, against a hand-written
representative schema — not against a real app entry point, which did not exist. Two things a
re-runner will get wrong:

- **the saving is conditional on tree shaking, which the React Native bundler does not enable by
  default.** Without it `zod/mini` measures 85 KB gzipped, i.e. no better than the classic entry.
  The 7.5 KB number is a best case, not a floor;
- **it depends on a decision that has not been made.** Expo SDK 52+ has experimental tree shaking;
  bare React Native does not. D-001 records that the Expo / bare choice is still open. Until it is
  settled, the honest statement is a range, not a number.

Re-measure at the real app entry once that decision lands. The finding that does **not** depend on
any of this, and is the durable part: the classic entry makes 64 error-message translation files
reachable, so zod's cost is **fixed and tied to the import**, not marginal and tied to the number
of schemas. That is why `@arthome/core` has two entry points and why `tools/check-core-entry.mjs`
exists.

## 7. The hardcoded 2000-seat gauge is in this mockup too

`storefront-web`'s handover records the `fillRateBps` / `seatsAvailable` trap as a web finding. It
is not: the mobile mockup carries the same bug at **line 5431**, applying a flat 2000 regardless of
venue to render "N seats left" while `soldPct` uses the real capacity. Both surfaces would have
shipped it. Neither number is derivable from the other; the contract serves both for that reason.
