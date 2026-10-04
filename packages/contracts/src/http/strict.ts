/**
 * Strict on emit (ADR principle 2). The response schemas are loose objects so that a client reads
 * tolerantly, which is right for the client and wrong for the server: a handler could return any
 * extra field and it would reach the wire. `stripping(schema)` is the same schema with every loose
 * object turned into one that strips what it does not declare, deeply, and `strippingBodiesOf` gives
 * it for each success response of a route, for the platform's serializer.
 */

import { z } from 'zod';

import type { RouteShape } from './index.js';

type Def = { readonly type: string } & Readonly<Record<string, unknown>>;

function defOf(schema: z.ZodType): Def {
  return (schema as unknown as { _zod: { def: Def } })._zod.def;
}

function keptMeta<S extends z.ZodType>(from: z.ZodType, to: S): S {
  const meta = z.globalRegistry.get(from);
  return meta === undefined ? to : to.meta(meta);
}

/** The schema with each loose object turned into a stripping one. A schema with no object in it is returned as it is. */
export function stripping(schema: z.ZodType): z.ZodType {
  const def = defOf(schema);
  const again = (inner: unknown): z.ZodType => stripping(inner as z.ZodType);
  switch (def.type) {
    case 'object': {
      const shape = Object.fromEntries(
        Object.entries(def.shape as Readonly<Record<string, z.ZodType>>).map(([key, field]) => [
          key,
          again(field),
        ]),
      );
      return keptMeta(schema, z.object(shape));
    }
    case 'array':
      return keptMeta(schema, z.array(again(def.element)));
    case 'optional':
      return keptMeta(schema, again(def.innerType).optional());
    case 'nullable':
      return keptMeta(schema, again(def.innerType).nullable());
    case 'default':
      return keptMeta(schema, again(def.innerType).default(def.defaultValue as never));
    case 'readonly':
      return keptMeta(schema, again(def.innerType).readonly());
    case 'intersection':
      return keptMeta(schema, z.intersection(again(def.left), again(def.right)));
    case 'union': {
      const options = (def.options as readonly z.ZodType[]).map(again);
      const [first, second, ...rest] = options;
      if (first === undefined || second === undefined) return schema;
      const stripped = def.discriminator
        ? z.discriminatedUnion(def.discriminator as string, options as never)
        : z.union([first, second, ...rest]);
      return keptMeta(schema, stripped);
    }
    case 'record':
      return keptMeta(schema, z.record(def.keyType as z.ZodString, again(def.valueType)));
    default:
      return schema;
  }
}

const cache = new WeakMap<object, Readonly<Record<string, z.ZodType>>>();

/** The stripping schema of each success response of a route that has a JSON body, by status. */
export function strippingBodiesOf(route: RouteShape): Readonly<Record<string, z.ZodType>> {
  const held = cache.get(route);
  if (held !== undefined) return held;
  const out: Record<string, z.ZodType> = {};
  for (const [status, response] of Object.entries(route.responses)) {
    const schema = response.content?.['application/json']?.schema;
    if (status.startsWith('2') && schema !== undefined) out[status] = stripping(schema);
  }
  cache.set(route, out);
  return out;
}
