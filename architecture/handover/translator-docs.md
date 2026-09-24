# translator-docs

*Written 24 September 2026 by the agent that translated the five handover documents, before being
stood down. Its work is the English `docs/README.md`, `docs/streaming.md`, `docs/PROMPT.md`, and
the renamed `docs/taxonomy.md` and `docs/storefront-tv.md`. It read those five files and the
vocabulary and tooling it had to check them against; it did not sweep the repository.*

## 1. The language gate cannot see the French that is deliberate, and it passes either way

`check-language.mjs` decides with a **stop-word list and `THRESHOLD = 3`**: three distinct French
words from the list, in one file, in prose (Markdown minus fenced blocks). The list is **function
words only** — `qui`, `pour`, `avec`, `dans`, `cette`, `sont` — and its header says content words
are excluded on purpose, because they collide with identifiers and locale codes.

The product's vocabulary is entirely content words. So the gate is structurally blind to it, and
three sites in files it *does* check are French on purpose and produce a green run:

- **`docs/storefront-tv.md:13`** — the opening sentence lists disciplines in running prose
  (`théâtre, danse, cirque, humour, opéra, comédie musicale, performance`, then `rock to
  classique`, `musiques du monde`).
- **`docs/storefront-tv.md:226`** — the two universes, `Musique` and `Scène`, spelled as
  `taxonomy.json` spells them.
- **`docs/README.md:302`** — `"l'opéra"` and `"opéra"`, the worked example for the OpenSearch
  `french` analyser's elision handling.

Translating all three would also pass. **The gate gives no signal in either direction here**, so a
later tidy-up that anglicises them looks exactly as clean as leaving them. Each has a reason that
is not visible from the line:

- `:13` is the sentence the file's own dated note records as *corrected* — it previously used
  "ballet" and "concerts" as disciplines. The vocabulary link is what the correction installed;
  anglicising the names re-breaks what the note says was fixed.
- `:226` feeds the tile grouping that reads `rank` from `taxonomy.json`. English universe names
  would name two families the file does not have.
- `:302` argues that without the `french` analyser the two spellings do not match each other.
  In English the pair matches trivially and the sentence argues for nothing.

If the gate ever does start flagging them, the fix is **not** a `path` entry in
`language.allow.json` — that file's own comment rules out entries added to make the gate pass. The
shape is a `quotations` entry, one per line, since the check is per line. These three are
candidates nobody has filed.

## 2. `docs/taxonomy.md` is path-exempt, so none of its English is checked

It is the only one of the five in `allow[]`, and the exemption is whole-file: the gate skips its
header and its English prose along with its vocabulary. The English around the lists has no gate
behind it and will not acquire one.

The reason it needed a path exemption rather than riding the fenced-block skip is worth knowing
before anyone tidies the file: **the discipline, subgenre and tag lists are plain prose lines
separated by `·`, not fenced blocks.** The fenced blocks in that file are the attribute shapes
and the `tag` record. Move the vocabulary lists into fences to tidy them and the exemption stops
being necessary — at which point dropping it would put that file's English under the gate for the
first time, which is a change worth making deliberately rather than as a side effect.

## 3. Calls a later reader would not recognise as calls

- **`schéma`**, in streaming.md's "never create a media branch just to make a diagram uniform".
  The word is *diagram* or *schema*. I read it as diagram, because the two ASCII topology diagrams
  sit directly beneath it and the surrounding argument is about branches drawn for symmetry. On
  the other reading the sentence argues against normalising an event payload — a different claim,
  in a document that elsewhere talks about Protobuf schemas. **This is the one I am least
  confident about.**
- **`Router est un travail d'infrastructure`** → "Routing is infrastructure work." `Router` is the
  infinitive and also a component name; read as the noun it becomes a claim about a specific
  component rather than about the activity.
- **`retour de régie`** → "control-room return feed", used consistently. `régie` is control room,
  gallery or production desk; `retour` is both return-feed and monitor. One English term now
  carries what the French split across senses. `WHEP` and `monitor/{id}` in the same file are the
  anchors if it needs re-cutting.
- **`version scénique` / `version concert`** → "a staged version" / "a concert version". Only the
  second is a FORMAT tag in `taxonomy.md`; the first is not. French gave no sign that one of the
  pair is vocabulary and the other is description, and English gives none either. Anyone wiring
  that sentence to the tag list should know only the second resolves.
- **`issues`** in the `booking/` module comment is a **false friend** — it means *outcomes*, the
  `DateOutcome` axis (cancelled, postponed, interrupted), not problems or tickets. I translated it
  "outcomes". Left as "issues" an English reader would have read it as defects and looked for a
  bug tracker.
- **`On porte les règles, on remodèle les formes`** → "We port the rules, we reshape the forms."
  Impersonal `on` forces an agent in English that the French withholds. It appears three times
  (README §1, README stage 1, PROMPT stage 1) and reads as a slogan, so the three must stay
  word-identical; a future edit that improves one of them breaks the echo.

## 4. Translations I am not confident about

- **`jauge`** → "capacity", in the `@arthome/core` tree comment for `booking/`. `handover.md` §3
  records that this one French word covered capacity, seats-still-on-sale and fill rate at once.
  A tree listing gives one word of room and I took the narrow sense. If that module owns all
  three, the comment now under-describes it, and §3 is the place that says so.
- **`l'assiette de la TVA`** → "the VAT base". Correct but thin: `assiette` is specifically the
  taxable base, and the sentence's work is to accuse the payout formula of inventing one. "Base"
  states it; `assiette` pointed at it.
- **`plomberie interne`**, for the tag `category` → "internal plumbing". The French register is
  dismissive and means *ignore this, it never surfaces*; English "plumbing" leans towards
  infrastructure, which is nearly the opposite emphasis for a field whose whole point is that
  users never see it.
