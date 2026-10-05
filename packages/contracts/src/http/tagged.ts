/**
 * A union discriminated on one field, in the three forms it is read in. The server is strict: only
 * a declared variant is emitted. The document is a `oneOf` with its `discriminator`, which zod does
 * not write. The client is tolerant (`transport.md` §5.11): a variant it does not know is kept raw
 * and treated as neutral, never a failure, so a variant added later is additive.
 */

import { z } from 'zod';

type Variants = Readonly<Record<string, z.ZodObject>>;

/** Type-only: marks a union as tagged on `Tag`, so the client's view of it can add the unknown variant. */
export interface TaggedBrand<Tag extends string> {
  readonly '~tagged'?: Tag;
}

type Union<Tag extends string, V extends Variants> = {
  [K in keyof V & string]: z.output<V[K]> & Readonly<Record<Tag, K>> & TaggedBrand<Tag>;
}[keyof V & string];

/** What `tagged` returns: the explicit type of an exported union, under `isolatedDeclarations`. */
export type TaggedSchema<Tag extends string, V extends Variants> = z.ZodType<Union<Tag, V>>;

/** A variant the client does not know yet: kept raw, and treated as neutral (`transport.md` §5.11). */
export type UnknownVariant<Tag extends string> = Readonly<Record<Tag, string & {}>> &
  Readonly<Record<string, unknown>>;

/**
 * What a client may receive: each tagged union of a body gains the unknown variant, so an exhaustive
 * `switch` on the tag must handle it. The server's types do not: it never emits one.
 */
export type ClientView<T> = T extends readonly (infer Item)[]
  ? ClientView<Item>[]
  : T extends TaggedBrand<infer Tag>
    ? string extends Tag
      ? { [K in keyof T]: ClientView<T[K]> }
      : T | UnknownVariant<Tag>
    : T extends object
      ? { [K in keyof T]: ClientView<T[K]> }
      : T;

/**
 * Several tag values are a string that accepts exactly them, not an enum: a response schema never
 * freezes a closed list into the document (`check-openapi` R14), and the union still routes on it.
 * A field the variant declared lends its metadata (description, vocabulary).
 */
function tagField(keys: readonly string[], declared: z.ZodType | undefined): z.ZodType {
  const meta = declared?.meta() ?? {};
  const [only, ...others] = keys;
  if (only !== undefined && others.length === 0) return z.literal(only).meta(meta);
  const field = z
    .string()
    .check(z.refine((value) => keys.includes(value)))
    .meta(meta);
  field._zod.values = new Set(keys);
  return field;
}

/**
 * `tagged('outcome', { succeeded: Succeeded, declined: Declined })`: each variant is an object
 * schema without the tag, and the helper adds it. Two keys may name one schema (a variant that
 * serves two tag values), and its tag then takes both. A variant that declares the tag field itself
 * lends the metadata of that field (its description and vocabulary) to the tag the helper writes.
 */
export function tagged<const Tag extends string, const V extends Variants>(
  tag: Tag,
  variants: V,
): TaggedSchema<Tag, V> {
  const byVariant = new Map<z.ZodObject, string[]>();
  for (const [key, schema] of Object.entries(variants)) {
    byVariant.set(schema, [...(byVariant.get(schema) ?? []), key]);
  }
  const options = [...byVariant].map(([schema, keys]) =>
    schema
      .extend({ [tag]: tagField(keys, schema.shape[tag] as z.ZodType | undefined) })
      .meta(schema.meta() ?? {}),
  );
  return z
    .discriminatedUnion(tag, options as unknown as [z.ZodObject, ...z.ZodObject[]])
    .meta({ discriminator: { propertyName: tag } }) as unknown as TaggedSchema<Tag, V>;
}

/** The variant a tag value selects, as the union holds it: the schema to register as that variant's component. */
export function variantOf(union: z.ZodType, key: string): z.ZodObject {
  const { discriminator, options } = (
    union as unknown as {
      _zod: { def: { discriminator: string; options: readonly z.ZodObject[] } };
    }
  )._zod.def;
  const found = options.find((option) => option._zod.propValues?.[discriminator]?.has(key));
  if (found === undefined) throw new Error(`variantOf: no variant is selected by '${key}'`);
  return found;
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
