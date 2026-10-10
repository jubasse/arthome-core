import { describe, expect, it } from 'vitest';

import type { Api } from './http/index.js';
import { strippingBodiesOf } from './http/index.js';
import { storefrontApi } from './storefront-api/index.js';
import { streamingServiceApi } from './streaming-service-api/index.js';
import { studioApi } from './studio-api/index.js';

describe.each([
  ['storefront', storefrontApi],
  ['studio', studioApi],
  ['streaming service', streamingServiceApi],
] as const)('deny by default, %s', (_name, api: Api) => {
  it('has every route declare its access, a plain defineRoute included', () => {
    const lacking = Object.values(api.routes)
      .filter((route) => route.access === undefined)
      .map((route) => route.operationId);

    expect(lacking).toEqual([]);
  });
});

describe.each([
  ['storefront', storefrontApi],
  ['studio', studioApi],
  ['streaming service', streamingServiceApi],
] as const)('the stripping schemas, %s', (_name, api: Api) => {
  it('exist for every success response of every route', () => {
    for (const route of Object.values(api.routes)) {
      const bodies = strippingBodiesOf(route);
      const declared = Object.entries(route.responses).filter(
        ([status, response]) =>
          status.startsWith('2') && response.content?.['application/json'] !== undefined,
      );
      expect(Object.keys(bodies).sort()).toEqual(declared.map(([status]) => status).sort());
    }
  });
});
