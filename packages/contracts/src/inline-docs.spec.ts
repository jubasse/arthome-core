import { describe, expect, it } from 'vitest';

import type { Api, Route } from './http/index.js';
import { storefrontApi } from './storefront-api/index.js';
import { studioApi } from './studio-api/index.js';

const DOC_ONLY_KEYS = [
  'x-arthome-maturity',
  'x-arthome-upstream',
  'x-arthome-freshness',
  'x-arthome-idempotency-exemption',
] as const;

/** An example written in place: an example by reference, or derived from a registered one, is not. */
function writesAnExample(route: Route, shared: ReadonlySet<unknown>): boolean {
  const media = [
    ...Object.values(route.requestBody?.content ?? {}),
    ...Object.values(route.responses)
      .filter((response) => !shared.has(response))
      .flatMap((response) => Object.values(response.content ?? {})),
  ];
  return media.some(
    (entry) =>
      entry.example !== undefined ||
      Object.values(entry.examples ?? {}).some(
        (example) => typeof example !== 'object' || example === null || !('$ref' in example),
      ),
  );
}

/** What only the document reads is registered in a module's `docs.ts` and `examples.ts`, never in a route. */
describe.each([
  ['storefront', storefrontApi],
  ['studio', studioApi],
] as const)('docs and examples out of the routes, %s', (_name, api: Api) => {
  it('has no route carry a description, a doc-only x-arthome-* or an example itself', () => {
    const shared = new Set<unknown>(Object.values(api.components.responses ?? {}));
    const carrying = Object.values(api.routes)
      .filter(
        (route) =>
          route.description !== undefined ||
          DOC_ONLY_KEYS.some((key) => key in route) ||
          writesAnExample(route, shared),
      )
      .map((route) => route.operationId);

    expect(carrying).toEqual([]);
  });
});
