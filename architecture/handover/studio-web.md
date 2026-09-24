# Handover — studio web

> Written 24 September 2026 by `studio-web`. Only what is not recoverable from the code or from
> `git log`: the shape of the artefact, where things live that nobody would look for, the traps,
> and the reasons that never reached `DECISIONS.md`.

## The shape of `Studio.dc.html`

444 KB, 6 590 lines, ~110 000 tokens. Never open it whole; `rg` to locate, `sed -n 'X,Yp'` to read.

It splits at line 2348, and **the two halves are organised on opposite principles**.

**The markup (35–2345) *is* per screen.** One top-level `<sc-if>` at indentation 4 per screen —
`grep -n '^    <sc-if'` gives you the whole map in one call, twenty-seven ranges including the
dialogs. That is the good half.

**The view model is not.** `renderVals()` runs from 3415 to 6585 — one 3 171-line function whose
`return {` opens at 3981 and whose top-level keys then run to 6583, interleaved by screen and
punctuated by **six** `...(() => { … })()` spreads (4018, 4223, 4554, 5344, 5431, 6357) that each
carry one screen's or one group's sub-object. **So you grep a key, you do not look for a per-screen
block.** Two details will break a naive parser, and both broke mine: several keys share a line
(`rgOverview: …, rgFeed: …, rgMod: …` on 5479), and at least one key sits at the wrong indentation
inside its own object (`regieClock` at indent 6 among siblings at indent 10). What works is a
dominant-indent boundary scan: collect every `^\s*key\s*:` line, take the modal indentation as the
object's level, and let each key's definition run to the next boundary. That resolved 569 keys and
left under a dozen unmatched per screen.

## Twelve of the nineteen screens share one markup block

`hasSimple` (2209–2340) is a generic page renderer: header, strip of figures, then a list of blocks
built by `block()` / `rows()` / `strip()` / `tabsOf()` / `barsOf()` / `donutOf()` (4555–4663), with
`PER = 8` pagination. Twelve screens use it and **differ only by their entry in the `PAGES`
registry** (4664–5335):

`agenda` · `stream` · `stats` · `tickets` · `store` · `replays` · `team` · `payouts` · `journal` ·
`settings` · `help` · `inbox`

The seven with markup of their own are `dashboard`, `moderation`, `crew`, `events`, `event`,
`regie`, `wizard`. That is why `prototypes/screens/studio-web/_simple-page.html` exists and why the
twelve carry only their view model: copying 132 lines of shared renderer into each would assert a
per-screen markup that does not exist. It is invisible from the extracted files — you can only see
it in the original.

## The extraction is indexed by line number, and that is its one fragility

Every extracted span is delimited by a marker naming its source range
(`<!-- ···· markup · Studio.dc.html lines 135–302 ···· -->`); there are 77 of them across the ten
files, and `needs/studio-web.md` cites the mockup by line throughout. **If `Studio.dc.html` is ever
re-saved, reformatted or line-ending-normalised, all 77 markers and every citation die at once, in
silence.** There is a verifier for exactly this: walk each marker, re-slice the range out of the
original, compare. It caught zero discrepancies on 3 311 lines and takes seconds to rewrite — do
that before trusting any extracted file you did not produce.

A second, smaller coupling: the ten extraction headers cite `needs/studio-web.md` sections **by
title**, so retitling a heading breaks them without breaking anything a linter sees. I created that
failure myself by translating `needs/studio-web.md` and only then noticing four headers pointed at
French headings that no longer existed. Anyone translating or restructuring a document others cite
should sweep the citations in the same pass.

## Three traps inside the file

- **`identityOf` is defined twice** in the same class (2665 and 2728). The second wins. The first
  is dead and calls `A.subcategory(...)`, which does not exist, and `A.genre(id)` with one argument
  where the helper takes two. Do not port the first one.
- **`EN` (2373–2411) is a French-literal → English map, not an i18n key table.** `tr(s, en)` looks
  up the rendered French string. You therefore **cannot derive i18n keys from the mockup** for
  anything routed through `T()`; only `A.enumLabel(group, id)` and `A.t('key')` calls map to real
  keys. Any plan that starts "extract the copy keys from the mockup" fails on the majority of the
  strings.
- **The state names in the mockup are a parallel table** (`draft·hidden·sched·tech·live·done·
  replay`). `shared/catalogue.json` and the contract use
  `draft·reserve·scheduled·technical·live·ended·replay-online`. Errata D2. Reading the state
  machine off `STATES`/`EV_MOVES` gives you the wrong seven names.

## Why the five `absent` markings resisted an answer

They are recorded as open in `needs/studio-web.md`; what is not recorded is that **each resisted for
the same reason — the mockup holds evidence for two different answers, or evidence that contradicts
its own label.** Do not expect a closer reading to settle them:

- **series granularity** — `metricsOf` builds four different granularities at once: per date for
  three measures, per merchandise item for one, empty for `followers`, and from the health series of
  *the first date only* for `signal`. There is no single answer to read off;
- **"unique viewer"** — `statsOf.viewers` sums `max(live viewers, seats sold) + replay views` across
  dates. It conflates three populations, and no unique-individual counter exists anywhere in
  `shared/`. The label and the computation disagree;
- **the `REVENUE PER DATE` total** — hard-coded (`140496 × coefficient`) and *not* derived from the
  six rows it heads, so the mockup cannot tell you whether it means those rows or the channel;
- **the "to handle" sort order and cap** — `todos` is a concatenation in source order, capped at two
  rows from the checklists and then filtered by scope. The order is an artefact of an array literal,
  not a rule;
- **`dashboard` for `mod` and `regie`** — tiles 5 and 6 test `roleOf` (the primary role, not the
  `has()` union) and neither persona has `dashboard` in `ACCESS`, so the mockup ships two tiles that
  can never render. It contains no evidence of what was intended.

## Two findings still open, and how to test them properly

Both fail the same naive check — **the string is present, the operation is not**:

- **crew presence.** Promised in `realtime.md` §8 (pushed, ~10 s), listed in the `channel:{id}` room
  in §3, and counted as one of the control room's three internal calls in `context-map.md` §10.1 —
  so grepping for the word finds it three times and proves nothing. The test is whether
  `openapi/studio.yaml` exposes an operation and whether `RunConsole` carries it. Last checked: no
  to both, and `realtime.md` §5.1's "to re-request" list still omits it;
- **the health series.** `grep health-samples` matches `submitHealthSample`, which is a **POST**.
  The test is whether a **read** of the series exists. `realtime.md` §5.1 says a bitrate curve "is
  re-requested"; last checked, there is still nothing to re-request it from.

## Two decisions whose reason never reached `DECISIONS.md`

- **`team` left the navigation vocabulary.** It is the right outcome — no persona ever opened it —
  but no decision record says so, and the mockup still contains the page and a `goTeam` shortcut
  pointing at it. A reader will find the page, fail to find the reason, and re-raise it.
- **`?panes=` was declined.** Serving the date record as one call plus one per open pane was
  adopted; composing the requested panes at the BFF, so the call count follows the role rather than
  the maximum, was not, and no note says why. The record therefore costs seven calls for an artist
  and two for a moderator — the second number is the one the per-pane split was for.
