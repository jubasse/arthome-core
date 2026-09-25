#!/usr/bin/env python3
"""arthome-check-vocabulary — the contracts and the domain share one vocabulary.

WHAT IT PROVES
  Every `x-arthome-vocabulary` in openapi/*.yaml agrees, member for member, with
  the `as const` vocabulary `@arthome/core` exports.

  And every error code an architecture document NAMES is a code some published
  package exports — or is declared, in that document, as promised-but-unexported
  with a reason. See THE PROSE BLOCK below.

WHY IT EXISTS — AND IT IS THE E2 GAP
  `check-enums` proves no enumeration value is COPIED into the source.
  `check-openapi.py` R14 proves every reachable enum is DECLARED.
  Neither proves the two artefacts AGREE.

  So the project's dominant fault — the parallel literal table (E2) — was
  surviving between the two artefacts that exist to prevent it, with five gates
  green. Found by hand: core says `moderation-page` where the contract says
  `moderation`, and `team` is in core and absent from the contract. Nothing
  reported it.

THREE DESIGN DECISIONS, AND WHY

1. THE CONTRACT DECLARES ITS SOURCE. It does not get guessed.
     x-arthome-vocabulary-source: NAVIGATION_ENTRIES

   Heuristic matching by member overlap was tried first and is why this key
   exists. At 0.38 overlap the matcher paired a display-state list with
   DATE_OUTCOMES and invented five "missing" members. A gate that guesses
   produces false positives, and a gate that shouts wrongly gets switched off
   (D-024). An undeclared vocabulary is exactly where drift hides, so being
   undeclared is itself a finding — see the ratchet below.

2. A VOCABULARY WITH NO DOMAIN COUNTERPART DECLARES THAT, IN PLACE.
     x-arthome-vocabulary-source: none
     x-arthome-vocabulary-reason: Input filter, not a domain vocabulary.

   In the artefact, not in a side file. A side file would have to identify the
   block by line number, and line numbers are exactly what this repository
   learned not to key on (code-conventions.md 3.7). A reason is mandatory: an
   exception that does not say why is not an exception, it is a hole.

3. IT IS PYTHON, AND IT STAYS IN tools/.
   It reads OpenAPI, and there is already a gate here that reads OpenAPI with a
   real YAML parser. Hand-rolling a second YAML reader in Node — for a format
   with four different flow shapes in these two files alone — would be a
   parallel implementation of parsing, which is this project's own fault class.

   And unlike arthome-check-language, this is a ONE-REPOSITORY rule: only
   arthome-core holds both @arthome/core and openapi/. The other six hold
   neither, so it does not belong in @arthome/tooling.

REPORTING BY PATH, NEVER BY LINE. A JSON path survives a reformat; a line number
does not survive anything.

THE PROSE BLOCK — architecture documents name codes too, and nothing checked them

  transport.md §5.5 carries the status -> nature -> code table every surface reads
  to know which code arrives with which status. It was a hand-maintained copy of
  ERROR_CODES and it had drifted: eleven names no package exported, and — worse,
  and not what the search was for — ALL of them written `SCHEMA_INVALID` when the
  wire carries `api.schema_invalid`. The contracts pin that shape themselves,
  `pattern: '^[a-z][a-z0-9_]*(?:\\.[a-z][a-z0-9_]*)+$'`, so every code the table
  named was one the contract's own regex forbids. A surface branching on the
  documented spelling could not match a single error.

  `SCHEMA_INVALID` is real, but it is the name of the TS ACCESSOR —
  `ApiErrorCode.SCHEMA_INVALID === 'api.schema_invalid'`. Prose took the constant
  for the value.

  WHY THIS LIVES HERE AND NOT IN A check-transport-codes.py. The input format
  differs (Markdown, not YAML) and that argues for a second gate. Three things
  outweigh it:
    · it is the SAME comparison against the SAME source of truth. ERROR_CODES is
      what both blocks compare against, and two gates reading one vocabulary is
      two places to fix the day its declaration shape moves.
    · this gate is already polyglot. It reads TypeScript by regex AND YAML by
      parser. Decision 3 above says it is Python because the YAML parser was
      already here; the same reasoning one step on puts Markdown where the
      VOCABULARY READER already is.
    · `published_sources` + `core_vocabularies` + the spread resolution is the
      repo's most load-bearing parsing. A second copy would be E2 inside the gate
      built to find E2 — a thing this file has already done once and recorded.

  IT DOES NOT GUESS WHICH TOKEN IS A CODE, AND THE NUMBER IS WHY. Measured over
  architecture/ and docs/: 105 distinct backticked SCREAMING_SNAKE tokens, of
  which 74 are not codes at all — vocabulary NAMES (`DATE_OUTCOMES`,
  `WATCH_SCOPES`), TS diagnostics (`TS1272`), shell (`PIPESTATUS`, `FLUSHALL`),
  a pairing code (`H4T9RD`), an alphabet. `NOT_SERVING` sits in transport.md
  itself and is a gRPC health status. And `RATE_LIMITED` resolves to TWO codes,
  `api.rate_limited` and `chat.rate_limited`, so even tail-matching is ambiguous.
  Shape cannot separate them; that is D-024's failure mode with a count on it.

  So the document opts in, exactly as a contract block does:

    <!-- arthome-codes-source: ERROR_CODES -->

  and a code it names that nothing exports yet is declared in place, with a
  reason, in the same comment:

    <!-- arthome-codes-promised: api.token_expired
         The BFF does not exist yet; 401 has no expiry code until it does. -->

  A code is then any backticked `<family>.<member>` whose family is a family of
  the declared vocabulary — derived from the vocabulary, never a denylist here,
  so `events.md` and `NOT_SERVING` fall out without being named.

  ⚠ AND THE SCOPE IS THE DECLARING SECTION, NOT THE DOCUMENT. Two false positives
    bought that, both recorded at the code that fixes them rather than restated
    here: a Kafka EVENT is shaped exactly like a code (`declared_spans`, and
    `check_prose`'s scan comment), and scoping by any enclosing section made the
    H1 — whose span is the whole file — declared, which let the document-wide scan
    back in through the front door (`declared_spans`). Anyone tempted to simplify
    this to one scan over the file should read those two before doing it.

  WHAT THE PROSE BLOCK DOES NOT PROVE. Not that the document is COMPLETE: §5.5
  says "Typical codes" and is deliberately not the whole of ERROR_CODES, so a
  code missing from the table is not a finding. Not that a code sits in the right
  status row — that is a claim about HTTP semantics no vocabulary carries. And a
  misspelling whose family is not a real family is invisible rather than flagged.

  REPORTING BY HEADING, NEVER BY LINE, for the reason above: the nearest `#`
  heading above the code, which survives an edit anywhere else in the file.

THE CONTRACT-PROSE BLOCK — and this is where the same fault actually costs

  The accessor-for-value confusion was not only in our architecture documents. It
  was in `description` prose inside openapi/*.yaml, on endpoints marked
  `x-arthome-maturity: stable` — 53 occurrences of 30 distinct accessor names.
  transport.md is ours; those two documents are what the storefront and the studio
  are BUILT AGAINST. A frontend developer reading "refused with `PRICES_LOCKED`"
  wrote a branch that never fires, while the `x-arthome-vocabulary` block three
  hundred lines down carried `date.prices_locked`. The machine-readable half was
  right and the human-readable half was wrong, in one file.

  IT IS THE INVERSE CHECK, AND THAT IS HOW IT AVOIDS GUESSING. In Markdown a named
  code must EXIST. Here an accessor spelling that RESOLVES must be rewritten — and
  a capitalised token that resolves onto nothing is ignored without a word, because
  `RFC`, `TODO` and every schema name share that token space. Both directions only
  ever speak about a member they can point at. A token folding onto two codes is
  reported as ambiguous and never chosen for (`RATE_LIMITED` again).

  A document opts in at its root, `x-arthome-codes-source: ERROR_CODES`, and prose
  that writes an accessor ON PURPOSE — a paragraph whose subject IS the spelling —
  is exempted in `tools/prose-literal-codes.json`, with a reason, retracted when
  the description stops writing it. That is a side file rather than an in-artefact
  marker for a reason from ANOTHER gate, recorded in its header: check-emit-diff
  compares `components/schemas` node for node, so a marker beside such a
  description would turn that gate red.

Usage: python3 tools/check-vocabulary.py openapi/*.yaml [architecture/*.md]
No dependency beyond PyYAML. Everything runs locally.
"""

import json
import os
import re
import sys
from datetime import date

# ⚠ THE UNIVERSE IS EVERY PUBLISHED PACKAGE, DISCOVERED — NOT `packages/core/src`.
#
#   This was `CORE_SRC = "packages/core/src"`, and the day `@arthome/contracts`
#   landed that single root became the scope fault this file keeps naming (D-045):
#   scoped by the package I happened to know about, rather than by a property of the
#   thing sought, which is "a vocabulary a published package exports".
#
#   The cost was not a miss, it was worse. `emptyReason` in storefront.yaml carries
#   the same fourteen values as `EMPTY_REASONS` in @arthome/contracts, and naming
#   that source was ILLEGAL — the check below rejected any name not exported by
#   @arthome/core. So the only annotation the gate would accept was
#   `x-arthome-vocabulary-source: none`, which is false. A gate that makes the false
#   declaration the only legal one manufactures the lie it then fails to detect.
#
#   Discovered rather than listed, for the reason core_vocabularies already gives:
#   a list of the packages would be one more parallel table. A fourth published
#   package is covered the day it has a `src/`, with no edit here.
PACKAGES_DIR = "packages"
RATCHET = "tools/vocabulary-migration.json"

DECL = re.compile(
    r"export\s+const\s+([A-Z][A-Z0-9_]*)\s*(?::[^=]+?)?=\s*\[([\s\S]*?)\]\s*as\s+const"
)
STRING = re.compile(r"'([^'\\\r\n]*)'|\"([^\"\\\r\n]*)\"")
SPREAD = re.compile(r"\.\.\.([A-Z][A-Z0-9_]*)")

VOCAB = "x-arthome-vocabulary"   # an OUTPUT vocabulary: served, tolerant
ENUM = "enum"                    # an INPUT enum: accepted, strict
SOURCE = "x-arthome-vocabulary-source"
REASON = "x-arthome-vocabulary-reason"
NARROWING = "x-arthome-vocabulary-narrowing"

problems = []
notes = []


def published_sources():
    """(package name, src dir) for every package this repository publishes.

    `private: true` is excluded because an unpublished package's constants are not
    a shared surface, and a package with no `src/` drops out on its own —
    `@arthome/tooling` has none, and it exports configuration rather than values.
    """
    out = []
    if not os.path.isdir(PACKAGES_DIR):
        return out
    for entry in sorted(os.listdir(PACKAGES_DIR)):
        manifest = os.path.join(PACKAGES_DIR, entry, "package.json")
        src = os.path.join(PACKAGES_DIR, entry, "src")
        if not os.path.isfile(manifest) or not os.path.isdir(src):
            continue
        try:
            meta = json.load(open(manifest, encoding="utf-8"))
        except (OSError, ValueError):
            continue
        if meta.get("private") is True:
            continue
        out.append((meta.get("name", entry), src))
    return out


def core_vocabularies(root):
    """Every `export const NAME = [...] as const` in one package's sources.

    Discovered, never listed: a list of the vocabularies would be one more
    parallel table, sitting next to the vocabularies.
    """
    found = {}
    for dirpath, _dirs, files in os.walk(root):
        for name in files:
            if not name.endswith((".ts", ".mts")):
                continue
            if name.endswith(".d.ts") or ".spec." in name or ".test." in name:
                continue
            path = os.path.join(dirpath, name)
            src = open(path, encoding="utf-8").read()
            src = re.sub(r"/\*[\s\S]*?\*/", "", src)
            src = re.sub(r"(?m)^\s*//.*$", "", src)
            for m in DECL.finditer(src):
                body = m.group(2)
                values = [a or b for a, b in STRING.findall(body)]
                spreads = SPREAD.findall(body)
                if values or spreads:
                    found[m.group(1)] = (values, spreads, path)

    # A VOCABULARY COMPOSED OF OTHERS IS STILL A VOCABULARY.
    #
    #   `ERROR_CODES` is `[...API_ERROR_CODES, ...IDENTITY_ERROR_CODES, …]` --
    #   spread rather than retyped, because writing the members out would be the
    #   parallel literal table this gate exists to find, assembled by hand inside
    #   the file that declares the parts.
    #
    #   Until this pass existed, such a constant was DISCOVERED AND DISCARDED: it
    #   matched the declaration shape, contributed no string literals, and fell
    #   out on `if values`. The contract that named it as its source was then
    #   reported as naming a vocabulary no package exports -- the gate calling a
    #   true declaration a lie, which is worse than missing it.
    #
    #   Resolution is iterative because a composition may compose a composition,
    #   and it stops rather than looping on a cycle: a vocabulary that spreads
    #   itself keeps whatever literals it has and is reported by its members, not
    #   by a stack overflow here.
    for _ in range(len(found) + 1):
        changed = False
        for name, (values, spreads, path) in list(found.items()):
            if not spreads:
                continue
            if any(s not in found or found[s][1] for s in spreads):
                continue
            resolved = []
            for s in spreads:
                resolved.extend(found[s][0])
            found[name] = (values + resolved, [], path)
            changed = True
        if not changed:
            break

    return {n: (v, p) for n, (v, _s, p) in found.items() if v}


def walk(node, path="$", parent=None):
    """Yield every (path, mapping, nearest enclosing mapping) triple.

    The parent is carried because a narrowing's explanation is very often written on
    the ARRAY rather than on its `items`, one level up from the vocabulary. A check
    that looked only at the block reported three documented narrowings as
    undocumented — an artefact of where it looked, which is the scope fault this
    document keeps naming.
    """
    if isinstance(node, dict):
        yield path, node, parent
        for key, value in node.items():
            yield from walk(value, f"{path}.{key}", node)
    elif isinstance(node, list):
        for i, value in enumerate(node):
            yield from walk(value, f"{path}[{i}]", parent)


def classify(only_contract, only_core):
    """Name the SHAPE of a disagreement, so the report says what to decide.

    A separator difference across eight vocabularies is one convention decision,
    not eight bugs. Saying so is the difference between a gate that reports and
    a gate that is useful.
    """
    def sep(s):
        return s.replace("_", "").replace("-", "")

    pairs, case_pairs = [], []
    for c in sorted(only_contract):
        for k in sorted(only_core):
            if sep(c) == sep(k):
                pairs.append((c, k))
            elif sep(c).lower() == sep(k).lower():
                # Same letters, different case: a FAMILY difference (D-036), not a
                # separator one. Naming it separately matters because the decision
                # is different — one is "pick a separator", the other is "these are
                # error codes, or they are not".
                case_pairs.append((c, k))
    if case_pairs and not pairs:
        return "case", case_pairs
    if pairs and len(pairs) == len(only_contract) == len(only_core):
        return "separator", pairs
    if pairs:
        return "separator+members", pairs
    return "members", []


DOMAIN_ONLY = "tools/domain-only-vocabularies.json"


def load_domain_only():
    """Vocabularies the domain keeps to itself, keyed by NAME.

    A side file rather than an in-source marker, and the distinction is the same one
    §3.7 taught: put the exemption in the artefact when the only stable key would be
    a LOCATION, and in a side file when there is a stable NAME. A contract block has
    no name, so its exemption lives inline; a vocabulary has one, so this can be a
    file — and a file is better here because the exemption is about the pair, not
    about the domain, and @arthome/core should not carry claims about the wire.
    """
    if not os.path.exists(DOMAIN_ONLY):
        return {}
    raw = json.load(open(DOMAIN_ONLY, encoding="utf-8"))
    return {e["vocabulary"]: e for e in raw.get("allow", []) if e.get("vocabulary")}


def load_ratchet():
    if not os.path.exists(RATCHET):
        return None
    return json.load(open(RATCHET, encoding="utf-8"))


# ── The prose block ──────────────────────────────────────────────────────────
PROSE_SOURCE = re.compile(r"<!--\s*arthome-codes-source:\s*([A-Z][A-Z0-9_]*)\s*-->")
# A token shaped exactly like a code that is not one — a state, a field, a flag. In the
# artefact and not a side file, because the document that creates the ambiguity is the
# one that can say so, and the reason belongs beside the sentence that needs it.
PROSE_NOT_CODE = re.compile(
    r"<!--\s*arthome-codes-not:\s*([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)\s+(.*?)-->", re.DOTALL
)
CODES_PROMISED = "tools/codes-promised.json"


def load_promised():
    """Codes a document names that nothing exports, keyed by CODE — one file, not one per
    document.

    A promise is a fact about the vocabulary, not about the document that mentions it:
    `api.state_conflict` is named in two documents, and a per-document list would give one
    reason two homes to drift between — the parallel literal table this gate exists to
    find, built inside it.

    ⚠ DECISION 2 ABOVE DOES NOT FORBID THIS, and the distinction is worth stating because
      it reads as though it might. Its objection to side files is that one would have to
      identify a contract block by LINE NUMBER (§3.7). A code NAME is not a line number:
      it survives a reformat, a section move and a document being split in two. Where the
      key is stable, the side file is the better home — which is why
      domain-only-vocabularies.json is one already.
    """
    if not os.path.exists(CODES_PROMISED):
        return {}
    raw = json.load(open(CODES_PROMISED, encoding="utf-8"))
    out = {}
    for e in raw.get("allow", []):
        code = e.get("code")
        if not code:
            continue
        if not e.get("reason"):
            problems.append(
                f"{CODES_PROMISED}\n      `{code}` is declared with no reason. An exception that"
                " does not\n      say why is not an exception, it is a hole."
            )
            continue
        if code in out:
            problems.append(
                f"{CODES_PROMISED}\n      `{code}` is declared twice. One code, one entry — the"
                " second\n      hides the first, reason and all."
            )
            continue
        out[code] = e
    return out
# A wire code as the contracts pin it, inside backticks. Lowercase and dotted, so
# NOT_SERVING and TS1272 cannot match; the family filter below removes the rest.
PROSE_CODE = re.compile(r"`([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)`")
HEADING = re.compile(r"(?m)^(#{1,6})\s+(.*)$")

# The accessor spelling, in a contract's own `description` prose.
YAML_CODES_SOURCE = "x-arthome-codes-source"
ACCESSOR = re.compile(r"`([A-Z][A-Z0-9_]{2,})`")
PROSE_LITERAL = "tools/prose-literal-codes.json"


def load_prose_literals(filename):
    """Accessor spellings a contract writes on purpose, as {(path, token)}, plus the same
    set for retraction — an entry whose description stops writing the token is a finding.

    A reason is mandatory, for decision 2's reason: an exception that does not say why is
    a hole. The file's own header records why this one cannot live in the artefact.
    """
    if not os.path.exists(PROSE_LITERAL):
        return set(), set()
    raw = json.load(open(PROSE_LITERAL, encoding="utf-8"))
    keys = set()
    for e in raw.get("allow", []):
        if e.get("file") != filename:
            continue
        if not e.get("reason"):
            problems.append(
                f"{PROSE_LITERAL}\n"
                f"      `{e.get('token')}` at {e.get('path')} is exempted with no reason."
            )
            continue
        keys.add((e["path"], e["token"]))
    return keys, set(keys)


def accessor_index(members):
    """Folded accessor spelling -> the code(s) it could mean.

    A code reaches prose under two spellings: the tail alone (`SCHEMA_INVALID` for
    `api.schema_invalid`) and the whole thing (`PAIRING_IDENTITY_MISMATCH`). Both are
    in use, so both are indexed — and a fold that collides is kept as a LIST, never
    resolved here, because `RATE_LIMITED` means `api.rate_limited` or
    `chat.rate_limited` and only the author knows which.
    """
    index = {}
    for code in members:
        if "." not in code:
            continue
        tail = code.split(".", 1)[1]
        for spelling in (tail, code.replace(".", "_")):
            index.setdefault(spelling.replace("_", "").lower(), []).append(code)
    return {k: sorted(set(v)) for k, v in index.items()}


def prose_strings(node, path="$"):
    """Every `description`/`summary` string in a parsed document, with its JSON path."""
    if isinstance(node, dict):
        for key, value in node.items():
            if key in ("description", "summary") and isinstance(value, str):
                yield f"{path}.{key}", value
            else:
                yield from prose_strings(value, f"{path}.{key}")
    elif isinstance(node, list):
        for i, value in enumerate(node):
            yield from prose_strings(value, f"{path}[{i}]")


def check_yaml_prose(filename, doc, core, origin):
    """The accessor-for-value confusion, inside a contract's own prose.

    ⚠ IT FLAGS ONLY WHAT IT CAN PROVE. A capitalised token is reported when it folds
      onto a code that EXISTS; one that folds onto nothing is ignored without a word,
      because `RFC`, `TODO` and every schema name live in the same token space. This
      is the inverse of the Markdown check — there, a named code must exist; here, an
      accessor spelling that resolves must be rewritten — and both avoid guessing by
      only ever speaking about a member it can point at.
    """
    literal, unseen = load_prose_literals(filename)
    if not isinstance(doc, dict) or YAML_CODES_SOURCE not in doc:
        return None, 0
    source = doc[YAML_CODES_SOURCE]
    if source not in core:
        problems.append(
            f"{filename} $.{YAML_CODES_SOURCE}\n"
            f"      declares `{source}`, which no published package exports as a vocabulary."
        )
        return source, 0

    index = accessor_index(core[source][0])
    found = 0
    for path, text in prose_strings(doc):
        for m in ACCESSOR.finditer(text):
            token = m.group(1)
            candidates = index.get(token.replace("_", "").lower())
            if not candidates:
                continue
            if (path, token) in literal:
                unseen.discard((path, token))
                continue
            found += 1
            if len(candidates) == 1:
                problems.append(
                    f"{filename} {path}\n"
                    f"      prose says `{token}`; the wire carries `{candidates[0]}`. That token is\n"
                    f"      the TypeScript accessor name, and this document's own `code` pattern\n"
                    "      forbids it — a surface branching on it would match nothing. Write the\n"
                    "      wire spelling."
                )
            else:
                problems.append(
                    f"{filename} {path}\n"
                    f"      prose says `{token}`, which folds onto {len(candidates)} codes:\n"
                    f"        {candidates}\n"
                    "      Write the one this description means; the gate will not choose."
                )

    for path, token in sorted(unseen):
        problems.append(
            f"{PROSE_LITERAL}\n"
            f"      `{token}` is exempted at {path}, and that description no longer writes it.\n"
            "      Remove the entry; it exempts nothing."
        )
    return source, found


def declared_spans(text):
    """(start, end) of every section carrying an `arthome-codes-source` declaration.

    A section runs from its heading to the next heading at the same level or above —
    so a declaration on `### 5.5` covers 5.5 and its subsections, and stops at `### 5.6`.
    """
    bounds = [(m.start(), len(m.group(1))) for m in HEADING.finditer(text)]
    spans = []
    for decl in PROSE_SOURCE.finditer(text):
        # ⚠ THE INNERMOST SECTION, NEVER EVERY ANCESTOR. Scoping by "any section whose
        #   span contains a declaration" made the H1 — whose span is the whole file,
        #   there being no second H1 — a declared section, so the document-wide scan
        #   came back through the front door and `chat.date_chat_policy_changed` was
        #   reported again from §1.
        owner = max((i for i, (s, _l) in enumerate(bounds) if s < decl.start()), default=None)
        if owner is None:
            spans.append((0, len(text)))  # declared before any heading: the file is the section
            continue
        start, level = bounds[owner]
        end = next((s for s, l in bounds[owner + 1:] if l <= level), len(text))
        spans.append((start, end))
    return spans


def nearest_heading(text, offset):
    """The last Markdown heading before `offset`, or the file itself.

    §3.7 again: a heading survives an edit anywhere else in the document, and it is
    what a reader searches for. A line number survives nothing.
    """
    last = None
    for m in HEADING.finditer(text):
        if m.start() > offset:
            break
        last = m.group(2).strip()
    return last or "(before the first heading)"


def check_prose(filename, core, origin, promised):
    """Compare the codes a Markdown document names against the vocabulary it declares.

    Returns (declared_source, codes_checked) — (None, 0) for a document that has not
    opted in, which the caller counts as undeclared rather than as passing.
    """
    text = open(filename, encoding="utf-8").read()

    decl = PROSE_SOURCE.search(text)
    if not decl:
        return None, 0, set()
    source = decl.group(1)

    if source not in core:
        problems.append(
            f"{filename}  {nearest_heading(text, decl.start())}\n"
            f"      declares `arthome-codes-source: {source}`, which no published package\n"
            f"      exports as an `as const` vocabulary. Name one that exists, or remove the\n"
            "      declaration — a source that is not there checks nothing."
        )
        return source, 0, set()

    members = set(core[source][0])
    # Derived from the vocabulary, never listed here: a list of the families would be
    # the parallel table this gate exists to find.
    families = {m.split(".", 1)[0] for m in members if "." in m}
    if not families:
        problems.append(
            f"{filename}  {nearest_heading(text, decl.start())}\n"
            f"      `{source}` has no dotted member, so no `<family>.<member>` code can be\n"
            "      recognised in prose. The prose block only fits a dotted vocabulary."
        )
        return source, 0, set()

    # ⚠ SCOPED TO THE DECLARING SECTION, NOT THE DOCUMENT, AND A FALSE POSITIVE IS
    #   WHY. An error code and a Kafka event type share the `<context>.<thing>` shape
    #   exactly — the first run of this check reported
    #   `chat.date_chat_policy_changed` from §1, which is an EVENT and not a code.
    #   Nothing about the token distinguishes them, and event types are not an
    #   exported vocabulary, so there is nothing to compare them against either.
    #
    #   Widening the declaration to cover the whole file would have put the gate back
    #   in the position decision 1 exists to forbid: guessing which token meant to be
    #   a code. So a section that names codes says so, and a section about events
    #   never opts in.
    # ⚠ SEGMENT COUNT IS DERIVED, NOT ASSUMED. Every member of the declared vocabulary
    #   has the same number of segments (all 67 of ERROR_CODES have two), so a token with
    #   a different count cannot be one of its members whatever its family looks like.
    #   That is what excludes an event type — `identity.device.revoked.v1` is four — and
    #   it excludes them by a property of the vocabulary rather than by a list of events
    #   that would need maintaining here.
    widths = {m.count(".") for m in members}
    not_codes = {m.group(1): m.group(2).strip() for m in PROSE_NOT_CODE.finditer(text)}
    for token, reason in sorted(not_codes.items()):
        if not reason:
            problems.append(
                f"{filename}  {nearest_heading(text, text.find(token))}\n"
                f"      `{token}` is declared not-a-code with no reason."
            )
        elif token in members:
            problems.append(
                f"{filename}  {nearest_heading(text, text.find(token))}\n"
                f"      `{token}` is declared not-a-code, and `{source}` contains it.\n"
                "      Remove the declaration; it excludes a real code."
            )

    seen = {}
    for start, end in declared_spans(text):
        for m in PROSE_CODE.finditer(text, start, end):
            code = m.group(1)
            if code.split(".", 1)[0] not in families or code.count(".") not in widths:
                continue
            if code in not_codes:
                continue
            seen.setdefault(code, m.start())

    for code, at in sorted(seen.items()):
        if code in members or code in promised:
            continue
        problems.append(
            f"{filename}  {nearest_heading(text, at)}\n"
            f"      names `{code}`, which `{source}` does not contain, so no service can emit\n"
            "      it and no surface can ever match it. Either publish the member in\n"
            f"      {origin[source]}, or add it to {CODES_PROMISED} with the reason\n"
            "      nobody can emit it yet."
        )

    return source, len(seen), set(seen)


def main(files):
    sources = published_sources()
    if not sources:
        print(f"WARN arthome-check-vocabulary: no published package with a src/ under "
              f"{PACKAGES_DIR}/. GATE INACTIVE.")
        return 0

    core = {}
    origin = {}      # vocabulary name -> package that exports it
    collisions = {}  # vocabulary name -> [packages], when more than one
    for pkg_name, src in sources:
        for name, entry in core_vocabularies(src).items():
            if name in core:
                collisions.setdefault(name, [origin[name]]).append(pkg_name)
                continue
            core[name] = entry
            origin[name] = pkg_name
    # One name exported by two published packages is E2 ACROSS A PACKAGE BOUNDARY —
    # the precise thing @arthome/contracts exists to avoid by extending rather than
    # redeclaring. Reported rather than silently resolved: taking the first would
    # make the gate's answer depend on directory order.
    for name, pkgs in sorted(collisions.items()):
        problems.append(
            f"{name}\n"
            f"      exported as a vocabulary by {len(pkgs)} published packages: {', '.join(pkgs)}\n"
            "      One vocabulary, one owner. A second declaration is E2 across a package\n"
            "      boundary: the copies agree today and the equality comparison between them\n"
            "      fails silently the day one moves. Derive it instead — .extend()/.pick() —\n"
            "      or move it to the package that owns the concept."
        )
    if not core:
        packages = ", ".join(n for n, _ in sources)
        print(f"WARN arthome-check-vocabulary: no `as const` vocabulary in {packages}. GATE INACTIVE.")
        return 0

    # The prose documents run BEFORE the YAML loop and outside the `compared == 0`
    # verdict below: a repository where no contract block declares a source must not
    # stop checking the documents that do. One gate, two independent coverages.
    prose_files = [f for f in files if f.endswith(".md")]
    files = [f for f in files if not f.endswith(".md")]
    prose = {"declared": 0, "codes": 0, "undeclared": []}
    # Counted apart from the Markdown documents: "codes named" and "accessor spellings
    # that resolve" are different measurements, and one number covering both would say
    # neither.
    yaml_prose = {"declared": 0, "resolved": 0, "undeclared": []}
    promised = load_promised()
    named_anywhere = set()
    named_by_file = {}
    for filename in prose_files:
        source, count, named = check_prose(filename, core, origin, promised)
        named_anywhere |= named
        named_by_file[filename] = named
        if source is None:
            prose["undeclared"].append(filename)
        else:
            prose["declared"] += 1
            prose["codes"] += count

    # ── Retracting a promise ─────────────────────────────────────────────────
    # A promise KEPT is an entry to delete, and that is a failure: a stale allowance is
    # the rot these gates exist to find, exactly as in domain-only-vocabularies.json.
    for code, entry in sorted(promised.items()):
        if code in {m for v, _p in core.values() for m in v}:
            problems.append(
                f"{CODES_PROMISED}\n"
                f"      `{code}` is declared unexported, and a package now exports it.\n"
                "      Remove the entry; it exempts nothing.\n"
                f"      Reason it carried: {entry['reason'][:120]}…"
            )
    # ⚠ AND AN ENTRY NOBODY NAMES IS A NOTE, NOT A FAILURE. With one shared file, the
    #   gate cannot tell "no document names this any more" from "the document that names
    #   it is not in the checked set" — `watch.seat_expired` is named only in
    #   adr-stream-entitlement.md, which has not opted in. Failing on that would punish
    #   the documents still to be migrated, so it is reported and left visible.
    for code in sorted(set(promised) - named_anywhere):
        where = ", ".join(promised[code].get("named_in") or ["nowhere recorded"])
        notes.append(
            f"{CODES_PROMISED}: `{code}` is declared and no CHECKED document names it. "
            f"Named in {where} — opt one in, or delete the entry."
        )
    # The pointer cannot quietly become a lie: a checked document naming a code the entry
    # does not list is drift, and it is the half that IS verifiable — a document nobody
    # checks cannot be confirmed either way.
    for filename, codes in sorted(named_by_file.items()):
        for code in sorted(codes & set(promised)):
            listed = promised[code].get("named_in") or []
            if filename not in listed:
                problems.append(
                    f"{CODES_PROMISED}\n"
                    f"      `{code}` is named in {filename}, which its `named_in` does not list:\n"
                    f"        {listed}\n"
                    "      Add it; the field is what a reader follows to the prose."
                )

    import yaml  # imported here so the two WARN paths above need no dependency

    # Counted per KIND, because the two are different work with different
    # urgency: an output divergence degrades gracefully (rule 10 keeps an unknown
    # value raw), an input divergence REJECTS — a 400 on every request from the
    # first deploy.
    stats = {
        "output": {"declared": 0, "agreed": 0, "exempt": 0, "narrowed": 0, "undeclared": []},
        "input": {"declared": 0, "agreed": 0, "exempt": 0, "narrowed": 0, "undeclared": []},
    }
    # every spelling seen, grouped by its separator-insensitive form, and where
    spelling_groups = {}
    spelling_where = {}
    folded = {}
    all_blocks = []  # (where, label, members) for the checks that need no annotation
    annotated_sources = set()  # vocabularies a block already points at, by name
    documented_narrowings = set()

    for filename in files:
        doc = yaml.safe_load(open(filename, encoding="utf-8"))
        yaml_source, yaml_found = check_yaml_prose(filename, doc, core, origin)
        if yaml_source is None:
            yaml_prose["undeclared"].append(filename)
        else:
            yaml_prose["declared"] += 1
            yaml_prose["resolved"] += yaml_found
        for path, node, parent in walk(doc):
            for key, kind in ((VOCAB, "output"), (ENUM, "input")):
                if key in node:
                    break
            else:
                continue
            members = node[key]
            st = stats[kind]
            where = f"{filename} {path}"
            label = "vocabulary" if kind == "output" else "enum (input)"
            if not isinstance(members, list):
                problems.append(f"{where}\n      {key} is not a list.")
                continue

            # ── The YAML 1.1 boolean trap ────────────────────────────────────
            # `off`, `on`, `yes`, `no`, `y`, `n` unquoted are BOOLEANS in YAML 1.1,
            # not strings. A vocabulary member written bare as `off` reaches every
            # YAML 1.1 consumer — PyYAML, and many code generators — as `False`.
            # The contract then does not say what its author believes it says.
            #
            # Reported as its own class, and the agreement check is SKIPPED for
            # the block: until the members are strings, comparing them is
            # meaningless, and two messages for one cause invites fixing the
            # wrong one (the same principle as check-tsconfig's broken chain).
            # A nullable vocabulary may legitimately list `null` among its
            # members: `type: [string, "null"]` admits it, and 14 blocks in these
            # two contracts are declared that way. Nullability is a fact about the
            # TYPE, not a member of the vocabulary, so `null` is accepted here and
            # dropped before the comparison — the domain's union will not contain
            # it either.
            #
            # Written before it fired rather than after: no block lists `null`
            # today, but the ones that could are already declared nullable. A gate
            # that shouts wrongly gets switched off, and that applies to this gate
            # as much as to the one it was written about.
            type_decl = node.get("type")
            nullable = isinstance(type_decl, list) and "null" in type_decl
            if nullable:
                members = [m for m in members if m is not None]

            non_strings = [m for m in members if not isinstance(m, str)]
            if non_strings:
                problems.append(
                    f"{where}\n"
                    f"      member(s) parsed as {', '.join(type(m).__name__ for m in non_strings)}, "
                    f"not string: {non_strings}\n"
                    f"      parsed list: {members}\n"
                    "      YAML 1.1 reads bare `off`/`on`/`yes`/`no` as booleans. Quote them:\n"
                    "      x-arthome-vocabulary: [open, emoji, read_only, 'off']\n"
                    "      Until then this contract does not say what it appears to say, and the\n"
                    "      agreement check cannot run on this block."
                )
                continue

            for m in members:
                # ⚠ Separator-insensitive but CASE-SENSITIVE. Case is MEANINGFUL
                #   since D-036 named three families: `snake_case` for domain
                #   vocabulary, `SCREAMING_SNAKE` for error and failure codes.
                #   Lowercasing here merged two genuinely different vocabularies —
                #   `WatchVerdict.reasonCode` (a refusal code, SCREAMING_SNAKE)
                #   against the refund `reasonCode` (a domain reason, snake_case) —
                #   and reported them as one value spelled two ways. They share one
                #   fact and are not the same vocabulary.
                #
                #   That was a real false positive, created by a ruling that landed
                #   after this check was written. A case-only difference is now a
                #   NOTE below, not a failure: it is legitimate across families and
                #   suspicious only within one, which a human can tell and this gate
                #   cannot.
                key = m.replace("-", "").replace("_", "")
                spelling_groups.setdefault(key, set()).add(m)
                spelling_where.setdefault(m, set()).add(where)
                # A second index, keyed case-INSENSITIVELY, so a cross-family pair
                # is downgraded to a note rather than silently dropped. Dropping it
                # was the first attempt and it was wrong: the point of the ruling is
                # that case now carries meaning, which makes a case difference worth
                # SEEING even when it is legitimate.
                folded.setdefault(key.lower(), set()).add(m)

            all_blocks.append((where, label, set(members), node, parent))
            members = set(members)
            source = node.get(SOURCE)

            if source is None:
                st["undeclared"].append(where)
                continue

            if str(source).lower() == "none":
                if not node.get(REASON):
                    problems.append(
                        f"{where}\n"
                        f"      {SOURCE}: none without {REASON}.\n"
                        "      An exception that does not say why is not an exception, it is a hole."
                    )
                else:
                    st["exempt"] += 1
                continue

            st["declared"] += 1
            annotated_sources.add(str(source))
            if source not in core:
                problems.append(
                    f"{where}\n"
                    f"      {SOURCE}: {source} — no such vocabulary is exported by any published\n"
                    f"      package ({', '.join(n for n, _ in sources)}).\n"
                    f"      (this block is an {label})\n"
                    f"      Exported: {', '.join(sorted(core))}"
                )
                continue

            expected = set(core[source][0])
            only_contract = members - expected
            only_core = expected - members

            # ── The third verdict: a DECLARED narrowing ───────────────────────
            # An input that deliberately refuses part of its vocabulary is neither
            # agreement nor disagreement, and it is certainly not `source: none` —
            # it IS the vocabulary, restricted. Before this existed it could only be
            # recorded as UNDECLARED, which made the six most carefully reviewed
            # blocks in the contracts indistinguishable from blocks nobody had read.
            #
            # And what each one leaves out is the rule. `RUN_STATES` minus
            # `interrupted`, because an interruption is DECLARED by `raiseIncident`
            # and never commanded — a control room able to set it directly would
            # have two ways into one state and only one raises the incident viewers
            # see. Two of the most important sentences in either contract were
            # written nowhere and carried by an omission.
            #
            # Which is why the reason is mandatory, and it is the same discipline
            # `source: none` carries: an omission that does not say why is not a
            # rule, it is a gap.
            narrowing_reason = node.get(NARROWING)
            if narrowing_reason is not None:
                if not str(narrowing_reason).strip():
                    problems.append(
                        f"{where}  [{label}]\n"
                        f"      {NARROWING} is present but empty. An omission that does not say why\n"
                        "      is not a rule, it is a gap."
                    )
                elif only_contract:
                    problems.append(
                        f"{where}  [{label}]  ~ {source}\n"
                        f"      declared as a narrowing, but it ADDS members the vocabulary does not\n"
                        f"      have: {sorted(only_contract)}\n"
                        "      A narrowing is a subset. This is a divergence wearing a narrowing's label."
                    )
                elif not only_core:
                    problems.append(
                        f"{where}  [{label}]  ~ {source}\n"
                        f"      declared as a narrowing, but it narrows nothing — it is the whole\n"
                        f"      vocabulary. Remove {NARROWING}; a label that describes nothing will be\n"
                        "      read as describing something."
                    )
                else:
                    st["narrowed"] += 1
                    documented_narrowings.add((where, source))
                continue

            # ⚠ THE COMPARISON IS ASYMMETRIC, because the contract is. Only in the
            #   CONTRACT fails both kinds: on an input it means we ACCEPT a value the
            #   domain cannot represent, and `SURFACES` diverging as core
            #   `storefront_web` against wire `storefront-web` on the required
            #   `X-Arthome-Surface` header would have been a 400 on everything from
            #   the first deploy. Only in the DOMAIN fails on outputs only — narrowing
            #   an input is legitimate and common, and a gate that shouts at every
            #   deliberately-restricted input gets switched off. An input that wants
            #   equality asserts it by listing every member.
            narrowing = only_core if kind == "input" else set()
            blocking_core = set() if kind == "input" else only_core

            if not only_contract and not blocking_core:
                st["agreed"] += 1
                if narrowing:
                    notes.append(
                        f"{where} [{label}] narrows {source}: "
                        f"{sorted(narrowing)} not accepted on input — legitimate if deliberate."
                    )
                continue

            shape, pairs = classify(only_contract, blocking_core or only_core)
            lines = [f"{where}  [{label}]  ~ {source} ({core[source][1]})"]
            if only_contract:
                lines.append(f"      contract only: {sorted(only_contract)}")
            if only_contract:
                lines.append(
                    "      ^ ACCEPTED BY THE API, UNKNOWN TO THE DOMAIN — a 400 or a silent"
                    "\n        mismatch on every request carrying it."
                    if kind == "input"
                    else "      ^ servable by the API, unknown to the domain."
                )
            if blocking_core:
                lines.append(f"      domain only  : {sorted(blocking_core)}")
            elif narrowing:
                lines.append(f"      domain only  : {sorted(narrowing)} (narrowing, not counted)")
            if shape == "separator":
                lines.append(
                    "      SHAPE: separator only — "
                    + ", ".join(f"{c} / {k}" for c, k in pairs)
                    + "\n      One wire-format decision, not one bug per member. Decide the"
                    "\n      convention once, then change whichever side loses."
                )
            elif shape == "case":
                lines.append(
                    "      SHAPE: case only — "
                    + ", ".join(f"{c} / {k}" for c, k in pairs)
                    + "\n      D-036 names three families: snake_case for domain vocabulary,"
                    "\n      SCREAMING_SNAKE for error and failure codes. Decide which family this"
                    "\n      is, then change the side that is in the wrong one."
                )
            elif shape == "separator+members":
                lines.append(
                    "      SHAPE: a separator difference AND a membership difference — "
                    + ", ".join(f"{c} / {k}" for c, k in pairs)
                )
            else:
                lines.append("      SHAPE: membership — a value exists on one side only.")
            problems.append("\n".join(lines))

    # ── Cross-boundary spelling: needs NO annotation ─────────────────────────
    # The agreement check only looks at ANNOTATED blocks, and 73 output plus 47
    # input blocks are still undeclared. So the worst divergence found so far was
    # invisible to it: `WATCH_DENIAL_REASONS` declared `no_seat`, `room_not_open`,
    # `subscription_required` in the domain against `NO_SEAT`, `ROOM_NOT_OPEN`,
    # `SUBSCRIPTION_REQUIRED` on the wire — ten concepts, ten matches, every one
    # differently cased, and `reason === WatchDenialReason.NO_SEAT` false for all
    # ten across the storefront's entire refusal experience.
    #
    # WHY THIS IS SAFE WITHOUT THE `-source` KEY, when heuristic overlap was not:
    # the criterion is a match of the WHOLE SET under normalisation, not a partial
    # overlap. If every member of a block corresponds to every member of a domain
    # vocabulary once case and separators are ignored, and yet the strings differ,
    # that is not a guess about which vocabulary it is.
    #
    # AND WHY CASE IS A DEFECT HERE THOUGH IT IS LEGITIMATE IN THE TWINS CHECK:
    # families (D-036/D-037) distinguish two DIFFERENT vocabularies — a refusal
    # code from a domain value. They do not straddle the domain/wire boundary,
    # because core and the wire are the same side of it: one vocabulary, spelled
    # once. A family difference across that boundary is not a family, it is a bug.
    def fold(value):
        return value.replace("-", "").replace("_", "").lower()

    core_folded = {name: {fold(v): v for v in vals} for name, (vals, _f) in core.items()}
    for where, label, members, _n, _p in all_blocks:
        if not members:
            continue
        block_folded = {fold(m): m for m in members}
        for name, folded_core in core_folded.items():
            if set(block_folded) != set(folded_core):
                continue  # not the same set: this check says nothing
            differing = [
                (block_folded[k], folded_core[k])
                for k in sorted(block_folded)
                if block_folded[k] != folded_core[k]
            ]
            if not differing:
                continue
            problems.append(
                f"{where}  [{label}]\n"
                f"      every member matches {name} ({core[name][1]}) once case and separators\n"
                f"      are ignored, but {len(differing)} of {len(members)} differ as written:\n"
                + "\n".join(f"        wire {c!r}  vs  domain {k!r}" for c, k in differing[:8])
                + "\n      A comparison against the domain constant is false for each of these, in\n"
                "      silence. Families distinguish two vocabularies (D-037); they do not\n"
                "      straddle the domain/wire boundary, so this is one vocabulary spelled twice."
            )
            break

    # ── `source: none` contradicted by a vocabulary that exists ───────────────
    #
    # THE EXEMPTION IS A CLAIM, AND UNTIL NOW NOTHING CHECKED IT.
    #
    # `source: none` asserts "no published package declares these values". Every
    # other verdict in this gate is tested against the packages; that one was taken
    # on trust, and it is the only verdict that SUPPRESSES the comparison. An
    # untested exemption is the widest hole a gate can have, because it is the branch
    # a future author reaches for when the comparison is inconvenient.
    #
    # It fired the day it was written. `emptyReason` in storefront.yaml declares
    # fourteen values and `source: none` with the reason "a vocabulary local to this
    # contract. The domain neither produces nor consumes these values". That was TRUE
    # when written and became false when @arthome/contracts landed EMPTY_REASONS with
    # the same fourteen. Two artefacts, one fact, and the annotation pointing away
    # from the copy.
    #
    # WHY WHOLE-SET EQUALITY AND NOTHING WEAKER. A subset is a narrowing and has its
    # own check below; an overlap is a guess, and the guess is what made an earlier
    # version of this gate unusable. Equal sets are not a guess about which
    # vocabulary it is — it is the same standard the folding check above rests on.
    #
    # The two checks are disjoint by construction and each has ONE cause: folding
    # reports "same set, spelled differently", this one reports "same set, spelled
    # identically, declared as having no source". A block cannot trip both.
    for where, label, members, node, _p in all_blocks:
        if not members:
            continue
        source = node.get(SOURCE)
        if source is None or str(source).lower() != "none":
            continue
        same = [name for name, (vals, _f) in core.items() if set(vals) == members]
        if not same:
            continue
        for name in sorted(same):
            problems.append(
                f"{where}  [{label}]\n"
                f"      {SOURCE}: none — but {name} ({origin[name]}, {core[name][1]})\n"
                f"      declares exactly these {len(members)} values.\n"
                f"      The exemption says no package owns this vocabulary, and one does. The two\n"
                f"      agree today, which is what E2 looks like on the day it is committed: the\n"
                f"      copies drift on the first change and the annotation points away from the\n"
                f"      other copy.\n"
                f"      Name it instead, and the comparison starts running:\n"
                f"        {SOURCE}: {name}\n"
                f"      If the wire really must differ from {name}, that is a narrowing or a\n"
                f"      rename, and both are declarable. `none` is for a vocabulary NO package\n"
                f"      declares."
            )

    # ── Undocumented narrowings ───────────────────────────────────────────────
    # THE PREDICATE, measured rather than guessed. `backend-contracts` ran the test
    # three ways:
    #
    #   scoped by a name          missed eight
    #   scoped by nothing         14 hits, 6 real, 8 NOISE
    #   scoped by this predicate   6 hits, 6 real, all documented
    #
    #   Fire when an UNANNOTATED block is a strict subset of a NAMED vocabulary.
    #   Ignore containment between two annotated blocks.
    #
    # The eight noise hits are why the predicate is not optional. Four were
    # vocabularies that legitimately nest — `CREW_ROLES` inside `MEMBER_ROLES` is
    # true and means something, a crew role IS a member role. One was pure
    # coincidence: `[low, medium, high]` nesting inside `[auto, low, medium, high]`,
    # two unrelated vocabularies, excluded because the narrower one carries its own
    # source. Three were artefacts of WHERE IT LOOKED — the description sat one level
    # up, on the array rather than on its `items`.
    #
    # Noise is how a gate gets switched off (D-024). Six that are all real beats
    # fourteen that are mostly right.
    #
    # And the general rule underneath (D-045) is the one this whole gate is built on:
    #   INCIDENTAL scope — a directory, a separator, a line count, a pipe. A property
    #     of the INSTRUMENT. Invisible in the output; everything outside it is a
    #     silent miss.
    #   INTRINSIC scope — "narrows something that has a name". A property of the
    #     QUESTION. Visible because it IS the question.
    for where, label, members, node, parent in all_blocks:
        if not members or node.get(SOURCE) is not None:
            continue  # annotated: the verdicts above own it
        candidates = [
            name
            for name, (vals, _f) in core.items()
            if members < set(vals)  # strict subset, and `<` says so structurally
        ]
        if not candidates:
            continue
        # Parent-aware: an explanation written on the array rather than on its
        # `items` is still an explanation. Without this, three documented narrowings
        # read as undocumented — the scope fault, inside the check for it.
        described = bool(
            str(node.get("description", "")).strip()
            or (parent is not None and str(parent.get("description", "")).strip())
        )
        missing = {n: sorted(set(core[n][0]) - members) for n in candidates}
        detail = "; ".join(f"{n} (omits {v})" for n, v in sorted(missing.items()))
        if described:
            notes.append(
                f"{where} [{label}] narrows {detail} and explains itself in prose, but carries no "
                f"`{SOURCE}` + `{NARROWING}`. Prose is not checkable: the omission is the rule, so "
                "annotate it."
            )
        else:
            problems.append(
                f"{where}  [{label}]\n"
                f"      a strict subset of {detail}\n"
                f"      An input that deliberately refuses part of its vocabulary is stating a RULE,\n"
                f"      and the rule is carried by the omission — with nothing written anywhere.\n"
                f"      Declare it:\n"
                f"        {SOURCE}: <VOCABULARY>\n"
                f"        {NARROWING}: <why these members are not accepted here>\n"
                f"      This is the inverse of E2: not a fact stated twice and drifting, but a fact\n"
                f"      stated ZERO times. An absence has no owning document to reread."
            )

    # ── A wire vocabulary the domain never declares ───────────────────────────
    # The third direction, and it is neither a narrowing nor `source: none`:
    # `[full, preview]` is on BOTH wires with no core vocabulary behind it — a
    # vocabulary the domain computes and never declares, so there is nothing for
    # either side to import and nothing for the agreement check to compare.
    #
    # THE SCOPE IS INTRINSIC, and it has to be, or this is unusable: firing on every
    # block with no core counterpart would flag every genuine wire-only enum — sort
    # orders, pagination directions, content types — and noise is how a gate gets
    # switched off. So the question is not "does the domain declare this?" but:
    #
    #   the SAME member set appears in BOTH contracts, and no domain vocabulary
    #   declares it
    #
    # Cross-document duplication is what makes it a shared vocabulary rather than a
    # local filter, and a shared vocabulary with no single declaration is E2 by
    # construction — two copies, no owner. A set appearing in one contract only is
    # local until proven otherwise, and this check says nothing about it.
    by_set = {}
    for where, _label, members, node, _p in all_blocks:
        if not members or node.get(SOURCE) is not None:
            continue
        doc = where.split(" ", 1)[0]
        by_set.setdefault(frozenset(members), {}).setdefault(doc, []).append(where)

    core_sets = {frozenset(vals) for vals, _f in core.values()}
    core_folded_sets = {frozenset(fold(v) for v in vals) for vals, _f in core.values()}
    for member_set, docs in sorted(by_set.items(), key=lambda kv: sorted(kv[1])):
        if len(docs) < 2:
            continue  # one document only: local until proven otherwise
        if member_set in core_sets:
            continue
        if frozenset(fold(m) for m in member_set) in core_folded_sets:
            continue  # the domain has it; the spelling check above owns that case
        wheres = [w for ws in docs.values() for w in ws]
        problems.append(
            f"{sorted(member_set)}\n"
            f"      the same vocabulary appears in BOTH contracts and NO domain vocabulary\n"
            f"      declares it:\n"
            + "\n".join(f"        {w}" for w in wheres[:4])
            + (f"\n        … and {len(wheres) - 4} more" if len(wheres) > 4 else "")
            + "\n      Two copies with no owner is E2 by construction: there is nothing to import\n"
            "      and nothing for the agreement check to compare. Declare it in @arthome/core,\n"
            "      or — if the two really are unrelated — annotate each with its own source."
        )

    # ── The reverse direction: can the wire carry what the domain returns? ────
    # Everything above asks whether the contract says something the domain does not
    # know. NOTHING asked the opposite, and the gap ran three deep before anyone
    # saw it: `PUBLICATION_STATES` and `DISPLAY_STATES` both carry `draft`,
    # `reserve` and `technical`, and both wire counterparts had lost all three —
    # as had `NOT_PUBLISHED`, the denial reason returned FOR exactly those states.
    #
    # One blind spot expressed three times. The cause is nameable: the three
    # non-public states are invisible to whoever authored the wire vocabularies
    # because they are invisible to a VIEWER. A contract that cannot express what
    # the domain returns is broken wherever that turns up.
    #
    # "Expressible SOMEWHERE" is deliberately loose: `NOT_PUBLISHED` needs to reach
    # one contract, not both. A member reaching neither is the finding.
    #
    # Needs no annotation either — it reads the domain and both documents.
    on_the_wire = set()
    for _w, _l, members, _n, _p in all_blocks:
        on_the_wire |= members
    folded_wire = {fold(m) for m in on_the_wire}

    domain_only = load_domain_only()
    for name, (vals, src_file) in sorted(core.items()):
        # ⚠ ONE CAUSE, ONE MESSAGE. A vocabulary that some block already points at is
        #   covered by the agreement check above, which reports the missing member
        #   against the block that should carry it — a more useful place than "absent
        #   from both documents". Reporting it here as well produced two findings for
        #   one defect (`watch_preview`), which is the thing this gate refuses to do
        #   elsewhere and had started doing itself.
        #
        #   So the division is by construction rather than by de-duplication:
        #     annotated somewhere  -> the agreement check owns it
        #     annotated nowhere    -> this check owns it, and nothing else can see it
        if name in annotated_sources:
            continue
        exempt_entry = domain_only.get(name)
        missing = [v for v in vals if fold(v) not in folded_wire]
        if exempt_entry:
            if not exempt_entry.get("reason"):
                problems.append(
                    f"{DOMAIN_ONLY}\n      `{name}` is exempted with no reason."
                )
            elif not missing:
                # The exemption has outlived its reason: every member now reaches a
                # contract. A stale allowance is the rot these gates exist to find.
                problems.append(
                    f"{DOMAIN_ONLY}\n      `{name}` is exempted as domain-only, but every member now\n"
                    f"      reaches a contract. Remove the entry; it exempts nothing."
                )
            continue
        if missing:
            problems.append(
                f"{src_file}  {name}\n"
                f"      {len(missing)} of {len(vals)} member(s) appear in NEITHER contract:\n"
                f"        {sorted(missing)}\n"
                "      The domain can return a value the wire cannot express. Either publish it\n"
                f"      in one contract, or declare the vocabulary domain-only in {DOMAIN_ONLY}\n"
                "      with a reason — which the gate will retract the day a member reaches a wire."
            )

    # ── One value, one spelling, across both contracts ───────────────────────
    # This check needs NO annotation, so it is live today across all 148 blocks
    # while the `-source` migration is still in front of us. It catches the class
    # the source key cannot reach yet: the same value spelled two ways in the two
    # documents, which means a storefront client and a studio client are reading
    # different strings for the same thing.
    #
    # Found this way: `co-production` in storefront.yaml against `co_production`
    # in studio.yaml. Neither contract is wrong on its own; together they are.
    twins = {}
    for key, spellings in spelling_groups.items():
        if len(spellings) > 1:
            twins[key] = spellings
    # A case-only difference crosses a family boundary (D-036) and is reported as a
    # note for a human to confirm; a separator difference within one case is the
    # real defect.
    for k, spellings in sorted(folded.items()):
        if len(spellings) < 2:
            continue
        if len({sp.replace("-", "").replace("_", "") for sp in spellings}) < 2:
            continue  # identical but for separators: that is the twin above, not this
        notes.append(
            "case differs for "
            + " / ".join(f"`{x}`" for x in sorted(spellings))
            + " — legitimate if these are an error code and a domain value in two different"
            " vocabularies (D-036), a defect if they are one vocabulary. Not failed, because this"
            " gate cannot tell and a human can."
        )

    for key, spellings in sorted(twins.items()):
        listed = sorted(spellings)
        problems.append(
            "the same value is spelled two ways across the contracts: "
            + " / ".join(f"`{s}`" for s in listed)
            + "\n      "
            + "; ".join(f"{s}: {', '.join(sorted(spelling_where[s])[:2])}" for s in listed)
            + "\n      A storefront client and a studio client read different strings for the same\n"
            "      thing. One spelling wins — the wire convention is snake_case (5.2)."
        )

    # ── Two ratchets, because the two kinds are not equally urgent ───────────
    # Outputs degrade gracefully; inputs reject. So the input allowance gets its
    # own number and its own date, and it is the one that should reach zero first.
    # One shared allowance would let the safe migration mask the dangerous one.
    ratchet = load_ratchet() or {}
    today = date.today().isoformat()

    KINDS = (
        ("output", "undeclaredAllowed", "rebaselineAfter", VOCAB),
        ("input", "undeclaredAllowedEnum", "rebaselineAfterEnum", ENUM),
    )

    remove_after = ratchet.get("removeAfter")
    if ratchet and not remove_after:
        problems.append(
            f"{RATCHET}\n      no `removeAfter` date. A migration allowance without a"
            "\n      deadline is a permanent exemption that does not say its name."
        )
    elif ratchet and str(remove_after) < today:
        total_undeclared = sum(len(stats[k]["undeclared"]) for k, *_ in KINDS)
        problems.append(
            f"{RATCHET}\n      the allowance expired on {remove_after} (today is {today}).\n"
            f"      {total_undeclared} block(s) still undeclared. Either finish the migration or\n"
            f"      re-date the allowance with a reason."
        )

    allowances = {}
    for kind, allow_key, rebase_key, key_name in KINDS:
        st = stats[kind]
        count = len(st["undeclared"])
        allowed = int(ratchet.get(allow_key, 0))
        allowances[kind] = allowed

        if count > allowed:
            problems.append(
                f"{count} `{key_name}` block(s) carry no `{SOURCE}`, allowance is {allowed}"
                f" ({kind}).\n"
                f"      An undeclared vocabulary is where drift hides: nothing can check it.\n"
                f"      The allowance is a RATCHET — it may go down, never up. Lower `{allow_key}`\n"
                f"      in {RATCHET} as blocks get annotated."
                + (
                    "\n      These are INPUTS: a divergence here rejects requests rather than"
                    "\n      degrading. This allowance should reach zero first."
                    if kind == "input"
                    else ""
                )
            )

        # Slack must be dated, not promised (see the prediction failure in 5.3.1 c).
        slack = allowed - count
        rebase = ratchet.get(rebase_key)
        if slack > 0:
            if not rebase:
                problems.append(
                    f"{RATCHET}\n"
                    f"      `{allow_key}` is {allowed} but only {count} {kind} block(s) are\n"
                    f"      undeclared — {slack} unit(s) of slack, with no `{rebase_key}` date.\n"
                    "      Slack with no deadline is an allowance that will never be tightened."
                )
            elif str(rebase) < today:
                problems.append(
                    f"{RATCHET}\n"
                    f"      `{allow_key}` is still {allowed} but only {count} {kind} block(s) are\n"
                    f"      undeclared, and the re-baseline was due {rebase} (today is {today}).\n"
                    f"      Lower `{allow_key}` to {count}. A ratchet that keeps its slack stops\n"
                    "      being a ratchet."
                )
            else:
                notes.append(
                    f"{kind}: allowance {allowed} against {count} undeclared — {slack} unit(s) of "
                    f"slack, to be re-baselined by {rebase}."
                )

    for kind, _a, _r, key_name in KINDS:
        st = stats[kind]
        total = st["declared"] + st["exempt"] + len(st["undeclared"])
        print(
            f"arthome-check-vocabulary [{kind}/{key_name}]: {total} block(s) — "
            f"{st['agreed']} agree, {st['declared'] - st['agreed'] - st['narrowed']} disagree, "
            f"{st['narrowed']} narrowed, {st['exempt']} exempt, "
            f"{len(st['undeclared'])} undeclared"
        )
    if prose_files:
        print(
            f"arthome-check-vocabulary [prose/arthome-codes-source]: "
            f"{len(prose_files)} document(s) — {prose['declared']} declared, "
            f"{prose['codes']} code(s) checked, {len(prose['undeclared'])} undeclared"
        )
    print(
        f"arthome-check-vocabulary [contract prose/{YAML_CODES_SOURCE}]: "
        f"{yaml_prose['declared']} of {yaml_prose['declared'] + len(yaml_prose['undeclared'])} "
        f"document(s) declared, {yaml_prose['resolved']} accessor spelling(s) resolved"
    )
    print(
        f"  against {len(core)} vocabularies exported by "
        + ", ".join(sorted({origin[n] for n in core}))
    )
    for where in prose["undeclared"]:
        print(f"  undeclared [prose]  {where}")

    for kind, _a, _r, _k in KINDS:
        shown = stats[kind]["undeclared"][:4]
        for where in shown:
            print(f"  undeclared [{kind}]  {where}")
        rest = len(stats[kind]["undeclared"]) - len(shown)
        if rest > 0:
            print(f"  undeclared [{kind}]  … and {rest} more (pass --list-undeclared)")

    if "--list-undeclared" in sys.argv:
        for kind, _a, _r, _k in KINDS:
            for where in stats[kind]["undeclared"]:
                print(f"  undeclared [{kind}]  {where}")

    for note in notes:
        print(f"  - {note}")

    if problems:
        # The count line and the notes go to stdout, the failures to stderr. Flush
        # stdout first or the two streams interleave when piped, and the failures
        # appear before the context that explains them.
        sys.stdout.flush()
        print(f"\nFAIL {len(problems)} vocabulary problem(s):\n", file=sys.stderr)
        for p in problems:
            print(f"  {p}", file=sys.stderr)
        print(
            "\n  The domain declares a vocabulary once; the contract mirrors it and says so.\n"
            "  A member on one side only is the parallel literal table (E2) between the two\n"
            "  artefacts built to prevent it. Fix the artefacts — do not widen the allowance.",
            file=sys.stderr,
        )
        return 1

    # ── The verdict names its own coverage ───────────────────────────────────
    # An earlier version printed "PASS the contracts and the domain share one
    # vocabulary" while having compared ZERO blocks: 0 agree, 0 disagree, 149
    # undeclared. The count line above was honest and the verdict line was not,
    # and a reader of a green `verify:offline` took away a conclusion nothing in
    # this repository had established.
    #
    # That is the exact class this gate was built to catch, committed by the gate
    # itself — a green gate that was never asked the question. The other four
    # gates already had the pattern (`GATE INACTIVE`, plus the missing
    # condition); this one asserted instead.
    #
    # So: no coverage, no verdict. And a pass states what it covered, because a
    # pass that names its coverage cannot quietly decay into a pass that covers
    # nothing as the ratchet lets the undeclared count drift.
    compared = sum(stats[k]["declared"] for k, *_ in KINDS)
    total = sum(
        stats[k]["declared"] + stats[k]["exempt"] + len(stats[k]["undeclared"]) for k, *_ in KINDS
    )
    exempt = sum(stats[k]["exempt"] for k, *_ in KINDS)
    undeclared_n = sum(len(stats[k]["undeclared"]) for k, *_ in KINDS)
    in_done = stats["input"]["declared"]
    in_total = in_done + stats["input"]["exempt"] + len(stats["input"]["undeclared"])

    if compared == 0 and prose["codes"] == 0:
        print(
            f"GATE INACTIVE — {undeclared_n} block(s) undeclared, nothing compared."
            f"\n  Needs `{SOURCE}` on a block, or `arthome-codes-source` in a document,"
            f"\n  before it can compare anything."
            f"\n  Exit 0 because the ratchet is deliberate policy (§5.3.1 c); the gate is not"
            f"\n  claiming the two sides agree."
        )
        return 0

    parts = [f"{compared} of {total} block(s) compared, all agree"]
    if exempt:
        parts.append(f"{exempt} exempt")
    if undeclared_n:
        parts.append(f"{undeclared_n} undeclared")
    parts.append(f"inputs {in_done}/{in_total}")
    # Named separately rather than folded into the block count: a reader who sees one
    # number cannot tell which of the two coverages earned it, and the prose coverage
    # is the one that is new and still narrow.
    if prose_files:
        parts.append(
            f"prose {prose['declared']}/{len(prose_files)} doc(s), {prose['codes']} code(s)"
        )
    print("PASS — " + "; ".join(parts))
    return 0


# ── A gate fails; it does not throw ──────────────────────────────────────────
# An unhandled exception in a gate reads EXACTLY like a finding: two teammates
# reported `verify:offline` down for everyone on a NameError in this file, and both
# were right that it was down — but the chain, and a human reading it, cannot tell a
# traceback from a verdict. A crashing gate and a red gate are the same observation.
#
# Exit code 3, distinct from 1 (a finding) and 2 (a malformed exemption), so the
# three are distinguishable by a caller and not only by eye. And the message says
# THE GATE IS BROKEN rather than describing the repository, because that is the
# thing that needs fixing.
if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    try:
        sys.exit(main(args or ["openapi/storefront.yaml", "openapi/studio.yaml"]))
    except SystemExit:
        raise
    except Exception:  # noqa: BLE001 — deliberately broad: any escape is a gate defect
        import traceback

        print(
            "\nGATE DEFECT arthome-check-vocabulary crashed. This is a bug in the gate,\n"
            "  NOT a finding about the repository — nothing has been verified, so treat this\n"
            "  as UNKNOWN rather than as pass or fail.\n",
            file=sys.stderr,
        )
        traceback.print_exc()
        sys.exit(3)
