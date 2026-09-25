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
