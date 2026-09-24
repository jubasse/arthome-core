# Handover — conventions and tooling

Only what is not in the code, in `git log`, or in `DECISIONS.md`.

## 1. The repository map (D-061) — designed, not built

### What the generator reads

The **installed** `.d.ts` of each `@arthome/*` dependency, resolved from the **consuming repository's own
`node_modules`** — not the workspace source and not the git tip. That is the whole point of the design: a
repository pinned to an older major must get that major's surface. `isolatedDeclarations` is what makes
reading declarations sufficient, because it guarantees they are complete rather than inferred; without it
this would need a type-checking pass and would not be cheap.

**Resolve through the `exports` map, never by globbing `dist/`.** This is the mistake I expect someone to
make. `dist/` contains modules that are not importable, and `@arthome/contracts` deliberately has no `.`
entry, so a glob would produce a map of names an agent cannot import — an answer that looks like an answer.
The `exports` map is the only authority for what is reachable.

### What the committed artefact looks like

One file per repository. A header naming the **exact versions it was generated against**, because the map is
true only for those. Then one section per installed shared package, and inside it one subsection per
exported subpath, **headed by the literal import specifier** (`@arthome/contracts/money`) with the exported
names under it. Then one section for the local tree, built from the PURPOSE registry.

The subpath heading is not cosmetic: with no barrel, a name without its subpath is unusable, so the import
specifier is the unit of the map rather than the package.

### How the freshness gate decides

Regenerate into memory, compare against the committed file, fail on difference — `check-tsconfig`'s shape,
which is to read the resolved result and never the file that claims it. Three things it must get right, each
of which is a mistake already made elsewhere in this repository:

- **Compare parsed structure, not text.** Identical to `backend-contracts`' emit ruling. Text comparison
  fails on heading order and line wrapping, and the repair for that is a normaliser added for the wrong
  reason, which then hides a real difference.
- **Fail, do not throw, and exit 3 when it did not run.** A dependency that is not installed yields an
  *empty* map, and an empty map compares equal to an empty committed file and passes. That is the worst
  available outcome — the E2 inverse, a fact stated zero times, wearing a green tick.
- **The pass must name its coverage**: packages, subpaths, exported names counted. Otherwise `PASS` cannot
  be distinguished from "compared nothing", which this repository has now produced twice.

### Which of the three answers I was least sure of

**The PURPOSE registry**, clearly. The generated half cannot drift, so the registry is the one part of the
artefact that is a claim with nobody behind it — the exact thing the design exists to remove. Two specific
weaknesses:

- I rejected per-directory `PURPOSE` files because they litter the tree and give the generator two places to
  look. I am not confident that was right; whoever builds it should feel free to reverse it.
- Keying by directory path means a **rename silently orphans an entry**, and my "an entry with no directory
  is an error" rule only catches that if the generator maps that directory at all.
- The "a PURPOSE line may not restate the directory name" test is the weakest thing in the design. It is a
  heuristic, in a document that argues against heuristics, and it will have false positives on directories
  whose honest purpose *is* their name.

One map per repository, and exports-only organised by subpath, I would defend.

## 2. Where `code-conventions.md` §5.3.1 does **not** substitute for the D-055 detector

I wrote §5.3.1 as a substitute for the teammate-disagreement detector D-055 found was the only reliable one.
It is not one, and the document does not admit this. §5.3.1 is a **convergence** check: it proves two
artefacts state one fact the same way. Four things follow, none recoverable from reading it:

1. **It needs both sides written down.** A disagreement still in an agent's head, or living in a message,
   produces no artefact and therefore no signal. Every disagreement that actually mattered this week — the
   tax basis, the separator ruling, `CHAT_MODES` — was caught by a human reading two *messages*. That is
   precisely what D-055's detector looked at and what §5.3.1 cannot see.
2. **It is blind to consensus error.** When every artefact agrees and all of them are wrong, no
   cross-artefact gate can fire. I invented four `CHAT_MODES` values, wrote them in one place, and nothing
   could contradict them; it took someone reading the proto. A gate that compares artefacts says nothing
   about a fact absent from all of them.
3. **It is downstream in time.** By the time two artefacts disagree, both have been written and the cost is
   already paid in one of them. A detector worth having fires before the second artefact exists.
4. **Its mechanism is mostly name equality.** Two agents can disagree while using different names, and two
   vocabularies each agree with themselves. The twins check catches spellings, not synonyms.

So: §5.3.1 proves artefacts say the same thing. It does not establish that the thing is true, and it does
not detect a disagreement that has not yet been written twice.

## 3. `check-language` — repairable, but it is misnamed

`translator-docs` is right that it decides on a stop-word list of **function words** while the product's
vocabulary is entirely **content words**, so a French label or copy string passes. My view is that this is a
naming defect rather than a detection defect, and that replacing it would be a mistake.

The gate detects French **sentences**, and function words are where sentences live. It cannot detect French
**terms**, and no stop-word list can, because a content word is exactly what a legitimate product vocabulary
is made of — `billetterie` is French *and* a domain term. The two are not separable by a word list. They are
separable only by **position**, which the gate already does structurally: a French term in a vocabulary
constant is data, the same term in a comment is a defect.

So rename it and state its scope — which is the floor rule I wrote today, applied to my own gate: *a gate's
name states an intention, its mechanism states its coverage*. It guarantees no French **prose in prose
positions**, and it should say so in its own output.

The residue after renaming is a French content word alone in a comment. I would **not** gate that. It needs a
dictionary, a dictionary of French content words overlaps the product's own vocabulary, and a gate that
shouts on `billetterie` gets switched off (D-024). If effort goes anywhere, it should go to **published
metadata and user-visible strings** — npm `description`, OpenAPI `summary`/`description`, i18n defaults.
Those are few and enumerable, and a check with a small denominator can afford a reviewed allow list where a
repository-wide term detector cannot.

## 4. One live blind spot, stated because nothing catches it

`check-vocabulary.py` now discovers its universe from every published package rather than from
`packages/core/src`. The `source: none` verdict is tested against that universe as of today, but **the
verdict `source: <NAME>` is only as good as the package set being complete** — a vocabulary declared in a
repository *outside* this one cannot be named, and the annotation for it will have to be `none`, which is the
same false-declaration trap the widening just removed one instance of. If a sixth repository starts exporting
vocabulary, that is the thing to fix first.
