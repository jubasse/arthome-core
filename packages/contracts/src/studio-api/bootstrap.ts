import { z } from 'zod';

import {
  CrewRole,
  DatePane,
  FailureNature,
  IdentityErrorCode,
  Locale,
  LOCALES,
  MemberRole,
  NavigationEntry,
  Service,
  Upstream,
} from '@arthome/core';
import type { VocabularyIn, VocabularyOut } from '@arthome/core/schema';
import {
  InstantOut,
  uuidOut,
  VOCABULARY_SOURCE_LOCAL,
  vocabularyIn,
  vocabularyOutLocal,
} from '@arthome/core/schema';

import {
  BadRequestResponse,
  ForbiddenResponse,
  GoneResponse,
  IdempotencyKeyParameter,
  IfRightsVersionParameter,
  NotFoundResponse,
  PageParameter,
  PageSizeParameter,
  RightsVersionHeader,
  ServedAtHeader,
  StudioTag,
  SurfaceParameter,
  TooManyRequestsResponse,
  TraceparentParameter,
  UnauthorizedResponse,
  UnavailableResponse,
} from './components.js';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import type {
  JsonRequestBody,
  JsonResponse,
  PathParameter,
  QueryParameter,
  Route,
} from '../http/index.js';
import { defineRoute } from '../http/index.js';
import { SessionMode } from '../identity/index.js';
import { OffsetPageInfoSchema } from '../pagination/index.js';
import {
  StudioBootstrapSchema,
  StudioCountersSchema,
  StudioSessionEstablishedSchema,
  StudioSessionModeSchema,
} from '../studio-access/index.js';
import { InboxEntrySchema } from '../studio-desk/index.js';

const CREATE_REAUTH_TOKEN_INTENT = [
  'reveal_stream_key',
  'rotate_stream_key',
  'transfer_ownership',
  'delete_channel',
  'change_bank_details',
] as const;
const CREATE_REAUTH_TOKEN_FACTOR = [
  'platform_biometric',
  'password',
  'totp',
  'backup_code',
] as const;
const LIST_STUDIO_DEVICES_PLATFORM = ['ios', 'android', 'web'] as const;
const REGISTER_STUDIO_PUSH_TOKEN_PLATFORM = ['fcm', 'apns'] as const;
const LIST_STUDIO_CHANGES_INVALIDATED = [
  'date:{id}',
  'date:{id}:publication',
  'date:{id}:tickets',
  'date:{id}:run',
  'date:{id}:crew',
  'channel:{id}:members',
  'channel:{id}:payouts',
  'channel:{id}:moderation',
  'channel:{id}:settings',
  'person:duties',
  'person:inbox',
  'person:rights',
] as const;

export const signInStudio: Route<{
  method: 'post';
  path: '/v1/auth/sign-in';
  parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        email: z.ZodString;
        password: z.ZodString;
        mode: typeof StudioSessionModeSchema;
        deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        deviceLabel: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof StudioSessionEstablishedSchema }, z.core.$loose>
      >
    >;
    401: JsonResponse<typeof StudioErrorEnvelopeSchema>;
    429: typeof TooManyRequestsResponse;
  };
}> = defineRoute({
  method: 'post',
  path: '/v1/auth/sign-in',
  operationId: 'signInStudio',
  tags: [StudioTag.BOOTSTRAP],
  summary: 'Opens a professional session.',
  description:
    "**Documented relay to `identity`**, and mandatory for the same three reasons as on the\nstorefront side: zod is the source and the OpenAPI is generated from it — a transparent relay\nwould not appear here; i18n by codes forbids the library's English sentences; and per-device\nrate limiting does not exist in it.\n\nThe response carries **the full bootstrap**, not a raw session shape: the surface paints\nnothing before it, and a second call would be one more blank screen.\n\n`identity.two_factor_required` carries a `challengeId`. Two-factor authentication is a **precondition**\nof transferring ownership of a channel.\n",
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  security: [],
  'x-arthome-idempotency-exemption':
    'A session opening must **always** re-authenticate: returning a memorised response would\namount to issuing a token without checking the credentials. The protection against a double\nsubmit is rate limiting, not the idempotency store.\n',
  parameters: [SurfaceParameter, TraceparentParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          email: z.string().meta({
            format: 'email',
          }),
          password: z.string(),
          mode: StudioSessionModeSchema,
          deviceId: uuidOut().nullable().optional(),
          deviceLabel: z.string().nullable().optional(),
        }),
        example: {
          email: 'claire@example.org',
          password: 'un-mot-de-passe-long',
          mode: SessionMode.BEARER,
          deviceLabel: 'iPhone de Claire',
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Session opened and bootstrap served, in the requested mode.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: StudioSessionEstablishedSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T17:58:00.000Z',
            rightsVersion: 412,
            data: {
              mode: SessionMode.BEARER,
              accessToken: 'sess_7c1de4',
              refreshToken: 'refr_2b9f',
              expiresAt: '2026-09-28T17:58:00Z',
              bootstrap: {
                person: {
                  personId: '019928b0-0000-7000-8000-000000000001',
                  displayName: 'Claire D.',
                },
                channels: [],
                personNavigation: [NavigationEntry.AGENDA, 'inbox', NavigationEntry.HELP],
                rightsVersion: 412,
                constants: {
                  technicalProvisionThreshold: 10000,
                  provisionRevisionHours: 72,
                  waitlistPriorityWindowHours: 2,
                  cancelDeadlineMinutesBefore: 60,
                  payoutDelayDays: 14,
                  commissionRateBps: 1200,
                  chatBurstThresholdPerMinute: 60,
                  holdScreenAutoAfterSec: 15,
                  seasonBounds: {
                    startsOn: '09-01',
                    endsOn: '08-31',
                  },
                },
                labelCatalog: {
                  locale: Locale.FR,
                  version: 41,
                  url: 'https://cdn.arthome.fr/i18n/studio/fr/v41.json',
                },
                counters: {
                  moderationPending: 14,
                  inboxUnread: 2,
                  dutiesTonight: 3,
                },
              },
            },
          },
        },
      },
    },
    401: {
      description:
        '`identity.invalid_credentials` — indistinguishable from an unknown email — or `identity.two_factor_required`.',
      content: {
        'application/json': {
          schema: StudioErrorEnvelopeSchema,
          example: {
            error: {
              code: IdentityErrorCode.TWO_FACTOR_REQUIRED,
              nature: FailureNature.REFUSED,
              params: {
                challengeId: 'chl_7ab2',
              },
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T17:58:00.000Z',
          },
        },
      },
    },
    429: TooManyRequestsResponse,
  },
});

export const verifyTwoFactorStudio: Route<{
  method: 'post';
  path: '/v1/auth/two-factor/verify';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        challengeId: z.ZodString;
        code: z.ZodString;
        mode: typeof StudioSessionModeSchema;
        deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof StudioSessionEstablishedSchema }, z.core.$loose>
      >
    >;
    401: typeof UnauthorizedResponse;
    410: typeof GoneResponse;
  };
}> = defineRoute({
  method: 'post',
  path: '/v1/auth/two-factor/verify',
  operationId: 'verifyTwoFactorStudio',
  tags: [StudioTag.BOOTSTRAP],
  summary: 'Answers the two-factor challenge.',
  description: 'Short-lived, single-use `challengeId`; a spent backup code cannot be replayed.',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  security: [],
  parameters: [IdempotencyKeyParameter, SurfaceParameter, TraceparentParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          challengeId: z.string(),
          code: z.string(),
          mode: StudioSessionModeSchema,
          deviceId: uuidOut().nullable().optional(),
        }),
        example: {
          challengeId: 'chl_7ab2',
          code: '318204',
          mode: SessionMode.BEARER,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Session ouverte.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: StudioSessionEstablishedSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T17:58:20.000Z',
            rightsVersion: 412,
            data: {
              mode: SessionMode.COOKIE,
              bootstrap: {
                person: {
                  personId: '019928b0-0000-7000-8000-000000000001',
                  displayName: 'Claire D.',
                },
                channels: [],
                rightsVersion: 412,
                constants: {
                  technicalProvisionThreshold: 10000,
                  provisionRevisionHours: 72,
                  waitlistPriorityWindowHours: 2,
                  cancelDeadlineMinutesBefore: 60,
                  payoutDelayDays: 14,
                  commissionRateBps: 1200,
                  chatBurstThresholdPerMinute: 60,
                  holdScreenAutoAfterSec: 15,
                  seasonBounds: {
                    startsOn: '09-01',
                    endsOn: '08-31',
                  },
                },
                labelCatalog: {
                  locale: Locale.FR,
                  version: 41,
                  url: 'https://cdn.arthome.fr/i18n/studio/fr/v41.json',
                },
                counters: {
                  moderationPending: 14,
                  inboxUnread: 2,
                  dutiesTonight: 3,
                },
              },
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
    410: GoneResponse,
  },
});

export const requestPasswordResetStudio: Route<{
  method: 'post';
  path: '/v1/auth/forget-password';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      { email: z.ZodString; locale: z.ZodOptional<VocabularyIn<typeof LOCALES>> },
      z.core.$strip
    >
  >;
  responses: {
    202: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<{ accepted: z.ZodOptional<z.ZodBoolean> }, z.core.$loose>
            >;
          },
          z.core.$loose
        >
      >
    >;
    429: typeof TooManyRequestsResponse;
  };
}> = defineRoute({
  method: 'post',
  path: '/v1/auth/forget-password',
  operationId: 'requestPasswordResetStudio',
  tags: [StudioTag.BOOTSTRAP],
  summary: 'Requests a password reset link.',
  description:
    "**Always answers `202`**, whether the account exists or not. The email's link points at\n**`studio.arthome.fr/reset`** — the surface, per product and per language — never at the API:\nthe library's default would build it from its base address and would land the person on an\nAPI entry point.\n",
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  security: [],
  parameters: [IdempotencyKeyParameter, SurfaceParameter, TraceparentParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          email: z.string().meta({
            format: 'email',
          }),
          locale: vocabularyIn(LOCALES)
            .meta({
              'x-arthome-vocabulary-source': 'LOCALES',
              description:
                '**The domain declares exactly two.** This one is an **input**, so the enum is strict:\na locale we cannot render is refused rather than silently answered in another\nlanguage.\n',
              examples: [Locale.FR],
            })
            .optional(),
        }),
        example: {
          email: 'claire@example.org',
          locale: Locale.FR,
        },
      },
    },
  },
  responses: {
    202: {
      description: 'Request accepted — the answer is identical in both cases.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  accepted: z.boolean().optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T17:57:00.000Z',
            rightsVersion: 0,
            data: {
              accepted: true,
            },
          },
        },
      },
    },
    429: TooManyRequestsResponse,
  },
});

export const getStudioBootstrap: Route<{
  method: 'get';
  path: '/v1/bootstrap';
  parameters: readonly [
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof StudioBootstrapSchema }, z.core.$loose>
      >
    >;
    401: typeof UnauthorizedResponse;
    503: typeof UnavailableResponse;
  };
}> = defineRoute({
  method: 'get',
  path: '/v1/bootstrap',
  operationId: 'getStudioBootstrap',
  tags: [StudioTag.BOOTSTRAP],
  summary: 'The bootstrap — the only thing the first paint waits for.',
  description:
    '**One call**, and nothing is painted until it is there: the person, **all** their channels\nwith their effective roles, `grants` **projected onto those roles**, the preferences, the\nrights version, the badge counters and the domain constants.\n\n**The root is a person, not a channel.** A freelance stage manager can be on duty for two\nlive shows the same evening, at two different channels.\n\nThe failure of this call is **a failure screen in its own right, with the trace identifier**:\nit is the only moment left where the person can still read out a number and dictate it to\nsupport.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  parameters: [SurfaceParameter, IfRightsVersionParameter, TraceparentParameter],
  responses: {
    200: {
      description: 'The bootstrap.',
      headers: {
        'X-Arthome-Served-At': ServedAtHeader,
        'X-Arthome-Rights-Version': RightsVersionHeader,
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: StudioBootstrapSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:00:00.000Z',
            rightsVersion: 412,
            data: {
              person: {
                personId: '019928b0-0000-7000-8000-000000000001',
                displayName: 'Claire D.',
                isFreelance: true,
                runsCalled: 84,
                readingTimezone: 'Europe/Paris',
              },
              rightsVersion: 412,
              channels: [
                {
                  channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
                  channelName: 'Compagnie Verticale',
                  roles: [MemberRole.PRODUCTION, MemberRole.COORDINATION],
                  isOwner: false,
                  navigation: [
                    NavigationEntry.DASHBOARD,
                    DatePane.CREW,
                    NavigationEntry.EVENTS,
                    NavigationEntry.STREAM,
                    NavigationEntry.STATS,
                    DatePane.TICKETS,
                    NavigationEntry.STORE,
                    NavigationEntry.REPLAYS,
                    NavigationEntry.TEAM,
                    NavigationEntry.JOURNAL,
                    NavigationEntry.HELP,
                  ],
                  datePanes: [
                    DatePane.PUBLIC,
                    DatePane.TICKETS,
                    DatePane.CHAT,
                    DatePane.TECH,
                    DatePane.CREW,
                    DatePane.REPLAY,
                  ],
                  canRevenue: true,
                  canOps: true,
                  canTech: true,
                  canDecideOutcome: true,
                  assignableRoles: [
                    MemberRole.COORDINATION,
                    CrewRole.DIRECTOR,
                    CrewRole.VIDEO,
                    CrewRole.SOUND,
                    CrewRole.MODERATION,
                  ],
                  dateGrants: [],
                },
              ],
              constants: {
                technicalProvisionThreshold: 10000,
                provisionRevisionHours: 72,
                waitlistPriorityWindowHours: 2,
                cancelDeadlineMinutesBefore: 60,
                payoutDelayDays: 14,
                commissionRateBps: 1200,
                chatBurstThresholdPerMinute: 60,
                moderationQueueAlertThreshold: 10,
                crewUnassignedAlertHoursBefore: 24,
                holdScreenAutoAfterSec: 15,
                seasonBounds: {
                  startsOn: '09-01',
                  endsOn: '08-31',
                },
              },
              labelCatalog: {
                locale: Locale.FR,
                version: 41,
                url: 'https://cdn.arthome.fr/i18n/studio/fr/v41.json',
              },
              counters: {
                moderationPending: 14,
                inboxUnread: 2,
                dutiesTonight: 3,
                invitationsPending: 1,
                datesToCover: 3,
                payoutsDue: 0,
              },
              realtime: {
                namespace: '/studio',
                pulseIntervalSec: 5,
              },
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
    503: UnavailableResponse,
  },
});

export const listInbox: Route<{
  method: 'get';
  path: '/v1/inbox';
  parameters: readonly [
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof PageParameter,
    typeof PageSizeParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          { items: z.ZodArray<typeof InboxEntrySchema>; page: typeof OffsetPageInfoSchema },
          z.core.$loose
        >
      >
    >;
    401: typeof UnauthorizedResponse;
  };
}> = defineRoute({
  method: 'get',
  path: '/v1/inbox',
  operationId: 'listInbox',
  tags: [StudioTag.BOOTSTRAP],
  summary: 'The inbox — invitations and alerts routed by role and by channel.',
  description:
    '**Open to everyone**, whatever the role. The routing is decided **server-side**: the\napplication does not filter a common queue, otherwise it would receive alerts it has no right\nto read and would merely refrain from displaying them — which is a leak, not a rule.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.NOTIFICATIONS],
  parameters: [
    SurfaceParameter,
    IfRightsVersionParameter,
    TraceparentParameter,
    PageParameter,
    PageSizeParameter,
  ],
  responses: {
    200: {
      description: 'A page of inbox entries.',
      headers: {
        'X-Arthome-Rights-Version': RightsVersionHeader,
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              items: z.array(InboxEntrySchema),
              page: OffsetPageInfoSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:00:10.000Z',
            rightsVersion: 412,
            items: [
              {
                id: '019928b1-0000-7000-8000-000000000001',
                kind: 'invitation',
                channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
                body: {
                  contentLanguage: Locale.FR,
                  text: 'Compagnie Verticale vous invite comme coordination.',
                },
                deepLinkCode: 'crew_invitation',
                createdAt: '2026-09-20T14:02:00Z',
                read: false,
              },
            ],
            page: {
              page: 1,
              pageSize: 20,
              totalItems: 2,
              totalPages: 1,
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
  },
});

export const markInboxRead: Route<{
  method: 'post';
  path: '/v1/inbox';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        entryIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
        all: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof StudioCountersSchema }, z.core.$loose>
      >
    >;
    401: typeof UnauthorizedResponse;
  };
}> = defineRoute({
  method: 'post',
  path: '/v1/inbox',
  operationId: 'markInboxRead',
  tags: [StudioTag.BOOTSTRAP],
  summary: 'Marks inbox entries as read.',
  description: '**Monotonic: nothing gets un-read.** Replayed, it changes nothing.',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.NOTIFICATIONS],
  parameters: [
    IdempotencyKeyParameter,
    SurfaceParameter,
    IfRightsVersionParameter,
    TraceparentParameter,
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          entryIds: z.array(uuidOut()).optional(),
          all: z.boolean().default(false).optional(),
        }),
        example: {
          all: true,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Up-to-date counters.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: StudioCountersSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:00:20.000Z',
            rightsVersion: 412,
            data: {
              moderationPending: 14,
              inboxUnread: 0,
              dutiesTonight: 3,
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
  },
});

export const createReauthToken: Route<{
  method: 'post';
  path: '/v1/me/reauth';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        intent: VocabularyIn<typeof CREATE_REAUTH_TOKEN_INTENT>;
        factor: VocabularyIn<typeof CREATE_REAUTH_TOKEN_FACTOR>;
        proof: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    201: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodObject<
              { reauthToken: z.ZodString; intent: z.ZodString; expiresAt: z.ZodString },
              z.core.$loose
            >;
          },
          z.core.$loose
        >
      >
    >;
    401: typeof UnauthorizedResponse;
    403: typeof ForbiddenResponse;
    429: typeof TooManyRequestsResponse;
  };
}> = defineRoute({
  method: 'post',
  path: '/v1/me/reauth',
  operationId: 'createReauthToken',
  tags: [StudioTag.BOOTSTRAP],
  summary: 'Mints the re-authentication token the four sensitive commands require.',
  description:
    "**Four commands declared it `required` and no entry point issued it**: revealing a stream\nkey, rotating it, transferring ownership of a channel, deleting a channel. The contract\ndemanded a token it did not offer.\n\n**The factor is served, not guessed.** `GET` returns `acceptedFactors` for this device and\nthis person; the surface offers what the server accepts, instead of assuming. This is the\nquestion being on duty asks: rotating a stream key is the stage manager's emergency gesture — the\none you make when you suspect a leak **during** a live show. If re-authentication is a\npassword to be typed in a dark room, one-handed, the guarantee is paid for in dead air.\n\n**What the contract guarantees**: `platform_biometric` is offered as soon as the device\ndeclares it, and **its failure closes nothing** — it falls back to the other accepted factors,\nlisted in the same response. A single factor that fails in the room is a blocked operator.\n\nThe token is **single-use**, short-lived, and **bound to the command it targets**: a token\nminted to reveal a key does not transfer a channel.\n",
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.IDENTITY],
  parameters: [
    IdempotencyKeyParameter,
    SurfaceParameter,
    IfRightsVersionParameter,
    TraceparentParameter,
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          intent: vocabularyIn(CREATE_REAUTH_TOKEN_INTENT).meta({
            'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
            'x-arthome-vocabulary-reason':
              'A vocabulary local to this contract. The domain neither produces nor consumes these values — they describe what this endpoint offers, and a new member is an endpoint change.',
            description: 'The command targeted. The token is valid for that one only.',
          }),
          factor: vocabularyIn(CREATE_REAUTH_TOKEN_FACTOR).meta({
            'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
            'x-arthome-vocabulary-reason':
              'An account-management shape, local to this endpoint: what the person asked for, not a fact the domain reasons about.',
          }),
          proof: z
            .string()
            .nullable()
            .meta({
              description:
                'Proof of the factor. **Absent for `platform_biometric`**: the device attests, the secret never\nleaves the hardware.\n',
            })
            .optional(),
        }),
        example: {
          intent: 'rotate_stream_key',
          factor: 'platform_biometric',
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Token minted, single-use.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({
                reauthToken: z.string(),
                intent: z.string(),
                expiresAt: InstantOut,
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:39:50.000Z',
            rightsVersion: 412,
            data: {
              reauthToken: 'ott_9f2ac1',
              intent: 'rotate_stream_key',
              expiresAt: '2026-09-21T18:44:50Z',
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    429: TooManyRequestsResponse,
  },
});

export const listReauthFactors: Route<{
  method: 'get';
  path: '/v1/me/reauth';
  parameters: readonly [
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodObject<
              {
                acceptedFactors: z.ZodOptional<z.ZodArray<VocabularyOut>>;
                platformBiometricEnrolled: z.ZodOptional<z.ZodBoolean>;
              },
              z.core.$loose
            >;
          },
          z.core.$loose
        >
      >
    >;
    401: typeof UnauthorizedResponse;
  };
}> = defineRoute({
  method: 'get',
  path: '/v1/me/reauth',
  operationId: 'listReauthFactors',
  tags: [StudioTag.BOOTSTRAP],
  summary: 'The re-authentication factors accepted for this device.',
  description:
    '**Served, so that the surface assumes nothing.** It offers what the server accepts, and it\nknows in advance whether a fallback exists when biometrics fail — which decides what interface\nto show in a room, one-handed.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.IDENTITY],
  parameters: [SurfaceParameter, IfRightsVersionParameter, TraceparentParameter],
  responses: {
    200: {
      description: "The accepted factors, in the server's order of preference.",
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({
                acceptedFactors: z
                  .array(
                    vocabularyOutLocal(
                      CREATE_REAUTH_TOKEN_FACTOR,
                      'An account-management shape, local to this endpoint: what the person asked for, not a fact the domain reasons about.',
                    ),
                  )
                  .optional(),
                platformBiometricEnrolled: z.boolean().optional(),
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:39:40.000Z',
            rightsVersion: 412,
            data: {
              acceptedFactors: ['platform_biometric', 'totp', 'backup_code'],
              platformBiometricEnrolled: true,
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
  },
});

export const listStudioDevices: Route<{
  method: 'get';
  path: '/v1/me/devices';
  parameters: readonly [
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          {
            items: z.ZodArray<
              z.ZodObject<
                {
                  deviceId: z.ZodString;
                  label: z.ZodString;
                  platform: z.ZodOptional<VocabularyOut>;
                  city: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                  lastSeenAt: z.ZodString;
                  isCurrent: z.ZodBoolean;
                },
                z.core.$loose
              >
            >;
          },
          z.core.$loose
        >
      >
    >;
    401: typeof UnauthorizedResponse;
  };
}> = defineRoute({
  method: 'get',
  path: '/v1/me/devices',
  operationId: 'listStudioDevices',
  tags: [StudioTag.BOOTSTRAP],
  summary: 'The devices this person is signed in to the studio on.',
  description:
    "**The studio offered neither a list, nor revocation, nor sign-out**, while the answer to the\nsurface's question promised \"revocation per device\". What that is worth concretely: **a phone\nleft behind in a room opens a moderation console and the revelation of a stream key** — and,\na freelancer working across several channels, on channels that do not belong to its bearer.\nNeither the person nor the channel's owner had any gesture available.\n\nThe notion of a device here is the studio's **token-bearing session**, distinct from the\ntelevision's pairing device: here a device is the bearer of a refresh token bound to the\nnative store.\n",
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.IDENTITY],
  parameters: [SurfaceParameter, IfRightsVersionParameter, TraceparentParameter],
  responses: {
    200: {
      description: 'The devices, with the calling one marked.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              items: z.array(
                z.looseObject({
                  deviceId: uuidOut(),
                  label: z.string(),
                  platform: vocabularyOutLocal(
                    LIST_STUDIO_DEVICES_PLATFORM,
                    'An external provider or platform identifier. It is their vocabulary, not ours, and it changes when they change.',
                  ).optional(),
                  city: z.string().nullable().optional(),
                  lastSeenAt: InstantOut,
                  isCurrent: z.boolean(),
                }),
              ),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:52:00.000Z',
            rightsVersion: 412,
            items: [
              {
                deviceId: '019928eb-0000-7000-8000-000000000001',
                label: 'iPhone de Claire',
                platform: 'ios',
                city: 'Paris',
                lastSeenAt: '2026-09-21T18:51:00Z',
                isCurrent: true,
              },
            ],
          },
        },
      },
    },
    401: UnauthorizedResponse,
  },
});

export const revokeStudioDevice: Route<{
  method: 'delete';
  path: '/v1/me/devices/{deviceId}';
  parameters: readonly [
    PathParameter<'deviceId', z.ZodString>,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<
                {
                  revoked: z.ZodOptional<z.ZodBoolean>;
                  commandsStopWithinSec: z.ZodOptional<z.ZodInt>;
                },
                z.core.$loose
              >
            >;
          },
          z.core.$loose
        >
      >
    >;
    404: typeof NotFoundResponse;
  };
}> = defineRoute({
  method: 'delete',
  path: '/v1/me/devices/{deviceId}',
  operationId: 'revokeStudioDevice',
  tags: [StudioTag.BOOTSTRAP],
  summary: 'Revokes a studio device — the phone left behind in a room.',
  description:
    'Revokes the refresh token bound to this device. The effect is immediate on the console — the\nserver makes it leave the real-time rooms without waiting for a reconnection — and **at most\n60 s on commands**, the lifetime of the internal token already minted.\n\n**A security command: never queued offline.** It must fail loudly rather than be replayed\nblind.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.IDENTITY],
  parameters: [
    {
      name: 'deviceId',
      in: 'path',
      required: true,
      schema: uuidOut(),
    },
    IdempotencyKeyParameter,
    SurfaceParameter,
    IfRightsVersionParameter,
    TraceparentParameter,
  ],
  responses: {
    200: {
      description: 'Device revoked, with the delay before it takes effect on commands.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  revoked: z.boolean().optional(),
                  commandsStopWithinSec: z
                    .int()
                    .meta({ minimum: undefined, maximum: undefined })
                    .meta({
                      examples: [60],
                    })
                    .optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:53:00.000Z',
            rightsVersion: 413,
            data: {
              revoked: true,
              commandsStopWithinSec: 60,
            },
          },
        },
      },
    },
    404: NotFoundResponse,
  },
});

export const signOutStudio: Route<{
  method: 'delete';
  path: '/v1/me/session';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<{ signedOut: z.ZodOptional<z.ZodBoolean> }, z.core.$loose>
            >;
          },
          z.core.$loose
        >
      >
    >;
    401: typeof UnauthorizedResponse;
  };
}> = defineRoute({
  method: 'delete',
  path: '/v1/me/session',
  operationId: 'signOutStudio',
  tags: [StudioTag.BOOTSTRAP],
  summary: "Signing out — an operator's only way out, and it did not exist.",
  description:
    'The "My account" sheet carries "SIGN OUT" and the contract had no gesture for it. Closes\n**this** device\'s session and revokes its refresh token; the person\'s other devices stay\nsigned in.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.IDENTITY],
  parameters: [
    IdempotencyKeyParameter,
    SurfaceParameter,
    IfRightsVersionParameter,
    TraceparentParameter,
  ],
  responses: {
    200: {
      description: 'Session closed. Replayed on an already-closed session, it succeeds.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  signedOut: z.boolean().optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T23:10:00.000Z',
            rightsVersion: 412,
            data: {
              signedOut: true,
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
  },
});

export const registerStudioPushToken: Route<{
  method: 'put';
  path: '/v1/me/push-registrations';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        platform: VocabularyIn<typeof REGISTER_STUDIO_PUSH_TOKEN_PLATFORM>;
        token: z.ZodString;
        deviceId: z.ZodString;
        locale: z.ZodOptional<VocabularyIn<typeof LOCALES>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<{ registered: z.ZodOptional<z.ZodBoolean> }, z.core.$loose>
            >;
          },
          z.core.$loose
        >
      >
    >;
    401: typeof UnauthorizedResponse;
  };
}> = defineRoute({
  method: 'put',
  path: '/v1/me/push-registrations',
  operationId: 'registerStudioPushToken',
  tags: [StudioTag.BOOTSTRAP],
  summary: 'Registers the push token — without it, a duty does not wake up.',
  description:
    '**The routing was settled, the recipient did not exist.** Duty alerts — moderation queue\nsaturated, no moderator assigned at D-1, unstable bitrate — arrive precisely when the\napplication is **not** in the foreground. Payload redaction was promised; the payload had\nnobody to go to.\n\n**A put, not an append**: re-registering the same token creates no duplicate, and a dead token\nis detached by the service when the provider reports it.\n\n**Redaction applies**: a notification never carries an amount if the recipient role lacks\n`canRevenue` — it is displayed on a locked screen.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.NOTIFICATIONS],
  parameters: [
    IdempotencyKeyParameter,
    SurfaceParameter,
    IfRightsVersionParameter,
    TraceparentParameter,
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          platform: vocabularyIn(REGISTER_STUDIO_PUSH_TOKEN_PLATFORM).meta({
            'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
            'x-arthome-vocabulary-reason':
              'An external provider or platform identifier. It is their vocabulary, not ours, and it changes when they change.',
          }),
          token: z.string(),
          deviceId: uuidOut(),
          locale: vocabularyIn(LOCALES)
            .meta({
              'x-arthome-vocabulary-source': 'LOCALES',
              description:
                '**The domain declares exactly two.** This one is an **input**, so the enum is strict:\na locale we cannot render is refused rather than silently answered in another\nlanguage.\n',
              examples: [Locale.FR],
            })
            .optional(),
        }),
        example: {
          platform: 'apns',
          token: 'a1b2c3…',
          deviceId: '019928eb-0000-7000-8000-000000000001',
          locale: Locale.FR,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Token registered.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  registered: z.boolean().optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:00:40.000Z',
            rightsVersion: 412,
            data: {
              registered: true,
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
  },
});

export const listStudioChanges: Route<{
  method: 'get';
  path: '/v1/changes';
  parameters: readonly [
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    QueryParameter<'since', z.ZodString, true>,
    QueryParameter<'channelId', z.ZodString>,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          { invalidated: z.ZodArray<VocabularyOut>; complete: z.ZodBoolean },
          z.core.$loose
        >
      >
    >;
    400: typeof BadRequestResponse;
    401: typeof UnauthorizedResponse;
  };
}> = defineRoute({
  method: 'get',
  path: '/v1/changes',
  operationId: 'listStudioChanges',
  tags: [StudioTag.BOOTSTRAP],
  summary: 'The invalidations since a given instant — not the data.',
  description:
    'The mechanism was **written, argued, specified** — and wired to the storefront BFF only. The\nstudio has the same need, on the surface one leaves open for two hours while a colleague edits\nthe same objects.\n\nAnd it has a reason that exists nowhere else: under Ionic\'s router, **a page stays in the DOM\nafter you leave it** and redisplays as-is on the way back. Without a cheap freshness read,\nevery return to a page is either a stale display or a full reload over a room\'s 4G.\n\n`complete: false` means "too many changes, reload everything" — the same honesty as\n`resume:too_old` on the channel.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Upstream.REALTIME],
  parameters: [
    SurfaceParameter,
    IfRightsVersionParameter,
    TraceparentParameter,
    {
      name: 'since',
      in: 'query',
      required: true,
      schema: InstantOut,
    },
    {
      name: 'channelId',
      in: 'query',
      description:
        'Restricted to one channel. Absent, the response covers **all** accessible channels.',
      schema: uuidOut(),
    },
  ],
  responses: {
    200: {
      description: 'A list of invalidated tags.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              invalidated: z
                .array(
                  vocabularyOutLocal(
                    LIST_STUDIO_CHANGES_INVALIDATED,
                    'Cache tags, not a domain vocabulary. They name what a surface must revalidate, and the domain has no notion of them: @arthome/core knows a date, not `date:{id}`.',
                  ),
                )
                .meta({
                  description: 'Tags **named by the contract**, never invented by a surface.\n',
                }),
              complete: z.boolean(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:45:00.000Z',
            rightsVersion: 412,
            invalidated: ['date:019928a0-7d31-7a10-b8c4-2f9e11a4c001:publication', 'person:inbox'],
            complete: true,
          },
        },
      },
    },
    400: BadRequestResponse,
    401: UnauthorizedResponse,
  },
});

export const updateStudioPreferences: Route<{
  method: 'patch';
  path: '/v1/me/preferences';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        readingTimezone: z.ZodOptional<z.ZodString>;
        runDeskLayout: z.ZodOptional<z.ZodString>;
        encodingProfileName: z.ZodOptional<z.ZodString>;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          { data: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>> },
          z.core.$loose
        >
      >
    >;
    401: typeof UnauthorizedResponse;
  };
}> = defineRoute({
  method: 'patch',
  path: '/v1/me/preferences',
  operationId: 'updateStudioPreferences',
  tags: [StudioTag.BOOTSTRAP],
  summary: "Writes one of the person's preferences — reading timezone, control-room layout.",
  description:
    "**Two settings follow the person, not the channel**: the reading timezone and the\ncontrol-room layout. The timezone is **the same field** as the storefront's — same account,\none carrier only.\n\n**Never in `localStorage`**: it is bound to the origin, can be cleared by the OS, and travels\nin no way at all — yet the person moves from studio web to studio mobile within the same\nevening.\n\n**Additive and tolerant**: a key unknown to one version is neither rejected nor erased on the\nnext write, otherwise the mobile version under store review would overwrite settings made from\nthe web.\n",
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  parameters: [
    IdempotencyKeyParameter,
    SurfaceParameter,
    IfRightsVersionParameter,
    TraceparentParameter,
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          readingTimezone: z.string().optional(),
          runDeskLayout: z.string().optional(),
          encodingProfileName: z.string().optional(),
        }),
        example: {
          readingTimezone: 'Europe/Paris',
          runDeskLayout: 'compact',
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Preferences up to date.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({}).optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:51:00.000Z',
            rightsVersion: 412,
            data: {
              readingTimezone: 'Europe/Paris',
              runDeskLayout: 'compact',
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
  },
});
