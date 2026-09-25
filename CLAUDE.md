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

## Comments — delete by default

**The default is no comment.** Name it first: `waitUntilDue` needs no gloss, `handleRetryTiming`
needs one. Then comment only what a name cannot carry.

**The test**: would a reader with this code in front of them learn something they could not derive
from it?

**Keep** — a measured failure with what it cost · a constraint invisible at that line · a decision
and its reason · a `⚠` where the obvious change is wrong.

**Delete** — a comment on trivial code (a delegate, a getter, a `findAll` calling `Model.findAll`) ·
a block above a name that already carries it · JSDoc restating the signature · narration of a
readable sequence · history · a default explained · prose about what the file does *not* do.

**TypeScript already documents the types, so JSDoc must not.** The signature gives the parameter
names, their types and the return type; repeating it is noise. JSDoc earns its place only for a
parameter whose **meaning** the type cannot give, or a **union return** — which branch comes back and
when. Never systematically.

**Where one line does, use one line, and give the scope rather than the whole story.** A surviving `⚠` is two to four lines, never ten.

⚠ **Never delete a recorded measurement** — shorten its prose to one sentence, keep the fact. And
**never a one-line gloss on an exported name**: `REPOSITORY_MAP.md` is generated from it.

⚠ **The mechanism that produces the problem**: paying yourself in comment lines for what the
discovery cost. That belongs in the commit message, not at the line.

Full rule, with four measured shapes: `code-conventions.md` §5.10.
