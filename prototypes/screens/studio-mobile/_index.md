# Studio Mobile — screen-by-screen extraction

`prototypes/Studio Mobile.dc.html` is 265 KB, roughly 66,000 tokens. No agent can load it to work
on one screen. This folder is that file cut up, **verbatim**: every slice is copied as it stands,
nothing is corrected, and the original is never modified.

Every file carries a header giving what it shows, **the roles that open it**, the screens it leads
to, the exact source line ranges, the copy keys it uses, and the pointers into
`needs/studio-mobile.md` and `openapi/studio.yaml`.

## How the surface is put together

The mockup is not one DOM per page. It is **one shell** plus **fifteen generic sections** driven by
a view model, plus a per-page block for six pages only. So:

- **six pages own their markup** — `inbox`, `agenda`, `dashboard`, `events`, `event`, `wizard`;
- **twelve pages own none.** They exist through `_blocks.html` and their view model alone. Their
  header lists which generic sections they drive, with line ranges, instead of copying markup that
  is not theirs.

Read `_shell.html` first, then `_blocks.html`, then the screen you need.

## Infrastructure

| File | Size | Purpose |
|---|---|---|
| `_blocks.html` | 31 KB | The fifteen sections that EVERY screen drives through its view model: indicator band, sub-tabs, filters, decision panel, note, search, actions, chat, form, matrix, bars, donut, blocks, "show more", footer. |
| `_data.html` | 29 KB | What feeds every screen: the vocabulary tables, the loading from shared/, and the functions that reshape the fixtures into what each page expects. |
| `_sheet-shell.html` | 8 KB | The single markup that the eighteen sheets fill, and the option/button factory every branch calls. |
| `_shell.html` | 35 KB | What surrounds every screen: the boot screen, the top bar (channel picker, account, inbox), the back button, the page title, and the context renderReady() hands to every page_*. |
| `_tab-bar.html` | 9 KB | This surface's central mechanism: four entries at most, chosen by the role held ON THE CURRENT CHANNEL, plus a "More" entry that is always present. |

## Screens

`regie`, `sanct`, `ov` and `q` are the mockup's own keys (`PAGE_META`, `TAB_PREF`, sub-tab state)
and are kept as identifiers, not translated.

| File | Size | Roles | Shows |
|---|---|---|---|
| `agenda.html` | 10 KB | regie · mod | The person's duties, across every channel, with the overlaps. |
| `crew-guests.html` | 5 KB | artist · prod · coord | One-off accesses, which expire on their own at curtain-down. |
| `crew-log.html` | 5 KB | artist · prod · coord | The access log, timestamped and named. |
| `crew-matrix.html` | 7 KB | artist · prod · coord | The slot matrix: one row per date, two columns of posts. |
| `crew-members.html` | 8 KB | artist · prod · coord | The channel's members, their roles, and their assignment to a date's slots. |
| `crew.html` | 4 KB | artist · prod · coord | Schedule and crew: four sub-tabs, one shared status band. |
| `dashboard.html` | 12 KB | artist · prod · tres | What is coming or what is on air, with the indicators filtered by role. |
| `event-panes.html` | 10 KB | artist · prod · regie · mod · coord · tres   (all six) | The record's six panes, ROLE-DERIVED: public, tickets, chat, tech, crew, replay. |
| `event.html` | 18 KB | artist · prod · regie | A date's record: state machine, checklist, series, irreversible gestures. |
| `events.html` | 10 KB | artist · prod · regie | The dates table: search, multi-state filter, six sort keys, pagination. |
| `help.html` | 4 KB | artist · prod · regie · mod · coord · tres   (all six) | OBS integration, recommended settings, platform rules, support and on-call line. |
| `inbox.html` | 11 KB | artist · prod · regie · mod · coord · tres   (all six) | What is waiting for an answer: received invitations and role-routed alerts. |
| `journal.html` | 4 KB | artist · prod · coord · tres | The channel journal: event, money, moderation, access. |
| `moderation-filter.html` | 6 KB | mod | Chat regime, filter severity, slow mode, blocked-word dictionary. |
| `moderation-live.html` | 5 KB | mod | The live chat, message by message, readable and searchable. |
| `moderation-queue.html` | 7 KB | mod | The queue of reported messages: claim, verdict, precedence between moderators. |
| `moderation-sanct.html` | 6 KB | mod | Active sanctions, search across the whole audience, moderation log. |
| `moderation.html` | 3 KB | mod | The moderation console: four sub-tabs, one shared status band. |
| `payouts.html` | 6 KB | artist · tres | Balance, next transfer, bank account change, accounting exports. |
| `regie-chat.html` | 13 KB | artist · prod · regie | Chat seen from the run desk: queue depth, moderator online, hold screen. |
| `regie-crew.html` | 13 KB | artist · prod · regie | The crew on this date and the on-air log. |
| `regie-ov.html` | 15 KB | artist · prod · regie | Overview: the two failures not to confuse, remembered layout, signal. |
| `regie-q.html` | 12 KB | artist · prod · regie | The broadcast qualities and the encoding tiers. |
| `regie.html` | 12 KB | artist · prod · regie | Running the live show: four sub-tabs, a stopwatch, and the incident flow. |
| `replays.html` | 3 KB | artist · prod · regie | Replays online, their policy, their window and their chapters. |
| `settings.html` | 4 KB | artist | Public identity, broadcast defaults, the owner's danger zone. |
| `sheet-account.html` | 7 KB | artist · prod · regie · mod · coord · tres   (all six) | My account: reading timezone, exit to arthome.fr/compte, sign-out. |
| `sheet-banword.html` | 7 KB | mod | Adding a term to the dictionary — the retroactive effect is announced. |
| `sheet-chan.html` | 7 KB | artist · prod · regie · mod · coord · tres   (all six) | The channel picker: my channel, then the ones I work on. |
| `sheet-confirm.html` | 7 KB | artist · prod | Confirming a one-way transition, with the promise it commits. |
| `sheet-crewdate.html` | 7 KB | artist · prod · coord | Choosing the date the crew is assigned on, or seeing every date. |
| `sheet-del.html` | 7 KB | artist · prod | Deleting a date — refused as soon as one seat is sold. |
| `sheet-dup.html` | 7 KB | artist · prod | Duplicating a date: what is carried over, what is not. |
| `sheet-invite.html` | 11 KB | artist · prod · coord | Inviting someone: directory, email, role, permanent or one-off scope. |
| `sheet-more.html` | 8 KB | artist · prod · regie · mod · coord · tres   (all six) | The remaining pages the roles open, outside the four tabs. |
| `sheet-mute.html` | 7 KB | mod | Sanctioning an audience member: a duration, or a permanent ban. |
| `sheet-poster.html` | 6 KB | artist · prod | Depositing the 16:9 artwork. |
| `sheet-refund-slug-danger.html` | 7 KB | artist · prod · tres | Three sheets sharing one branch: refund, page address, danger zone. |
| `sheet-role.html` | 8 KB | artist · prod · coord | Changing a member's roles, bounded by what you may assign — or removing them. |
| `sheet-slot.html` | 8 KB | artist · prod · coord | Assigning or clearing a slot in the matrix. |
| `sheet-sort.html` | 7 KB | artist · prod · regie | The six sort keys of the dates table, with their direction. |
| `sheet-states.html` | 7 KB | artist · prod · regie | The multi-state filter of the dates table. |
| `stats.html` | 9 KB | artist · prod · tres | Audience and series, as charts or as a detailed list. |
| `store.html` | 4 KB | artist · prod | The item catalogue, external orders and merchant integrations. |
| `stream.html` | 7 KB | artist · prod · regie | Preparing for air: ingest, stream key, pre-flight checklist, history of technical checks. |
| `tickets.html` | 7 KB | artist · prod · tres | Seats sold, waitlist, capacity tiers, complimentary tickets, pending requests. |
| `wizard.html` | 10 KB | artist · prod | Four decisions to create a draft date; everything else goes on the record. |

## Three things to know before editing anything here

**1. This is an extraction, not a source.** The only source is
`prototypes/Studio Mobile.dc.html`. If a slice needs to change, it changes there and this folder is
regenerated. Editing a slice here silently forks the two.

**2. The FR/EN literal tables are content, not prose.** `STATES`, `ROLES`, `EN`, `SHORT`,
`CHAT_SHORT`, `PAGE_META` and the French strings inside the view models are the mockup's own data.
They are extracted as they stand and **must not be translated**. Only the header comments and the
inline notes are authored here, and those are in English.

**3. Note D2 — the parallel vocabulary.** The mockup carries its own publication-state table
(`draft | hidden | sched | tech | live | done | replay`) **and** its own hardcoded French labels
with a home-made `EN` translation map, instead of going through `enums.publicationState.*`, which
exists and is translated. Two parallel vocabularies and two parallel i18n tables. The contract
fixes the `catalogue.json` names. Copy-key lists in the headers name this wherever it bites.
See `architecture/corrections-handoff.md` D2 and `needs/studio-mobile.md` §Inconsistencies 1.

## Portrait and landscape

Both orientations share the same markup. Landscape doubles the shell width and moves the blocks to
two columns; the switch lives in `_shell.html` (`land`, `shellStyle`, `mainStyle`,
`blocksWrapStyle`, `tabBarStyle`, `sheetStyle`). No screen needed a second file for it.

