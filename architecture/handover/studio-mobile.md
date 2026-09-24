# studio-mobile

*Written 24 September 2026 by the `studio-mobile` agent before being stood down. Its work is in
`needs/studio-mobile.md` (needs, Confrontation, twelve outcome notes), the 52 extractions plus
`_index.md` under `prototypes/screens/studio-mobile/`, and D-010 / D-019 in `DECISIONS.md`.*

---

### 1. The grep advice here is the inverse of `storefront-web`'s

`Studio Mobile.dc.html` is 4,165 lines and is **not** one function ending in one big object. It is
**nineteen `page_*` methods**, each returning its own view model, and that is the good news. The bad
news is on the markup side.

- **Script** 902–4162. Constants and vocabulary tables 903–1083; class opens at 1084; per-channel
  read models 1092–1326; `loadArthome` 1327–1411; lifecycle 1412–1498; style factories 1499–1556;
  `renderVals`/`renderReady` 1557–1890; `sheetVals` 1891–1971; `page_*` 1972–3843; `sheetCustom`
  3844–4157.
- **The `page_*` methods are not contiguous.** Eleven helper methods sit in the middle of them
  (`parts`, `pager`, `fld`, `barsOf`, `donutOf`, `crewRoster`, `crewDates`, `holdersOf`,
  `toggleSlot`, `tabStrip`, `act` — 2160–2303, between `page_dashboard` and `page_moderation`).
  Scanning a line range to enumerate the pages silently misses some. Grep `^  page_`.
- **The markup has a per-page block for six pages only** — `pgInbox`, `pgAgenda`, `pgDash`,
  `pgEvents`, `pgEvent`, `pgWizard`. The other twelve pages have **no markup of their own at all**.
  They render entirely through fifteen generic `sc-if` sections (475–810) driven by view-model keys
  (`band`, `pageTabs`, `blocks`, `form`, `matrix`, `bars`, `donut`, `panel`, `chatRows`, …).

So: in the script, look for a per-screen block and you will find one. In the markup, look for one
and two thirds of the time it does not exist — which is why twelve extraction files carry a pointer
to `_blocks.html` instead of copied markup. That is not laziness in the cut; it is the file.

### 2. Five different answers to "which date is this screen about", three of them hardcoded

This cost me real time and it is invisible from any single extraction. The screens do not share a
selected-date notion:

| Screen | How it picks the date | Line |
|---|---|---|
| `page_dashboard` | `const idx = 0` — the channel's **first** date | 2068 |
| `page_regie` | `const i = 0` — the **first** date | 2646 |
| `page_tickets` | `c.evDefs[1]` — the **second** date, hardcoded | 2871 |
| `page_stream` | `dates.filter(d => A.isOnAir(d))[0]` — the actually-live one | 3359 |
| `page_event` | `s.evSel` — a real selection | 3514 |

`renderReady`'s `airDate` (1699) adds a sixth rule: live, else next future, else first. So the run
desk and the streaming screen, adjacent in the navigation and both about the show going out **now**,
resolve "now" differently — and the run desk usually shows a date that is not on air. Read `const
i = 0` as a mockup shortcut, never as a binding. Every one of these screens takes a date identifier
in the real product, and the contract already gives it one (`/v1/dates/{dateId}/run`).

### 3. Orientation is an authoring prop, not a breakpoint

There is no `matchMedia` and no `@media` rule in the whole file. `land` is computed from the
`orientation` prop (`'portrait' | 'paysage'`, declared in the props blob on line 902) at 1559 and
1720, and everything it drives — `shellStyle`, `mainStyle`, `blocksWrapStyle`, `tabBarStyle`,
`sheetStyle` — is inline style. **The mockup cannot respond to a device rotating.** Looking for the
responsive layer and failing to find it will read as an omission in the extraction; it is not there
in the source either. Landscape is a second design the author could switch to, and the port has to
supply the actual trigger.

### 4. `regie`, `sanct`, `ov` and `q` are filenames on purpose — do not rename them

They look like sloppy French abbreviations and they are neither French words nor abbreviations: they
are the mockup's own keys, and the reason for keeping them exists nowhere else.

`regie` is the value in `ACCESS`, `FREE`, `TAB_PREF`, `PAGE_META` and `ORDER`, the name of
`page_regie()`, and the token the whole C1 argument in `needs/studio-mobile.md` turns on — the page
that was deleted from the `navigation` vocabulary and came back as `contextualPages`. `sanct`, `ov`
and `q` are sub-tab state values (`s.modTab`, `s.rgTab`). Renaming any of them to an English word
buys nothing readable and breaks the correspondence with the identifier that `openapi/studio.yaml`,
`corrections-handoff.md` E6 and every extraction header all use. Identifiers are not translated;
that rule was applied deliberately here, not overlooked.

### 5. `_shell.html` and `_tab-bar.html` duplicate a slice, deliberately

`renderReady()` is copied **in full** into `_shell.html`, and its two tab-derivation slices
(1626–1632 and 1727–1768) are copied **again** into `_tab-bar.html`. Both headers say so, but the
reason does not survive a casual read: the four-tab derivation is the single most-asked question
about this surface, and `_tab-bar.html` has to answer it without sending the reader to a 36 KB file
for the middle of the algorithm. Deduplicating them is a plausible tidy-up that costs the thing the
file exists for.

### 6. The secure-context question is a five-minute device probe, not a research task

D-019 defers WHEP on the native shell because it is not known whether `capacitor://localhost` is a
**secure context** in WKWebView. Everyone has treated this as an open question; it is an
unperformed measurement, and the distinction matters because it also gates `getUserMedia`, Web
Crypto and service workers — three unrelated decisions waiting on one unread boolean.

Settling it: build the iOS shell, open the WebView inspector on a **real device** (the simulator is
not authoritative for WKWebView scheme handling), and read `window.isSecureContext` and whether
`crypto.subtle` is defined. That is the whole experiment. `ionic-capacitor-how-to`'s
`references/native-origin.md` lists it under "Unresolved, do not assume" along with the exact
`Origin` header WKWebView sends for such a page — worth reading the same day, since both are
answered by the same probe.

### 7. How to re-cut the extraction if the mockup changes

The generators lived in my session scratchpad and are gone. They are not needed: **every extraction
header carries its exact source line ranges** under `SOURCE`, so the slice table is recoverable by
reading the 52 headers back rather than re-deriving section boundaries from the source.

What is worth reusing is the verification, because "extraction, not rewriting" is a property that
has to be proved rather than intended: strip every HTML comment, the `<script
type="text/x-dc-fragment">` wrappers and the `/* ---- … ---- */` markers from each file, then diff
the residue against the previous version. If the residue is byte-identical, only authored prose
changed. That check caught nothing the day I ran it across all 52 files, which is the point — it is
cheap enough to run every time and it is the only thing standing between an edit and a silent fork
from the source.
