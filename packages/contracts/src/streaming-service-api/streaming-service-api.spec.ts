import { describe, expect, it } from 'vitest';

import { API_ERROR_CODES, DomainErrorCode, InternalTokenIssuer } from '@arthome/core';

import { streamingServiceApi } from './index.js';
import type { Api, Route } from '../http/index.js';
import {
  BATCH_BODY_LIMIT,
  BATCH_BUDGET_MS,
  BATCH_MAX_IDS,
  Freshness,
  RelayedIdempotencyKeyParameter,
  ViewerCountryParameter,
  errorCodesOf,
  service,
  serviceErrors,
  versionedPath,
} from '../http/index.js';
import { SurfaceParameter } from '../storefront-api/components.js';
import { storefrontApi } from '../storefront-api/index.js';
import { studioApi } from '../studio-api/index.js';

const routes: readonly Route[] = Object.values(streamingServiceApi.routes);
const { routes: served } = streamingServiceApi;

/** Where each public operation is declared, and the BFF that serves it. */
const SURFACE_APIS: readonly (readonly [Api, InternalTokenIssuer])[] = [
  [storefrontApi, InternalTokenIssuer.STOREFRONT_BFF],
  [studioApi, InternalTokenIssuer.STUDIO_BFF],
];

/** The public operation a service route serves behind its BFF, and that BFF. */
function publicOperationOf(route: Route): readonly [Route, InternalTokenIssuer] | undefined {
  for (const [api, issuer] of SURFACE_APIS) {
    const operation = api.routes[route.operationId];
    if (operation !== undefined) return [operation, issuer];
  }
  return undefined;
}

function issuersOf(route: Route): readonly unknown[] | undefined {
  const rule = route.requires?.find((requirement) => requirement.name === 'callerService');
  return (rule?.params as { readonly issuers?: readonly unknown[] } | undefined)?.issuers;
}

const successesOf = (route: Route): readonly string[] =>
  Object.keys(route.responses).filter((status) => status.startsWith('2'));

const isTransportCode = (code: string): boolean =>
  (API_ERROR_CODES as readonly string[]).includes(code);

describe('the streaming service api', () => {
  it('has every route internal, on the service identity, with a caller rule', () => {
    const astray = routes.filter(
      (route) =>
        route.internal !== true ||
        route.access?.kind !== 'identified' ||
        route.access.identity !== service ||
        issuersOf(route) === undefined,
    );

    expect(astray.map((route) => route.operationId)).toEqual([]);
  });

  it('has no route public or optional', () => {
    const open = routes.filter(
      (route) => route.access?.kind !== 'identified' || route.access.optional,
    );

    expect(open.map((route) => route.operationId)).toEqual([]);
  });

  it('declares on its own only what no surface sees: the progress batch', () => {
    const own = routes.filter((route) => publicOperationOf(route) === undefined);

    expect(own.map((route) => route.operationId)).toEqual(['getViewerProgressBatch']);
  });
});

describe('one operation, two servers', () => {
  it.each(routes.filter((route) => publicOperationOf(route) !== undefined))(
    '$operationId keeps its public operation’s id, path, body, answer and codes',
    (route) => {
      const [operation] = publicOperationOf(route) ?? [];
      if (operation === undefined) throw new Error('no public operation');

      expect(route.method).toBe(operation.method);
      expect(versionedPath(route)).toBe(versionedPath(operation));
      expect(route.requestBody?.content['application/json']?.schema).toBe(
        operation.requestBody?.content['application/json']?.schema,
      );
      expect(successesOf(route)).toEqual(successesOf(operation));
      for (const status of successesOf(operation)) {
        expect(route.responses[status]?.content?.['application/json']?.exampleFrom?.of).toBe(
          operation.responses[status]?.content?.['application/json']?.exampleFrom?.of,
        );
      }

      const missing: string[] = [];
      for (const [status, codes] of Object.entries(operation.errorCodes ?? {})) {
        const held = errorCodesOf(route, status) ?? [];
        if (status in serviceErrors.standard && !(status in (route.errorCodes ?? {}))) {
          missing.push(status);
        }
        for (const code of codes) {
          if (!isTransportCode(code) && !held.includes(code)) missing.push(`${status} ${code}`);
        }
      }
      expect(missing).toEqual([]);
    },
  );

  it('serves the run desk to the studio BFF, playback and progress to the storefront BFF', () => {
    const callers = routes.map((route) => [
      route.operationId,
      issuersOf(route),
      [publicOperationOf(route)?.[1] ?? InternalTokenIssuer.STOREFRONT_BFF],
    ]);

    expect(callers.filter(([, issuers, expected]) => !equalLists(issuers, expected))).toEqual([]);
  });
});

function equalLists(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

describe('what each route carries', () => {
  it('takes the relayed key on a run desk write, and none on playback or progress', () => {
    const keyed = routes
      .filter((route) => route.parameters?.includes(RelayedIdempotencyKeyParameter) === true)
      .map((route) => route.operationId);

    expect(keyed).toEqual([
      'runTechnicalCheck',
      'rehearseRun',
      'goOnAir',
      'endRun',
      'resetRun',
      'raiseIncident',
      'resolveIncident',
    ]);
  });

  it('never lets an answer of playback or progress be stored', () => {
    const stored = [
      served.openPlayback,
      served.renewPlaybackTicket,
      served.recordPlaybackPosition,
      served.getViewerProgressBatch,
    ].filter((route) => route.cache?.freshness !== Freshness.NEVER);

    expect(stored.map((route) => route.operationId)).toEqual([]);
  });

  it('takes the viewer’s country where a watch verdict is decided', () => {
    const country = routes
      .filter((route) => route.parameters?.includes(ViewerCountryParameter) === true)
      .map((route) => route.operationId);

    expect(country).toEqual(['openPlayback', 'renewPlaybackTicket']);
  });

  it('keeps the surface header on openPlayback, relayed by the BFF', () => {
    expect(served.openPlayback.parameters).toContain(SurfaceParameter);
  });

  it('declares publication.transition_forbidden on goOnAir', () => {
    expect(errorCodesOf(served.goOnAir, 409)).toContain(
      DomainErrorCode.PUBLICATION_TRANSITION_FORBIDDEN,
    );
  });
});

describe('getViewerProgressBatch', () => {
  const batch = served.getViewerProgressBatch;
  const body = batch.requestBody.content['application/json'].schema;
  const PROFILE = '019928b0-0000-7000-8000-000000000001';
  const ids = (count: number): readonly string[] =>
    Array.from(
      { length: count },
      (_, index) => `019928a0-7d31-7a10-b8c4-${String(index).padStart(12, '0')}`,
    );

  it('takes 1 to 200 ids and refuses 201', () => {
    expect(body.safeParse({ profileId: PROFILE, dateIds: ids(1) }).success).toBe(true);
    expect(body.safeParse({ profileId: PROFILE, dateIds: ids(BATCH_MAX_IDS) }).success).toBe(true);
    expect(body.safeParse({ profileId: PROFILE, dateIds: ids(BATCH_MAX_IDS + 1) }).success).toBe(
      false,
    );
    expect(body.safeParse({ profileId: PROFILE, dateIds: [] }).success).toBe(false);
  });

  it('is a batched read: no key, the batch ceiling and budget', () => {
    expect(batch.parameters.map((parameter) => parameter.name)).not.toContain(
      RelayedIdempotencyKeyParameter.name,
    );
    expect(batch.bodyLimit).toBe(BATCH_BODY_LIMIT);
    expect(batch.budgetMs).toBe(BATCH_BUDGET_MS);
  });
});
