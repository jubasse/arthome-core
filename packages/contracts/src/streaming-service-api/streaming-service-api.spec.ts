import { describe, expect, it } from 'vitest';

import { DomainErrorCode, InternalTokenIssuer } from '@arthome/core';

import { streamingServiceDocs } from './docs.js';
import { streamingServiceApi } from './index.js';
import { PROFILE_FROM_THE_TOKEN } from './principal.docs.js';
import type { Api, Route } from '../http/index.js';
import {
  BATCH_BODY_LIMIT,
  BATCH_BUDGET_MS,
  BATCH_MAX_IDS,
  Freshness,
  RelayedIdempotencyKeyParameter,
  ViewerCountryParameter,
  errorCodesOf,
} from '../http/index.js';
import { SurfaceParameter } from '../storefront-api/components.js';
import { storefrontApi } from '../storefront-api/index.js';
import { studioApi } from '../studio-api/index.js';

// What every service api owes the model (internal, a caller rule, its public operations' codes) is
// service-apis.spec.ts's; this holds what is streaming's own.

const routes: readonly Route[] = Object.values(streamingServiceApi.routes);
const { routes: served } = streamingServiceApi;

const SURFACE_APIS: readonly (readonly [Api, InternalTokenIssuer])[] = [
  [storefrontApi, InternalTokenIssuer.STOREFRONT_BFF],
  [studioApi, InternalTokenIssuer.STUDIO_BFF],
];

/** The BFF that serves a route's public operation, if it has one. */
function bffOf(route: Route): InternalTokenIssuer | undefined {
  return SURFACE_APIS.find(([api]) => api.routes[route.operationId] !== undefined)?.[1];
}

function issuersOf(route: Route): readonly unknown[] | undefined {
  const rule = route.requires?.find((requirement) => requirement.name === 'callerService');
  return (rule?.params as { readonly issuers?: readonly unknown[] } | undefined)?.issuers;
}

describe('the streaming service api', () => {
  it('declares on its own only what no surface sees: the progress batch', () => {
    const own = routes.filter((route) => bffOf(route) === undefined);

    expect(own.map((route) => route.operationId)).toEqual(['getViewerProgressBatch']);
  });

  it('serves the run desk to the studio BFF alone, playback and progress to the storefront BFF alone', () => {
    const astray = routes.filter(
      (route) =>
        JSON.stringify(issuersOf(route)) !==
        JSON.stringify([bffOf(route) ?? InternalTokenIssuer.STOREFRONT_BFF]),
    );

    expect(astray.map((route) => route.operationId)).toEqual([]);
  });
});

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

describe('the profile', () => {
  it('is said to be the token’s on every route that reads it', () => {
    const reading = ['openPlayback', 'recordPlaybackPosition', 'getViewerProgressBatch'];
    const silent = reading.filter(
      (operationId) =>
        streamingServiceDocs.operations[operationId]?.description?.includes(
          PROFILE_FROM_THE_TOKEN,
        ) !== true,
    );

    expect(silent).toEqual([]);
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
