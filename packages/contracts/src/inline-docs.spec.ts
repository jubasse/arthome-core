import { describe, expect, it } from 'vitest';

import type { Api } from './http/index.js';
import type { ApiDocs } from './openapi/index.js';
import { openApiDocumentOf } from './openapi/index.js';
import { storefrontDocs } from './storefront-api/docs.js';
import { storefrontApi } from './storefront-api/index.js';
import { streamingServiceDocs } from './streaming-service-api/docs.js';
import { streamingServiceApi } from './streaming-service-api/index.js';
import { studioDocs } from './studio-api/docs.js';
import { studioApi } from './studio-api/index.js';

/** What only the document reads is registered in a module's `docs.ts` and `examples.ts`, and the emitter refuses a route that writes its own. */
describe.each([
  ['storefront', storefrontApi, storefrontDocs],
  ['studio', studioApi, studioDocs],
  ['streaming service', streamingServiceApi, streamingServiceDocs],
] as const)('docs and examples out of the routes, %s', (_name, api: Api, docs: ApiDocs) => {
  it('has no route carry a description, a doc-only x-arthome-* or an example itself', () => {
    expect(() => openApiDocumentOf(api, docs)).not.toThrow();
  });
});
