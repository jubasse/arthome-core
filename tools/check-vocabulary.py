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

VOCAB = "x-arthome-vocabulary"
SOURCE = "x-arthome-vocabulary-source"
REASON = "x-arthome-vocabulary-reason"

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


def walk(node, path="$"):
    """Yield every (path, mapping) pair in the document."""
    if isinstance(node, dict):
        yield path, node
        for key, value in node.items():
            yield from walk(value, f"{path}.{key}")
    elif isinstance(node, list):
        for i, value in enumerate(node):
            yield from walk(value, f"{path}[{i}]")


def classify(only_contract, only_core):
    """Name the SHAPE of a disagreement, so the report says what to decide.

    A separator difference across eight vocabularies is one convention decision,
    not eight bugs. Saying so is the difference between a gate that reports and
    a gate that is useful.
    """
    def norm(s):
        return s.replace("_", "").replace("-", "").lower()

    pairs = []
    for c in sorted(only_contract):
        for k in sorted(only_core):
            if norm(c) == norm(k):
                pairs.append((c, k))
    if pairs and len(pairs) == len(only_contract) == len(only_core):
        return "separator", pairs
    if pairs:
        return "separator+members", pairs
    return "members", []


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

    declared = agreed = exempt = 0
    undeclared = []
    # every spelling seen, grouped by its separator-insensitive form, and where
    spelling_groups = {}
    spelling_where = {}

    for filename in files:
        doc = yaml.safe_load(open(filename, encoding="utf-8"))
        for path, node in walk(doc):
            if VOCAB not in node:
                continue
            members = node[VOCAB]
            where = f"{filename} {path}"
            if not isinstance(members, list):
                problems.append(f"{where}\n      {VOCAB} is not a list.")
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
                key = m.replace("-", "").replace("_", "").lower()
                spelling_groups.setdefault(key, set()).add(m)
                spelling_where.setdefault(m, set()).add(where)

            members = set(members)
            source = node.get(SOURCE)

            if source is None:
                undeclared.append(where)
                continue

            if str(source).lower() == "none":
                if not node.get(REASON):
                    problems.append(
                        f"{where}\n"
                        f"      {SOURCE}: none without {REASON}.\n"
                        "      An exception that does not say why is not an exception, it is a hole."
                    )
                else:
                    exempt += 1
                continue

            declared += 1
            if source not in core:
                problems.append(
                    f"{where}\n"
                    f"      {SOURCE}: {source} — no such vocabulary is exported by @arthome/core.\n"
                    f"      Exported: {', '.join(sorted(core))}"
                )
                continue

            expected = set(core[source][0])
            only_contract = members - expected
            only_core = expected - members
            if not only_contract and not only_core:
                agreed += 1
                continue

            kind, pairs = classify(only_contract, only_core)
            lines = [f"{where}  ~ {source} ({core[source][1]})"]
            if only_contract:
                lines.append(f"      contract only: {sorted(only_contract)}")
            if only_core:
                lines.append(f"      domain only  : {sorted(only_core)}")
            if kind == "separator":
                lines.append(
                    "      SHAPE: separator only — "
                    + ", ".join(f"{c} / {k}" for c, k in pairs)
                    + "\n      One wire-format decision, not one bug per member. Decide the"
                    "\n      convention once, then change whichever side loses."
                )
            elif kind == "separator+members":
                lines.append(
                    "      SHAPE: a separator difference AND a membership difference — "
                    + ", ".join(f"{c} / {k}" for c, k in pairs)
                )
            else:
                lines.append("      SHAPE: membership — a value exists on one side only.")
            problems.append("\n".join(lines))

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

    ratchet = load_ratchet()
    allowed = 0
    if ratchet:
        allowed = int(ratchet.get("undeclaredAllowed", 0))
        remove_after = ratchet.get("removeAfter")
        if not remove_after:
            problems.append(
                f"{RATCHET}\n      no `removeAfter` date. A migration allowance without a"
                "\n      deadline is a permanent exemption that does not say its name."
            )
        elif str(remove_after) < date.today().isoformat():
            problems.append(
                f"{RATCHET}\n      the allowance expired on {remove_after} "
                f"(today is {date.today().isoformat()}).\n"
                f"      {len(undeclared)} vocabulary block(s) still undeclared. Either finish the\n"
                f"      migration or re-date the allowance with a reason."
            )

        # ── The allowance must not stay loose ────────────────────────────────
        # A ratchet set above the real count is slack, and slack is a promise
        # nobody owns. This one is deliberate and temporary: five blocks are
        # unparseable today (the YAML boolean trap), so they are not counted, and
        # quoting them RAISES the count. Tightening the allowance now would turn
        # the gate red for fixing a defect, which a ratchet must never do.
        #
        # So the slack is dated rather than promised. After `rebaselineAfter`,
        # any gap between the allowance and the real count is a failure: by then
        # the count has settled and the allowance should equal it.
        slack = allowed - len(undeclared)
        rebaseline_after = ratchet.get("rebaselineAfter")
        if slack > 0:
            if not rebaseline_after:
                problems.append(
                    f"{RATCHET}\n"
                    f"      `undeclaredAllowed` is {allowed} but only {len(undeclared)} block(s) are\n"
                    f"      undeclared — {slack} unit(s) of slack, with no `rebaselineAfter` date.\n"
                    "      Slack with no deadline is an allowance that will never be tightened.\n"
                    "      Either lower it to the real count or date the slack."
                )
            elif str(rebaseline_after) < date.today().isoformat():
                problems.append(
                    f"{RATCHET}\n"
                    f"      `undeclaredAllowed` is still {allowed} but only {len(undeclared)} block(s)\n"
                    f"      are undeclared, and the re-baseline was due {rebaseline_after}\n"
                    f"      (today is {date.today().isoformat()}).\n"
                    f"      Lower `undeclaredAllowed` to {len(undeclared)}. A ratchet that keeps its\n"
                    "      slack stops being a ratchet."
                )
            else:
                notes.append(
                    f"allowance {allowed} against {len(undeclared)} undeclared — {slack} unit(s) of "
                    f"slack, to be re-baselined by {rebaseline_after}."
                )

    print(
        f"arthome-check-vocabulary: {len(core)} domain vocabularies, "
        f"{declared + exempt + len(undeclared)} contract block(s) — "
        f"{agreed} agree, {declared - agreed} disagree, {exempt} exempt, "
        f"{len(undeclared)} undeclared"
    )

    if len(undeclared) > allowed:
        problems.append(
            f"{len(undeclared)} vocabulary block(s) carry no `{SOURCE}`, allowance is {allowed}.\n"
            f"      An undeclared vocabulary is where drift hides: nothing can check it.\n"
            f"      The allowance is a RATCHET — it may go down, never up. Lower it in\n"
            f"      {RATCHET} as blocks get annotated."
        )
        for where in undeclared[:8]:
            print(f"  undeclared  {where}")
        if len(undeclared) > 8:
            print(f"  undeclared  … and {len(undeclared) - 8} more (pass --list-undeclared)")

    if "--list-undeclared" in sys.argv:
        for where in undeclared:
            print(f"  undeclared  {where}")

    for note in notes:
        print(f"  - {note}")

    if problems:
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

    print("PASS the contracts and the domain share one vocabulary")
    return 0


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    sys.exit(main(args or ["openapi/storefront.yaml", "openapi/studio.yaml"]))
