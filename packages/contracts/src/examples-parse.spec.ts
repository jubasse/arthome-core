import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { Api, MediaType, Route } from './http/index.js';
import type { ApiDocs } from './openapi/docs.js';
import { storefrontDocs } from './storefront-api/docs.js';
import { storefrontApi } from './storefront-api/index.js';
import { studioDocs } from './studio-api/docs.js';
import { studioApi } from './studio-api/index.js';

const APIS: readonly (readonly [string, Api, ApiDocs])[] = [
  ['storefront', storefrontApi, storefrontDocs],
  ['studio', studioApi, studioDocs],
];

function failureOf(schema: z.ZodType, example: unknown): string | undefined {
  const parsed = schema.safeParse(example);
  if (parsed.success) return undefined;
  return parsed.error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join('.')} ${issue.code}`)
    .join('; ');
}

function mediaOf(route: Route): readonly MediaType[] {
  return [
    ...Object.values(route.requestBody?.content ?? {}),
    ...Object.values(route.responses).flatMap((response) => Object.values(response.content ?? {})),
  ];
}

function isSchema(value: unknown): value is z.ZodType {
  return value instanceof z.ZodType;
}

/** Every schema reachable from `root`, through its definition, its fields and its parent. */
function* schemasUnder(root: z.ZodType, seen: Set<z.ZodType>): Generator<z.ZodType> {
  if (seen.has(root)) return;
  seen.add(root);
  yield root;
  const children: z.ZodType[] = [];
  const definition = { ...root._zod.def } satisfies Readonly<Record<string, unknown>>;
  for (const [key, value] of Object.entries<unknown>(definition)) {
    if (isSchema(value)) children.push(value);
    else if (Array.isArray(value)) children.push(...value.filter(isSchema));
    else if (key === 'shape' && typeof value === 'object' && value !== null) {
      children.push(...Object.values(value).filter(isSchema));
    }
  }
  const parent = root._zod.parent;
  if (isSchema(parent)) children.push(parent);
  for (const child of children) yield* schemasUnder(child, seen);
}

function rootsOf(route: Route): readonly z.ZodType[] {
  return [
    ...(route.parameters ?? []).map((parameter) => parameter.schema),
    ...mediaOf(route).map((media) => media.schema),
  ];
}

describe('ADR §9.6: every example parses with its schema', () => {
  it.each(APIS)('%s: every registered example', (_name, _api, docs) => {
    const failures: string[] = [];
    for (const [schema, examples] of docs.examples.entries) {
      for (const example of examples) {
        const failure = failureOf(schema, example);
        if (failure !== undefined)
          failures.push(`${JSON.stringify(example).slice(0, 80)}: ${failure}`);
      }
    }

    expect(failures).toEqual([]);
  });

  it.each(APIS)('%s: every example a schema writes in its `.meta`', (_name, api) => {
    const failures: string[] = [];
    const seen = new Set<z.ZodType>();
    for (const route of Object.values(api.routes)) {
      for (const root of rootsOf(route)) {
        for (const schema of schemasUnder(root, seen)) {
          const meta = z.globalRegistry.get(schema) as { examples?: unknown } | undefined;
          const examples: readonly unknown[] = Array.isArray(meta?.examples) ? meta.examples : [];
          for (const example of examples) {
            const failure = failureOf(schema, example);
            if (failure !== undefined) failures.push(`${JSON.stringify(example)}: ${failure}`);
          }
        }
      }
    }

    expect(failures).toEqual([]);
  });
});

describe('the docs registry is the one place a converted operation is documented', () => {
  it.each(APIS)(
    '%s: a route carries no prose or upstream its docs state, and no other maturity',
    (_name, api, docs) => {
      const twice = Object.entries(docs.operations).filter(([operationId, doc]) => {
        const route = api.routes[operationId];
        const carried = route?.['x-arthome-maturity'];
        return (
          (doc.description !== undefined && route?.description !== undefined) ||
          (doc.upstream !== undefined && route?.['x-arthome-upstream'] !== undefined) ||
          (doc.maturity !== undefined && carried !== undefined && carried !== doc.maturity)
        );
      });

      expect(twice.map(([operationId]) => operationId)).toEqual([]);
    },
  );

  it.each(APIS)(
    '%s: a schema with registered examples carries none in its `.meta`',
    (_name, _api, docs) => {
      const twice = docs.examples.entries.filter(([schema]) => {
        const meta = z.globalRegistry.get(schema) as { examples?: unknown } | undefined;
        return meta?.examples !== undefined;
      });

      expect(twice.length).toBe(0);
    },
  );
});
