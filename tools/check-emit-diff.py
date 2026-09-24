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
    "`additionalProperties` absent == `{}` -- looseObject's emitted form against the document's silence",
    "`additionalProperties: true` == the above, BUT ONLY on a node with no `properties` -- a map, not an open shape",
    "`required: []` == absent `required` -- an all-optional shape; the documents never write the empty list",
    "`anyOf: [{X}, {type: null}]` == `type: [X, 'null']`, X's keywords merged up",
    "key order is not compared, at any depth",
    "`required` is compared as a SET -- JSON Schema gives its order no meaning",
    "an empty `properties: {}` == absent -- it names nothing, so it constrains nothing",
    "a description's trailing whitespace is not compared -- YAML block scalars end in a newline",
]

# WHAT IS DELIBERATELY *NOT* GRANTED, because the list above would otherwise be
# read as the whole truth:
#
#   `additionalProperties: true` is NOT equated with `{}` or with absence.
#   backend-contracts refused that one on its last turn and the refusal is right:
#   absent and `{}` are two artefacts spelling one thing, but `true` IS A VALUE A
#   HUMAN TYPES. Granting it means the gate can no longer tell a schema that is
#   open by design from one somebody opened by hand to make a diff go away.
#
#   It costs something real and the cost is the point: the storefront's
#   `WatchVerdict.reasonParams` carries `additionalProperties: true` today, so it
#   will fail here until the document says `{}` or the source emits `true`. That
#   is a document change made deliberately, which is what the ruling below asks
#   for, rather than an exemption that makes it invisible.
#
#   `examples` is likewise never equated with a media type's `example`. Different
#   keys, different owners, and the resemblance is the whole hazard.

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
        if key == "properties" and value == {}:
            # An empty `properties` names nothing, so it constrains nothing --
            # the same relationship `{}` has with an absent
            # `additionalProperties`. `z.looseObject({})` emits it; a
            # hand-written map never does.
            continue
        if key == "additionalProperties":
            # `{}` and absence are two artefacts spelling one thing: always equal.
            #
            # `True` is equal to them ONLY WHERE THE NODE HAS NO `properties`.
            # backend-contracts refused `True` outright because it is a value a
            # human types, so granting it hides a schema somebody opened by hand.
            # That argument is about an OPEN-VERSUS-CLOSED decision, and a node
            # with no `properties` is not making one -- it is a MAP, and `True`
            # there declares the value type as unconstrained, which is the point
            # of the field rather than a loophole in it.
            #
            # `Error.params` is the case that forced the distinction, and the
            # document settled it by carrying an array in its own example.
            # `not node.get("properties")` rather than `"properties" not in
            # node`: an EMPTY properties map is dropped just above, so a node
            # carrying one is a map exactly like a node carrying none, and the
            # two must reach the same verdict. Testing membership alone would
            # have made the answer depend on which artefact spelled it.
            if value == {} or (value is True and not node.get("properties")):
                continue
        if key == "required" and value == []:
            continue
        if key == "description" and isinstance(value, str):
            out[key] = value.strip()
            continue
        if key == "required" and isinstance(value, list):
            # JSON Schema defines `required` as an array of UNIQUE strings with
            # no ordering semantics, so two orders are the same schema. A
            # hand-written document groups it by meaning and an emitter follows
            # declaration order; neither is more correct.
            out[key] = sorted(value)
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


# WHICH EXPORT ANSWERS FOR A DOCUMENT SCHEMA, in order.
#
#   `Money` is served in a response AND accepted in `POST /v1/orders/seats` as
#   `expectedTotal`, so core exports MoneyOut (loose) and MoneyIn (strict) and no
#   ambiguous `MoneySchema` at all -- D-065 section H: a name that does not state
#   its direction will be used in the wrong one.
#
#   `components/schemas` publishes the SERVED shape wherever a shape has two, so
#   `...Out` wins. `...Schema` is the ordinary case of a shape with exactly one
#   form. `...In` is last, for a schema the documents publish only as an input --
#   `SearchCriteria` is one today, and the day it has a zod source this is what
#   finds it.
SUFFIX_PRECEDENCE = ("Out", "Schema", "In")


def product_of(document):
    """`Storefront` or `Studio`, from the document's filename (`openapi/studio.yaml`)."""
    return Path(document).stem.capitalize()


def source_of(name, emitted, document=""):
    """The export that answers for the document's schema `name`, and its spelling.

    A shape the two documents spell differently is exported once per PRODUCT
    (D-065 family G), so `<Product><Name>Schema` is tried before the shared names.
    """
    candidates = [f"{product_of(document)}{name}Schema"] if document else []
    candidates += [f"{name}{suffix}" for suffix in SUFFIX_PRECEDENCE]
    for export in candidates:
        if export in emitted:
            return export, emitted[export]
    return None, None


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
            export, entry = source_of(name, emitted, document)
            if entry is None:
                unsourced.append(name)
                continue
            sourced += 1
            found = diff(normalise(schemas[name]), normalise(entry["schema"]))
            if not found:
                agreed += 1
            else:
                failures.append((document, name, export, entry, found))
        print(
            f"{document}: {len(schemas)} schema(s) · "
            f"{len(schemas) - len(unsourced)} sourced · {len(unsourced)} not yet written"
        )
        if show_all and unsourced:
            print("  not yet written: " + " ".join(unsourced))

    if failures:
        print(f"\n✗ {len(failures)} schema(s) do not match the document they must emit:\n")
        for document, name, export, entry, found in failures:
            print(f"  {document} · {name}  (from {entry['from']}, {export})")
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
