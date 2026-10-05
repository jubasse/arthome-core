import { z } from 'zod';

import { AccountStatus, Locale, MessageDomain, PlanTier, Service } from '@arthome/core';

import {
  ServedAtHeader,
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  UnauthorizedResponse,
  UnavailableResponse,
  ViewerTimezoneParameter,
  storefrontV1,
} from './components.js';
import { StorefrontEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonResponse, Route } from '../http/index.js';
import { ViewerContextSchema } from '../identity/index.js';

const bootstrapRoutes = storefrontV1
  .tags(StorefrontTag.BOOTSTRAP)
  .headers(SurfaceParameter, TraceparentParameter);
const bootstrapReads = bootstrapRoutes.errors({ 401: UnauthorizedResponse });

export const getViewerContext: Route<{
  method: 'get';
  version: 1;
  path: '/viewer-context';
  parameters: readonly [
    typeof ViewerTimezoneParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof ViewerContextSchema }, z.core.$loose>
      >
    >;
    401: typeof UnauthorizedResponse;
    503: typeof UnavailableResponse;
  };
}> = bootstrapReads.defineRoute({
  method: 'get',
  path: '/viewer-context',
  operationId: 'getViewerContext',
  summary: 'The bootstrap — the entire budget of the start-up screen.',
  description:
    '**A single call.** Device profiles, rights, preferences, domain constants, version of the\nlabel catalogue and of the taxonomy. The labels themselves come from the snapshot embedded\nat build time: the version check **never blocks** the first render.\n\nIf this call fails, the surface must still display a **readable** message — not a raw code,\nnot a blank screen. That is what makes the embedded snapshot mandatory rather than merely\ndesirable.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  'x-arthome-freshness': 300,
  security: [
    {
      sessionCookie: [],
    },
    {
      bearerToken: [],
    },
    {
      deviceToken: [],
    },
  ],
  parameters: [ViewerTimezoneParameter],
  responses: {
    200: {
      description: 'Viewer context.',
      headers: {
        'X-Arthome-Served-At': ServedAtHeader,
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: ViewerContextSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:02:12.400Z',
            data: {
              deviceId: '019928f4-1b6c-7c3a-9f2e-6a1d0c4b8e77',
              signedIn: true,
              currentProfileId: '019928f4-2a11-7000-8000-000000000001',
              profiles: [
                {
                  id: '019928f4-2a11-7000-8000-000000000001',
                  name: 'Marie',
                  kind: 'adult',
                },
              ],
              plan: {
                tier: PlanTier.PASS,
                state: AccountStatus.ACTIVE,
                seatDiscountBps: 1000,
                concurrentStreamsAllowed: 1,
              },
              constants: {
                roomOpensMinutesBefore: 30,
                cancelDeadlineMinutesBefore: 60,
                scarcityThresholdBps: 8500,
                billboardPreviewDelaySec: 4,
                waitlistPriorityWindowHours: 2,
                chatRateLimitPerSecond: 2,
                chatCatchUpMessages: 20,
                reminderLeadMinutes: 30,
                replayExpiryWarningHours: 6,
                previewSecondsTotal: 300,
                searchExactTotalLimit: 10000,
                creditDelayCode: 'refund_delay_business_days_3_5',
              },
              labelCatalog: {
                domain: MessageDomain.STOREFRONT,
                locale: Locale.FR,
                version: 41,
                url: 'https://cdn.arthome.fr/i18n/storefront/fr/v41.json',
              },
              taxonomyArtifact: {
                domain: MessageDomain.TAXONOMY,
                locale: Locale.FR,
                version: 12,
                url: 'https://cdn.arthome.fr/taxonomy/fr/v12.json',
              },
              realtime: {
                namespace: '/storefront',
                pulseIntervalSec: 5,
              },
            },
          },
        },
      },
    },
    503: UnavailableResponse,
  },
});
