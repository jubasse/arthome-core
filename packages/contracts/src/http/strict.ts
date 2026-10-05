/**
 * Strict on emit (ADR principle 2). The response schemas are loose objects so that a client reads
 * tolerantly, which is right for the client and wrong for the server: a handler could return any
 * extra field and it would reach the wire. `stripping(schema)` is the same schema with every loose
 * object turned into one that strips what it does not declare, deeply, and `strippingBodiesOf` gives
 * it for each success response of a route, for the platform's serializer.
 */

import { z } from 'zod';

import type { RouteShape } from './index.js';
import { defOf, isLeafKind, unknownKind } from './schema-kinds.js';

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
    case 'optional': {
      const stripped = again(def.innerType);
      return keptMeta(
        schema,
        schema instanceof z.ZodExactOptional ? stripped.exactOptional() : stripped.optional(),
      );
    }
    case 'nullable':
      return keptMeta(schema, again(def.innerType).nullable());
    case 'default':
      return keptMeta(schema, again(def.innerType).default(def.defaultValue as never));
    case 'prefault':
      return keptMeta(schema, again(def.innerType).prefault(def.defaultValue as never));
    case 'nonoptional':
      return keptMeta(schema, again(def.innerType).nonoptional());
    case 'readonly':
      return keptMeta(schema, again(def.innerType).readonly());
    case 'catch':
      return keptMeta(schema, again(def.innerType).catch(def.catchValue as never));
    case 'success':
      return keptMeta(schema, z.success(again(def.innerType)));
    case 'promise':
      return keptMeta(schema, z.promise(again(def.innerType)));
    case 'lazy': {
      let stripped: z.ZodType | undefined;
      return keptMeta(
        schema,
        z.lazy(() => (stripped ??= again((def.getter as () => unknown)()))),
      );
    }
    case 'pipe':
      return keptMeta(schema, z.pipe(again(def.in), again(def.out)));
    case 'transform':
      return schema;
    case 'tuple': {
      const items = (def.items as readonly unknown[]).map(again);
      const rest = def.rest === null ? null : again(def.rest);
      return keptMeta(schema, z.tuple(items as never, rest as never));
    }
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
    case 'map':
      return keptMeta(schema, z.map(again(def.keyType), again(def.valueType)));
    case 'set':
      return keptMeta(schema, z.set(again(def.valueType)));
    default:
      if (isLeafKind(def.type)) return schema;
      return unknownKind('the stripping walker', def.type);
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
