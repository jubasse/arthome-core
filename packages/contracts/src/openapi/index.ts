/**
 * An api's OpenAPI document, emitted from its routes and components, and from its docs: the prose,
 * upstream, maturity and examples its modules register (`./docs.ts`). What the docs say wins over
 * what a route still carries itself.
 *
 * Schemas go through ONE zod registry per direction: every component under its document name,
 * and every schema a route holds under a synthetic id. Without a registry `z.toJSONSchema`
 * inlines every nested object, so a `$ref` to a component never survives. A request is emitted
 * with `io: 'input'`, a response with `io: 'output'` (D-057), and `components/schemas` with
 * `output`.
 */

import { z } from 'zod';

import type { ApiDocs, ExampleRegistry, OperationDoc } from './docs.js';
import { maturityOf } from './docs.js';
import type {
  Api,
  ApiComponents,
  Header,
  MediaType,
  Parameter,
  RequestBody,
  Response,
  Route,
} from '../http/index.js';
import { versionedPath } from '../http/index.js';

type Io = 'input' | 'output';

export type OpenApiDocument = Readonly<Record<string, unknown>>;

/** What the path and the method say, not the operation. */
const STRUCTURE = new Set(['method', 'version', 'path']);

/** Written first, in this order, whatever order the declaration spells them. */
const FIRST = ['operationId', 'summary', 'description', 'x-arthome-maturity', 'x-arthome-upstream'];

/** Written last, in this order, whatever order the declaration spells them: the keys a reader scans for. */
const LAST = new Set(['security', 'parameters', 'requestBody', 'responses']);

/** What the server and the client read from a route and the document does not carry as a key of its own. */
const RUNTIME = new Set([
  'access',
  'requires',
  'budgetMs',
  'cache',
  'bodyLimit',
  'internal',
  'degradable',
  'owner',
  'paging',
  'errorCodes',
  'sortable',
  'expand',
]);

const SLOT_PREFIX = '__route_schema_';
const SCHEMA_REF_PREFIX = '#/components/schemas/';

class SchemaSlot {
  public json: unknown = undefined;

  public constructor(
    public readonly schema: z.ZodType,
    public readonly io: Io,
  ) {}
}

class DocumentBuilder {
  private readonly slots: SchemaSlot[] = [];
  private readonly componentRefs = new Map<object, string>();
  private readonly schemaNames = new Map<z.ZodType, string>();
  private slotCount = 0;

  public constructor(
    components: ApiComponents,
    private readonly examples: ExampleRegistry | undefined,
  ) {
    for (const [name, schema] of Object.entries(components.schemas ?? {})) {
      this.schemaNames.set(schema, name);
    }
    this.name(components.parameters, 'parameters');
    this.name(components.headers, 'headers');
    this.name(components.responses, 'responses');
  }

  private name(values: Readonly<Record<string, object>> | undefined, kind: string): void {
    for (const [name, value] of Object.entries(values ?? {})) {
      this.componentRefs.set(value, `#/components/${kind}/${name}`);
    }
  }

  private refOr(value: object, build: () => Record<string, unknown>): Record<string, unknown> {
    const ref = this.componentRefs.get(value);
    return ref === undefined ? build() : { $ref: ref };
  }

  private slot(schema: z.ZodType, io: Io): SchemaSlot {
    const slot = new SchemaSlot(schema, io);
    this.slots.push(slot);
    return slot;
  }

  private withSchema(value: object, schema: z.ZodType, io: Io): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = key === 'schema' ? this.slot(schema, io) : entry;
    }
    return out;
  }

  public parameter(parameter: Parameter): Record<string, unknown> {
    return this.withSchema(parameter, parameter.schema, 'input');
  }

  public header(header: Header): Record<string, unknown> {
    return this.withSchema(header, header.schema, 'output');
  }

  private media(media: MediaType, io: Io): Record<string, unknown> {
    const { exampleFrom: _derivation, ...declared } = media;
    const out = this.withSchema(declared, media.schema, io);
    const registered = this.registeredExampleOf(media);
    if (registered !== undefined) out.example = registered;
    return out;
  }

  /** The schema's own registered example, else the one derived from the record it wraps. */
  private registeredExampleOf(media: MediaType): unknown {
    const own = this.examples?.firstOf(media.schema);
    if (own !== undefined || media.exampleFrom === undefined) return own;
    const source = this.examples?.firstOf(media.exampleFrom.of);
    return source === undefined ? undefined : media.exampleFrom.as(source);
  }

  private content(
    content: Readonly<Record<string, MediaType>>,
    io: Io,
  ): Record<string, Record<string, unknown>> {
    const out: Record<string, Record<string, unknown>> = {};
    for (const [mediaType, media] of Object.entries(content))
      out[mediaType] = this.media(media, io);
    return out;
  }

  public response(response: Response): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(response)) {
      if (key === 'headers' && response.headers !== undefined) {
        const headers: Record<string, unknown> = {};
        for (const [name, header] of Object.entries(response.headers)) {
          headers[name] = this.refOr(header, () => this.header(header));
        }
        out[key] = headers;
      } else if (key === 'content' && response.content !== undefined) {
        out[key] = this.content(response.content, 'output');
      } else {
        out[key] = value;
      }
    }
    return out;
  }

  private requestBody(body: RequestBody): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      out[key] = key === 'content' ? this.content(body.content, 'input') : value;
    }
    return out;
  }

  public operation(route: Route, doc: OperationDoc | undefined): Record<string, unknown> {
    const declared: Readonly<Record<string, unknown>> = { ...route, ...documented(route, doc) };
    const out: Record<string, unknown> = {};
    for (const key of FIRST) if (declared[key] !== undefined) out[key] = declared[key];
    for (const [key, value] of Object.entries(declared)) {
      if (!STRUCTURE.has(key) && !LAST.has(key) && !RUNTIME.has(key) && !(key in out)) {
        out[key] = value;
      }
    }
    if (route.requires !== undefined && route.requires.length > 0) {
      out['x-arthome-requires'] = route.requires.map((rule) => ({
        name: rule.name,
        ...rule.params,
      }));
    }
    if (route.budgetMs !== undefined) out['x-arthome-budget-ms'] = route.budgetMs;
    if (route.internal === true) out['x-arthome-internal'] = true;
    if (route.degradable !== undefined) out['x-arthome-degradable'] = route.degradable;
    if (route.security !== undefined) out.security = route.security;
    if (route.parameters !== undefined) {
      out.parameters = route.parameters.map((parameter) =>
        this.refOr(parameter, () => this.parameter(parameter)),
      );
    }
    if (route.requestBody !== undefined) out.requestBody = this.requestBody(route.requestBody);
    const responses: Record<string, unknown> = {};
    for (const [status, response] of Object.entries(route.responses)) {
      responses[status] = this.refOr(response, () => this.response(response));
    }
    out.responses = responses;
    return out;
  }

  /** Emits every slot, and returns `components/schemas` as the output direction emits it. */
  public emitSchemas(): Record<string, unknown> {
    const slotJson = new Map<string, unknown>();
    let components: Record<string, unknown> = {};
    for (const io of ['output', 'input'] as const) {
      const registry = z.registry<{ id: string }>();
      for (const [schema, name] of this.schemaNames) registry.add(schema, { id: name });
      const slotIds = new Map<z.ZodType, string>();
      for (const slot of this.slots) {
        if (slot.io !== io || this.schemaNames.has(slot.schema) || slotIds.has(slot.schema)) {
          continue;
        }
        const id = `${SLOT_PREFIX}${String(this.slotCount++)}`;
        slotIds.set(slot.schema, id);
        registry.add(slot.schema, { id });
      }
      const { schemas } = z.toJSONSchema(registry, {
        io,
        uri: (id) => `${SCHEMA_REF_PREFIX}${id}`,
      });
      if ('__shared' in schemas) {
        throw new Error('openapi: a schema emitted shared definitions; a cycle has no place here.');
      }
      for (const [id, json] of Object.entries(schemas)) {
        if (id.startsWith(SLOT_PREFIX)) slotJson.set(id, stripped(json));
      }
      if (io === 'output') {
        components = {};
        for (const name of this.schemaNames.values()) components[name] = stripped(schemas[name]);
      }
      for (const slot of this.slots) {
        if (slot.io !== io) continue;
        const name = this.schemaNames.get(slot.schema);
        const id = slotIds.get(slot.schema);
        slot.json = name !== undefined ? { $ref: `${SCHEMA_REF_PREFIX}${name}` } : id;
      }
    }
    for (const slot of this.slots) {
      if (typeof slot.json === 'string') slot.json = inlined(slotJson.get(slot.json), slotJson);
    }
    return inlined(components, slotJson) as Record<string, unknown>;
  }
}

/** What the docs registry says of an operation, as the keys a route would carry. */
function documented(route: Route, doc: OperationDoc | undefined): Record<string, unknown> {
  if (doc === undefined) return {};
  const upstream = doc.upstream ?? (route['x-arthome-upstream'] as OperationDoc['upstream']);
  const derived = maturityOf(upstream ?? []);
  if (doc.maturity !== undefined && doc.maturity === derived) {
    throw new Error(
      `openapi: "${route.operationId}" states the maturity its owning service gives; leave it out.`,
    );
  }
  const maturity = doc.maturity ?? derived;
  if (maturity === undefined) {
    throw new Error(
      `openapi: "${route.operationId}" calls no service a maturity derives from; state its maturity.`,
    );
  }
  return {
    ...(doc.description !== undefined && { description: doc.description }),
    'x-arthome-maturity': maturity,
    ...(upstream !== undefined && { 'x-arthome-upstream': upstream }),
  };
}

function stripped(json: unknown): unknown {
  if (typeof json !== 'object' || json === null) return json;
  const { $schema: _schema, $id: _id, ...rest } = json as Record<string, unknown>;
  return rest;
}

/** A route schema reached from another one is a slot, not a component: copy it in place. */
function inlined(json: unknown, slots: ReadonlyMap<string, unknown>): unknown {
  if (Array.isArray(json)) return json.map((item: unknown) => inlined(item, slots));
  if (typeof json !== 'object' || json === null) return json;
  const ref = (json as { $ref?: unknown }).$ref;
  if (typeof ref === 'string' && ref.startsWith(`${SCHEMA_REF_PREFIX}${SLOT_PREFIX}`)) {
    const { $ref: _ref, ...siblings } = json as Record<string, unknown>;
    const target = slots.get(ref.slice(SCHEMA_REF_PREFIX.length));
    return { ...(inlined(target, slots) as Record<string, unknown>), ...siblings };
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(json)) out[key] = inlined(value, slots);
  return out;
}

function resolved(value: unknown): unknown {
  if (value instanceof SchemaSlot) return value.json;
  if (Array.isArray(value)) return value.map(resolved);
  if (typeof value !== 'object' || value === null) return value;
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) out[key] = resolved(entry);
  return out;
}

function componentsOf(
  builder: DocumentBuilder,
  components: ApiComponents,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [kind, values] of Object.entries(components)) {
    if (kind === 'schemas' || values === undefined) continue;
    const entries: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(values as Record<string, unknown>)) {
      if (kind === 'parameters') entries[name] = builder.parameter(value as Parameter);
      else if (kind === 'headers') entries[name] = builder.header(value as Header);
      else if (kind === 'responses') entries[name] = builder.response(value as Response);
      else entries[name] = value;
    }
    out[kind] = entries;
  }
  return out;
}

/** `oneOf` with a `discriminator` and no `mapping`: map each tag value to the component that fixes it. */
function mapped(json: unknown, schemas: Readonly<Record<string, unknown>>): unknown {
  if (Array.isArray(json)) return json.map((item: unknown) => mapped(item, schemas));
  if (typeof json !== 'object' || json === null) return json;
  const node = json as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) out[key] = mapped(value, schemas);
  const discriminator = node.discriminator as
    { propertyName?: string; mapping?: unknown } | undefined;
  if (
    Array.isArray(node.oneOf) &&
    discriminator?.propertyName !== undefined &&
    discriminator.mapping === undefined
  ) {
    const mapping: Record<string, string> = {};
    for (const option of node.oneOf as readonly { $ref?: string }[]) {
      const ref = option.$ref;
      if (!ref?.startsWith(SCHEMA_REF_PREFIX)) return out;
      const target = schemas[ref.slice(SCHEMA_REF_PREFIX.length)] as
        { properties?: Record<string, { const?: unknown; enum?: readonly unknown[] }> } | undefined;
      const property = target?.properties?.[discriminator.propertyName];
      const values = property?.const !== undefined ? [property.const] : (property?.enum ?? []);
      for (const value of values) mapping[String(value)] = ref;
    }
    out.discriminator = { ...discriminator, mapping };
  }
  return out;
}

function extensionsOf(source: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(source).filter(([key]) => key.startsWith('x-')));
}

function undocumentedOperations(api: Api, docs: ApiDocs | undefined): readonly string[] {
  return Object.keys(docs?.operations ?? {}).filter((operationId) => !(operationId in api.routes));
}

export function openApiDocumentOf(api: Api, docs?: ApiDocs): OpenApiDocument {
  const strays = undocumentedOperations(api, docs);
  if (strays.length > 0) {
    throw new Error(`openapi: documented, but not an operation of this api: ${strays.join(', ')}.`);
  }
  const info = docs?.info ?? api.info;
  if (info === undefined) throw new Error('openapi: the document has no `info`.');
  const servers = docs?.servers ?? api.servers;
  const tags = docs?.tags ?? api.tags;
  const securitySchemes = docs?.securitySchemes ?? api.components.securitySchemes;
  const { securitySchemes: _declared, ...components } = api.components;
  const builder = new DocumentBuilder(api.components, docs?.examples);
  const paths: Record<string, Record<string, unknown>> = {};
  for (const route of Object.values(api.routes)) {
    const path = versionedPath(route);
    const operation = builder.operation(route, docs?.operations[route.operationId]);
    paths[path] = { ...paths[path], [route.method]: operation };
  }
  const document: Record<string, unknown> = {
    openapi: api.openapi,
    ...extensionsOf(api),
    ...(docs !== undefined && extensionsOf(docs)),
    info,
    ...(servers !== undefined && { servers }),
    ...(tags !== undefined && { tags }),
    ...(api.security !== undefined && { security: api.security }),
    paths,
    components: componentsOf(builder, {
      ...(securitySchemes !== undefined && { securitySchemes }),
      ...components,
    }),
  };
  const schemas = builder.emitSchemas();
  const out = resolved(document) as Record<string, unknown>;
  if (api.components.schemas !== undefined) {
    out.components = { ...(out.components as Record<string, unknown>), schemas };
  }
  return mapped(out, schemas) as Record<string, unknown>;
}

export * from './docs.js';
