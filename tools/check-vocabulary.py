#!/usr/bin/env python3
"""arthome-check-vocabulary — the contracts and the domain share one vocabulary.

WHAT IT PROVES
  Every `x-arthome-vocabulary` in openapi/*.yaml agrees, member for member, with
  the `as const` vocabulary `@arthome/core` exports.

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

Usage: python3 tools/check-vocabulary.py openapi/*.yaml
No dependency beyond PyYAML. Everything runs locally.
"""

import json
import os
import re
import sys
from datetime import date

CORE_SRC = "packages/core/src"
RATCHET = "tools/vocabulary-migration.json"

DECL = re.compile(
    r"export\s+const\s+([A-Z][A-Z0-9_]*)\s*(?::[^=]+?)?=\s*\[([\s\S]*?)\]\s*as\s+const"
)
STRING = re.compile(r"'([^'\\\r\n]*)'|\"([^\"\\\r\n]*)\"")

VOCAB = "x-arthome-vocabulary"   # an OUTPUT vocabulary: served, tolerant
ENUM = "enum"                    # an INPUT enum: accepted, strict
SOURCE = "x-arthome-vocabulary-source"
REASON = "x-arthome-vocabulary-reason"
NARROWING = "x-arthome-vocabulary-narrowing"

problems = []
notes = []


def core_vocabularies(root):
    """Every `export const NAME = [...] as const` in the domain's sources.

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
                values = [a or b for a, b in STRING.findall(m.group(2))]
                if values:
                    found[m.group(1)] = (values, path)
    return found


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


def main(files):
    if not os.path.isdir(CORE_SRC):
        print(f"WARN arthome-check-vocabulary: {CORE_SRC} not found. GATE INACTIVE.")
        return 0

    core = core_vocabularies(CORE_SRC)
    if not core:
        print("WARN arthome-check-vocabulary: no `as const` vocabulary in the domain. GATE INACTIVE.")
        return 0

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
                    f"      {SOURCE}: {source} — no such vocabulary is exported by @arthome/core.\n"
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

            # ── The comparison is ASYMMETRIC, because the contract's design is ──
            #
            # The contract is strict on input and tolerant on output, and that is a
            # design property rather than a notation accident. Flattening it here —
            # demanding set equality everywhere — would make the gate disagree with
            # the thing it is checking.
            #
            #   ONLY IN THE CONTRACT — always a failure, both kinds.
            #     output: we would serve a value the domain cannot represent.
            #     input:  we would ACCEPT one. This is the dangerous direction and
            #             the one that takes a platform down: `SURFACES` diverged
            #             as core `storefront_web` against wire `storefront-web` on
            #             `X-Arthome-Surface`, a REQUIRED header validated on every
            #             request to both BFFs. A 400 on everything, from the first
            #             deploy. This rule is what catches it.
            #
            #   ONLY IN THE DOMAIN — depends on the kind.
            #     output: a failure. An output contract must be able to describe
            #             every value the domain can emit, or a consumer meets a
            #             value the contract never mentioned.
            #     input:  a NOTE, not a failure. Narrowing an input is legitimate
            #             and common — not every domain value is settable by a
            #             client, and a "set state" enum properly accepts only the
            #             transitions a client may request. Failing here would
            #             shout at every deliberately-restricted input, and a gate
            #             that shouts wrongly gets switched off.
            #
            # So the dangerous direction fails in both kinds; only outputs require
            # equality. An input that wants equality asserts it by listing every
            # member — the gate does not need a flag for that.
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
    print(f"  against {len(core)} vocabularies exported by @arthome/core")

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

    if compared == 0:
        print(
            f"GATE INACTIVE — {undeclared_n} block(s) undeclared, nothing compared."
            f"\n  Needs `{SOURCE}` on a block before it can compare anything."
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
