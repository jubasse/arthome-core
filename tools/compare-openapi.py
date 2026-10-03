#!/usr/bin/env python3
"""arthome-compare-openapi -- does an emitted document say what a written one says?

Both are parsed and compared as trees: key order and YAML formatting are not compared.
Every JSON Schema node -- a `schema` under a parameter, a header or a media type, and each
of `components/schemas` -- is first reduced by check-emit-diff's `normalise`, so the nine
equivalences that gate already grants (and prints) are the only ones granted here. Everything
outside a schema is compared exactly: an OpenAPI default spelled out is a difference.

The report is per unit a reader can act on: one operation, one component, one top-level key.

    python3 tools/compare-openapi.py EMITTED.json openapi/storefront.yaml [--all] [--only ID]
"""

import importlib.util
import json
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
METHODS = ("get", "put", "post", "delete", "patch", "head", "options", "trace")


def _emit_diff():
    spec = importlib.util.spec_from_file_location("check_emit_diff", ROOT / "tools/check-emit-diff.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


EMIT_DIFF = _emit_diff()
diff = EMIT_DIFF.diff
brief = EMIT_DIFF.brief


class DocumentLoader(yaml.SafeLoader):
    """YAML 1.1 without its timestamp type: OpenAPI 3.1 is JSON, where `2026-10-01` is a string."""


DocumentLoader.yaml_implicit_resolvers = {
    first: [(tag, regexp) for tag, regexp in resolvers if tag != "tag:yaml.org,2002:timestamp"]
    for first, resolvers in yaml.SafeLoader.yaml_implicit_resolvers.items()
}


def load_document(path):
    return yaml.load(Path(path).read_text(encoding="utf-8"), Loader=DocumentLoader)


def schemas_normalised(node, in_schema=False):
    """`node` with every JSON Schema inside it reduced by `normalise`."""
    if in_schema:
        return EMIT_DIFF.normalise(node)
    if isinstance(node, list):
        return [schemas_normalised(item) for item in node]
    if not isinstance(node, dict):
        return node
    return {key: schemas_normalised(value, key == "schema") for key, value in node.items()}


def units(document):
    """The document cut into the units a report names: `(label, operationId or None, tree)`."""
    found = []
    for key, value in document.items():
        if key == "paths":
            for path, item in (value or {}).items():
                for method, operation in item.items():
                    label = f"{method.upper()} {path}"
                    if method in METHODS and isinstance(operation, dict):
                        found.append((label, operation.get("operationId"), schemas_normalised(operation)))
                    else:
                        found.append((f"{path} {method}", None, schemas_normalised(operation)))
        elif key == "components":
            for kind, entries in (value or {}).items():
                for name, entry in (entries or {}).items():
                    tree = (
                        EMIT_DIFF.normalise(entry)
                        if kind == "schemas"
                        else schemas_normalised(entry)
                    )
                    found.append((f"components/{kind}/{name}", None, tree))
        else:
            found.append((key, None, value))
    return found


def compare(written, emitted):
    """`[(label, operationId, differences)]` for every unit of either document, in the written order."""
    want = {label: (oid, tree) for label, oid, tree in units(written)}
    got = {label: (oid, tree) for label, oid, tree in units(emitted)}
    results = []
    for label in list(want) + [label for label in got if label not in want]:
        oid = (want.get(label) or got.get(label))[0]
        if label not in got:
            results.append((label, oid, [("<root>", "<present>", "<absent>")]))
        elif label not in want:
            results.append((label, oid, [("<root>", "<absent>", "<present>")]))
        else:
            results.append((label, oid, diff(want[label][1], got[label][1])))
    return results


def report(results, show_all=False, limit=8):
    failing = [r for r in results if r[2]]
    for label, oid, found in failing:
        print(f"  {label}" + (f"  ({oid})" if oid else ""))
        for where, want, got in found[: None if show_all else limit]:
            print(f"    {where}")
            print(f"      document: {brief(want)}")
            print(f"      emitted : {brief(got)}")
        if len(found) > limit and not show_all:
            print(f"    ... and {len(found) - limit} more (run with --all)")
    return len(failing)


def main(argv):
    show_all = "--all" in argv
    only = argv[argv.index("--only") + 1] if "--only" in argv else None
    paths = [a for a in argv if not a.startswith("--") and a != only]
    if len(paths) != 2:
        print("usage: compare-openapi.py EMITTED.json DOCUMENT.yaml [--all] [--only ID]", file=sys.stderr)
        return 2
    emitted = json.loads(Path(paths[0]).read_text(encoding="utf-8"))
    written = load_document(paths[1])
    results = compare(written, emitted)
    if only:
        results = [r for r in results if only in (r[0], r[1])]
    failing = report(results, show_all)
    agreed = len(results) - failing
    print(f"\n{'PASS' if not failing else 'FAIL'} {agreed} of {len(results)} unit(s) agree")
    return 0 if not failing else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
