# Session handoff — 24 September 2026

> For whoever resumes this session, including a compacted version of the lead. Everything here was
> **verified from disk** at the time of writing, not recalled. Re-verify before acting: this
> repository has had three agents report three different states of one gate inside one round.

---

## Where things stand

```
repo      ~/Dev/arthome/arthome-core   (public: github.com/jubasse/arthome-core)
HEAD      848d87e · 116 commits · working tree clean
verify    pnpm run verify → exit 0   (9 gates, typecheck, 336 tests)
vocab     120 of 234 blocks compared, 0 disagree, 0 undeclared
log       DECISIONS.md — 66 arbitrations
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
- the **emit diff gate is not built**. It compares **trees, not text**, and takes four known
  equivalences: `$schema`/`$id` stripped, `additionalProperties: {}` ≡ absent,
  `anyOf:[{X},{type:null}]` ≡ `type:[X,'null']` with X's keywords merged up, key order
- when it is built it needs `^build` in its Turbo `dependsOn`, or it diffs against a stale core

**Open and unassigned**: the repository map (D-061) — generated from installed packages'
declarations, committed, freshness-gated. `conventions` settled its three design questions (one
registry per repository; one map per repository; only what is reachable through `exports`, organised
by subpath) and did not implement it.

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

**Agent state right now**: all eleven hit a session limit at 08:34, reset 16:00. Six of the seven
being stood down never wrote their handover section; `architecture/handover.md` has one section
(`storefront-web`). Their *work* is committed — only the notes are missing.

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

**D-055.** The only reliable detector all week was **a teammate disagreeing with something** — not
rereading. Almost nothing was caught by care; nearly everything by a short check that could fail for
the reason it mattered.

This is a solo project. That detector does not survive. `code-conventions.md` §5.3.1 is an attempt
at a substitute and its author would not claim it fully succeeds.

What does substitute, on the evidence: **construct the discriminating case rather than reason about
the mechanism**, and **run something short that can fail for the reason you care about.** Both work
without a second party.
