/**
 * Marks a schema carries for the server to read: a field that must never be logged or cached
 * (`sensitive`), and a field only some callers may see (`restricted`). The mark is metadata, so the
 * schema parses as before; `sensitivePathsOf` and `restrictedFieldsOf` walk a schema and say where
 * each mark is, so the server redacts and projects from the declaration and no field list is
 * written twice.
 */

import { z } from 'zod';

import { childrenOf, pathBelow } from './schema-kinds.js';

export const SENSITIVE_KEY = 'x-arthome-sensitive';
export const RESTRICTED_KEY = 'x-arthome-restricted';

/** A password, a token, a stream key: `format: password` in the document, redacted from logs, never cached. */
export function sensitive<S extends z.ZodType>(schema: S): S {
  return schema.meta({ format: 'password', [SENSITIVE_KEY]: true });
}

/**
 * A field present only for a caller who holds `right`: optional in the type and in the document,
 * absent from the answer otherwise, never present and null.
 *
 * @param meta the field's own metadata, given here rather than through a `.meta()` of its own: a
 *   second `.meta()` on a schema the document names (`MoneyOut`) writes it out in full.
 */
export function restricted<S extends z.ZodType, const Right extends string>(
  schema: S,
  right: Right,
  meta: Readonly<Record<string, unknown>> = {},
): z.ZodOptional<S> {
  return schema.meta({ ...meta, [RESTRICTED_KEY]: right }).optional();
}

function metaOf(schema: z.ZodType): Readonly<Record<string, unknown>> {
  return z.globalRegistry.get(schema) ?? {};
}

type Visit = (path: string, meta: Readonly<Record<string, unknown>>) => void;

function walk(
  schema: z.ZodType,
  path: string,
  visit: Visit,
  seen: Map<z.ZodType, Set<string>>,
  ancestors: ReadonlySet<z.ZodType>,
): void {
  if (ancestors.has(schema)) return;
  const paths = seen.get(schema) ?? new Set<string>();
  if (paths.has(path)) return;
  paths.add(path);
  seen.set(schema, paths);
  visit(path, metaOf(schema));
  const within = new Set(ancestors).add(schema);
  for (const child of childrenOf('the marks walker', schema)) {
    walk(child.schema, pathBelow(path, child), visit, seen, within);
  }
}

/** The dotted paths of the sensitive fields: `reauthToken`, `data.streamKey`, `items[].secret`. */
export function sensitivePathsOf(schema: z.ZodType): readonly string[] {
  const out: string[] = [];
  walk(
    schema,
    '',
    (path, meta) => {
      if (meta[SENSITIVE_KEY] === true) out.push(path);
    },
    new Map(),
    new Set(),
  );
  return out;
}

export interface RestrictedField {
  readonly path: string;
  readonly right: string;
}

/** Each restricted field with the right that unlocks it. */
export function restrictedFieldsOf(schema: z.ZodType): readonly RestrictedField[] {
  const out: RestrictedField[] = [];
  walk(
    schema,
    '',
    (path, meta) => {
      const right = meta[RESTRICTED_KEY];
      if (typeof right === 'string') out.push({ path, right });
    },
    new Map(),
    new Set(),
  );
  return out;
}
