import type { z } from 'zod';

export type Def = { readonly type: string } & Readonly<Record<string, unknown>>;

export function defOf(schema: z.ZodType): Def {
  return (schema as unknown as { _zod: { def: Def } })._zod.def;
}

const LEAF_KINDS: ReadonlySet<string> = new Set([
  'any',
  'bigint',
  'boolean',
  'custom',
  'date',
  'enum',
  'file',
  'function',
  'literal',
  'nan',
  'never',
  'null',
  'number',
  'string',
  'symbol',
  'template_literal',
  'undefined',
  'unknown',
  'void',
]);

const OPEN_CATCHALLS: ReadonlySet<string> = new Set(['unknown', 'never']);

export function isLeafKind(kind: string): boolean {
  return LEAF_KINDS.has(kind);
}

/** The walkers fail closed: a container they cannot see into would hide whatever it holds. */
export function unknownKind(walker: string, kind: string): never {
  throw new Error(`${walker} does not know the zod schema kind "${kind}"`);
}

export interface Child {
  readonly schema: z.ZodType;
  readonly step: string;
  readonly field?: true;
}

export function pathBelow(path: string, child: Child): string {
  if (child.field === undefined) return `${path}${child.step}`;
  return path === '' ? child.step : `${path}.${child.step}`;
}

/** What a schema holds and the path step to each part, or nothing for a leaf. Throws on a kind not listed. */
export function childrenOf(walker: string, schema: z.ZodType): readonly Child[] {
  const def = defOf(schema);
  const here = (inner: unknown): Child => ({ schema: inner as z.ZodType, step: '' });
  switch (def.type) {
    case 'optional':
    case 'nullable':
    case 'default':
    case 'prefault':
    case 'nonoptional':
    case 'readonly':
    case 'catch':
    case 'success':
    case 'promise':
      return [here(def.innerType)];
    case 'lazy':
      return [here((def.getter as () => unknown)())];
    case 'pipe':
      return [here(def.in), here(def.out)];
    case 'transform':
      return [];
    case 'intersection':
      return [here(def.left), here(def.right)];
    case 'union':
      return (def.options as readonly unknown[]).map(here);
    case 'array':
      return [{ schema: def.element as z.ZodType, step: '[]' }];
    case 'set':
      return [{ schema: def.valueType as z.ZodType, step: '[]' }];
    case 'tuple': {
      const items = (def.items as readonly z.ZodType[]).map((item, index) => ({
        schema: item,
        step: `[${index}]`,
      }));
      return def.rest === null ? items : [...items, { schema: def.rest as z.ZodType, step: '[]' }];
    }
    case 'record':
    case 'map':
      return [{ schema: def.valueType as z.ZodType, step: '.*' }];
    case 'object': {
      const shape = def.shape as Readonly<Record<string, z.ZodType>>;
      const fields = Object.entries(shape).map(([key, field]) => ({
        schema: field,
        step: key,
        field: true as const,
      }));
      const catchall = def.catchall as z.ZodType | undefined;
      const rest =
        catchall === undefined || OPEN_CATCHALLS.has(defOf(catchall).type)
          ? []
          : [{ schema: catchall, step: '.*' }];
      return [...fields, ...rest];
    }
    default:
      if (isLeafKind(def.type)) return [];
      return unknownKind(walker, def.type);
  }
}
