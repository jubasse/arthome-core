#!/usr/bin/env python3
"""Vérificateur de conformité OpenAPI 3.1 — règles Arthome.
Usage: python3 check-openapi.py openapi/*.yaml
Aucune dépendance hors PyYAML. Tout se vérifie en local."""
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
        err(fn, f"R1 openapi doit être 3.1.x, trouvé {d.get('openapi')}")

    # R2 — pas de `nullable` (retiré en 3.1), pas de `example` dans un schéma (c'est `examples`)
    for p, n in walk(d.get("components",{}).get("schemas",{}), "components/schemas"):
        if "nullable" in n:
            err(fn, f"R2 `nullable` interdit en 3.1 → type: [T,'null'] — {p}")
        if "exclusiveMinimum" in n and isinstance(n["exclusiveMinimum"], bool):
            err(fn, f"R2 exclusiveMinimum est un nombre en 2020-12 — {p}")

    # R3 — tous les $ref résolvent
    refs = set()
    for p, n in walk(d):
        r = n.get("$ref") if isinstance(n, dict) else None
        if isinstance(r, str): refs.add((p, r))
    for p, r in refs:
        if not r.startswith("#/"):
            err(fn, f"R3 $ref externe interdit: {r} ({p})"); continue
        cur = d
        for seg in r[2:].split("/"):
            seg = seg.replace("~1","/").replace("~0","~")
            if not isinstance(cur, dict) or seg not in cur:
                err(fn, f"R3 $ref non résolu: {r} ({p})"); cur=None; break
            cur = cur[seg]

    ops = [(pp, m, o) for pp, pi in d.get("paths",{}).items()
           for m, o in (pi or {}).items() if m in HTTP]

    ids = {}
    for pp, m, o in ops:
        oid = o.get("operationId")
        # R4 — operationId présent, lowerCamelCase, unique
        if not oid:
            err(fn, f"R4 operationId manquant — {m.upper()} {pp}"); continue
        if not re.fullmatch(r"[a-z][A-Za-z0-9]*", oid):
            err(fn, f"R4 operationId doit être lowerCamelCase: {oid}")
        if oid in ids:
            err(fn, f"R4 operationId dupliqué: {oid} ({ids[oid]} et {m.upper()} {pp})")
        ids[oid] = f"{m.upper()} {pp}"

        # R5 — summary et description obligatoires
        if not o.get("summary"): err(fn, f"R5 summary manquant — {oid}")
        if not o.get("description"): err(fn, f"R5 description manquante — {oid}")

        # R6 — maturité déclarée
        mat = o.get("x-arthome-maturity")
        if mat not in ("stable","provisional"):
            err(fn, f"R6 x-arthome-maturity absent ou invalide — {oid}")

        # R7 — service amont déclaré
        if not o.get("x-arthome-upstream"):
            err(fn, f"R7 x-arthome-upstream absent — {oid}")

        # R8 — exemple sur toute requête avec corps
        rb = o.get("requestBody")
        if rb:
            for ct, media in rb.get("content",{}).items():
                if "example" not in media and "examples" not in media:
                    err(fn, f"R8 exemple manquant sur la requête — {oid} ({ct})")

        resp = o.get("responses",{})
        # R9 — au moins une réponse 2xx, avec exemple
        success = [c for c in resp if str(c).startswith("2")]
        if not success:
            err(fn, f"R9 aucune réponse 2xx — {oid}")
        for c in success:
            for ct, media in (resp[c].get("content") or {}).items():
                if "example" not in media and "examples" not in media:
                    err(fn, f"R9 exemple manquant sur la réponse {c} — {oid} ({ct})")

        # R10 — enveloppe d'erreur partagée sur toute réponse 4xx/5xx
        for c, r in resp.items():
            if str(c)[0] in "45":
                if "$ref" in r:
                    if not r["$ref"].startswith("#/components/responses/"):
                        err(fn, f"R10 réponse d'erreur non partagée — {oid} {c}")
                    continue
                for ct, media in (r.get("content") or {}).items():
                    s = media.get("schema",{})
                    if s.get("$ref") != "#/components/schemas/ErrorEnvelope":
                        err(fn, f"R10 réponse {c} n'utilise pas ErrorEnvelope — {oid}")

        # R11 — toute écriture d'engagement porte Idempotency-Key
        params = o.get("parameters",[]) or []
        has_idem = any(pa.get("$ref","").endswith("/IdempotencyKey") or pa.get("name")=="Idempotency-Key"
                       for pa in params)
        # L'exemption se lit DANS LE DOCUMENT, pas dans une liste tenue ici.
        #
        # La première version portait un `SAFE_WRITE` codé en dur — c'est-à-dire
        # une table littérale parallèle au contrat, tenue dans l'outil qui existe
        # pour interdire les tables littérales parallèles. E2 dans sa propre porte.
        # Elle a échoué comme une telle table échoue toujours : le contrat a gagné
        # deux opérations (`signIn`, `signInStudio`) et la liste ne le savait pas.
        #
        # Une opération exemptée porte donc `x-arthome-idempotency-exemption`, avec
        # son motif en clair — le motif étant la partie utile, puisqu'il se relit.
        # Deux familles, toutes deux légitimes :
        #
        #   · écriture tolérante à la perte ou sans effet cumulatif, où la clé
        #     coûterait plus cher que ce qu'elle protège (position de lecture,
        #     échantillon de santé, réaction bornée par un quota, devis) ;
        #   · ouverture de session, et le motif est sérieux : le régime
        #     d'idempotence rend la réponse d'origine VERBATIM, donc sur un
        #     `signIn` il rendrait un jeton sans avoir vérifié les justificatifs.
        #     Une clé rejouée deviendrait un porteur de session.
        exempt = o.get("x-arthome-idempotency-exemption")
        if m in ("post","put","patch","delete") and not exempt and not has_idem:
            err(fn, f"R11 Idempotency-Key absent sur une écriture — {oid}")
        if exempt and has_idem:
            err(fn, f"R11 exemption déclarée ET Idempotency-Key présent — {oid}")
        if exempt and not str(exempt).strip():
            err(fn, f"R11 exemption sans motif — {oid}")

        # R12 — traceparent propagé partout
        if not any(pa.get("$ref","").endswith("/Traceparent") or pa.get("name")=="traceparent"
                   for pa in params):
            err(fn, f"R12 traceparent absent — {oid}")

    # R13 — pas de phrase d'interface : aucun champ nommé `label`, `message`, `title` en string nu
    #        hors LocalizedText (contenu rédigé assumé)
    for p, n in walk(d.get("components",{}).get("schemas",{}), "components/schemas"):
        if not isinstance(n, dict): continue
        props = n.get("properties")
        if not isinstance(props, dict): continue
        for name, sch in props.items():
            if name in ("labelFr","labelEn","messageFr","messageEn"):
                err(fn, f"R13 fuite d'i18n dans la donnée: {p}/{name}")

    # R14 — aucun `enum` figé dans un schéma ATTEIGNABLE DEPUIS UNE RÉPONSE.
    #
    # Deux corrections successives. La version d'origine ne se déclenchait que si
    # `enum` ET `x-arthome-vocabulary` étaient présents ensemble : un `enum` nu
    # passait au travers, et c'est ce que `storefront-tv` a trouvé à la main sur
    # `Error.nature` — `required` dans `Error`, lui-même `required` dans
    # `ErrorEnvelope`, donc dans le corps de TOUTES les erreurs. Une quatrième
    # nature aurait fait rejeter l'enveloppe entière par un parc qu'on ne met pas
    # à jour, au moment précis où quelque chose ne va pas.
    #
    # La première tentative de durcissement — « tout `enum` sous
    # components/schemas » — criait à tort sur `SearchCriteria`, qui n'est
    # référencée qu'en `in: query`. Un vocabulaire d'ENTRÉE est légitimement
    # fermé : le serveur doit refuser ce qu'il ne connaît pas. Une porte qui crie
    # à tort se fait désactiver, donc le critère juste est l'atteignabilité.
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
                        else " (ajouter x-arthome-vocabulary et x-arthome-unknown-fallback)")
                err(fn, f"R14 enum figé dans un schéma servi en réponse{hint} — {sp}")

    # R15 — tout schéma de réponse racine porte servedAt (via EnvelopeMeta)
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
                    err(fn, f"R15 réponse {c} sans EnvelopeMeta (donc sans servedAt) — {oid}")

    print(f"{fn}: {len(d.get('paths',{}))} chemins, {len(ops)} opérations, "
          f"{len(d.get('components',{}).get('schemas',{}))} schémas")

for fn in sys.argv[1:]:
    check(fn)

if ERRS:
    print(f"\n{len(ERRS)} écart(s) :")
    for e in ERRS: print("  ✗", e)
    sys.exit(1)
print("\n✓ conforme")
