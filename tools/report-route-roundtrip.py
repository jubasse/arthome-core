#!/usr/bin/env python3
"""arthome-report-route-roundtrip -- how many operations survive YAML -> TypeScript -> OpenAPI unaided.

A REPORT, NOT A GATE: it exits 0 whatever it measures, and `verify` does not run it. It
measures the converter while the documents are still written by hand (D-058); the gate that
covers the whole document comes with the switch, once every route is declared.

For each document it converts every operation into `packages/contracts/.route-roundtrip/`
(ignored), compiles the declarations with the published packages' own compiler options,
emits the api through `@arthome/contracts/openapi`, and compares it with the written document
through `compare-openapi.py`. An operation ROUND-TRIPS when all three hold: it converted, its
declaration compiles, and its emitted operation is the written one.

It then writes the same declarations where the package's own would sit, `src/roundtrip-*-api/`,
runs ESLint and `check-enums` over them, and deletes them: an operation is READY TO COMMIT when it
round-trips and neither gate has anything to say about it.

    python3 tools/report-route-roundtrip.py openapi/storefront.yaml openapi/studio.yaml [--verbose]
"""

import importlib.util
import json
import re
import shutil
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACKAGE = ROOT / "packages/contracts"
SCRATCH = PACKAGE / ".route-roundtrip"
TSCONFIG = {
    "extends": "@arthome/tooling/tsconfig/lib.json",
    "compilerOptions": {
        "rootDir": "src",
        "outDir": "dist",
        "declarationMap": False,
        "sourceMap": False,
        # The published declarations, not the sources: what a consumer compiles against.
        "customConditions": [],
    },
    "include": ["src/**/*.ts"],
}
GATED_PREFIX = "roundtrip-"
ERROR = re.compile(r"^(?P<file>[^(\n]+)\((?P<line>\d+),\d+\): error (?P<code>TS\d+): (?P<message>.*)$", re.M)


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / "tools" / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


COMPARE = load("compare_openapi", "compare-openapi.py")
CONVERT = load("convert_openapi_routes", "convert-openapi-routes.py")


def run(argv, cwd=ROOT):
    return subprocess.run(argv, cwd=cwd, capture_output=True, text=True)


def route_lines(source_dir):
    """`{(file, line): operationId}` for every line of every declared route."""
    owner = {}
    for file in sorted(source_dir.rglob("*.ts")):
        current = None
        for number, line in enumerate(file.read_text(encoding="utf-8").splitlines(), 1):
            match = re.match(r"export const (\w+): Route<", line)
            if match:
                current = match.group(1)
            elif line.startswith("export const "):
                current = None
            if current:
                owner[(file.resolve(), number)] = current
    return owner


KIND_BY_KEY = {
    "tags": "a tag",
    "tag name": "a tag",
    "name": "a parameter name",
    "in": "an OpenAPI keyword",
    "x-arthome-upstream": "an extension value",
    "scheme": "an OpenAPI keyword",
    "description": "a server description",
}


def enclosing_key(lines, index, file_name):
    """The property a literal on `lines[index]` is the value of, or sits in the list of."""
    for number in range(index, -1, -1):
        match = re.match(r"\s*['\"]?([\w$-]+)['\"]?:", lines[number])
        if match:
            key = match[1]
            if key == "name" and file_name == "index.ts":
                return "tag name"
            return key
    return ""


def gate_findings(documents):
    """`{operationId: [finding]}` from ESLint and check-enums, over declarations written in `src/`."""
    directories = []
    findings = defaultdict(list)
    try:
        for document in documents:
            directory = f"{GATED_PREFIX}{Path(document).stem}-api"
            CONVERT.Converter(document, "relative").convert(PACKAGE / "src", directory=directory)
            directories.append((PACKAGE / "src" / directory).resolve())
        owners = {}
        for directory in directories:
            owners.update(route_lines(directory))

        def owner_of(file, line):
            return owners.get((file, line), f"<{file.parent.name}/{file.name}>")

        lint = run(["pnpm", "exec", "eslint", "-f", "json", *map(str, directories)])
        for report in json.loads(lint.stdout or "[]"):
            for message in report["messages"]:
                file = Path(report["filePath"]).resolve()
                findings[owner_of(file, message.get("line", 0))].append(f"lint: {message.get('ruleId')}")
        enums = run(["pnpm", "exec", "arthome-check-enums"])
        for match in re.finditer(r"^  (\S+):(\d+)  '([^']*)'", enums.stdout + enums.stderr, re.M):
            file = (ROOT / match[1]).resolve()
            if not any(directory in file.parents for directory in directories):
                continue
            lines = file.read_text(encoding="utf-8").splitlines()
            where = KIND_BY_KEY.get(enclosing_key(lines, int(match[2]) - 1, file.name), "an example value")
            findings[owner_of(file, int(match[2]))].append(f"check-enums: {where} '{match[3]}'")
    finally:
        for directory in directories:
            shutil.rmtree(directory, ignore_errors=True)
    return findings


def category_of_difference(where, want, got):
    """A short name for one difference, so the summary can count them by kind."""
    last = re.sub(r"\[\d+\]", "", where).rsplit(".", 1)[-1]
    if want == "<absent>":
        return f"emitted a `{last}` the document does not write"
    if got == "<absent>":
        return f"document writes a `{last}` the emission leaves out"
    if isinstance(want, list) and isinstance(got, list) and sorted(map(json.dumps, want)) == sorted(map(json.dumps, got)):
        return f"`{last}` in another order"
    return f"`{last}` differs"


def main(argv):
    verbose = "--verbose" in argv
    documents = [a for a in argv if a.endswith((".yaml", ".yml"))] or [
        "openapi/storefront.yaml",
        "openapi/studio.yaml",
    ]
    build = run(["pnpm", "-r", "run", "build"])
    if build.returncode != 0:
        print("the packages do not build:\n" + (build.stdout + build.stderr)[-2000:])
        return 0

    shutil.rmtree(SCRATCH, ignore_errors=True)
    (SCRATCH / "src").mkdir(parents=True)
    (SCRATCH / "tsconfig.json").write_text(json.dumps(TSCONFIG, indent=2) + "\n", encoding="utf-8")

    conversions = {}
    notes = Counter()
    for document in documents:
        converter = CONVERT.Converter(document, "package")
        conversions[document] = converter.convert(SCRATCH / "src")
        notes.update({f"metadata only: {k}": v for k, v in converter.metadata_only.items()})
        notes.update({f"vocabulary: {k}": v for k, v in converter.vocabulary_notes.items()})

    compiled = run(["pnpm", "exec", "tsc", "-p", ".route-roundtrip/tsconfig.json"], cwd=PACKAGE)
    owners = route_lines(SCRATCH / "src")
    compile_errors = defaultdict(list)
    for match in ERROR.finditer(compiled.stdout + compiled.stderr):
        file = (PACKAGE / match["file"]).resolve()
        owner = owners.get((file, int(match["line"])), f"<{file.name}>")
        compile_errors[owner].append(f"{match['code']} {match['message'][:160]}")

    gates = gate_findings(documents)

    total = passed = ready = 0
    failures = Counter()
    gate_failures = Counter()
    by_group = defaultdict(lambda: [0, 0, 0])
    other_units = []
    for document in documents:
        written = COMPARE.load_document(document)
        product = Path(document).stem
        emitted_run = run(["node", "tools/emit-openapi.mjs", str(SCRATCH / f"dist/{product}-api/index.js")])
        if emitted_run.returncode != 0:
            print(f"{document}: the api did not load\n{emitted_run.stderr[:2000]}")
            continue
        emitted = json.loads(emitted_run.stdout)
        results = {label: (oid, found) for label, oid, found in COMPARE.compare(written, emitted)}
        group_of = {
            op["operationId"]: (op.get("tags") or ["untagged"])[0]
            for item in written["paths"].values()
            for method, op in item.items()
            if method in CONVERT.METHODS
        }
        print(f"\n{document}")
        for label, (oid, found) in results.items():
            if oid is None:
                if found:
                    other_units.append((document, label, found))
                continue
            total += 1
            reasons = []
            not_converted = conversions[document].get(oid)
            if not_converted:
                reasons.append(f"not converted: {not_converted}")
                failures[f"not converted: {re.sub(r'^[^:]*: ', '', not_converted)}"] += 1
            if compile_errors.get(oid):
                reasons += [f"compile: {e}" for e in compile_errors[oid]]
                for code in sorted({e.split(' ', 1)[0] for e in compile_errors[oid]}):
                    failures[f"does not compile: {code}"] += 1
            if found and not not_converted:
                reasons += [f"{w}: document {COMPARE.brief(a, 60)} / emitted {COMPARE.brief(b, 60)}" for w, a, b in found]
                for kind in sorted({category_of_difference(*d) for d in found}):
                    failures[kind] += 1
            group = f"{product}/{group_of.get(oid, '?')}"
            by_group[group][2] += 1
            for finding in sorted(set(gates.get(oid, []))):
                gate_failures[finding] += 1
            if not reasons and not gates.get(oid):
                ready += 1
                by_group[group][1] += 1
            if not reasons:
                passed += 1
                by_group[group][0] += 1
                if verbose:
                    print(f"  PASS {label} ({oid})")
            else:
                print(f"  FAIL {label} ({oid})")
                for reason in reasons[: None if verbose else 4]:
                    print(f"    {reason}")

    print("\nFailure categories (an operation counts once per category it shows):")
    for kind, count in failures.most_common():
        print(f"  {count:4d}  {kind}")
    print("\nGate findings on round-tripping declarations (an operation counts once per kind):")
    for kind, count in gate_failures.most_common():
        print(f"  {count:4d}  {kind}")
    document_level = {k: v for k, v in gates.items() if k.startswith("<")}
    for owner, found in sorted(document_level.items()):
        print(f"  outside a route, {owner}: " + ", ".join(f"{n} x {k}" for k, n in Counter(found).items()))
    print("\nBy group (round-trip / ready to commit / operations):")
    for group, (ok, clean, count) in sorted(by_group.items()):
        print(f"  {group:28s} {ok:3d} / {clean:3d} / {count}")
    if other_units:
        print("\nComponents and top-level keys that differ:")
        for document, label, found in other_units:
            print(f"  {document} {label}: {len(found)} difference(s), first at {found[0][0]}")
    unattributed = {k: v for k, v in compile_errors.items() if k.startswith("<")}
    for owner, errors in unattributed.items():
        print(f"\nCompile errors outside a route, in {owner}: {len(errors)}, first: {errors[0]}")
    if notes:
        print("\nConverter notes:")
        for note, count in sorted(notes.items()):
            print(f"  {count:4d}  {note}")
    print(f"\nROUND-TRIP {passed} of {total} operation(s), unaided; {ready} of them also clear lint and check-enums.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
