# Starting prompts — Claude Code sessions

> ## ⚠ Document largely superseded — do not paste as is
>
> **Corrected on 21 September 2026.** These three prompts were written before
> several structuring decisions and before the "interface contracts, backend
> architecture, authentication" session. The point corrections below align the
> vocabulary, but **the order of work itself has changed**:
>
> - stage 0 no longer stands up a monorepo, but the `arthome-core` repository;
> - stage 1 is now preceded by the **contracts session**, which produces
>   `architecture/` and the two OpenAPI files — and it is that session which
>   tells stage 1 which shapes to carry;
> - stage 2 no longer stands up OpenTelemetry, only the propagation of
>   `traceparent`;
> - the event schemas are in **Protobuf**, the choice is no longer open.
>
> **The living reference is the corrected `README.md`, plus
> `arthome-core/architecture/`.** The original version of this document is
> under `PROMPT.pre-corrections.md`, which lives with the source folder
> `design_handoff_arthome/` and is not part of this repository.

Three prompts, for the first three stages. The sessions that follow no longer
need a prompt: it is enough to ask for
`design_handoff_arthome/README.md` to be read.

---

## Stage 0 — `arthome-core` and the showcase

To be pasted after committing `design_handoff_arthome/` into `arthome-core`'s `docs/`.

---

I am starting Arthome, a live-broadcast platform for the performing arts:
ticketing, live, moderated chat, replays, shop, artist payouts. It is a
personal project, whose purpose is to serve as a technical showcase on GitHub.

First read `design_handoff_arthome/README.md` in full: architecture, design
tokens, design principles, order of work. Then `streaming.md`.

**Task for this session**: stand up `arthome-core` and the showcase. No
business code, no services.

1. Structure of the `arthome-core` repository as described in §3 of the README:
   `docs/`, `prototypes/`, `architecture/`, `proto/`, `openapi/`, and
   `packages/core` + `packages/contracts`. The services and the infrastructure
   live in a second repository, `arthome-platform`; each application has its own.

2. **Minimal** tooling: pnpm workspaces, turborepo only for the task cache.
   **No Nx.** The `.npmrc` `node-linker=hoisted` no longer has any purpose:
   with multiple repositories, each mobile application has its own repository
   and its own lockfile, so the Metro/pnpm friction disappears along with the
   shared workspace that caused it.

3. Move `design_handoff_arthome/mockups/` to `prototypes/` and configure
   GitHub Pages. An index page introduces them: what each surface is, for whom,
   on which device. The mockups must be clickable and navigable — the TV one is
   driven with the keyboard arrows.

4. The first ADRs, short and argued. The format matters less than the honesty
   of the trade-offs:
   - ADR-001 React for the public side, Angular for the studio
   - ADR-002 Multi-repository: `arthome-core`, `arthome-platform`, one repository per application
   - ADR-003 A domain package with no framework dependency
   - ADR-004 Microservices and Kafka from the start — and why this choice is
     owned despite its cost
   - ADR-005 Control plane and media plane kept separate
   - ADR-006 The TV is an interface in its own right, not an adaptation

5. The README must make the product and the architecture understandable in
   under thirty seconds, with the link to the gallery prominent.

Propose the structure and the outline of the README to me before writing.

---

## Stage 1 — the `@arthome/core` domain

---

I am building `@arthome/core`, Arthome's domain package. It will be consumed
by five applications (Next.js, React Native, react-native-tvos, Angular,
Angular/Ionic) and by seven NestJS services.

Read `design_handoff_arthome/README.md`, in particular §3.

`design_handoff_arthome/shared/` contains **already proven** code: the
taxonomy, the written content, the domain rules and the bilingual copy. It is
the single source of truth for this project's five mockups. It must be **ported
to typed TypeScript**, not rewritten.

**Task for this session:**

1. Port `shared/` to the tree in §3, with subpath exports
   (`/taxonomy`, `/i18n`, `/fixtures`). **We port the rules, we reshape the
   forms**: see family D of `arthome-core/architecture/corrections-handoff.md`,
   which lists the seven points where `shared/` must be corrected along the way.

2. **Strict rule: zero framework dependency.** No React, no Angular, no Nest,
   no browser API, no Node-specific code in the business rules. The package
   must work under Node, Next, Metro, react-native-tvos and Angular. As few
   dependencies as possible, full stop.

3. Tests on the rules that really hurt: time zone changes, expiry of a replay
   window, per-role permissions, VAT and rounding, computing a payout, seat
   codes, state transitions of a date.

4. CI: lint, typecheck, tests, build.

This package is the first thing anyone will open to judge the quality of the code.

Propose the module split to me before writing the first file.

---

## Stage 2 — the distributed foundation

---

I am standing up Arthome's infrastructure and the first two services.

Read `design_handoff_arthome/README.md` §3.

**Task for this session**: the event path end to end, with only two services.
This is the stage that costs the most and proves the most; once it is behind
you, every following service will be fast.

1. `infra/docker-compose.yml`: PostgreSQL, Kafka, Kafka Connect, Schema
   Registry, Redis, OpenSearch, MinIO. No OpenTelemetry collector at this
   stage: simple observability, but `traceparent` (W3C) propagated from the
   very first producer, over HTTP and over Kafka.

2. Two NestJS services: `identity` and `catalog`. Each with its own database.

3. The complete path, demonstrable:
   - a database write with the **outbox pattern**
   - Kafka publication with a **versioned schema** in **Protobuf**, tooled with `buf`
   - **Debezium** for change capture
   - a **sink connector** to OpenSearch, with the `french` analyser
   - **`traceparent` propagated** from the HTTP request all the way to
     indexing, visible in the logs. The dashboard comes later; the propagation
     does not: an event published without `traceparent` is orphaned for good
   - **DLQ**: Kafka Connect's for connector failures, and a consumer-specific
     retry/dead-letter pattern for business failures

4. An **idempotent** consumer, with a deduplication key and a test that replays
   the same event twice.

`catalog` consumes the taxonomy from `@arthome/core`: the search facets derive
from it, they are not redeclared.

Propose the Kafka topic scheme and the event model to me before writing.

---

**A point of vigilance valid for every session**: anything that is computed
twice will diverge. With seven services and five applications, the temptation
to recompute a value locally will be constant. If a value appears on two
screens, it comes from `@arthome/core` — never recomposed.
