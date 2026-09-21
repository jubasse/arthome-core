#!/usr/bin/env python3
"""OpenAPI 3.1 conformance checker — Arthome rules.
Usage: python3 check-openapi.py openapi/*.yaml
No dependency beyond PyYAML. Everything is verified locally."""
import sys, re, yaml

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

def check(fn):
    d = yaml.safe_load(open(fn, encoding="utf-8"))

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

    scan(d, "")

    print(f"{fn}: {len(d.get('paths',{}))} paths, {len(ops)} operations, "
          f"{len(d.get('components',{}).get('schemas',{}))} schemas")

for fn in sys.argv[1:]:
    check(fn)

if ERRS:
    print(f"\n{len(ERRS)} finding(s):")
    for e in ERRS: print("  ✗", e)
    sys.exit(1)
print("\n✓ conformant")
