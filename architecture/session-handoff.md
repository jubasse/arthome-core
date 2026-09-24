# Session handoff — 24 September 2026

> For whoever resumes this session, including a compacted version of the lead. Everything here was
> **verified from disk** at the time of writing, not recalled. Re-verify before acting: this
> repository has had three agents report three different states of one gate inside one round.

---

## Where things stand

```
repo      ~/Dev/arthome/arthome-core   (public: github.com/jubasse/arthome-core)
HEAD      8f1d805 · 124 commits · working tree clean · NOT PUSHED (7 ahead)
verify    pnpm run verify → exit 0   (9 gates, typecheck, 339 tests)
vocab     121 of 234 blocks compared, 0 disagree, 0 undeclared, 113 exempt
emit      pnpm run check:emit-diff → RED BY DESIGN. 14 sourced, 14 disagree.
          Deliberately out of `verify` until it is green — D-065.
log       DECISIONS.md — 68 arbitrations
```

**The foundation is built.** `@arthome/core` (domain, two entry points, `./schema` added this
session), `@arthome/tooling` (five gates), `@arthome/contracts` (four modules: envelope, money,
pagination, text). No application code anywhere. Five app repos and `arthome-platform` exist as
scoping READMEs only.

---

## The current job

**`@arthome/contracts` — the zod schemas that must emit `openapi/*/components/schemas`.**

- the two OpenAPI documents are **hand-written and authoritative**; the schemas must reproduce them
- **`paths` is NOT generated** — D-058 scoped the empty diff to `components/schemas` only, because
  `paths` is 65–71 % of each document and has no zod source
- **the emit diff gate is BUILT** — `tools/emit-contracts.mjs` + `tools/check-emit-diff.py`,
  `pnpm run check:emit-diff`. It compares **trees, not text**, indexes **by the document**, and
  grants six equivalences it prints on every run. It is **red and out of `verify` on purpose**: a
  gate wired in red is a gate switched off within a day (D-065)
- **what it found is the work**: 14 sourced schemas, 14 disagreements, nine families, ruled in
  D-065. Two are fixed (§H the strict locale, and the misdeclared narrowing). Seven are open
- `additionalProperties: true` is **not** granted as an equivalence — `backend-contracts` refused it
  and the refusal is right: `true` is a value a human types, so granting it hides a schema somebody
  opened by hand to silence a diff. It will fail on `WatchVerdict.reasonParams` until the document
  is changed deliberately
- it reads `dist/`, so it needs `^build` upstream or it diffs against a stale core. The
  `check:emit-diff` script runs `pnpm -r run build` first; a Turbo wiring would need `^build` in
  `dependsOn`
- **registry mode, when refs are wired**: the id lives on the schema, so a schema you forget to
  register is **silently inlined** and the emitted document stays valid. That is the failure to
  watch for — `architecture/handover/backend-contracts.md` has the exact call

**Open and unassigned**: the repository map (D-061) — generated from installed packages'
declarations, committed, freshness-gated. `conventions` settled its three design questions and did
not implement it; **`architecture/handover/conventions.md` §1 is now the only place that design
exists**, including which of the three answers its author trusted least.

---

## How to run agents here — this cost a session to learn

**D-064.** A reloaded session was exhausted in under thirty minutes. Measured: **162 messages,
487,669 characters, ~122,000 tokens, averaging 3,010 each.** tmux is free; Opus multiplies volume
rather than creating it. **The volume was the lead's.**

The real cost is re-billing — a message lands permanently in its recipient's context and is re-sent
on every turn it takes afterwards.

1. **A ruling is ~400 characters.** The reasoning goes in `DECISIONS.md`, read on demand, once.
   Lengthen only when the explanation genuinely cannot be referenced.
2. **Agents are short-lived** — one task, then closed. A two-day-old agent re-sends two days of
   context every turn, and D-055 found a fresh agent disagrees better than a stale one agrees.
3. **Model by role.** Opus for arbitration; extraction, translation and annotation do not need it.
4. **Three in parallel, not eleven.**

**Agent state: there are none. All eleven were stood down on 24 September 2026, each after writing
its own handover note.** `architecture/handover.md` is the index; the ten notes are in
`architecture/handover/`. Read them before touching a mockup or the emit path — four of them correct
something that was already committed, including two gates and one arbitration.

**This project is now solo.** That changes which detectors are available, and D-066 says which ones
survive. It is the first thing to read after this file.

---

## Standing instructions from the project owner

- **speak French to them; everything technical is English** — code, docs, commits, agent messages.
  A gate enforces it (`check-language`)
- `rg` not `grep`, `fd` not `find`
- **always offer a recommended option** when asking
- **no `npm publish`**; everything verifiable locally (GitHub Actions quota exhausted)
- the mockup split is **on hold** until the foundation is finished
- every repo needs a README linking a complete map, and shared surfaces documented in the
  repositories that consume them (→ D-061)

---

## Traps — what a fresh session will get wrong

1. **Do not trust a reported state.** Three agents reported a red gate that was already green. Every
   report is true when measured and possibly false on arrival. Re-measure.
2. **Never read an exit code through a pipe.** `$?` gives the last command's status. This was
   committed three times this week, by two different agents.
3. **Never put prose in a double-quoted shell string.** Backticks execute. Committed three times.
   Use a quoted heredoc for commit messages.
4. **Stage by file, never `git add -A` or by directory.** A commit message that does not describe
   what the commit contains is the one thing a future reader cannot recover from.
5. **`dist/` is tracked deliberately** for the two published packages — the `.d.ts` only, so a
   contract change is visible in review. Maps and `.js` are ignored.
6. **`prototypes/` is a byte-identical copy** of a read-only source; its French is product copy.
   Verified with `cmp`. Do not translate it.

---

## The one finding that outlives the project

**D-055 said the only reliable detector was a teammate disagreeing, and that it does not survive a
solo project. D-066 corrects it, and the correction is the part to keep.** What is gone is *one*
kind — the scope error inside an instrument, invisible from within the instrument. Two kinds are not
gone, both are cheap, and both work with nobody else in the room:

**A — make an OUTSIDE AUTHORITY contradict the document.** An internally coherent document can be
wrong about the world, and no internal review reaches that. *Every sentence of the form "vendor X
does Y" is a URL nobody has opened yet.* Cost: minutes.

**B — RECOUNT what a document says about itself.** *Any sentence carrying a number about this
repository is a script, usually a one-liner.* It is not a hunt: some counts come back true, which is
what makes it a detector.

**B caught the lead twice on 24 September**, both times within an hour of the claim being written —
once on a line count, once on an arbitration entry whose own prescribed fix had reached one file of
five.

And the standing instruction `skeptic` left, which is B pointed at this log: **take any entry that
names the files it says must change, and check the files.** Two entries were checked that way and
both were wrong the same way.
