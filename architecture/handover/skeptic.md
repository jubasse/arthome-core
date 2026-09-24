# Handover — `skeptic`

`architecture/skeptic.md` holds the review and its outcomes. This holds what it cannot: the
outcomes I do not believe, the detectors that survive a solo project, and the log entries I
think are still wrong. Everything below was re-checked on 24 September.

## 1. Closed by an answer I would reopen

**K3 — the promise was corrected, the operation was not.** Making `playbackCutWithinSec` read
120 was right and I endorsed it, but it resolved a *documentation* defect and left the
*operational* one untouched: signing out a device is still a two-minute operation against the
threat it exists to counter, account sharing. Nobody asked whether two minutes is acceptable —
my own "could not judge" §6 says the remedy is unmeasured, and it still is. The number is now
honest; it is not established that it is right. **Reopen when someone can price a 60 s token
against the renewal load on the hottest path in the system.**

**K7 — I believe the ownership, not the cost.** Moving the journal to `identity` as a
Kafka-fed read model was the right call. Two things it bought that nobody has priced: the
coldest and most sensitive service now consumes every topic, including
`arthome.chat.date` at twelve partitions during a live show, to build an audit table; and the
field that carries the meaning, `JournalEntry.code` (`openapi/studio.yaml:8059`), is
`{ type: string }` with no `x-arthome-vocabulary`, with `params: additionalProperties: true`
beside it. Seven producers, one table, no owner for the vocabulary. That is E2's exact shape
with every gate green — see §2.

**K1 — the cost sentence and the fixture still disagree.** `adr-payments.md` now says a Swiss
or Canadian channel "waits or is handled otherwise", while `shared/catalogue.json`
`geography.billingMarkets` still declares `chf` with `live: true`. One is wrong, and nothing
forces them to agree.

**What I do believe, so nobody spends time here.** K2, K4, K5 and K6 are properly closed —
K5 with event, named consumer and data-model row, not just a proto message; K4's regrouping
onto sixteen topics **by partition key** fixes the rule underneath my finding rather than the
count I complained about. R1 was acted on exactly as asked: justification rewritten, decision
untouched.

## 2. What to attack next, and how

**Start here: the premise of D-055 is too pessimistic, and this matters more than any single
bug.** D-055 concludes that teammate disagreement was the only reliable detector and that it
does not survive. That is true of the defects it was drawn from — scope errors inside
instruments, invisible from within the instrument. It is not true of this session. **None of
K1–K7 came from a teammate disagreeing.** Two detectors found all of them, and both work
alone:

**Detector A — make an outside authority contradict the document.** K1 came from fetching
Stripe's page, not from thinking harder about Stripe. `adr-payments.md` was internally
coherent; it was wrong about the world, and no internal review reaches that. The rule:
*every sentence of the form "vendor X does Y" is a URL you have not opened yet.* Cost,
minutes. It is precisely the class that rereading, care, and a teammate reading the same
documents all miss.

**Detector B — recount what a document says about itself.** K4 (topic count), G1 (fan-out of
4) and R3 (the fifteen OpenAPI rules) all came from running the count the document asserted.
Two came back false, one true — which is why it is a detector and not a hunt. The rule: *any
sentence containing a number about this repository is a script, usually a one-liner.*

### Three things to point at, in order

**(a) The outbox routing columns now lie, and nothing checks them.** `events.md` §1.1 still
shows `aggregatetype = "catalog.date"` → topic `arthome.catalog.date`, but §3 maps thirty
aggregate types onto sixteen topics. So `aggregatetype` names the **topic**, not the
aggregate, and `aggregateid` must be the **grouping** key, not the aggregate's own id: a
`seat` event on `arthome.ticketing.date_sales` has to carry `date_id`, never `seat_id`.
Write the natural thing and the gauge's ordering invariant — the one `context-map.md` §11(b)
says must stay in one partition — breaks silently, in production, at peak load. There is no
gate: nothing under `tools/` mentions either column. *The check that fails for the right
reason:* assert every outbox row's `(aggregatetype, aggregateid)` pair against the §3 table,
inside the S2 integration test that already opens the transaction.

**(b) `check-vocabulary.py` proves core and the contract agree. It does not prove either is
right.** It reads `packages/*/src` and `openapi/*.yaml`; it never opens
`shared/catalogue.json`, which `data-model.md` §0 declares authoritative on vocabulary. K6
was exactly a `shared/` → core drift (`free-dates` becoming `free_dates`). **Two artefacts
that drift together are green.** *The check that fails for the right reason:* a third column
in the same gate comparing both against `shared/`, with deliberate departures in a dated
allowlist — the gate already has that ratchet machinery.

**(c) `JournalEntry.code`.** Undeclared vocabulary, seven producers, one consumer — and the
gate's own doctrine says being undeclared is itself a finding.

### The artefacts I trust least, ranked by confidence per unit of verification

1. **`answers-to-surfaces.md`.** Ninety-nine answers, no gate. It can be wrong while nothing
   fails, because it makes claims about *other documents* and nothing checks that relation —
   it was wrong on G8 while the contract it indexed was right.
2. **Any count written in prose** — "16 topics", "55 paths". Correct today because someone
   recounted today. No gate, and they are the most quotable lines here.
3. **Sentences beginning "the only"** (G7 was one). A superlative claims something about
   everything, which makes it least likely to have been checked. Grep for it periodically.
4. **`definition-of-done.md`** — the document that makes others provable and is itself the
   least proven: its §11 still records that `buf`, `oasdiff` and the OpenAPI linter are not
   installed.

## 3. Claims in `DECISIONS.md` I think are still wrong

**D-012's correction did not propagate, and the entry is about correction failing to
propagate.** It records that the 85 KB row "reached neither this table nor any of the four
places that quote this table", and names them. The table was fixed; checked today, none of
the four contains the string `85` — `packages/contracts/package.json`,
`packages/contracts/README.md`, `tools/check-core-entry.mjs`, `code-conventions.md` §5.5. The
diagnosis landed in the place that records diagnoses and nowhere else. One grep. *And the
point underneath survives:* with tree shaking off the saving is zero, so `93 KB → 7.5 KB`
must never again be quoted without the third row. The decision stays right; the number that
sells it is not, alone, support for it.

**D-055 overstates its scope, and it is the entry most likely to be believed.** "The teammate
disagreement was the only reliable detector" is sound for the defects it was drawn from, but
as written it tells a solo developer the detector is gone — when this same week shows one
kind is gone and two are not (§2). Of all the entries this is the one whose being wrong costs
most: it is advice rather than a fact, and it will be read at exactly the moment there is
nobody left to disagree.

**A caveat that is itself the point.** Sixty-seven entries; I read perhaps a dozen closely.
Two checked, two wrong is not a survey, it is a hit rate — and it suggests the rest deserve
the same treatment. The pattern both share: **an entry that correctly diagnoses a defect, and
whose fix lands only in the log.** Take any entry that names files it says must change, and
check the files.
