# arthome-core

## No framework router applies here, and that is a decision rather than an omission

The other three repositories load a framework router first — `nestjs-how-to` in arthome-platform,
`nextjs-how-to` in the storefront, `angular-how-to` in the studio. **This repository loads none,
because it has no framework and is forbidden one.**

`@arthome/core` declares zero platform dependencies (README section 3). That is what lets the same
domain serve a Node service, a Next.js server component and an Angular application without any of
them inheriting the others' runtime. A framework dependency added here would not be a new skill to
load — it would be a broken invariant, and `check-versions` lists the packages whose mere presence
cancels a decision.

⚠ **So the absence of a router here is not permission to work from memory.** What governs this
repository is stricter and is written down: `architecture/critical-rules.md` (re-read it every
session), `architecture/code-conventions.md`, and `DECISIONS.md`, whose arbitrations are never
reopened. Ten gates enforce what those documents say; `pnpm run verify` runs them.

If a task in this repository turns out to need a framework, that is the signal that the task belongs
in another repository.

## Read AGENTS.md

**[`AGENTS.md`](AGENTS.md) is this repository's working guide, and it is not loaded for you — read it
at the start of a session.** Whether a tool picks it up by itself varies, so the instruction is here
rather than assumed.

## Comments — the why and the failure, never the what

**Name it, then comment what the name cannot carry.** A function named for exactly what it does and a
variable named for exactly what it holds remove the paragraph above them — and a long name is the
cheap side of that trade. `waitUntilDue` needs no gloss; `handleRetryTiming` needs one.

**JSDoc is not owed to every export.** Write it when the code is non-trivial, or when the reader needs
context the signature cannot give. A one-line function whose name says what it does gets nothing, and
a `@param` restating the parameter's name is noise. When a comment is warranted, it is **concise**.

A comment earns its place by saying something the code cannot. The test: *would a reader with this
code in front of them learn something they could not derive from it?*

**Keep** a measured failure, a constraint that is not visible locally, a decision and its reason, and
a `⚠` on a trap where the obvious change is the wrong one. **Cut** anything that restates the code,
explains a well-named function, narrates a readable sequence, or copies what `DECISIONS.md` already
says — link instead.

Past roughly a quarter of a file, ask whether the code is unclear rather than under-explained.
Measured on 2026-09-25, three files in arthome-platform's `libs/messaging` stood at 59 %, 55 % and
40 %.

⚠ **This is not a licence to delete reasons.** Where a comment is long *because* it records something
expensive, shorten the prose and keep the fact. Never delete a recorded reason to satisfy a ratio.

**Apply it opportunistically**: any file you read or modify is one you may shrink. It costs a moment
while the context is already loaded, and it is the only way this reaches code written before it.

⚠ **THE FAILURE MODE THAT CAUSES ALL OF THIS: PAYING YOURSELF IN COMMENT LINES FOR WHAT THE DISCOVERY
COST.** A line you just fought for feels load-bearing, so it gets a paragraph defending it — and a
twelve-line configuration object ends up under forty lines of prose. **The effort of finding something
out is not the reader's problem.** The commit message is where it belongs, at any length; the code
carries only what will bite the next person at that line.

Three shapes give it away: a **default written out with a paragraph defending it** (delete both — a
default nobody overrides is not a decision); a **comment on a self-documenting option** (`applicationName`
did not need four lines saying what `applicationName` is for); and a **comment explaining an absence**,
which is the worst because nothing fails when it stops being true — prose about what a file does *not*
do belongs beside the thing that *is* done.

The full rule is `code-conventions.md` §5.10 — in `docs/arthome/` here, and the original in
arthome-core.
