import { describe, expect, it } from 'vitest';

import type { Upstream } from '@arthome/core';

import type { Api } from './http/index.js';
import type { ApiDocs } from './openapi/index.js';
import { maturityOf, openApiDocumentOf } from './openapi/index.js';
import { storefrontDocs } from './storefront-api/docs.js';
import { storefrontApi } from './storefront-api/index.js';
import { streamingServiceDocs } from './streaming-service-api/docs.js';
import { streamingServiceApi } from './streaming-service-api/index.js';
import { studioDocs } from './studio-api/docs.js';
import { studioApi } from './studio-api/index.js';

const APIS: readonly (readonly [string, Api, ApiDocs])[] = [
  ['storefront', storefrontApi, storefrontDocs],
  ['studio', studioApi, studioDocs],
  ['streaming service', streamingServiceApi, streamingServiceDocs],
];

type Operation = Readonly<Record<string, unknown>>;

describe('transport.md §5.11: an operation has its owning service’s maturity', () => {
  it.each(APIS)('%s: or one its docs state, with the reason', (_name, api, docs) => {
    const { paths } = openApiDocumentOf(api, docs) as {
      readonly paths: Readonly<Record<string, Readonly<Record<string, Operation>>>>;
    };
    const astray: string[] = [];
    for (const operations of Object.values(paths)) {
      for (const operation of Object.values(operations)) {
        const operationId = String(operation.operationId);
        const upstream = (operation['x-arthome-upstream'] ?? []) as readonly Upstream[];
        const expected = docs.operations[operationId]?.maturity ?? maturityOf(upstream);
        if (operation['x-arthome-maturity'] !== expected) {
          astray.push(
            `${operationId}: ${String(operation['x-arthome-maturity'])}, not ${String(expected)}`,
          );
        }
      }
    }

    expect(astray).toEqual([]);
  });
});
