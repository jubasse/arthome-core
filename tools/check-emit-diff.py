#!/usr/bin/env python3
"""arthome-check-emit-diff — does what @arthome/* emits say what the contracts say?

THE SCOPE IS `components/schemas`, AND IT IS A RULING RATHER THAN A SHORTCUT (D-058).
`paths` is 65-71 % of each document and has no zod source. Emitting it would assert
that a generator reproduces prose a human wrote, which is not a property anyone
needs true -- and it would turn the two readable documents into build output, which
is the artefact every finding this week came from.

THE COMPARISON RUNS FROM THE DOCUMENT TO THE CODE.
The document is authoritative. So this gate indexes by the document's schema names
and asks the code for each one. A schema with no source yet is COVERAGE, reported as
a number, not a failure -- the migration is partial by design and a gate that failed
on partial progress would simply be switched off.

IT COMPARES TREES, NOT TEXT (D-060 section 4). Key order, block style and quoting are a
normaliser's problem, and the normaliser is below. Every equivalence it grants is
listed in EQUIVALENCES and printed on request, because an equivalence nobody can see
is an exemption nobody audits.

IT NEEDS `^build` UPSTREAM. It reads `dist/`, for the reason check-tsconfig reads
`tsc --showConfig`: what a consumer gets is the built package. Run against a stale
build it compares the wrong thing and says PASS.
"""

import json
import subprocess
import sys
from pathlib import Path

import yaml

EQUIVALENCES = [
    "`$schema` and `$id` are stripped -- emitter bookkeeping, not contract",
    "`additionalProperties` absent == `{}` == `true` -- three spellings of 'open'",
    "`anyOf: [{X}, {type: null}]` == `type: [X, 'null']`, X's keywords merged up",
    "key order is not compared",
    "a description's trailing whitespace is not compared -- YAML block scalars end in a newline",
]

ROOT = Path(__file__).resolve().parent.parent


def normalise(node):
    """Reduce a JSON Schema node to the form both sides can be compared in."""
    if isinstance(node, list):
        return [normalise(v) for v in node]
    if not isinstance(node, dict):
        return node

    out = {}
    for key, value in node.items():
        if key in ("$schema", "$id"):
            continue
        if key == "additionalProperties" and value in ({}, True):
            continue
        if key == "description" and isinstance(value, str):
            out[key] = value.strip()
            continue
        out[key] = normalise(value)

    # anyOf: [{X}, {type: null}]  ->  type: [X.type, 'null'] with X merged up.
    any_of = out.get("anyOf")
    if (
        isinstance(any_of, list)
        and len(any_of) == 2
        and isinstance(any_of[0], dict)
        and any_of[1] == {"type": "null"}
        and isinstance(any_of[0].get("type"), str)
    ):
        inner = dict(any_of[0])
        inner_type = inner.pop("type")
        del out["anyOf"]
        merged = {"type": [inner_type, "null"]}
        merged.update(inner)
        merged.update(out)
        merged["type"] = [inner_type, "null"]
        out = merged

    if isinstance(out.get("type"), list):
        out["type"] = sorted(out["type"])
    return out


def diff(want, got, path=""):
    """Every place the two trees disagree, deepest first, as (path, want, got)."""
    if isinstance(want, dict) and isinstance(got, dict):
        found = []
        for key in sorted(set(want) | set(got)):
            here = f"{path}.{key}" if path else key
            if key not in got:
                found.append((here, want[key], "<absent>"))
            elif key not in want:
                found.append((here, "<absent>", got[key]))
            else:
                found += diff(want[key], got[key], here)
        return found
    if isinstance(want, list) and isinstance(got, list) and len(want) == len(got):
        found = []
        for i, (a, b) in enumerate(zip(want, got)):
            found += diff(a, b, f"{path}[{i}]")
        return found
    return [] if want == got else [(path or "<root>", want, got)]


def brief(value, width=72):
    text = json.dumps(value, ensure_ascii=False, sort_keys=True)
    return text if len(text) <= width else text[: width - 1] + "…"


def main(argv):
    show_all = "--all" in argv
    documents = [a for a in argv if not a.startswith("--")]
    if not documents:
        print("usage: check-emit-diff.py openapi/*.yaml [--all]", file=sys.stderr)
        return 2

    run = subprocess.run(
        ["node", "tools/emit-contracts.mjs"], cwd=ROOT, capture_output=True, text=True
    )
    if run.returncode != 0:
        print("✗ the emitter failed. Build the packages first.\n", file=sys.stderr)
        print(run.stderr.strip()[:2000], file=sys.stderr)
        return 1
    payload = json.loads(run.stdout)
    emitted, problems = payload["emitted"], payload["problems"]

    if problems:
        print("✗ the emitter reported a problem with the packages themselves:\n")
        for p in problems:
            print(f"  {p}")
        return 1

    total = sourced = agreed = 0
    failures = []
    for document in documents:
        schemas = yaml.safe_load(Path(document).read_text(encoding="utf-8"))["components"]["schemas"]
        unsourced = []
        for name in sorted(schemas):
            total += 1
            entry = emitted.get(name)
            if entry is None:
                unsourced.append(name)
                continue
            sourced += 1
            found = diff(normalise(schemas[name]), normalise(entry["schema"]))
            if not found:
                agreed += 1
            else:
                failures.append((document, name, entry, found))
        print(
            f"{document}: {len(schemas)} schema(s) · "
            f"{len(schemas) - len(unsourced)} sourced · {len(unsourced)} not yet written"
        )
        if show_all and unsourced:
            print("  not yet written: " + " ".join(unsourced))

    if failures:
        print(f"\n✗ {len(failures)} schema(s) do not match the document they must emit:\n")
        for document, name, entry, found in failures:
            print(f"  {document} · {name}  (from {entry['from']}, {entry['export']})")
            for where, want, got in found[: 40 if show_all else 8]:
                print(f"    {where}")
                print(f"      document: {brief(want)}")
                print(f"      emitted : {brief(got)}")
            if len(found) > 8 and not show_all:
                print(f"    … and {len(found) - 8} more (run with --all)")
            print()
        print("  The document is authoritative (D-058). A difference is a defect in the")
        print("  schema, OR a defect in the document that must be fixed in the document")
        print("  first and recorded -- never absorbed by an exception here.")
        return 1

    print(f"\n✓ {agreed} of {sourced} sourced schema(s) agree, out of {total} in the contracts")
    print(f"  (scope: components/schemas only — `paths` is hand-written, D-058)")
    print(f"  {len(EQUIVALENCES)} equivalence(s) granted by the normaliser:")
    for e in EQUIVALENCES:
        print(f"    · {e}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
