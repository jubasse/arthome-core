/**
 * The listing of an api's routes, built from the blocks that declare them. A block is a record of
 * routes keyed by operation id, which a resource closure returns and `crud` spreads; it may nest
 * records. `collect` flattens them into the `routes` record `defineApi` takes, and refuses a key
 * that is not the route's operation id, or an id declared twice.
 */

import type { RouteShape } from './index.js';

interface RouteValue extends RouteShape {
  readonly operationId: string;
}

export interface RouteTree {
  readonly [key: string]: RouteValue | RouteTree;
}

type UnionToIntersection<U> = (U extends unknown ? (value: U) => void : never) extends (
  value: infer I,
) => void
  ? I
  : never;

type Leaves<T> = {
  [K in keyof T]: T[K] extends RouteValue ? { readonly [P in K]: T[K] } : Leaves<T[K]>;
}[keyof T];

type Flatten<T> = { [K in keyof T]: T[K] } & {};

export type Collected<Trees extends readonly RouteTree[]> = Flatten<
  UnionToIntersection<Leaves<Trees[number]>>
>;

function isRoute(value: unknown): value is RouteValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { operationId?: unknown }).operationId === 'string' &&
    typeof (value as { method?: unknown }).method === 'string'
  );
}

export function collect<const Trees extends readonly RouteTree[]>(
  ...trees: Trees
): Collected<Trees> {
  const out: Record<string, RouteValue> = {};
  const visit = (tree: RouteTree): void => {
    for (const [key, value] of Object.entries(tree)) {
      if (!isRoute(value)) {
        visit(value);
        continue;
      }
      if (key !== value.operationId) {
        throw new Error(`collect: the route under "${key}" is operation "${value.operationId}".`);
      }
      if (key in out) throw new Error(`collect: operation "${key}" is declared twice.`);
      out[key] = value;
    }
  };
  for (const tree of trees) visit(tree);
  return out as Collected<Trees>;
}
