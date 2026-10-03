import { z } from 'zod';

import {
  AccountStatus,
  DEVICE_KINDS,
  DeviceKind,
  Locale,
  PlanTier,
  Service,
  Upstream,
} from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import {
  InstantOut,
  uuidOut,
  VOCABULARY_SOURCE_LOCAL,
  vocabularyIn,
  dateTimeIn,
} from '@arthome/core/schema';

import {
  BadRequestResponse,
  IdempotencyKeyParameter,
  ServedAtHeader,
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  UnauthorizedResponse,
  UnavailableResponse,
  ViewerTimezoneParameter,
  storefrontV1,
} from './components.js';
import { ChangeFeedSchema } from '../engagement/index.js';
import { StorefrontEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, QueryParameter, Route } from '../http/index.js';
import { ViewerContextSchema } from '../identity/index.js';

const bootstrapRoutes = storefrontV1
  .tags(StorefrontTag.BOOTSTRAP)
  .headers(SurfaceParameter, TraceparentParameter);
const bootstrapReads = bootstrapRoutes.errors({ 401: UnauthorizedResponse });

const LIST_CHANGES_SCOPE = ['profile', 'device'] as const;

export const registerDevice: Route<{
  method: 'post';
  version: 1;
  path: '/devices';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        kind: VocabularyIn<typeof DEVICE_KINDS>;
        label: z.ZodString;
        osVersion: z.ZodOptional<z.ZodString>;
        appVersion: z.ZodOptional<z.ZodString>;
      },
      z.core.$strip
    >
  >;
  responses: {
    201: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodObject<
              { deviceId: z.ZodString; deviceToken: z.ZodString; expiresAt: z.ZodString },
              z.core.$loose
            >;
          },
          z.core.$loose
        >
      >
    >;
    400: typeof BadRequestResponse;
    503: typeof UnavailableResponse;
  };
}> = bootstrapRoutes.defineRoute({
  method: 'post',
  path: '/devices',
  operationId: 'registerDevice',
  summary: 'Registers the device and returns its device token.',
  description:
    '**Called on first launch, before any session.** Device identity is a contract notion, and\nit is required for four things the surfaces ask for: opening and polling a pairing, naming\nitself under "connected devices", being revoked, and carrying a rate limit somewhere other\nthan the IP address — which a household behind a NAT shares.\n\nIt **is not a session** and opens no personal data; in particular it does not open the\nreal-time channel.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  security: [],
  parameters: [IdempotencyKeyParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          kind: vocabularyIn(DEVICE_KINDS).meta({
            'x-arthome-vocabulary-source': 'DEVICE_KINDS',
          }),
          label: z.string().max(80),
          osVersion: z.string().optional(),
          appVersion: z.string().optional(),
        }),
        example: {
          kind: DeviceKind.TV,
          label: 'Téléviseur du salon',
          osVersion: 'tvOS 19.2',
          appVersion: '1.4.0',
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Device registered. The token is to be kept in the native store.',
      headers: {
        'X-Arthome-Served-At': ServedAtHeader,
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({
                deviceId: uuidOut(),
                deviceToken: z.string(),
                expiresAt: InstantOut,
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:02:11.004Z',
            data: {
              deviceId: '019928f4-1b6c-7c3a-9f2e-6a1d0c4b8e77',
              deviceToken: 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImRldi0yMDI2LTA5In0',
              expiresAt: '2027-03-20T18:02:11.004Z',
            },
          },
        },
      },
    },
    400: BadRequestResponse,
    503: UnavailableResponse,
  },
});

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
                locale: Locale.FR,
                version: 41,
                url: 'https://cdn.arthome.fr/i18n/storefront/fr/v41.json',
              },
              taxonomyArtifact: {
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

export const listChanges: Route<{
  method: 'get';
  version: 1;
  path: '/changes';
  parameters: readonly [
    QueryParameter<'since', z.ZodString, true>,
    QueryParameter<'scope', z.ZodDefault<VocabularyIn<typeof LIST_CHANGES_SCOPE>>>,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof ChangeFeedSchema }, z.core.$loose>
      >
    >;
    400: typeof BadRequestResponse;
    401: typeof UnauthorizedResponse;
  };
}> = bootstrapReads.defineRoute({
  method: 'get',
  path: '/changes',
  operationId: 'listChanges',
  summary: 'The invalidations since a given instant — not the data.',
  description:
    "**One request instead of twelve.** On returning to the foreground, every observed read\nrevalidates at the same time; an account screen shows half a dozen, a category page as many.\nRefusing that burst means refusing to open the application.\n\nIt is also the path by which the storefront learns what it **did not cause** — Kafka being\nforbidden outside inter-service traffic, it is the only one possible. For Next's server\nrendering, the same tags feed `revalidateTag`: they are **named by the contract**, never\ninvented by a surface.\n\n## This feed requires a credential, and the public side has no feed at all\n\n**The `401` is a ruling, not an oversight** (D-022's rule applied). This path answers \"what\nchanged **for you** since your cursor\". A public invalidation stream would answer \"what\nchanged in the catalogue since T\". They are **two resources**, and their cacheability\nrequirements are opposite: this one must `Vary` on the credential and can never be\nedge-cached; a public one is worthless unless it is. Served from one path, the public half\ninherits the private half's `Vary`, so Next's server rendering would reach origin on every\nrevalidation check — which is most of what this path exists to save.\n\nThe direction was chosen on reversibility. Making this path anonymous **cannot be undone**:\nonce clients call it without a credential, the credential cannot come back. Adding a\nseparate public path later is **purely additive**.\n\n**The cost, named rather than shrugged at.** Signed-out pages have no invalidation path and\nfall back to **time-based revalidation** on their family's freshness — 60 s for `home` and\nthe lists, 300 s for `category` and `artist` (§ the freshness table). A catalogue change is\ntherefore visible to a signed-out reader in **up to one freshness window**, where a feed\nwould cut it to the push latency. That is a performance property, not a contract property,\nand it is the number to beat: a measurement showing a public page stale past its window, or\nan origin-hit cost that the time-based fallback makes unacceptable, reopens this.\n\n**What it would take to fill the gap, and why the shape is not written here.** Nobody has\ndesigned a public catalogue-change stream: whether it is keyed on time or on entity, what\nwindow it covers, what a client that has been away for a week receives, and whether it is a\nfeed at all rather than an `ETag` on each catalogue read. What has no source does not enter\nthe contract, so the gap is named and the shape is left alone.\n",
  'x-arthome-maturity': 'stable',
  // This feed queries NO service: it reads the Redis resume buffer that the real-time
  // gateway already keeps per room (30 min / 5,000 events). It is the HTTP pull of the same
  // stream the channel pushes. Declaring it over four services described a composition that
  // does not happen, and would have counted it as a four-call screen.
  'x-arthome-upstream': [Upstream.REALTIME],
  parameters: [
    {
      name: 'since',
      in: 'query',
      required: true,
      description: "The `servedAt` of the client's last known response.",
      schema: dateTimeIn(),
    },
    {
      name: 'scope',
      in: 'query',
      required: false,
      description:
        'Which invalidations to return. `profile` covers what follows the account — tickets,\norders, subscription, cart — and is what a surface wants on returning to the\nforeground. `device` restricts the answer to what follows **this device**, and exists\nfor the television, where five profiles share one device and a switch of profile must\nnot force the other four to reload.\n\nA **closed** vocabulary, and legitimately so: this is an input, and the server must\nrefuse a scope it does not know rather than silently widen the answer.\n',
      schema: vocabularyIn(LIST_CHANGES_SCOPE)
        .meta({
          'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
          'x-arthome-vocabulary-reason':
            'An account-management shape, local to this endpoint: what the person asked for, not a fact the domain reasons about.',
        })
        .default('profile'),
    },
  ],
  responses: {
    200: {
      description: 'A list of invalidations.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: ChangeFeedSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T20:44:02.010Z',
            data: {
              invalidated: ['date:019928a0-7d31-7a10-b8c4-2f9e11a4c001', 'account:tickets'],
              complete: true,
            },
          },
        },
      },
    },
    400: BadRequestResponse,
  },
});
