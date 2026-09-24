#!/usr/bin/env python3
"""OpenAPI 3.1 conformance checker — Arthome rules.
Usage: python3 check-openapi.py openapi/*.yaml
No dependency beyond PyYAML. Everything is verified locally."""
import os
import re
import sys, re, yaml

counts = {}

HTTP = {"get","put","post","delete","patch","head","options","trace"}
ERRS = []

def err(doc, msg): ERRS.append(f"{doc}: {msg}")

def walk(node, path=""):
    if isinstance(node, dict):
        yield path, node
        for k, v in node.items():
            yield from walk(v, f"{path}/{k}")
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from walk(v, f"{path}/{i}")

class _DuplicateKeyLoader(yaml.SafeLoader):
    """A loader that REMEMBERS the keys `yaml.safe_load` silently overwrites."""


def _remember_duplicates(loader, node, deep=False):
    seen = {}
    for key_node, _value in node.value:
        key = loader.construct_object(key_node, deep=True)
        if key in seen:
            _DUPLICATES.append((key, key_node.start_mark.line + 1, seen[key]))
        seen[key] = key_node.start_mark.line + 1
    return yaml.SafeLoader.construct_mapping(loader, node, deep)


_DuplicateKeyLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _remember_duplicates
)
_DUPLICATES = []


def _known_upstreams():
    """`UPSTREAMS` from @arthome/core, resolved through the constants it spreads.

    Read from the SOURCE rather than the build, for the same reason
    arthome-check-enums does: the gate must work before anything is built. It
    returns an empty set when the package is absent, and R22 then declines to
    run rather than passing everything.
    """
    root = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "packages/core/src")
    if not os.path.isdir(root):
        return set()
    consts = {}
    decl = re.compile(r"export const ([A-Z][A-Z0-9_]*) = \[([\s\S]*?)\] as const;")
    for dirpath, _dirs, files in os.walk(root):
        for name in files:
            if not name.endswith(".ts") or name.endswith(".d.ts") or ".spec." in name:
                continue
            with open(os.path.join(dirpath, name), encoding="utf-8") as handle:
                src = handle.read()
            for m in decl.finditer(src):
                consts[m.group(1)] = m.group(2)
    body = consts.get("UPSTREAMS")
    if body is None:
        return set()
    out = set(re.findall(r"'([^']*)'", body))
    for spread in re.findall(r"\.\.\.([A-Z][A-Z0-9_]*)", body):
        out |= set(re.findall(r"'([^']*)'", consts.get(spread, "")))
    return out


def check(fn):
    # R21 — NO DUPLICATE KEY, because YAML resolves one by DESTROYING the other.
    #
    #   `yaml.safe_load` keeps the last and discards the first without a word, so
    #   a document can carry a sentence nobody will ever read and every gate
    #   stays green. Found in `JournalEntry.nature`, where a specific reason —
    #   that renaming the `money` member would falsify two domain documents — was
    #   written first and destroyed by generic boilerplate two lines later. The
    #   loss ran in the worse direction: the argued text lost to the template.
    #
    #   It is R21 rather than a linter setting because it is a CONTENT loss, not
    #   a style one, and because this gate is the thing that reads these two
    #   files. Prettier formats YAML and says nothing about it.
    _DUPLICATES.clear()
    with open(fn, encoding="utf-8") as handle:
        yaml.load(handle, _DuplicateKeyLoader)
    for key, line, first in _DUPLICATES:
        err(
            fn,
            f"R21 duplicate key `{key}` at line {line} — already set at line {first}. "
            "YAML keeps the last and DISCARDS the first, silently.",
        )

    d = yaml.safe_load(open(fn, encoding="utf-8"))

    # R22 — every `x-arthome-upstream` names a KNOWN upstream.
    #
    #   174 operations declare one. It is what makes fan-out countable — how many
    #   services a request touches, and therefore what one slow service costs —
    #   and nothing had ever compared those names to anything. backend-contracts
    #   found three operations declaring services they never call, two of them
    #   its own, BY READING. A claim that only a reader can check is a claim that
    #   goes unchecked.
    #
    #   The list comes from @arthome/core, discovered the way check-vocabulary
    #   discovers a vocabulary, so the seven service names live in exactly one
    #   place. This gate cannot tell whether an operation REALLY calls what it
    #   declares — only a service can — and it says so rather than implying more.
    known = _known_upstreams()
    if known:
        for path, node in walk(d, "$"):
            up = node.get("x-arthome-upstream")
            if up is None:
                continue
            for name in up if isinstance(up, list) else [up]:
                if name not in known:
                    err(
                        fn,
                        f"R22 x-arthome-upstream: {name!r} is not a known upstream — {path}. "
                        f"Known: {', '.join(sorted(known))}. Declare it in UPSTREAMS "
                        "(@arthome/core) or correct the operation.",
                    )

    # R1 — OpenAPI 3.1
    if not str(d.get("openapi","")).startswith("3.1"):
        err(fn, f"R1 openapi must be 3.1.x, found {d.get('openapi')}")

    # R2 — no `nullable` (dropped in 3.1), no boolean `exclusiveMinimum`
    for p, n in walk(d.get("components",{}).get("schemas",{}), "components/schemas"):
        if "nullable" in n:
            err(fn, f"R2 `nullable` forbidden in 3.1 → type: [T,'null'] — {p}")
        if "exclusiveMinimum" in n and isinstance(n["exclusiveMinimum"], bool):
            err(fn, f"R2 exclusiveMinimum is a number in 2020-12 — {p}")

    # R3 — every $ref resolves
    refs = set()
    for p, n in walk(d):
        r = n.get("$ref") if isinstance(n, dict) else None
        if isinstance(r, str): refs.add((p, r))
    for p, r in refs:
        if not r.startswith("#/"):
            err(fn, f"R3 external $ref forbidden: {r} ({p})"); continue
        cur = d
        for seg in r[2:].split("/"):
            seg = seg.replace("~1","/").replace("~0","~")
            if not isinstance(cur, dict) or seg not in cur:
                err(fn, f"R3 unresolved $ref: {r} ({p})"); cur=None; break
            cur = cur[seg]

    ops = [(pp, m, o) for pp, pi in d.get("paths",{}).items()
           for m, o in (pi or {}).items() if m in HTTP]

    ids = {}
    for pp, m, o in ops:
        oid = o.get("operationId")
        # R4 — operationId present, lowerCamelCase, unique
        if not oid:
            err(fn, f"R4 missing operationId — {m.upper()} {pp}"); continue
        if not re.fullmatch(r"[a-z][A-Za-z0-9]*", oid):
            err(fn, f"R4 operationId must be lowerCamelCase: {oid}")
        if oid in ids:
            err(fn, f"R4 duplicate operationId: {oid} ({ids[oid]} and {m.upper()} {pp})")
        ids[oid] = f"{m.upper()} {pp}"

        # R5 — summary and description are mandatory
        if not o.get("summary"): err(fn, f"R5 missing summary — {oid}")
        if not o.get("description"): err(fn, f"R5 missing description — {oid}")

        # R6 — maturity declared
        mat = o.get("x-arthome-maturity")
        if mat not in ("stable","provisional"):
            err(fn, f"R6 x-arthome-maturity missing or invalid — {oid}")

        # R7 — upstream service declared
        if not o.get("x-arthome-upstream"):
            err(fn, f"R7 x-arthome-upstream missing — {oid}")

        # R8 — example on every request with a body
        rb = o.get("requestBody")
        if rb:
            for ct, media in rb.get("content",{}).items():
                if "example" not in media and "examples" not in media:
                    err(fn, f"R8 missing example on the request — {oid} ({ct})")

        resp = o.get("responses",{})
        # R9 — at least one 2xx response, with an example
        success = [c for c in resp if str(c).startswith("2")]
        if not success:
            err(fn, f"R9 no 2xx response — {oid}")
        for c in success:
            for ct, media in (resp[c].get("content") or {}).items():
                if "example" not in media and "examples" not in media:
                    err(fn, f"R9 missing example on response {c} — {oid} ({ct})")

        # R10 — shared error envelope on every 4xx/5xx response
        for c, r in resp.items():
            if str(c)[0] in "45":
                if "$ref" in r:
                    if not r["$ref"].startswith("#/components/responses/"):
                        err(fn, f"R10 error response is not shared — {oid} {c}")
                    continue
                for ct, media in (r.get("content") or {}).items():
                    s = media.get("schema",{})
                    if s.get("$ref") != "#/components/schemas/ErrorEnvelope":
                        err(fn, f"R10 response {c} does not use ErrorEnvelope — {oid}")

        # R11 — every committing write carries Idempotency-Key
        params = o.get("parameters",[]) or []
        has_idem = any(pa.get("$ref","").endswith("/IdempotencyKey") or pa.get("name")=="Idempotency-Key"
                       for pa in params)
        # The exemption is read FROM THE DOCUMENT, not from a list kept here.
        #
        # The first version carried a hardcoded `SAFE_WRITE` — that is, a parallel
        # literal table of the contract, kept inside the very tool that exists to
        # forbid parallel literal tables. E2 in its own gate. It failed the way
        # such a table always fails: the contract gained two operations
        # (`signIn`, `signInStudio`) and the list did not know it.
        #
        # An exempted operation therefore carries `x-arthome-idempotency-exemption`
        # with its reason in plain words — the reason being the useful part, since
        # it is what gets reread. Two families, both legitimate:
        #
        #   · a loss-tolerant write, or one with no cumulative effect, where the key
        #     would cost more than it protects (playback position, health sample,
        #     quota-bounded reaction, quote);
        #   · a session opening, and the reason is serious: the idempotency regime
        #     replays the original response VERBATIM, so on a `signIn` it would
        #     return a token without having verified the credentials.
        #     A replayed key would become a session bearer.
        exempt = o.get("x-arthome-idempotency-exemption")
        if m in ("post","put","patch","delete") and not exempt and not has_idem:
            err(fn, f"R11 Idempotency-Key missing on a write — {oid}")
        if exempt and has_idem:
            err(fn, f"R11 exemption declared AND Idempotency-Key present — {oid}")
        if exempt and not str(exempt).strip():
            err(fn, f"R11 exemption without a reason — {oid}")

        # R12 — traceparent propagated everywhere
        if not any(pa.get("$ref","").endswith("/Traceparent") or pa.get("name")=="traceparent"
                   for pa in params):
            err(fn, f"R12 traceparent missing — {oid}")

    # R13 — no interface sentence: no field named `label`, `message`, `title` as a bare
    #        string, outside LocalizedText (authored content, assumed)
    for p, n in walk(d.get("components",{}).get("schemas",{}), "components/schemas"):
        if not isinstance(n, dict): continue
        props = n.get("properties")
        if not isinstance(props, dict): continue
        for name, sch in props.items():
            if name in ("labelFr","labelEn","messageFr","messageEn"):
                err(fn, f"R13 i18n leak in the data: {p}/{name}")

    # R14 — no frozen `enum` in a schema REACHABLE FROM A RESPONSE.
    #
    # Two successive corrections. The original version only fired when `enum` AND
    # `x-arthome-vocabulary` were present together: a bare `enum` slipped through,
    # and that is what `storefront-tv` found by hand on `Error.nature` — `required`
    # in `Error`, itself `required` in `ErrorEnvelope`, hence in the body of EVERY
    # error. A fourth nature would have made a fleet we cannot update reject the
    # whole envelope, at the exact moment something is already wrong.
    #
    # The first hardening attempt — "every `enum` under components/schemas" — cried
    # wolf on `SearchCriteria`, which is only referenced `in: query`. An INPUT
    # vocabulary is legitimately closed: the server must refuse what it does not
    # know. A gate that cries wolf gets switched off, so the right criterion is
    # reachability.
    schemas = d.get("components", {}).get("schemas", {})

    def refs_of(node):
        out = []
        if isinstance(node, dict):
            r = node.get("$ref")
            if isinstance(r, str) and r.startswith("#/components/schemas/"):
                out.append(r.rsplit("/", 1)[1])
            for v in node.values():
                out += refs_of(v)
        elif isinstance(node, list):
            for v in node:
                out += refs_of(v)
        return out

    reachable, queue = set(), []
    for _pp, _m, o in ops:
        for _code, r in (o.get("responses") or {}).items():
            for _ct, media in ((r or {}).get("content") or {}).items():
                queue += refs_of(media.get("schema"))
    while queue:
        name = queue.pop()
        if name in reachable or name not in schemas:
            continue
        reachable.add(name)
        queue += refs_of(schemas[name])

    for name in sorted(reachable):
        for sp, n in walk(schemas[name], f"components/schemas/{name}"):
            if isinstance(n, dict) and "enum" in n:
                hint = ("" if "x-arthome-vocabulary" in n
                        else " (add x-arthome-vocabulary and x-arthome-unknown-fallback)")
                err(fn, f"R14 frozen enum in a schema served in a response{hint} — {sp}")

    # R15 — every root response schema carries servedAt (through EnvelopeMeta)
    for pp, m, o in ops:
        oid = o.get("operationId","?")
        for c, r in (o.get("responses") or {}).items():
            if not str(c).startswith("2"): continue
            for ct, media in (r.get("content") or {}).items():
                s = media.get("schema")
                if not isinstance(s, dict): continue
                allof = s.get("allOf")
                ok = False
                if isinstance(allof, list):
                    ok = any(isinstance(x, dict) and x.get("$ref","").endswith("/EnvelopeMeta") for x in allof)
                if not ok:
                    err(fn, f"R15 response {c} without EnvelopeMeta (hence without servedAt) — {oid}")

    # ------------------------------------------------------------------ R16–R19
    #
    # Four rules that share one property: they are INVISIBLE AT THE LINE LEVEL and
    # obvious at the parse level. Every one of them was found by parsing a document
    # that fifteen green rules had just declared conformant, and two of the defects
    # had been shipping a half-sentence since the document was first written —
    # because everyone was reading YAML instead of reading what YAML parses to.
    #
    # That is why they live here rather than in a reviewer's eye.

    PROSE = ("description", "summary", "x-arthome-idempotency-exemption",
             "x-arthome-fanout-exception")

    def scan(node, path, parent_type=None):
        if isinstance(node, list):
            for i, v in enumerate(node):
                scan(v, f"{path}/{i}", parent_type)
            return
        if not isinstance(node, dict):
            return
        typ = node.get("type")
        for k, v in node.items():
            # R16 — a vocabulary member is a string. An unquoted YAML scalar is a
            # TYPE DECISION MADE BY THE PARSER: `off`, `on`, `yes` and `no` are
            # booleans under YAML 1.1, so `[open, emoji, read_only, off]` declares
            # three modes and a `False`. `null` is admitted only where the schema's
            # own `type` admits it.
            if k in ("enum", "x-arthome-vocabulary") and isinstance(v, list):
                for m in v:
                    if isinstance(m, str):
                        continue
                    if m is None and isinstance(typ, list) and "null" in typ:
                        continue
                    err(fn, f"R16 non-string member {m!r} — quote it — {path}/{k}")
            if isinstance(k, str):
                # R17 — a mapping key that reads like prose is a scalar the parser
                # cut in half. A comma inside an unquoted scalar in a FLOW mapping
                # ends it: `{ description: Cache validator, so the TV … }` parses as
                # the value `Cache validator` plus a junk key mapped to null.
                # A fragment can land here WITHOUT a space — `{ description: a token,
                # short-lived. }` leaves the key `short-lived.` — so the trailing
                # full stop alone is enough to convict.
                if (" " in k or k.endswith(".")) and not k.startswith("/"):
                    err(fn, f"R17 prose promoted to a mapping key — quote the scalar — {path}: {k[:60]!r}")
                if k in PROSE:
                    # R18 — a prose value that carries its own quotation marks.
                    # Perfect in the YAML, corrupted in every generated client.
                    if isinstance(v, str):
                        s = v.strip()
                        if len(s) > 1 and s[0] == s[-1] and s[0] in "\"'":
                            err(fn, f"R18 value carries its own quotation marks — {path}/{k}")
                    # R19 — a prose key whose value is not a string at all.
                    elif v is not None:
                        err(fn, f"R19 {k} is not a string ({type(v).__name__}) — {path}/{k}")
            scan(v, f"{path}/{k}", typ)

    # R20 — every money-bearing field declares its TAX BASIS.
    #
    # D-056 makes a price tax-inclusive. `Money` itself cannot say so: it carries
    # credits, refunds, commissions and payouts as well as prices, so the basis is
    # a property of the FIELD and not of the shape.
    #
    # `@arthome/contracts` brands it for TypeScript consumers — `Taxed<Money,
    # 'inclusive'>` — and states plainly that a brand's mechanism is the compiler,
    # so it does not reach a generated client in another language, a webhook
    # recipient or a partner reading this document. A guarantee is only as wide as
    # its mechanism. This is the wire half, and it reaches all of them.
    #
    # THREE VALUES, because two would force a lie:
    #   inclusive  — what a viewer pays or sees. The price, the total, the fee.
    #   exclusive  — the payout chain below grossTtc: grossHt, base, commission, net.
    #   inherited  — a movement rather than a price. A refund, a credit, a
    #                discrepancy: its basis is that of the thing it moves, and
    #                asserting one would invent a fact.
    #
    # NOT A PER-VALUE FIELD IN THE PAYLOAD. The basis of `grossTtc` never varies,
    # so carrying it beside every amount would put a schema fact in the data — the
    # inverse of the `vatIncluded` case, where a datum sat in a structure whose
    # semantics contradicted it.
    BASES = ("inclusive", "exclusive", "inherited")
    MONEY = "#/components/schemas/Money"

    def money_fields(node, path=""):
        if isinstance(node, list):
            for i, v in enumerate(node):
                yield from money_fields(v, f"{path}[{i}]")
            return
        if not isinstance(node, dict):
            return
        ref = node.get("$ref")
        allof = node.get("allOf")
        bare_ref = ref == MONEY and len(node) == 1 and path.endswith("]")
        is_money = (ref == MONEY and not bare_ref) or (
            isinstance(allof, list)
            and any(isinstance(x, dict) and x.get("$ref") == MONEY for x in allof)
        )
        if is_money:
            yield path, node
        for k, v in node.items():
            yield from money_fields(v, f"{path}/{k}")

    # The count is PRINTED, because a number nobody can see is a number two people
    # measure separately and disagree about — which is exactly what happened on the
    # first run of this rule: a survey said 65 money fields, the gate said 55, and
    # the survey was counting each `allOf: [{$ref: Money}]` field twice, once as the
    # property and once as the `$ref` inside it. The gate was right and unfalsifiable
    # at the same time, which is the worse half. A gate that reports what it counted
    # can be argued with.
    money_basis = {b: 0 for b in BASES}
    money_seen = 0
    for path, node in money_fields(d):
        money_seen += 1
        basis = node.get("x-arthome-tax-basis")
        if basis is None:
            err(fn, f"R20 money field without x-arthome-tax-basis — {path}")
        elif basis not in BASES:
            err(fn, f"R20 x-arthome-tax-basis must be one of {BASES}, found {basis!r} — {path}")
        else:
            money_basis[basis] += 1
    counts[fn] = (money_seen, money_basis)

    scan(d, "")

    seen, by_basis = counts.get(fn, (0, {}))
    print(f"{fn}: {seen} money field(s) — "
          + " · ".join(f"{k} {v}" for k, v in by_basis.items()))
    print(f"{fn}: {len(d.get('paths',{}))} paths, {len(ops)} operations, "
          f"{len(d.get('components',{}).get('schemas',{}))} schemas")

for fn in sys.argv[1:]:
    check(fn)

if ERRS:
    print(f"\n{len(ERRS)} finding(s):")
    for e in ERRS: print("  ✗", e)
    sys.exit(1)
print("\n✓ conformant")
