/**
 * An api's OpenAPI document, emitted from its routes and components.
 *
 * Schemas go through ONE zod registry per direction: every component under its document name,
 * and every schema a route holds under a synthetic id. Without a registry `z.toJSONSchema`
 * inlines every nested object, so a `$ref` to a component never survives. A request is emitted
 * with `io: 'input'`, a response with `io: 'output'` (D-057), and `components/schemas` with
 * `output`.
 */

import { z } from 'zod';

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

type Io = 'input' | 'output';

export type OpenApiDocument = Readonly<Record<string, unknown>>;

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

  public constructor(components: ApiComponents) {
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
    return this.withSchema(media, media.schema, io);
  }

  private content(
    content: Readonly<Record<string, MediaType>>,
    io: Io,
  ): Record<string, Record<string, unknown>> {
    const out: Record<string, Record<string, unknown>> = {};
    for (const [mediaType, media] of Object.entries(content)) out[mediaType] = this.media(media, io);
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

  public operation(route: Route): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(route)) {
      if (key === 'method' || key === 'path') continue;
      if (key === 'parameters' && route.parameters !== undefined) {
        out[key] = route.parameters.map((parameter) =>
          this.refOr(parameter, () => this.parameter(parameter)),
        );
      } else if (key === 'requestBody' && route.requestBody !== undefined) {
        out[key] = this.requestBody(route.requestBody);
      } else if (key === 'responses') {
        const responses: Record<string, unknown> = {};
        for (const [status, response] of Object.entries(route.responses)) {
          responses[status] = this.refOr(response, () => this.response(response));
        }
        out[key] = responses;
      } else {
        out[key] = value;
      }
    }
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

export function openApiDocumentOf(api: Api): OpenApiDocument {
  const builder = new DocumentBuilder(api.components);
  const document: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(api)) {
    if (key === 'routes') {
      const paths: Record<string, Record<string, unknown>> = {};
      for (const route of Object.values(api.routes)) {
        paths[route.path] ??= {};
        paths[route.path] = { ...paths[route.path], [route.method]: builder.operation(route) };
      }
      document.paths = paths;
    } else if (key === 'components') {
      document[key] = componentsOf(builder, api.components);
    } else {
      document[key] = value;
    }
  }
  const schemas = builder.emitSchemas();
  const out = resolved(document) as Record<string, unknown>;
  if (api.components.schemas !== undefined) {
    out.components = { ...(out.components as Record<string, unknown>), schemas };
  }
  return out;
}
