/**
 * A union discriminated on one field, in the three forms it is read in. The server is strict: only
 * a declared variant is emitted. The document is a `oneOf` with its `discriminator`, which zod does
 * not write. The client is tolerant (`transport.md` §5.11): a variant it does not know is kept raw
 * and treated as neutral, never a failure, so a variant added later is additive.
 */

import { z } from 'zod';

type Variants = Readonly<Record<string, z.ZodObject>>;

type Union<Tag extends string, V extends Variants> = {
  [K in keyof V & string]: z.output<V[K]> & Readonly<Record<Tag, K>>;
}[keyof V & string];

function tagOf(keys: readonly string[]): z.ZodType {
  const [only, ...others] = keys;
  return only !== undefined && others.length === 0
    ? z.literal(only)
    : z.enum(keys as [string, ...string[]]);
}

/**
 * `tagged('outcome', { succeeded: Succeeded, declined: Declined })`: each variant is an object
 * schema without the tag, and the helper adds it. Two keys may name one schema (a variant that
 * serves two tag values), and its tag then takes both.
 */
export function tagged<const Tag extends string, const V extends Variants>(
  tag: Tag,
  variants: V,
): z.ZodType<Union<Tag, V>> {
  const byVariant = new Map<z.ZodObject, string[]>();
  for (const [key, schema] of Object.entries(variants)) {
    byVariant.set(schema, [...(byVariant.get(schema) ?? []), key]);
  }
  const options = [...byVariant].map(([schema, keys]) => schema.extend({ [tag]: tagOf(keys) }));
  return z
    .discriminatedUnion(tag, options as unknown as [z.ZodObject, ...z.ZodObject[]])
    .meta({ discriminator: { propertyName: tag } }) as unknown as z.ZodType<Union<Tag, V>>;
}

export type TolerantParse =
  | { readonly ok: true; readonly value: unknown; readonly unknownVariants: readonly string[] }
  | { readonly ok: false; readonly error: z.ZodError };

function valueAt(root: unknown, path: readonly PropertyKey[]): unknown {
  let current = root;
  for (const key of path) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<PropertyKey, unknown>)[key];
  }
  return current;
}

/**
 * Parses with the schema, and accepts a value whose only faults are variants of a tagged union it
 * does not know: the value comes back raw, with the unknown tags named.
 */
export function parseTolerant(schema: z.ZodType, value: unknown): TolerantParse {
  const result = schema.safeParse(value);
  if (result.success) return { ok: true, value: result.data, unknownVariants: [] };
  const unknown: string[] = [];
  for (const issue of result.error.issues) {
    const isUnknownTag =
      issue.code === 'invalid_union' &&
      (issue as { note?: string }).note === 'No matching discriminator';
    if (!isUnknownTag) return { ok: false, error: result.error };
    unknown.push(String(valueAt(value, issue.path)));
  }
  return { ok: true, value, unknownVariants: unknown };
}
