# Handover — `backend-contracts`

What is not recoverable from the code, `git log` or `DECISIONS.md`. Read D-058, D-060 and D-062
first; this is what they do not tell you.

## The emit gate: what I would change about its five equivalences

**I would refuse one of the five.** `additionalProperties` absent ≡ `{}` ≡ `true` is two
equivalences wearing one name, and only the first pair is safe. Absent and `{}` are genuinely the
same — that is `looseObject`'s emitted form against the documents' silence. But `true` is a value a
human types, and granting it means the gate cannot tell a deliberate open schema from one somebody
opened by hand to make a diff go away. Split it: absent ≡ `{}`, and `true` fails until someone says
why.

**Three equivalences I found that are not in the list.**

1. **`default` moves the node.** `z.boolean().default(false)` emits `{default, description, type}` —
   `default` and `description` *before* `type`, where every hand-written block in both documents
   puts `type` first. Key order covers it only if the normaliser sorts recursively; if it compares
   the top level and recurses positionally, this one slips.
2. **`examples` is a list in both artefacts but arrives from two places.** `.meta({examples: [...]})`
   emits it beside `format`; a hand-written block often carries `examples` *and* an `example` under
   a media type. They are different keys with different owners and must not be equated.
3. **An empty `required: []` versus an absent `required`.** `z.looseObject({})` emits neither, but a
   partial shape with every field optional emits `"required": []`. The documents never write it.

## Registry mode, exactly

```js
const reg = z.registry();
reg.add(MoneySchema, { id: 'Money' });
z.toJSONSchema(reg, { io: 'output', uri: (id) => `#/components/schemas/${id}` });
```

Without `uri`, refs come out as `#/$defs/Money` and every one of the 1 458 `$ref`s in the two
documents is wrong. Without the registry at all, nothing refs: `z.toJSONSchema(schema)` **inlines
every nested object**, so `SeatQuote` containing four `Money` fields emits four copies of `Money`
and the document has no `components/schemas` worth the name. The id must be on the schema, so a
schema you forget to register is silently inlined rather than reported — **that is the failure to
watch for**, because the emitted document stays valid.

## What the first real emit taught, beyond D-060

**Order of chained calls is load-bearing and invisible.** `.meta({format}).nullable()` buries the
format inside `anyOf[0]`; `.nullable().meta({format})` puts it on the field. The two read
identically. The same applies to a vocabulary: `vocabularyOut(V).nullable()` puts
`x-arthome-vocabulary` inside the branch, where `check-vocabulary` does not read it — **and the
schema still validates correctly**, so the code works and only the document is wrong. That is why
core exports `vocabularyOutNullable` rather than leaving it to a call site.

**The `anyOf` collapse rule is narrower than D-060 says.** zod collapses a nullable union into
`type: [T,'null']` only when the non-null branch is **bare**. A `pattern`, a `minimum`, anything
beyond `type` blocks it. A `format` does not — it lands on the field either way. So the equivalence
fires on constrained nullable fields, which is most of ours, because instants carry a regex and
integers carry bounds.

**`.describe()` merges, it does not replace.** It is `.meta({description})` underneath and the
natural fear after the `.nullable()` finding is that it drops the metadata. Measured: it does not.

**`@arthome/contracts` resolves `@arthome/core/schema` through `dist`.** A new export in core's
source is invisible until core is rebuilt, and the error is `has no exported member` on a symbol
plainly present in the file you are reading. The emit gate needs `^build` in its Turbo `dependsOn`
or its first run diffs against a stale core.

**Write emitted-shape tests, not validation tests.** zod validates correctly in every case that has
gone wrong here. What goes wrong is the emitted document. And type the emitted shape rather than
bracketing into `Record<string, unknown>` — eslint's `dot-notation` will tell you, and it is right.

## `paths` — the two thirds nothing generates

`z.toJSONSchema()` emits schemas. `components/schemas` is 28% of `storefront.yaml` and 22% of
`studio.yaml`. **The other two thirds is hand-written for good** (D-058), and what holds it is
`tools/check-openapi.py` and nothing else. Twenty rules; R16–R19 exist because fifteen green rules
declared both documents conformant while four defect classes sat in them, and two had been shipping
a half-sentence since the documents were written. All four are invisible at the line level and
obvious at the parse level.

**So the standing risk is structural, not stylistic: an operation added to a service has no
mechanical link to one added to a contract.** Nothing compares the two. `x-arthome-upstream` is what
makes fan-out countable, and it is only as true as whoever typed it — I found three operations
declaring services they never call, including two of my own.

**~22 500 words of prose live outside `components/schemas`** — operation summaries, the
idempotency-exemption motives, the argument for why `/v1/changes` keeps its `401`. None of it hangs
off a schema. If anyone proposes emitting `paths` too, that prose has to move into the emitter's
source, and the documents stop being reviewable as prose. **Every defect I found this year in these
two files, I found by reading them.** `targetPage` carrying a stale `moderation`, `reasonCode`
meaning five things, a VAT line sitting among addends — none of those is a diff.

## Three habits that paid, and one number to distrust

**Report what a check looked at.** My survey said 65 money fields where the gate said 55; the gate
was right and the survey was double-counting `allOf` wrappers. Neither number could be argued with
until R20 printed its own count. A gate that says what it counted can be corrected; one that prints
a verdict cannot.

**Prove a rule fires before relying on it.** Every rule I added, I added by injecting its defect into
a copy and watching it fail. R17 was wrong on the first try and its own test corrected it: a
truncated scalar does not always leave a key containing a space — `{ description: a token,
short-lived. }` leaves the one-word key `short-lived.`

**When two artefacts disagree, ask which one a function produces.** `watch_preview` crossed the
core/contract boundary three times in a day because each of us was answering the other's last
message. What ended it: does `decideWatch` return it? It did not.

**Distrust `x-arthome-freshness`.** It is on 24 operations and nothing checks it against
`data-model.md` §4. It is the last number in these documents with no owning gate.
