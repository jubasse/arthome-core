#!/usr/bin/env python3
"""arthome-convert-openapi-routes -- an OpenAPI document's operations, as TypeScript routes.

It reads `paths` and the components a path names (`parameters`, `headers`, `responses`,
`securitySchemes`) and writes `@arthome/contracts/http` declarations: one module per first tag,
`components.ts`, and `index.ts` holding the api. Every JSON Schema becomes the zod expression
that emits it back, and every export gets the explicit annotation `isolatedDeclarations` demands.

A `$ref` to a schema becomes the export that answers for it, found by check-emit-diff's own rule
(`source_of`), so the two gates cannot disagree on which export a name means. A vocabulary becomes
`@arthome/core`'s constant, or its accessor's members for a narrowing, never a copied list.

A keyword it has no zod method for is carried through `.meta()`: emitted, not validated. Each one
is counted in the summary, because it is a place where the document promises more than the
server checks.

    python3 tools/convert-openapi-routes.py openapi/storefront.yaml --out DIR
        [--operations id,id] [--imports relative|package]
"""

import importlib.util
import json
import re
import subprocess
import sys
from collections import Counter, OrderedDict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
METHODS = ("get", "put", "post", "delete", "patch")
IDENTIFIER = re.compile(r"^[A-Za-z_$][A-Za-z0-9_$]*$")

# Keywords a zod method expresses, per JSON type. Anything else on the node goes to `.meta()`.
STRING_KEYWORDS = {"type", "enum", "const", "pattern", "minLength", "maxLength", "default"}
NUMBER_KEYWORDS = {"type", "minimum", "maximum", "default"}
ARRAY_KEYWORDS = {"type", "items", "minItems", "maxItems", "default"}
OBJECT_KEYWORDS = {"type", "properties", "required", "additionalProperties", "default"}
VOCABULARY_KEYWORDS = {
    "x-arthome-vocabulary",
    "x-arthome-vocabulary-source",
    "x-arthome-vocabulary-reason",
}
# Emitted as metadata by design rather than by lack of a method: annotations, not constraints.
ANNOTATIONS = {"description", "examples", "format", "title", "deprecated"}


def _tool(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / "tools" / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def node_json(script):
    run = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        cwd=ROOT / "packages/contracts",
        capture_output=True,
        text=True,
    )
    if run.returncode != 0:
        sys.exit(f"convert-openapi-routes: node failed (build the packages first)\n{run.stderr[:2000]}")
    return json.loads(run.stdout)


VOCABULARY_SCRIPT = """
const fs = await import('node:fs');
const manifest = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const sources = [['@arthome/core', await import('@arthome/core')]];
for (const [subpath, entry] of Object.entries(manifest.exports)) {
  if (typeof entry === 'object' && entry.import && fs.existsSync(entry.import))
    sources.push(['@arthome/contracts' + subpath.slice(1), await import(entry.import)]);
}
const arrays = {}, accessors = {};
for (const [from, mod] of sources) {
  for (const [name, value] of Object.entries(mod)) {
    const values = value && typeof value === 'object' ? Object.values(value) : [];
    if (Array.isArray(value) && value.length && value.every((m) => typeof m === 'string')) arrays[name] ??= { members: value, from };
    else if (!Array.isArray(value) && values.length && values.every((m) => typeof m === 'string') && /^[A-Z][a-z]/.test(name))
      accessors[name] ??= { entries: value, from };
  }
}
process.stdout.write(JSON.stringify({ arrays, accessors }));
"""


def ts_string(value):
    return json.dumps(value, ensure_ascii=False)


def ts_key(key):
    key = str(key)
    if re.fullmatch(r"[0-9]+", key) or IDENTIFIER.match(key):
        return key
    return ts_string(key)


def camel(*parts):
    words = [w for part in parts for w in re.split(r"[^A-Za-z0-9]+", str(part)) if w]
    head, *tail = words or ["value"]
    return head[:1].lower() + head[1:] + "".join(w[:1].upper() + w[1:] for w in tail)


def constant(*parts):
    words = []
    for part in parts:
        for w in re.split(r"[^A-Za-z0-9]+", str(part)):
            words += re.findall(r"[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])", w)
    return "_".join(w.upper() for w in words) or "VALUES"


def local_name(where):
    """`search:param:tab` -> `SEARCH_TAB`, `component:Surface` -> `SURFACE`."""
    owner = where.split(":")[0]
    field = where.rsplit(".", 1)[-1].split(":")[-1]
    return constant(field) if owner == "component" else constant(owner, field)


class Unsupported(Exception):
    """A construct with no zod rendering: the operation is reported, not guessed."""


class Module:
    """One TypeScript file being written: its imports, its local constants, its body."""

    def __init__(self, path):
        self.path = path
        self.values = {}
        self.types = {}
        self.locals = OrderedDict()
        self.body = []

    def use(self, specifier, name, type_only=False):
        target = self.types if type_only else self.values
        target.setdefault(specifier, set()).add(name)
        return name

    def local(self, preferred, declaration_of):
        """A module-level constant, deduplicated on what it declares."""
        for name, text in self.locals.items():
            if text == declaration_of(name):
                return name
        name, n = preferred, 2
        while name in self.locals:
            name, n = f"{preferred}_{n}", n + 1
        self.locals[name] = declaration_of(name)
        return name

    def render(self, own_names):
        lines = []
        external = sorted(s for s in set(self.values) | set(self.types) if not s.startswith("."))
        relative = sorted(s for s in set(self.values) | set(self.types) if s.startswith("."))
        for group in (["zod"], [s for s in external if s != "zod"], relative):
            block = []
            for spec in group:
                if spec not in self.values and spec not in self.types:
                    continue
                values = sorted((n for n in self.values.get(spec, ()) if n not in own_names), key=str.lower)
                types = sorted(
                    (n for n in self.types.get(spec, ()) if n not in values and n not in own_names), key=str.lower
                )
                if types:
                    block.append(f"import type {{ {', '.join(types)} }} from '{spec}';")
                if values:
                    block.append(f"import {{ {', '.join(values)} }} from '{spec}';")
            if block:
                lines += block + [""]
        for text in self.locals.values():
            lines.append(text)
        if self.locals:
            lines.append("")
        lines += self.body
        return "\n".join(lines).rstrip() + "\n"


class Converter:
    def __init__(self, document_path, imports):
        self.document_path = document_path
        self.document = _tool("compare_openapi", "compare-openapi.py").load_document(document_path)
        self.product = Path(document_path).stem
        self.imports = imports
        self.metadata_only = Counter()
        self.vocabulary_notes = Counter()
        emit_diff = _tool("check_emit_diff", "check-emit-diff.py")
        run = subprocess.run(["node", "tools/emit-contracts.mjs"], cwd=ROOT, capture_output=True, text=True)
        if run.returncode != 0:
            sys.exit(f"convert-openapi-routes: the emitter failed (build the packages first)\n{run.stderr[:2000]}")
        payload = {name: entry["from"] for name, entry in json.loads(run.stdout)["emitted"].items()}
        self.schema_source = {}
        for name in self.document["components"]["schemas"]:
            export, _ = emit_diff.source_of(name, {k: True for k in payload}, document_path)
            if export is not None:
                self.schema_source[name] = (export, payload[export])
        vocabulary = node_json(VOCABULARY_SCRIPT)
        self.arrays = {name: entry["members"] for name, entry in vocabulary["arrays"].items()}
        self.published_from = {name: entry["from"] for name, entry in vocabulary["arrays"].items()}
        self.published_from.update({name: entry["from"] for name, entry in vocabulary["accessors"].items()})
        self.accessor_of = {}
        for array_name, members in self.arrays.items():
            for accessor, entry in vocabulary["accessors"].items():
                entries = entry["entries"]
                if set(entries.values()) == set(members) and len(entries) == len(members):
                    self.accessor_of[array_name] = (accessor, {v: k for k, v in entries.items()})
                    break
        self.member_accessor = {}
        for array_name, (accessor, keys) in sorted(self.accessor_of.items()):
            for member, key in keys.items():
                self.member_accessor.setdefault(member, (accessor, key))

    # ------------------------------------------------------------------ specifiers

    def spec(self, published):
        """A module specifier for an `@arthome/contracts/<sub>` or `@arthome/core*` import."""
        prefix = "@arthome/contracts/"
        if self.imports == "relative" and published.startswith(prefix):
            return f"../{published[len(prefix):]}/index.js"
        return published

    def use_published(self, module, name):
        return module.use(self.spec(self.published_from[name]), name)

    # ------------------------------------------------------------------ literals

    def literal(self, value, module, indent=0, members=True):
        """A TypeScript literal for document data; with `members`, a vocabulary member is spelled
        through its accessor. Off for OpenAPI's own words: `in: cookie` is a location, not a mode."""
        pad = "  " * (indent + 1)
        end = "  " * indent
        if isinstance(value, dict):
            if not value:
                return "{}"
            items = [f"{pad}{ts_key(k)}: {self.literal(v, module, indent + 1, members)}," for k, v in value.items()]
            return "{\n" + "\n".join(items) + f"\n{end}}}"
        if isinstance(value, list):
            if not value:
                return "[]"
            items = [f"{pad}{self.literal(v, module, indent + 1, members)}," for v in value]
            return "[\n" + "\n".join(items) + f"\n{end}]"
        if members and isinstance(value, str) and value in self.member_accessor:
            accessor, key = self.member_accessor[value]
            self.use_published(module, accessor)
            return f"{accessor}.{key}"
        if isinstance(value, bool):
            return "true" if value else "false"
        if value is None:
            return "null"
        if isinstance(value, (int, float)):
            return json.dumps(value)
        return ts_string(value)

    def prose(self, value, module, indent=0, key=""):
        """OpenAPI's own data, verbatim. Only an extension's or an example's values hold members."""
        if isinstance(value, str) and not str(key).startswith("x-"):
            return ts_string(value)
        holds_members = str(key).startswith("x-") or key in ("examples", "example", "default")
        return self.literal(value, module, indent, members=holds_members)

    def meta_value(self, key, value, module, indent):
        if key == "x-arthome-vocabulary-source" and value == "none":
            return module.use(self.spec("@arthome/core/schema"), "VOCABULARY_SOURCE_LOCAL")
        return self.prose(value, module, indent, key)

    def meta_call(self, keys, module, indent):
        if not keys:
            return ""
        pad = "  " * (indent + 1)
        end = "  " * indent
        items = [f"{pad}{ts_key(k)}: {self.meta_value(k, v, module, indent + 1)}," for k, v in keys.items()]
        return ".meta({\n" + "\n".join(items) + f"\n{end}}})"

    # ------------------------------------------------------------------ schemas

    def schema_ref(self, ref, module):
        name = ref.rsplit("/", 1)[-1]
        if not ref.startswith("#/components/schemas/") or name not in self.schema_source:
            raise Unsupported(f"$ref {ref} has no zod source")
        export, published = self.schema_source[name]
        module.use(self.spec(published), export)
        return export, f"typeof {export}"

    def annotations(self, node, consumed, where):
        keys = OrderedDict()
        for key, value in node.items():
            if key in consumed:
                continue
            if key not in ANNOTATIONS and not key.startswith("x-"):
                self.metadata_only[key] += 1
            keys[key] = value
        return keys

    def zod(self, node, io, module, where, indent=0):
        """`(expression, type)` for a JSON Schema node."""
        if not isinstance(node, dict):
            raise Unsupported(f"{where}: a boolean schema")
        if "$ref" in node:
            expr, typ = self.schema_ref(node["$ref"], module)
            rest = self.annotations(node, {"$ref"}, where)
            return expr + self.meta_call(rest, module, indent), typ
        module.use("zod", "z")
        if "allOf" in node:
            members = [self.zod(m, io, module, f"{where}.allOf", indent) for m in node["allOf"]]
            expr, typ = members[0]
            for m_expr, m_typ in members[1:]:
                expr, typ = f"z.intersection({expr}, {m_expr})", f"z.ZodIntersection<{typ}, {m_typ}>"
            rest = self.annotations(node, {"allOf"}, where)
            return expr + self.meta_call(rest, module, indent), typ
        for key in ("anyOf", "oneOf", "not", "discriminator", "prefixItems", "if"):
            if key in node:
                raise Unsupported(f"{where}: `{key}` at path level")

        kind = node.get("type")
        nullable = False
        leading_meta = OrderedDict()
        if isinstance(kind, list):
            others = [k for k in kind if k != "null"]
            if len(others) != 1:
                raise Unsupported(f"{where}: type {kind}")
            nullable, kind = "null" in kind, others[0]
        if kind is None and "enum" in node:
            kind = "string"
        if kind is None and "properties" in node:
            kind = "object"

        if "x-arthome-vocabulary" in node or (kind == "string" and "enum" in node):
            base, typ, consumed, leading_meta = self.vocabulary(node, io, module, where, nullable)
            nullable_done = True
        elif kind == "string":
            base, consumed = self.string(node, module)
            typ, nullable_done = "z.ZodString", False
            if "const" in node:
                typ = f"z.ZodLiteral<{ts_string(node['const'])}>"
        elif kind == "integer" and node.get("format") == "int64" and "minimum" not in node and "maximum" not in node:
            base, typ = module.use(self.spec("@arthome/core/schema"), "int64") + "()", "z.ZodNumber"
            consumed, nullable_done = NUMBER_KEYWORDS | {"format"}, False
        elif kind in ("integer", "number"):
            base, typ, consumed = self.number(node, kind)
            nullable_done = False
        elif kind == "boolean":
            base, typ, consumed, nullable_done = "z.boolean()", "z.ZodBoolean", {"type", "default"}, False
        elif kind == "array":
            items, items_type = self.zod(node.get("items", {}), io, module, f"{where}[]", indent)
            base, typ = f"z.array({items})", f"z.ZodArray<{items_type}>"
            if "minItems" in node:
                base += f".min({node['minItems']})"
            if "maxItems" in node:
                base += f".max({node['maxItems']})"
            consumed, nullable_done = ARRAY_KEYWORDS, False
        elif kind == "object":
            base, typ = self.object(node, io, module, where, indent)
            consumed, nullable_done = OBJECT_KEYWORDS, False
        else:
            raise Unsupported(f"{where}: type {kind!r}")

        if nullable and not nullable_done:
            base, typ = f"{base}.nullable()", f"z.ZodNullable<{typ}>"
        rest = OrderedDict(leading_meta)
        rest.update(self.annotations(node, consumed | VOCABULARY_KEYWORDS, where))
        expr = base + self.meta_call(rest, module, indent)
        if "default" in node:
            expr += f".default({self.literal(node['default'], module, indent)})"
            typ = f"z.ZodDefault<{typ}>"
        return expr, typ

    def string(self, node, module):
        """`(expression, consumed keywords)`, through core's own primitive where one says it exactly."""
        bare = not any(k in node for k in ("minLength", "maxLength", "pattern", "const"))
        schema_module = self.spec("@arthome/core/schema")
        if bare and node.get("format") == "uuid":
            return module.use(schema_module, "uuidOut") + "()", STRING_KEYWORDS | {"format"}
        if bare and node.get("format") == "date-time":
            return module.use(schema_module, "InstantOut"), STRING_KEYWORDS | {"format"}
        consumed = STRING_KEYWORDS
        if "/" in node.get("pattern", ""):
            # A RegExp's `source` escapes `/`, so the emitted pattern would gain a backslash.
            consumed = consumed - {"pattern"}
        if "const" in node:
            return f"z.literal({ts_string(node['const'])})", consumed
        expr = "z.string()"
        if "minLength" in node:
            expr += f".min({node['minLength']})"
        if "maxLength" in node:
            expr += f".max({node['maxLength']})"
        if "pattern" in node:
            pattern = node["pattern"]
            expr += f".regex(new RegExp({ts_string(pattern)}))"
        return expr, consumed

    def number(self, node, kind):
        if kind == "number":
            expr = "z.number()"
            if "minimum" in node:
                expr += f".min({node['minimum']})"
            if "maximum" in node:
                expr += f".max({node['maximum']})"
            return expr, "z.ZodNumber", NUMBER_KEYWORDS
        expr = "z.int()"
        if "minimum" in node:
            expr += f".min({node['minimum']})"
        if "maximum" in node:
            expr += f".max({node['maximum']})"
        # `z.int()` emits JavaScript's safe range as bounds; a bound the document leaves out is blanked.
        blank = [b for b in ("minimum", "maximum") if b not in node]
        if blank:
            expr += ".meta({ " + ", ".join(f"{b}: undefined" for b in blank) + " })"
        return expr, "z.ZodInt", NUMBER_KEYWORDS

    def object(self, node, io, module, where, indent):
        properties = node.get("properties") or {}
        required = set(node.get("required") or [])
        extra = node.get("additionalProperties")
        if extra is False:
            factory, mode = "z.strictObject", "z.core.$strict"
        elif io == "output" or extra is True or extra == {}:
            factory, mode = "z.looseObject", "z.core.$loose"
        else:
            factory, mode = "z.object", "z.core.$strip"
        catchall = None
        if isinstance(extra, dict) and extra:
            catchall = self.zod(extra, io, module, f"{where}{{}}", indent)
            factory, mode = "z.object", f"z.core.$catchall<{catchall[1]}>"
        pad = "  " * (indent + 1)
        end = "  " * indent
        shape, shape_type = [], []
        for key, value in properties.items():
            expr, typ = self.zod(value, io, module, f"{where}.{key}", indent + 1)
            if key not in required:
                expr, typ = f"{expr}.optional()", f"z.ZodOptional<{typ}>"
            shape.append(f"{pad}{ts_key(key)}: {expr},")
            shape_type.append(f"{ts_key(key)}: {typ}")
        expr = f"{factory}({{\n" + "\n".join(shape) + f"\n{end}}})" if shape else f"{factory}({{}})"
        typ = f"z.ZodObject<{{ {'; '.join(shape_type)} }}, {mode}>" if shape_type else f"z.ZodObject<Record<never, never>, {mode}>"
        if catchall is not None:
            expr += f".catchall({catchall[0]})"
        return expr, typ

    def vocabulary(self, node, io, module, where, nullable):
        """A closed set: strict `enum` on the way in, tolerant `x-arthome-vocabulary` on the way out."""
        source = node.get("x-arthome-vocabulary-source")
        tolerant = "x-arthome-vocabulary" in node and "enum" not in node
        members = node["x-arthome-vocabulary"] if tolerant else node["enum"]
        null_member = None in members
        if null_member:
            members = [m for m in members if m is not None]
        consumed = STRING_KEYWORDS | VOCABULARY_KEYWORDS | {"x-arthome-vocabulary-narrowing"}
        meta = OrderedDict()
        schema_module = self.spec("@arthome/core/schema")

        preferred = local_name(where)

        def local_array():
            name = module.local(
                preferred,
                lambda n: f"const {n} = [{', '.join(ts_string(m) for m in members)}] as const;",
            )
            return name

        if source and source != "none" and source in self.arrays:
            declared = self.arrays[source]
            accessor = self.accessor_of.get(source)
            if list(members) == list(declared):
                array_expr = source
                self.use_published(module, source)
                array_type = f"typeof {source}"
            elif set(members) <= set(declared) and accessor:
                acc, keys = accessor
                self.use_published(module, acc)
                if set(members) == set(declared):
                    self.vocabulary_notes["order differs from the vocabulary"] += 1
                else:
                    self.vocabulary_notes["narrowing, through the accessor"] += 1
                refs = [f"{acc}.{keys[m]}" for m in members]
                array_type = f"readonly [{', '.join(f'typeof {r}' for r in refs)}]"
                array_expr = module.local(
                    preferred,
                    lambda n: f"const {n}: {array_type} = [{', '.join(refs)}];",
                )
                array_type = f"typeof {array_expr}"
            else:
                self.vocabulary_notes["members outside the declared vocabulary"] += 1
                array_expr = local_array()
                array_type = f"typeof {array_expr}"
        else:
            if source and source != "none":
                self.vocabulary_notes["source names no core vocabulary"] += 1
            array_expr = local_array()
            array_type = f"typeof {array_expr}"

        if not tolerant:
            if null_member:
                # `enum: [a, b, null]`: `.nullable()` would emit `null` as an `anyOf` branch, while a
                # multi-value literal emits the list as written.
                expr = f"z.literal([...{array_expr}, null])"
                typ = f"z.ZodLiteral<({array_type})[number] | null>"
                meta["type"] = node["type"]
            else:
                module.use(schema_module, "vocabularyIn")
                module.use(schema_module, "VocabularyIn", type_only=True)
                expr, typ = f"vocabularyIn({array_expr})", f"VocabularyIn<{array_type}>"
            for key in ("x-arthome-vocabulary-source", "x-arthome-vocabulary-reason", "x-arthome-vocabulary-narrowing"):
                if key in node:
                    meta[key] = node[key]
            if nullable and not null_member:
                expr, typ = f"{expr}.nullable()", f"z.ZodNullable<{typ}>"
            return expr, typ, consumed, meta

        if source == "none":
            helper = "vocabularyOutLocalNullable" if nullable else "vocabularyOutLocal"
            expr = f"{helper}({array_expr}, {ts_string(node.get('x-arthome-vocabulary-reason', ''))})"
        else:
            helper = "vocabularyOutNullable" if nullable else "vocabularyOut"
            named = array_expr != source
            expr = f"{helper}({array_expr}{', ' + ts_string(source) if named and source else ''})"
        module.use(schema_module, helper)
        typ = "VocabularyOutNullable" if nullable else "VocabularyOut"
        module.use(schema_module, typ, type_only=True)
        if "x-arthome-vocabulary-narrowing" in node:
            meta["x-arthome-vocabulary-narrowing"] = node["x-arthome-vocabulary-narrowing"]
        return expr, typ, consumed, meta

    # ------------------------------------------------------------------ OpenAPI objects

    def component_name(self, ref, kind):
        prefix = f"#/components/{kind}/"
        if not ref.startswith(prefix):
            raise Unsupported(f"$ref {ref} is not a {kind} component")
        name = ref[len(prefix) :]
        suffix = {"parameters": "Parameter", "headers": "Header", "responses": "Response"}[kind]
        return f"{name}{suffix}"

    def use_component(self, ref, kind, module):
        name = self.component_name(ref, kind)
        if module.path.name != "components.ts":
            module.use("./components.js", name)
        self.used_components.add((kind, ref.rsplit("/", 1)[-1]))
        return name

    def object_literal(self, entries, indent):
        pad = "  " * (indent + 1)
        end = "  " * indent
        lines = [f"{pad}{k}," if k == v else f"{pad}{ts_key(k)}: {v}," for k, v in entries]
        return "{\n" + "\n".join(lines) + f"\n{end}}}"

    def generic(self, node, module, indent, render):
        """An OpenAPI object: `render(key, value)` answers for the keys it owns, prose for the rest."""
        entries = []
        for key, value in node.items():
            rendered = render(key, value)
            entries.append((key, rendered if rendered is not None else self.prose(value, module, indent + 1, key)))
        return self.object_literal(entries, indent)

    def parameter(self, node, module, where, indent):
        """`(literal, annotation)` for an inline parameter object."""
        typ_holder = {}

        def render(key, value):
            if key == "schema":
                expr, typ = self.zod(value, "input", module, where, indent + 1)
                typ_holder["schema"] = typ
                return expr
            return None

        literal = self.generic(node, module, indent, render)
        schema_type = typ_holder.get("schema", "z.ZodType")
        name, location = ts_string(node["name"]), node["in"]
        required = node.get("required") is True
        module_http = self.spec("@arthome/contracts/http")
        if location == "path":
            annotation = module.use(module_http, "PathParameter", type_only=True) + f"<{name}, {schema_type}>"
        elif location == "query":
            annotation = module.use(module_http, "QueryParameter", type_only=True) + f"<{name}, {schema_type}{', true' if required else ''}>"
        elif location == "header":
            annotation = module.use(module_http, "HeaderParameter", type_only=True) + f"<{name}, {schema_type}{', true' if required else ''}>"
        else:
            annotation = module.use(module_http, "Parameter", type_only=True)
        return literal, annotation

    def header(self, node, module, where, indent):
        def render(key, value):
            if key == "schema":
                return self.zod(value, "output", module, where, indent + 1)[0]
            return None

        return self.generic(node, module, indent, render)

    def media(self, node, io, module, where, indent):
        typ_holder = {}

        def render(key, value):
            if key == "schema":
                expr, typ = self.zod(value, io, module, where, indent + 1)
                typ_holder["schema"] = typ
                return expr
            if key in ("example", "examples"):
                return self.literal(value, module, indent + 1)
            return None

        return self.generic(node, module, indent, render), typ_holder.get("schema")

    def content(self, node, io, module, where, indent):
        types = {}

        def render(media_type, value):
            literal, typ = self.media(value, io, module, f"{where} {media_type}", indent + 1)
            types[media_type] = typ
            return literal

        return self.generic(node, module, indent, render), types

    def response(self, node, module, where, indent):
        """`(literal, annotation)` for an inline response object."""
        types = {}
        module_http = self.spec("@arthome/contracts/http")

        def render(key, value):
            if key == "headers":
                def header(name, h):
                    if "$ref" in h:
                        return self.use_component(h["$ref"], "headers", module)
                    return self.header(h, module, f"{where} header {name}", indent + 3)
                return self.generic(value, module, indent + 1, header)
            if key == "content":
                literal, content_types = self.content(value, "output", module, where, indent + 1)
                types.update(content_types)
                return literal
            return None

        literal = self.generic(node, module, indent, render)
        json_type = types.get("application/json")
        if json_type is not None:
            return literal, module.use(module_http, "JsonResponse", type_only=True) + f"<{json_type}>"
        return literal, module.use(module_http, "Response", type_only=True)

    def request_body(self, node, module, where, indent):
        types = {}
        module_http = self.spec("@arthome/contracts/http")

        def render(key, value):
            if key == "content":
                literal, content_types = self.content(value, "input", module, where, indent + 1)
                types.update(content_types)
                return literal
            return None

        literal = self.generic(node, module, indent, render)
        json_type = types.get("application/json")
        if json_type is None:
            return literal, module.use(module_http, "RequestBody", type_only=True)
        required = "" if node.get("required") is True else ", false"
        return literal, module.use(module_http, "JsonRequestBody", type_only=True) + f"<{json_type}{required}>"

    def route(self, path, method, operation, module):
        """The `export const` for one operation, or raises `Unsupported`."""
        name = operation["operationId"]
        where = name
        entries = [("method", ts_string(method)), ("path", ts_string(path))]
        annotation = [f"method: {ts_string(method)}", f"path: {ts_string(path)}"]
        for key, value in operation.items():
            if key == "parameters":
                literals, types = [], []
                for parameter in value:
                    if "$ref" in parameter:
                        component = self.use_component(parameter["$ref"], "parameters", module)
                        literals.append(component)
                        types.append(f"typeof {component}")
                    else:
                        literal, typ = self.parameter(parameter, module, f"{where}:param:{parameter['name']}", 3)
                        literals.append(literal)
                        types.append(typ)
                entries.append((key, "[\n" + "\n".join(f"      {l}," for l in literals) + "\n    ]"))
                annotation.append("parameters: readonly [" + ", ".join(types) + "]")
            elif key == "requestBody":
                literal, typ = self.request_body(value, module, f"{where}:req", 2)
                entries.append((key, literal))
                annotation.append(f"requestBody: {typ}")
            elif key == "responses":
                literals, types = [], []
                for status, response in value.items():
                    if "$ref" in response:
                        component = self.use_component(response["$ref"], "responses", module)
                        literals.append((status, component))
                        types.append(f"{ts_key(status)}: typeof {component}")
                    else:
                        literal, typ = self.response(response, module, f"{where}:{status}", 3)
                        literals.append((status, literal))
                        types.append(f"{ts_key(status)}: {typ}")
                entries.append((key, self.object_literal(literals, 2)))
                annotation.append("responses: { " + "; ".join(types) + " }")
            else:
                entries.append((key, self.prose(value, module, 2, key)))
        module.use(self.spec("@arthome/contracts/http"), "defineRoute")
        module.use(self.spec("@arthome/contracts/http"), "Route", type_only=True)
        body = self.object_literal(entries, 1)
        return (
            f"export const {name}: Route<{{ {'; '.join(annotation)} }}> = defineRoute(\n  "
            + body.replace("\n", "\n  ")
            + ",\n);\n"
        )

    # ------------------------------------------------------------------ the whole document

    def convert(self, out_dir, only=None, directory=None):
        out_dir = Path(out_dir) / (directory or f"{self.product}-api")
        out_dir.mkdir(parents=True, exist_ok=True)
        self.used_components = set()
        groups = OrderedDict()
        results = OrderedDict()
        for path, item in self.document["paths"].items():
            for method, operation in item.items():
                if method not in METHODS:
                    continue
                operation_id = operation["operationId"]
                if only and operation_id not in only:
                    continue
                group = (operation.get("tags") or ["untagged"])[0]
                module = groups.setdefault(group, Module(out_dir / f"{group}.ts"))
                snapshot = (dict(module.values), dict(module.types), OrderedDict(module.locals), set(self.used_components))
                snapshot = ({k: set(v) for k, v in snapshot[0].items()}, {k: set(v) for k, v in snapshot[1].items()}, snapshot[2], snapshot[3])
                try:
                    module.body.append(self.route(path, method, operation, module))
                    results[operation_id] = None
                except Unsupported as reason:
                    module.values, module.types, module.locals, self.used_components = snapshot
                    results[operation_id] = str(reason)

        components = Module(out_dir / "components.ts")
        component_names = []
        source = self.document["components"]
        for kind, name in list(self.used_components):
            if kind != "responses":
                continue
            for header in (source["responses"][name].get("headers") or {}).values():
                if "$ref" in header:
                    self.used_components.add(("headers", header["$ref"].rsplit("/", 1)[-1]))
        for kind in ("parameters", "headers", "responses"):
            for name, node in (source.get(kind) or {}).items():
                if only and (kind, name) not in self.used_components:
                    continue
                const = self.component_name(f"#/components/{kind}/{name}", kind)
                try:
                    if kind == "parameters":
                        literal, typ = self.parameter(node, components, f"component:{name}", 0)
                    elif kind == "headers":
                        literal = self.header(node, components, f"component:{name}", 0)
                        typ = components.use(self.spec("@arthome/contracts/http"), "Header", type_only=True)
                    else:
                        literal, typ = self.response(node, components, f"component:{name}", 0)
                except Unsupported as reason:
                    results[f"components/{kind}/{name}"] = str(reason)
                    continue
                components.body.append(f"export const {const}: {typ} = {literal};\n")
                component_names.append((kind, name, const))

        for module in groups.values():
            module.path.write_text(module.render(set()), encoding="utf-8")
        components.path.write_text(components.render(set()), encoding="utf-8")
        self.write_index(out_dir, groups, component_names, results)
        # Import order and shorthand are ESLint's to fix, layout is Prettier's. Both skip an
        # ignored directory, which is what the round-trip report's scratch output is.
        subprocess.run(["pnpm", "exec", "eslint", "--fix", str(out_dir)], cwd=ROOT, capture_output=True)
        subprocess.run(["pnpm", "exec", "prettier", "--write", str(out_dir)], cwd=ROOT, capture_output=True)
        return results

    def write_index(self, out_dir, groups, component_names, results):
        index = Module(out_dir / "index.ts")
        http = self.spec("@arthome/contracts/http")
        index.use(http, "defineApi")
        index.use(http, "Api", type_only=True)
        api_name = camel(self.product, "api")
        routes = []
        for group, module in groups.items():
            for line in module.body:
                route = re.match(r"export const (\w+):", line).group(1)
                index.use(f"./{group}.js", route)
                routes.append(route)
        entries = []
        for key, value in self.document.items():
            if key == "paths":
                entries.append(("routes", self.object_literal([(r, r) for r in routes], 1)))
            elif key == "components":
                parts = []
                for kind, values in value.items():
                    if kind == "schemas":
                        schema_entries = []
                        for name in values:
                            if name not in self.schema_source:
                                continue
                            export, published = self.schema_source[name]
                            index.use(self.spec(published), export)
                            schema_entries.append((name, export))
                        parts.append((kind, self.object_literal(schema_entries, 2)))
                    elif kind in ("parameters", "headers", "responses"):
                        named = [(n, c) for k, n, c in component_names if k == kind]
                        for _, const in named:
                            index.use("./components.js", const)
                        parts.append((kind, self.object_literal(named, 2)))
                    else:
                        parts.append((kind, self.prose(values, index, 2)))
                entries.append((key, self.object_literal(parts, 1)))
            else:
                entries.append((key, self.prose(value, index, 1, key)))
        route_types = "; ".join(f"{r}: typeof {r}" for r in routes)
        index.body.append(
            f"export const {api_name}: Api<{{ {route_types} }}> = defineApi({self.object_literal(entries, 0)});\n"
        )
        index.path.write_text(index.render(set()), encoding="utf-8")


def main(argv):
    args = [a for a in argv]
    out = args[args.index("--out") + 1] if "--out" in args else None
    only = set(args[args.index("--operations") + 1].split(",")) if "--operations" in args else None
    imports = args[args.index("--imports") + 1] if "--imports" in args else "relative"
    documents = [a for a in args if a.endswith((".yaml", ".yml"))]
    if not out or not documents:
        print(__doc__.strip().splitlines()[-2:], file=sys.stderr)
        return 2
    failed = 0
    for document in documents:
        converter = Converter(document, imports)
        results = converter.convert(out, only)
        converted = sum(1 for r in results.values() if r is None)
        print(f"{document}: {converted} of {len(results)} converted")
        for name, reason in results.items():
            if reason:
                failed += 1
                print(f"  NOT CONVERTED {name}: {reason}")
        for key, count in sorted(converter.metadata_only.items()):
            print(f"  carried as metadata only: {key} x{count}")
        for key, count in sorted(converter.vocabulary_notes.items()):
            print(f"  vocabulary: {key} x{count}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
