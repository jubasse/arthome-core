#!/usr/bin/env python3
"""arthome-generate-openapi -- openapi/storefront.yaml and openapi/studio.yaml, from the route declarations.

The two documents are GENERATED (D-120): every operation is declared in TypeScript in
`@arthome/contracts/storefront-api` and `/studio-api`, and `@arthome/contracts/openapi` turns
each api into its document. This tool is the YAML writer on top of that emission and the gate
that holds the committed files to it.

    python3 tools/generate-openapi.py            write both documents
    python3 tools/generate-openapi.py --check    fail when a committed document differs from what the
                                                 declarations generate (the whole document: paths,
                                                 components, top-level keys, byte for byte)

IT READS `dist/`, like every gate that consumes the built packages, so it builds first, one
invocation at a time: two builds writing packages/*/dist at once leave a half-written .d.ts.
"""

import difflib
import fcntl
import json
import subprocess
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
DOCUMENTS = ("storefront", "studio")
HEADER = (
    "# Generated from packages/contracts/src/{product}-api by tools/generate-openapi.py (D-120).\n"
    "# Edit the declarations, run `pnpm run generate:openapi`, commit both. Never edit this file.\n\n"
)


class Dumper(yaml.SafeDumper):
    """Block scalars for prose, document order kept, nothing folded."""

    def ignore_aliases(self, data):
        return True


def _string(dumper, value):
    if "\n" in value and not any(line != line.rstrip() for line in value.split("\n")) and "\t" not in value:
        return dumper.represent_scalar("tag:yaml.org,2002:str", value, style="|")
    return dumper.represent_scalar("tag:yaml.org,2002:str", value)


Dumper.add_representer(str, _string)


def render(document, product):
    body = yaml.dump(
        document,
        Dumper=Dumper,
        sort_keys=False,
        allow_unicode=True,
        default_flow_style=False,
        width=2**31 - 1,
    )
    return HEADER.format(product=product) + body


def build():
    lock = ROOT / "node_modules" / ".arthome-build.lock"
    lock.parent.mkdir(exist_ok=True)
    with open(lock, "w") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        run = subprocess.run(["pnpm", "-r", "run", "build"], cwd=ROOT, capture_output=True, text=True)
    if run.returncode != 0:
        print("the packages do not build.\n" + (run.stdout + run.stderr).strip()[:2000], file=sys.stderr)
        return False
    return True


def generated(product):
    run = subprocess.run(
        ["node", "tools/emit-openapi.mjs", f"packages/contracts/dist/{product}-api/index.js"],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if run.returncode != 0:
        print(f"{product}: the api did not emit\n{run.stderr.strip()[:2000]}", file=sys.stderr)
        return None
    return render(json.loads(run.stdout), product)


def main(argv):
    check = "--check" in argv
    if not build():
        return 1
    failed = 0
    for product in DOCUMENTS:
        text = generated(product)
        if text is None:
            return 1
        path = ROOT / "openapi" / f"{product}.yaml"
        if not check:
            path.write_text(text, encoding="utf-8")
            print(f"wrote openapi/{product}.yaml ({text.count(chr(10))} lines)")
            continue
        committed = path.read_text(encoding="utf-8")
        if committed == text:
            print(f"PASS openapi/{product}.yaml is what the declarations generate")
            continue
        failed += 1
        diff = list(
            difflib.unified_diff(
                committed.splitlines(), text.splitlines(), f"openapi/{product}.yaml (committed)", "generated", lineterm="", n=1
            )
        )
        print(f"FAIL openapi/{product}.yaml differs from what the declarations generate ({len(diff)} diff lines):")
        print("\n".join(diff[:40]))
        if len(diff) > 40:
            print(f"  ... and {len(diff) - 40} more")
    if failed:
        print("\nEdit the declarations in packages/contracts, then `pnpm run generate:openapi` and commit both.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
