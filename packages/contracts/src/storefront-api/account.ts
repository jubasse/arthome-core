import { z } from 'zod';

import {
  AccountStatus,
  DisplayState,
  FailureNature,
  IdentityErrorCode,
  Locale,
  LOCALES,
  NOTIFICATION_CHANNELS,
  NotificationChannel,
  PlanTier,
  Service,
} from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import {
  InstantOut,
  uuidOut,
  VOCABULARY_SOURCE_LOCAL,
  vocabularyIn,
  uuidIn,
} from '@arthome/core/schema';

import {
  ArtistIdParameter,
  BadRequestResponse,
  ConflictResponse,
  CsrfRefusedResponse,
  CursorDirectionParameter,
  CursorParameter,
  DateIdParameter,
  GoneResponse,
  IdempotencyKeyParameter,
  LimitParameter,
  NotFoundResponse,
  StorefrontTag,
  SurfaceParameter,
  TooManyRequestsResponse,
  TraceparentParameter,
  UnauthorizedResponse,
  storefrontV1,
} from './components.js';
import { ArtistSummarySchema, DateCardSchema, SavedSearchSchema } from '../catalog/index.js';
import { NotificationEntrySchema, NotificationPreferencesSchema } from '../engagement/index.js';
import { StorefrontEnvelopeMetaSchema, StorefrontErrorEnvelopeSchema } from '../envelope/index.js';
import type {
  JsonRequestBody,
  JsonResponse,
  PathParameter,
  QueryParameter,
  Route,
} from '../http/index.js';
import {
  AccountScreenSchema,
  ConsentsSchema,
  DeviceSchema,
  SessionMode,
  StorefrontSessionEstablishedSchema,
  StorefrontSessionModeSchema,
  ViewerContextSchema,
  ViewerPreferencesSchema,
} from '../identity/index.js';
import { EmptyReason, StorefrontCursorPageInfoSchema } from '../pagination/index.js';
import {
  ExportRequestSchema,
  ExternalOrderRefSchema,
  OrderSchema,
  TicketCardSchema,
} from '../ticketing/index.js';

const accountRoutes = storefrontV1
  .tags(StorefrontTag.ACCOUNT)
  .headers(SurfaceParameter, TraceparentParameter);
const SavedSearchIdParameter: PathParameter<'savedSearchId', z.ZodString> = {
  name: 'savedSearchId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};
const savedSearches = accountRoutes.resource('me/saved-searches', { id: SavedSearchIdParameter });

const START_SOCIAL_SIGN_IN_PROVIDER = ['google', 'facebook'] as const;
const LIST_MY_TICKETS_WINDOW = ['upcoming', 'past'] as const;
const LIST_FOLLOWED_ARTISTS_SORT = ['alpha', 'followers', 'next_date'] as const;
const CREATE_SAVED_SEARCH_SCOPE = ['search', 'category'] as const;
const REQUEST_EXPORT_KIND = ['personal_data', 'invoices'] as const;
const CONTACT_SUPPORT_TOPIC = [
  'ticketing_refund',
  'playback_quality',
  'replay',
  'store_shipping',
  'account_signin',
  'personal_data',
] as const;

export const signUp: Route<{
  method: 'post';
  version: 1;
  path: '/auth/sign-up';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        email: z.ZodString;
        password: z.ZodString;
        displayName: z.ZodOptional<z.ZodString>;
        mode: typeof StorefrontSessionModeSchema;
        deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        acceptedTermsVersion: z.ZodInt;
        locale: VocabularyIn<typeof LOCALES>;
      },
      z.core.$strip
    >
  >;
  responses: {
    201: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof StorefrontSessionEstablishedSchema }, z.core.$loose>
      >
    >;
    400: typeof BadRequestResponse;
    409: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
    429: typeof TooManyRequestsResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'post',
  path: '/auth/sign-up',
  operationId: 'signUp',
  summary: 'Creates an account with email and password.',
  description:
    '**A documented relay to `identity`, and the relay is mandatory, not preferable.** Three\nreasons, the first of which comes from our own tooling:\n\n1. **zod is the source and the OpenAPI is generated from it.** A transparent relay has no\n   schema, so it **would not appear in this document** — the six missing contracts would\n   stay missing. That is the decisive argument;\n2. **i18n by codes.** The authentication library answers in English sentences\n   (`"Invalid email or password"`), which the error envelope forbids. The BFF translates\n   into **codes**, envelope included;\n3. **rate limiting per `device_id`**, which the library cannot do: its ceilings are per\n   address or per session, and a living room behind a NAT shares its address.\n\nThe cookie, when there is one, is set on the **BFF\'s domain** — that is what lets the\nserver renderer read it, and what keeps critical rule 1 free of an exception through the\nauthentication door.\n\n**The public handle is generated, neutral, and changeable later** through `updateProfile`\n(D-101): a sign-up never fails on a handle, and nothing personal becomes public by\ndefault. A verification link is emailed at once; an unverified address blocks nothing\n(D-100), and `ViewerContext.account.emailVerified` says where it stands.\n\n**A taken email answers `409` `identity.email_taken`** (D-099). The status alone says the\naddress is registered, so what bounds enumeration is the rate limit, answered `429`.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  security: [],
  parameters: [IdempotencyKeyParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          email: z.string().meta({
            format: 'email',
          }),
          password: z.string().min(12).max(128),
          displayName: z.string().max(80).optional(),
          mode: StorefrontSessionModeSchema,
          deviceId: uuidOut().nullable().optional(),
          acceptedTermsVersion: z.int().meta({ minimum: undefined, maximum: undefined }).meta({
            description:
              '**Timestamped by the server, versioned**: a consent without a version or a date is worth nothing.',
          }),
          locale: vocabularyIn(LOCALES).meta({
            'x-arthome-vocabulary-source': 'LOCALES',
            description:
              "The language the account's emails are written in, starting with the welcome and the\nverification link. **Strict, as an input**: a locale we cannot render is refused\nrather than answered in another language. The country is not asked: the server\nresolves it.\n",
            examples: [Locale.FR],
          }),
        }),
        example: {
          email: 'marie@example.org',
          password: 'a-long-password',
          displayName: 'Marie J.',
          mode: SessionMode.COOKIE,
          acceptedTermsVersion: 3,
          locale: Locale.FR,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Account created and session opened, in the requested mode.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: StorefrontSessionEstablishedSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:00:00.000Z',
            data: {
              mode: SessionMode.COOKIE,
              viewerContext: {
                deviceId: '019928f4-1b6c-7c3a-9f2e-6a1d0c4b8e77',
                signedIn: true,
                profiles: [],
                constants: {
                  roomOpensMinutesBefore: 30,
                  cancelDeadlineMinutesBefore: 60,
                  scarcityThresholdBps: 8500,
                  billboardPreviewDelaySec: 4,
                  waitlistPriorityWindowHours: 2,
                  chatRateLimitPerSecond: 10,
                  reminderLeadMinutes: 30,
                  replayExpiryWarningHours: 6,
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
              },
            },
          },
        },
      },
    },
    400: BadRequestResponse,
    409: {
      description: "`identity.email_taken` — a **code**, not the library's English sentence.",
      content: {
        'application/json': {
          schema: StorefrontErrorEnvelopeSchema,
          example: {
            error: {
              code: IdentityErrorCode.EMAIL_TAKEN,
              nature: FailureNature.REFUSED,
              params: {},
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T18:00:00.000Z',
          },
        },
      },
    },
    429: TooManyRequestsResponse,
  },
});

export const signIn: Route<{
  method: 'post';
  version: 1;
  path: '/auth/sign-in';
  parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        email: z.ZodString;
        password: z.ZodString;
        mode: typeof StorefrontSessionModeSchema;
        deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof StorefrontSessionEstablishedSchema }, z.core.$loose>
      >
    >;
    401: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
    429: typeof TooManyRequestsResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'post',
  path: '/auth/sign-in',
  operationId: 'signIn',
  summary: 'Opens a session with email and password.',
  description:
    'Same relay, same translation into codes: `identity.invalid_credentials` **never** distinguishes an\nunknown email from a wrong password — the distinction would tell an attacker which accounts\nexist.\n\n`identity.two_factor_required` is an **intermediate** refusal, not a failure: it carries a\n`challengeId` to present to `/v1/auth/two-factor/verify`.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  'x-arthome-idempotency-exemption':
    '**The one exemption that is not "nothing to deduplicate": this one is a prohibition.** The\nidempotency regime replays the original response **verbatim**; on a session opening, that\nwould amount to **returning a token without having verified the credentials**. A replayed\nkey would become a session bearer — and a stolen key, a stolen session.\n\nThe five other authentication routes do carry the key, because a replay there returns the\noriginal response rather than a `410` or a second effect: that is safe resumption. A\nsign-in, no — it must **always** re-authenticate. The protection against double submission\nhere is rate limiting per `device_id`, not the idempotency store.\n',
  security: [],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          email: z.string().meta({
            format: 'email',
          }),
          password: z.string().max(128),
          mode: StorefrontSessionModeSchema,
          deviceId: uuidOut().nullable().optional(),
        }),
        example: {
          email: 'marie@example.org',
          password: 'a-long-password',
          mode: SessionMode.BEARER,
          deviceId: '019928f4-1b6c-7c3a-9f2e-6a1d0c4b8e77',
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Session opened, in the requested mode.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: StorefrontSessionEstablishedSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:00:10.000Z',
            data: {
              mode: SessionMode.BEARER,
              accessToken: 'sess_9f2ac1b4',
              refreshToken: 'refr_4d77e2',
              expiresAt: '2026-09-28T18:00:10Z',
              viewerContext: {
                deviceId: '019928f4-1b6c-7c3a-9f2e-6a1d0c4b8e77',
                signedIn: true,
                profiles: [],
                constants: {
                  roomOpensMinutesBefore: 30,
                  cancelDeadlineMinutesBefore: 60,
                  scarcityThresholdBps: 8500,
                  billboardPreviewDelaySec: 4,
                  waitlistPriorityWindowHours: 2,
                  chatRateLimitPerSecond: 6,
                  reminderLeadMinutes: 30,
                  replayExpiryWarningHours: 6,
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
              },
            },
          },
        },
      },
    },
    401: {
      description:
        '`identity.invalid_credentials`, or `identity.two_factor_required` with its `challengeId`.',
      content: {
        'application/json': {
          schema: StorefrontErrorEnvelopeSchema,
          example: {
            error: {
              code: IdentityErrorCode.TWO_FACTOR_REQUIRED,
              nature: FailureNature.REFUSED,
              params: {
                challengeId: 'chl_7ab2',
              },
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T18:00:10.000Z',
          },
        },
      },
    },
    429: TooManyRequestsResponse,
  },
});

export const signOut: Route<{
  method: 'post';
  version: 1;
  path: '/auth/sign-out';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
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
}> = accountRoutes.defineRoute({
  method: 'post',
  path: '/auth/sign-out',
  operationId: 'signOut',
  summary: 'Closes the current session — and nothing else.',
  description:
    "**The trap this operation exists to avoid.** The authentication library's `signOut` revokes\n**all** of the user's sessions. On a television shared by five profiles, that is never what\nanyone wants: it would sign out the whole living room.\n\n**Two gestures, two routes, never one for the other**:\n- **this one** closes the current session;\n- **`DELETE /v1/me/device-sessions/{sessionId}`** signs out **one profile** from a device\n  (`multi-session.revoke`), the other accounts staying signed in;\n- **`DELETE /v1/me/devices/{deviceId}`** removes the device, all its sessions **and its\n  playback leases**.\n\n**Order matters in `bearer` mode**: the session is destroyed server-side **then** the client\nclears its native store. Clearing the store is not revoking. In `cookie` mode, the cookie is\ncleared **with exactly the attributes that set it** — otherwise it is not cleared.\n",
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  parameters: [IdempotencyKeyParameter],
  responses: {
    200: {
      description: 'Session closed. Replayed, it succeeds.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  signedOut: z.boolean().optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T23:00:00.000Z',
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

export const confirmEmailVerification: Route<{
  method: 'post';
  version: 1;
  path: '/auth/verify-email';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<z.ZodObject<{ token: z.ZodString }, z.core.$strip>>;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: z.ZodObject<{ verified: z.ZodBoolean }, z.core.$loose> }, z.core.$loose>
      >
    >;
    400: typeof BadRequestResponse;
    410: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
    429: typeof TooManyRequestsResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'post',
  path: '/auth/verify-email',
  operationId: 'confirmEmailVerification',
  summary: 'Confirms an email address from the link sent to it.',
  description:
    '**The link points at the surface, never at the API**, which sends its token here. No\nsession is needed: the link is opened on whatever device read the email.\n\n**The token is spent by its first use and expires** (`adr-auth.md` §6.7). An unknown, an\nexpired and an already used token all answer the same `410`\n`identity.verification_link_invalid`: telling them apart would say which tokens were ever\nissued. A replay under the same `Idempotency-Key` answers the first `200` again.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  'x-arthome-invalidates': ['account:profile'],
  security: [],
  parameters: [IdempotencyKeyParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          token: z.string().min(1).max(256),
        }),
        example: {
          token: 'vrf_4b2c9e1f7a0d',
        },
      },
    },
  },
  responses: {
    200: {
      description: 'The address is verified.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({
                verified: z.boolean(),
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:05:00.000Z',
            data: {
              verified: true,
            },
          },
        },
      },
    },
    400: BadRequestResponse,
    410: {
      description:
        '`identity.verification_link_invalid`: unknown, expired or already used, one answer for the three.',
      content: {
        'application/json': {
          schema: StorefrontErrorEnvelopeSchema,
          example: {
            error: {
              code: IdentityErrorCode.VERIFICATION_LINK_INVALID,
              nature: FailureNature.REFUSED,
              params: {},
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T18:05:00.000Z',
          },
        },
      },
    },
    429: TooManyRequestsResponse,
  },
});

export const resendEmailVerification: Route<{
  method: 'post';
  version: 1;
  path: '/auth/verify-email/resend';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: z.ZodObject<{ queued: z.ZodBoolean }, z.core.$loose> }, z.core.$loose>
      >
    >;
    401: typeof UnauthorizedResponse;
    403: typeof CsrfRefusedResponse;
    429: typeof TooManyRequestsResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'post',
  path: '/auth/verify-email/resend',
  operationId: 'resendEmailVerification',
  summary: "Queues a fresh verification link for the signed-in account's address.",
  description:
    'The fresh link replaces the earlier ones, which stop working. **`queued: true`** says the\nlink is recorded for `notifications` to send, which owns the sending; it does not say an\nemail left. **`queued: false` when the address is already verified**: nothing is queued,\nand that is not a refusal.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [IdempotencyKeyParameter],
  responses: {
    200: {
      description: 'A link was queued for sending, or the address is already verified.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({
                queued: z.boolean(),
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:06:00.000Z',
            data: {
              queued: true,
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
    403: CsrfRefusedResponse,
    429: TooManyRequestsResponse,
  },
});

export const requestPasswordReset: Route<{
  method: 'post';
  version: 1;
  path: '/auth/forget-password';
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
        typeof StorefrontEnvelopeMetaSchema,
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
}> = accountRoutes.defineRoute({
  method: 'post',
  path: '/auth/forget-password',
  operationId: 'requestPasswordReset',
  summary: 'Requests a password reset link.',
  description:
    "**Always answers `202`, whether the account exists or not.** Distinguishing the two would\ntell an attacker which emails are registered.\n\n**The email's link points at the surface, never at the API** — `arthome.fr/reset?token=…` —\nand therefore **per product and per language**. The library's default builds it from its own\nbase address and would land the person on an API.\n",
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  security: [],
  parameters: [IdempotencyKeyParameter],
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
          email: 'marie@example.org',
          locale: Locale.FR,
        },
      },
    },
  },
  responses: {
    202: {
      description: 'Request accepted — the answer is the same in both cases.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  accepted: z.boolean().optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:01:00.000Z',
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

export const resetPassword: Route<{
  method: 'post';
  version: 1;
  path: '/auth/reset-password';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<{ token: z.ZodString; password: z.ZodString }, z.core.$strip>
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<
                {
                  changed: z.ZodOptional<z.ZodBoolean>;
                  otherSessionsRevoked: z.ZodOptional<z.ZodInt>;
                },
                z.core.$loose
              >
            >;
          },
          z.core.$loose
        >
      >
    >;
    400: typeof BadRequestResponse;
    410: typeof GoneResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'post',
  path: '/auth/reset-password',
  operationId: 'resetPassword',
  summary: 'Sets a new password from a reset token.',
  description:
    '**Does not open a session.** The person signs in again, which proves the new password works\nand avoids an email link becoming a session bearer. The token is single-use and\nshort-lived.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  security: [],
  parameters: [IdempotencyKeyParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          token: z.string(),
          password: z.string().min(12).max(128),
        }),
        example: {
          token: 'rst_9f2ac1',
          password: 'a-new-password',
        },
      },
    },
  },
  responses: {
    200: {
      description:
        'Password changed. **All other sessions are revoked** — a password changed after a theft must close the door.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  changed: z.boolean().optional(),
                  otherSessionsRevoked: z
                    .int()
                    .meta({ minimum: undefined, maximum: undefined })
                    .optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:02:00.000Z',
            data: {
              changed: true,
              otherSessionsRevoked: 3,
            },
          },
        },
      },
    },
    400: BadRequestResponse,
    410: GoneResponse,
  },
});

export const startSocialSignIn: Route<{
  method: 'post';
  version: 1;
  path: '/auth/social/{provider}/start';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    PathParameter<'provider', VocabularyIn<typeof START_SOCIAL_SIGN_IN_PROVIDER>>,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        mode: typeof StorefrontSessionModeSchema;
        deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        returnPath: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodObject<
              { authorizationUrl: z.ZodString; state: z.ZodString; expiresAt: z.ZodString },
              z.core.$loose
            >;
          },
          z.core.$loose
        >
      >
    >;
    400: typeof BadRequestResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'post',
  path: '/auth/social/{provider}/start',
  operationId: 'startSocialSignIn',
  summary: 'Starts a social sign-in — the surfaces never talk to the provider.',
  description:
    "**The OAuth client is confidential and server-side.** No application embeds a secret: that\nis the only defensible form on a distributed binary, and the redirect is registered **once\nper provider**, on the BFF's domain.\n\n**The deep link on return never carries the token.** It carries only a **single-use opaque\nstate**, which the application then exchanges for its token over direct TLS with the BFF\n(`/v1/auth/exchange`). The return URL travels through the operating system, can be logged,\nand can be opened by another application.\n\n**Per surface**: browsers follow an ordinary redirect; native shells open the **system\nbrowser**, never their WebView, and come back through a universal link. **The television\ndoes no OAuth**: it goes through pairing, intent `signin`.\n",
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  security: [],
  parameters: [
    IdempotencyKeyParameter,
    {
      name: 'provider',
      in: 'path',
      required: true,
      schema: vocabularyIn(START_SOCIAL_SIGN_IN_PROVIDER).meta({
        'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
        'x-arthome-vocabulary-reason':
          'An external provider or platform identifier. It is their vocabulary, not ours, and it changes when they change.',
      }),
    },
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          mode: StorefrontSessionModeSchema,
          deviceId: uuidOut().nullable().optional(),
          returnPath: z
            .string()
            .nullable()
            .meta({
              description:
                '**Relative** return path inside the surface. An absolute address is refused: the allowlist\nis made of **literal strings**, never of a pattern.\n',
            })
            .optional(),
        }),
        example: {
          mode: SessionMode.BEARER,
          deviceId: '019928f4-1b6c-7c3a-9f2e-6a1d0c4b8e77',
          returnPath: '/compte',
        },
      },
    },
  },
  responses: {
    200: {
      description: 'The authorization address to open, and the opaque state that will come back.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({
                authorizationUrl: z.string().meta({
                  format: 'uri',
                }),
                state: z.string().meta({
                  description:
                    '**Opaque, single-use, short-lived.** It carries nothing meaningful.',
                }),
                expiresAt: InstantOut,
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:03:00.000Z',
            data: {
              authorizationUrl:
                'https://api.arthome.fr/v1/auth/social/google/redirect?state=ott_9f2ac1',
              state: 'ott_9f2ac1',
              expiresAt: '2026-09-21T18:13:00Z',
            },
          },
        },
      },
    },
    400: BadRequestResponse,
  },
});

export const exchangeOneTimeToken: Route<{
  method: 'post';
  version: 1;
  path: '/auth/exchange';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        state: z.ZodString;
        mode: typeof StorefrontSessionModeSchema;
        deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof StorefrontSessionEstablishedSchema }, z.core.$loose>
      >
    >;
    410: typeof GoneResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'post',
  path: '/auth/exchange',
  operationId: 'exchangeOneTimeToken',
  summary: 'Exchanges the opaque state from the return for a session.',
  description:
    '**This is what makes the journey replayable if the operating system kills the application\nduring the detour**: the pending state lives server-side, not in application memory. On\nreturn, the deep link says **where to go**, and this exchange says **what changed**.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  security: [],
  parameters: [IdempotencyKeyParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          state: z.string(),
          mode: StorefrontSessionModeSchema,
          deviceId: uuidOut().nullable().optional(),
        }),
        example: {
          state: 'ott_9f2ac1',
          mode: SessionMode.BEARER,
          deviceId: '019928f4-1b6c-7c3a-9f2e-6a1d0c4b8e77',
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Session opened in the requested mode.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: StorefrontSessionEstablishedSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:03:40.000Z',
            data: {
              mode: SessionMode.BEARER,
              accessToken: 'sess_4d77e2',
              expiresAt: '2026-09-28T18:03:40Z',
              viewerContext: {
                deviceId: '019928f4-1b6c-7c3a-9f2e-6a1d0c4b8e77',
                signedIn: true,
                profiles: [],
                constants: {
                  roomOpensMinutesBefore: 30,
                  cancelDeadlineMinutesBefore: 60,
                  scarcityThresholdBps: 8500,
                  billboardPreviewDelaySec: 4,
                  waitlistPriorityWindowHours: 2,
                  chatRateLimitPerSecond: 6,
                  reminderLeadMinutes: 30,
                  replayExpiryWarningHours: 6,
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
              },
            },
          },
        },
      },
    },
    410: GoneResponse,
  },
});

export const changePassword: Route<{
  method: 'patch';
  version: 1;
  path: '/auth/password';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        currentPassword: z.ZodString;
        newPassword: z.ZodString;
        revokeOtherSessions: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<
                {
                  changed: z.ZodOptional<z.ZodBoolean>;
                  otherSessionsRevoked: z.ZodOptional<z.ZodInt>;
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
    403: typeof CsrfRefusedResponse;
    429: typeof TooManyRequestsResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'patch',
  path: '/auth/password',
  operationId: 'changePassword',
  summary: 'Changes the password from the account.',
  description:
    '**The current password is required**, and that is not a formality: without it, a stolen\nsession would be enough to lock the owner out of their own account.\n\n**Other sessions are revoked** — this is the gesture one makes on suspecting a theft, and\nleaving the other bearers untouched would empty it of meaning. The current session survives:\nyou do not sign yourself out by changing your password.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [IdempotencyKeyParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          currentPassword: z.string(),
          newPassword: z.string().min(12),
          revokeOtherSessions: z.boolean().default(true).optional(),
        }),
        example: {
          currentPassword: 'an-old-password',
          newPassword: 'a-new-password',
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Password changed.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  changed: z.boolean().optional(),
                  otherSessionsRevoked: z
                    .int()
                    .meta({ minimum: undefined, maximum: undefined })
                    .optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:57:00.000Z',
            data: {
              changed: true,
              otherSessionsRevoked: 2,
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
    403: CsrfRefusedResponse,
    429: TooManyRequestsResponse,
  },
});

export const enableTwoFactor: Route<{
  method: 'post';
  version: 1;
  path: '/auth/two-factor';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<z.ZodObject<{ password: z.ZodString }, z.core.$strip>>;
  responses: {
    201: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodObject<
              { otpauthUri: z.ZodString; backupCodes: z.ZodArray<z.ZodString> },
              z.core.$loose
            >;
          },
          z.core.$loose
        >
      >
    >;
    401: typeof UnauthorizedResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'post',
  path: '/auth/two-factor',
  operationId: 'enableTwoFactor',
  summary: 'Enables two-factor authentication and returns the backup codes.',
  description:
    '**The backup codes are returned here, once only.** They are never read back: the server\nkeeps only hashes of them. An operation able to repeat them would be able to read them, and\nit would no longer be a second factor.\n\nTwo-factor authentication is a **precondition** for transferring ownership of a channel on\nthe studio side: the contract refuses it without one.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [IdempotencyKeyParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          password: z.string().meta({
            description: 'Re-authentication — this is a sensitive operation.',
          }),
        }),
        example: {
          password: 'a-long-password',
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Secret to enrol and backup codes, returned **once only**.',
      headers: {
        'Cache-Control': {
          schema: z.literal('no-store'),
        },
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({
                otpauthUri: z.string(),
                backupCodes: z.array(z.string()),
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:58:00.000Z',
            data: {
              otpauthUri:
                'otpauth://totp/Arthome:marie%40example.org?secret=JBSWY3DP&issuer=Arthome',
              backupCodes: ['7K2M-9QP4', 'X3N8-2VTR'],
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
    403: CsrfRefusedResponse,
  },
});

export const disableTwoFactor: Route<{
  method: 'delete';
  version: 1;
  path: '/auth/two-factor';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<z.ZodObject<{ password: z.ZodString }, z.core.$strip>>;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<{ twoFactorEnabled: z.ZodOptional<z.ZodBoolean> }, z.core.$loose>
            >;
          },
          z.core.$loose
        >
      >
    >;
    401: typeof UnauthorizedResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'delete',
  path: '/auth/two-factor',
  operationId: 'disableTwoFactor',
  summary: 'Disables two-factor authentication.',
  description:
    '**Re-authentication required**: disabling a second factor is exactly what a session thief would try first.',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [IdempotencyKeyParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          password: z.string(),
        }),
        example: {
          password: 'a-long-password',
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Two-factor authentication disabled.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  twoFactorEnabled: z.boolean().optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:58:30.000Z',
            data: {
              twoFactorEnabled: false,
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
    403: CsrfRefusedResponse,
  },
});

export const verifyTwoFactor: Route<{
  method: 'post';
  version: 1;
  path: '/auth/two-factor/verify';
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
        mode: typeof StorefrontSessionModeSchema;
        deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof StorefrontSessionEstablishedSchema }, z.core.$loose>
      >
    >;
    401: typeof UnauthorizedResponse;
    410: typeof GoneResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'post',
  path: '/auth/two-factor/verify',
  operationId: 'verifyTwoFactor',
  summary: 'Answers the two-factor challenge, and opens the session.',
  description:
    'Follows `identity.two_factor_required`. The `challengeId` is **short-lived and single-use**; a\nconsumed backup code cannot be replayed.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  security: [],
  parameters: [IdempotencyKeyParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          challengeId: z.string(),
          code: z.string(),
          mode: StorefrontSessionModeSchema,
          deviceId: uuidOut().nullable().optional(),
        }),
        example: {
          challengeId: 'chl_7ab2',
          code: '318204',
          mode: SessionMode.COOKIE,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Session opened, in the requested mode.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: StorefrontSessionEstablishedSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:00:25.000Z',
            data: {
              mode: SessionMode.COOKIE,
              viewerContext: {
                deviceId: '019928f4-1b6c-7c3a-9f2e-6a1d0c4b8e77',
                signedIn: true,
                profiles: [],
                constants: {
                  roomOpensMinutesBefore: 30,
                  cancelDeadlineMinutesBefore: 60,
                  scarcityThresholdBps: 8500,
                  billboardPreviewDelaySec: 4,
                  waitlistPriorityWindowHours: 2,
                  chatRateLimitPerSecond: 10,
                  reminderLeadMinutes: 30,
                  replayExpiryWarningHours: 6,
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

export const addPasskey: Route<{
  method: 'post';
  version: 1;
  path: '/me/passkeys';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<{ label: z.ZodOptional<z.ZodString> }, z.core.$strip>,
    false
  >;
  responses: {
    201: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodObject<
              {
                registrationOptions: z.ZodOptional<
                  z.ZodObject<Record<never, never>, z.core.$loose>
                >;
                expiresAt: z.ZodOptional<z.ZodString>;
              },
              z.core.$loose
            >;
          },
          z.core.$loose
        >
      >
    >;
    401: typeof UnauthorizedResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'post',
  path: '/me/passkeys',
  operationId: 'addPasskey',
  summary: 'Enrols a passkey.',
  description:
    'Returns the enrolment options produced by the server; the surface passes them to the browser\nor platform API, then returns the attestation to `PUT`. **The secret never leaves the\nhardware.**\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [IdempotencyKeyParameter],
  requestBody: {
    required: false,
    content: {
      'application/json': {
        schema: z.object({
          label: z.string().max(80).optional(),
        }),
        example: {
          label: 'MacBook de Marie',
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Enrolment options, single-use.',
      headers: {
        'Cache-Control': {
          schema: z.literal('no-store'),
        },
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({
                registrationOptions: z.looseObject({}).optional(),
                expiresAt: InstantOut.optional(),
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:59:00.000Z',
            data: {
              registrationOptions: {
                challenge: 'k7M2pQ',
                rp: {
                  id: 'arthome.fr',
                  name: 'Arthome',
                },
              },
              expiresAt: '2026-09-21T19:04:00Z',
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
    403: CsrfRefusedResponse,
  },
});

export const removePasskey: Route<{
  method: 'delete';
  version: 1;
  path: '/me/passkeys/{passkeyId}';
  parameters: readonly [
    PathParameter<'passkeyId', z.ZodString>,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<{ removed: z.ZodOptional<z.ZodBoolean> }, z.core.$loose>
            >;
          },
          z.core.$loose
        >
      >
    >;
    409: typeof ConflictResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'delete',
  path: '/me/passkeys/{passkeyId}',
  operationId: 'removePasskey',
  summary: 'Removes a passkey.',
  description:
    "**Refused if it is the account's last credential** (`LAST_CREDENTIAL`): an account with no way to sign in is a lost account.",
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [
    {
      name: 'passkeyId',
      in: 'path',
      required: true,
      schema: z.string(),
    },
    IdempotencyKeyParameter,
  ],
  responses: {
    200: {
      description: 'Passkey removed.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  removed: z.boolean().optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:59:30.000Z',
            data: {
              removed: true,
            },
          },
        },
      },
    },
    409: ConflictResponse,
    403: CsrfRefusedResponse,
  },
});

export const addPaymentMethod: Route<{
  method: 'post';
  version: 1;
  path: '/me/payment-methods';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      { returnPath: z.ZodString; setAsDefault: z.ZodOptional<z.ZodDefault<z.ZodBoolean>> },
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
              {
                setupIntentRef: z.ZodString;
                clientSecret: z.ZodString;
                returnUrl: z.ZodString;
                expiresAt: z.ZodOptional<z.ZodString>;
              },
              z.core.$loose
            >;
          },
          z.core.$loose
        >
      >
    >;
    401: typeof UnauthorizedResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'post',
  path: '/me/payment-methods',
  operationId: 'addPaymentMethod',
  summary: 'Registers a payment method from the web.',
  description:
    '**The only surface able to register a card was the one with no keyboard.** The\n`payment_method` intent existed for television pairing, and the account\'s Security section\ndisplayed "Payment methods · Manage" without any command reaching it.\n\n**No card number touches our domain**: the command returns a setup `clientSecret`, and the\nsurface\'s payment element takes it from there — that is what keeps the compliance scope as\nnarrow as possible.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING],
  'x-arthome-invalidates': ['account:payment-methods'],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [IdempotencyKeyParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          returnPath: z.string().meta({
            description: '**Relative** path inside the surface. An absolute address is refused.',
          }),
          setAsDefault: z.boolean().default(false).optional(),
        }),
        example: {
          returnPath: '/compte/securite',
          setAsDefault: true,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Setup opened. The surface presents the payment element.',
      headers: {
        'Cache-Control': {
          schema: z.literal('no-store'),
        },
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({
                setupIntentRef: z.string(),
                clientSecret: z.string(),
                returnUrl: z.string().meta({
                  format: 'uri',
                }),
                expiresAt: InstantOut.optional(),
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:55:20.000Z',
            data: {
              setupIntentRef: 'seti_1Ab2Cd',
              clientSecret: 'seti_1Ab2Cd_secret_7f3',
              returnUrl: 'https://arthome.fr/compte/securite?setup=seti_1Ab2Cd',
              expiresAt: '2026-09-21T19:25:20Z',
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
    403: CsrfRefusedResponse,
  },
});

export const removePaymentMethod: Route<{
  method: 'delete';
  version: 1;
  path: '/me/payment-methods/{paymentMethodId}';
  parameters: readonly [
    PathParameter<'paymentMethodId', z.ZodString>,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<{ removed: z.ZodOptional<z.ZodBoolean> }, z.core.$loose>
            >;
          },
          z.core.$loose
        >
      >
    >;
    409: typeof ConflictResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'delete',
  path: '/me/payment-methods/{paymentMethodId}',
  operationId: 'removePaymentMethod',
  summary: 'Removes a payment method.',
  description:
    "**Refused if it is the last method of an active subscription** (`payment_method.in_use`):\nsilently removing a subscription's only card would produce a failed charge and a cancelled\nplan that nobody intended.\n",
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [
    {
      name: 'paymentMethodId',
      in: 'path',
      required: true,
      schema: z.string(),
    },
    IdempotencyKeyParameter,
  ],
  responses: {
    200: {
      description: 'Method removed. Replayed on an already-removed method, it succeeds.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  removed: z.boolean().optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:56:00.000Z',
            data: {
              removed: true,
            },
          },
        },
      },
    },
    409: ConflictResponse,
    403: CsrfRefusedResponse,
  },
});

export const getAccountScreen: Route<{
  method: 'get';
  version: 1;
  path: '/me/account';
  parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof AccountScreenSchema }, z.core.$loose>
      >
    >;
    401: typeof UnauthorizedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'get',
  path: '/me/account',
  operationId: 'getAccountScreen',
  summary: "The aggregate of the account's eleven sections, in one call.",
  description:
    'The eleven sections share **one** account shape. They justify neither eleven calls nor eleven\nschemas: eight are projections of this one. Only saved searches, orders and notifications are\npaginated separately.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY, Service.TICKETING, Service.NOTIFICATIONS],
  'x-arthome-freshness': 300,
  responses: {
    200: {
      description: 'The account.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: AccountScreenSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:55:00.000Z',
            data: {
              profile: {
                publicHandle: '@marie.j',
                displayName: 'Marie J.',
                email: 'marie@example.org',
                emailVerified: true,
                phoneVerified: false,
                memberNumber: 'A-004212',
              },
              subscription: {
                planTier: PlanTier.PASS,
                state: AccountStatus.ACTIVE,
                currentPeriodEnd: '2026-10-21T00:00:00Z',
                cancelAtPeriodEnd: false,
              },
              credits: [],
              devices: [],
              consents: {
                purposes: {
                  audience: true,
                  perso: true,
                  partners: false,
                  ads: false,
                },
                textVersion: 3,
                recordedAt: '2026-05-02T09:12:00Z',
              },
              deletion: null,
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
  },
});

export const listMyTickets: Route<{
  method: 'get';
  version: 1;
  path: '/me/tickets';
  parameters: readonly [
    typeof CursorParameter,
    typeof CursorDirectionParameter,
    typeof LimitParameter,
    QueryParameter<'window', z.ZodDefault<VocabularyIn<typeof LIST_MY_TICKETS_WINDOW>>>,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            items: z.ZodArray<typeof TicketCardSchema>;
            page: typeof StorefrontCursorPageInfoSchema;
          },
          z.core.$loose
        >
      >
    >;
    401: typeof UnauthorizedResponse;
    410: typeof GoneResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'get',
  path: '/me/tickets',
  operationId: 'listMyTickets',
  summary: 'My seats, upcoming or past, already ordered by the server.',
  description:
    'The order is **server-side**: a date carrying an outcome rises to the top, because it calls\nfor action. No surface reorders.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING, Service.CATALOG, Service.STREAMING],
  'x-arthome-freshness': 60,
  parameters: [
    CursorParameter,
    CursorDirectionParameter,
    LimitParameter,
    {
      name: 'window',
      in: 'query',
      schema: vocabularyIn(LIST_MY_TICKETS_WINDOW)
        .meta({
          'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
          'x-arthome-vocabulary-reason':
            "A sort or filter key. It is a property of THIS endpoint's list — which orders it offers — not of the domain, and adding one is an endpoint change rather than a vocabulary change.",
        })
        .default('upcoming'),
    },
  ],
  responses: {
    200: {
      description: 'Page of seats.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              items: z.array(TicketCardSchema),
              page: StorefrontCursorPageInfoSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:56:00.000Z',
            items: [],
            page: {
              hasMore: false,
              emptyReason: EmptyReason.NO_TICKET_YET,
              emptyActionCode: 'browse_catalog',
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
    410: GoneResponse,
  },
});

export const listMyReplays: Route<{
  method: 'get';
  version: 1;
  path: '/me/replays';
  parameters: readonly [
    typeof CursorParameter,
    typeof LimitParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          { items: z.ZodArray<typeof DateCardSchema>; page: typeof StorefrontCursorPageInfoSchema },
          z.core.$loose
        >
      >
    >;
    401: typeof UnauthorizedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'get',
  path: '/me/replays',
  operationId: 'listMyReplays',
  summary: 'My replays, the ones expiring first.',
  description:
    'Each entry carries `replay.expiresAt` as an **instant**; the surface derives "expires in 41 h" against `servedAt`, with no call.',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING, Service.CATALOG, Service.STREAMING],
  'x-arthome-freshness': 60,
  parameters: [CursorParameter, LimitParameter],
  responses: {
    200: {
      description: 'Page of replays.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              items: z.array(DateCardSchema),
              page: StorefrontCursorPageInfoSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:56:30.000Z',
            items: [],
            page: {
              hasMore: false,
              emptyReason: EmptyReason.NO_REPLAY_AVAILABLE,
              emptyActionCode: 'browse_catalog',
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
  },
});

export const listWatchlist: Route<{
  method: 'get';
  version: 1;
  path: '/me/watchlist';
  parameters: readonly [
    typeof CursorParameter,
    typeof LimitParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          { items: z.ZodArray<typeof DateCardSchema>; page: typeof StorefrontCursorPageInfoSchema },
          z.core.$loose
        >
      >
    >;
    401: typeof UnauthorizedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'get',
  path: '/me/watchlist',
  operationId: 'listWatchlist',
  summary: 'Ma liste.',
  description:
    '"My list" — complete cards, not identifiers: the surface must be able to paint without a\nsecond call per entry.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY, Service.CATALOG],
  'x-arthome-freshness': 60,
  parameters: [CursorParameter, LimitParameter],
  responses: {
    200: {
      description: 'Page of dates set aside.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              items: z.array(DateCardSchema),
              page: StorefrontCursorPageInfoSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:57:00.000Z',
            items: [],
            page: {
              hasMore: false,
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
  },
});

export const addToWatchlist: Route<{
  method: 'put';
  version: 1;
  path: '/me/watchlist/{dateId}';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof DateCardSchema }, z.core.$loose>
      >
    >;
    404: typeof NotFoundResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'put',
  path: '/me/watchlist/{dateId}',
  operationId: 'addToWatchlist',
  summary: 'Sets a date aside.',
  description:
    '**A state assignment, not a toggle.** Two submissions of the same gesture leave a single\nentry; a toggle on an unreliable network would invert the result. Returns the updated card,\nso the surface repaints without a second round trip.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  'x-arthome-invalidates': ['home:rails'],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [DateIdParameter, IdempotencyKeyParameter],
  responses: {
    200: {
      description: 'The updated card.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: DateCardSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:57:20.000Z',
            data: {
              id: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
              displayState: DisplayState.LIVE,
              viewerRelations: {
                inWatchlist: true,
                reminderSet: false,
                followsArtist: false,
              },
            },
          },
        },
      },
    },
    404: NotFoundResponse,
    403: CsrfRefusedResponse,
  },
});

export const removeFromWatchlist: Route<{
  method: 'delete';
  version: 1;
  path: '/me/watchlist/{dateId}';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof DateCardSchema }, z.core.$loose>
      >
    >;
    404: typeof NotFoundResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'delete',
  path: '/me/watchlist/{dateId}',
  operationId: 'removeFromWatchlist',
  summary: 'Removes a date from my list.',
  description:
    'Replayed on an already-removed entry, it **succeeds** — an idempotent deletion must not fail.',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [DateIdParameter, IdempotencyKeyParameter],
  responses: {
    200: {
      description: 'The updated card.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: DateCardSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:57:40.000Z',
            data: {
              id: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
              displayState: DisplayState.LIVE,
              viewerRelations: {
                inWatchlist: false,
                reminderSet: false,
                followsArtist: false,
              },
            },
          },
        },
      },
    },
    404: NotFoundResponse,
    403: CsrfRefusedResponse,
  },
});

export const listFollowedArtists: Route<{
  method: 'get';
  version: 1;
  path: '/me/follows';
  parameters: readonly [
    typeof CursorParameter,
    typeof LimitParameter,
    QueryParameter<'sort', z.ZodDefault<VocabularyIn<typeof LIST_FOLLOWED_ARTISTS_SORT>>>,
    QueryParameter<'liveOnly', z.ZodDefault<z.ZodBoolean>>,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            items: z.ZodArray<typeof ArtistSummarySchema>;
            page: typeof StorefrontCursorPageInfoSchema;
          },
          z.core.$loose
        >
      >
    >;
    401: typeof UnauthorizedResponse;
    410: typeof GoneResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'get',
  path: '/me/follows',
  operationId: 'listFollowedArtists',
  summary: 'Followed artists — the "Following" page, which had no entry point.',
  description:
    "**The whole page was unserved.** `/v1/me/follows/{artistId}` exposed only `PUT` and\n`DELETE`, `/v1/artists` accepted no filter on following, and `AccountScreen` carried no list.\nThe only way to paint the screen was to walk `/v1/artists` in full and filter client-side —\nthat is, exactly what the contract forbids elsewhere, and rightly so.\n\n**The home page's `followed` rail was no substitute**: it carries `DateCard`s, hence\nannounced dates, whereas half of this page is made of followed artists **with no date** — and\nit has no sort, no remove-in-place, and no empty states of its own.\n\nThe contract in fact contradicted itself: `emptyReason` carried `no_followed_artist_live`,\n**an empty state for a list no operation produced**.\n\nIt also serves `account/faves`, of whose two collections this is the first — the second being\n`/v1/me/watchlist`.\n",
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY, Service.CATALOG, Service.NOTIFICATIONS],
  'x-arthome-freshness': 60,
  parameters: [
    CursorParameter,
    LimitParameter,
    {
      name: 'sort',
      in: 'query',
      schema: vocabularyIn(LIST_FOLLOWED_ARTISTS_SORT)
        .meta({
          'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
          'x-arthome-vocabulary-reason':
            "A sort or filter key. It is a property of THIS endpoint's list — which orders it offers — not of the domain, and adding one is an endpoint change rather than a vocabulary change.",
        })
        .default('next_date'),
    },
    {
      name: 'liveOnly',
      in: 'query',
      description: '**The "Following live" section**, served rather than filtered client-side.',
      schema: z.boolean().default(false),
    },
  ],
  responses: {
    200: {
      description:
        'Page of followed artists. Each carries `alertEnabled` — **following and being alerted are two\nsettings** — and `nextDate` when there is one, which gives the split the screen displays\nwithout a call per artist.\n',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              items: z.array(ArtistSummarySchema),
              page: StorefrontCursorPageInfoSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:58:40.000Z',
            items: [
              {
                id: '019928a0-7d31-7a10-b8c4-2f9e11a4c333',
                channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
                name: 'Compagnie Verticale',
                categoryId: 'dance-contemporary',
                followers: 4120,
                isLiveNow: true,
                followedByViewer: true,
                alertEnabled: true,
              },
            ],
            page: {
              hasMore: false,
              emptyReason: EmptyReason.NO_FOLLOWED_ARTIST,
              emptyActionCode: 'browse_artists',
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
    410: GoneResponse,
  },
});

export const followArtist: Route<{
  method: 'put';
  version: 1;
  path: '/me/follows/{artistId}';
  parameters: readonly [
    typeof ArtistIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<{ alertEnabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>> }, z.core.$strip>,
    false
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof ArtistSummarySchema }, z.core.$loose>
      >
    >;
    404: typeof NotFoundResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'put',
  path: '/me/follows/{artistId}',
  operationId: 'followArtist',
  summary: 'Follows an artist.',
  description:
    '**Following and being alerted are two settings.** `followArtist` is a catalogue relation; the\nalert is a flag **per followed artist** carried by `notifications` (`alertEnabled` below).\nConflating them would make it impossible to follow an artist without being notified — and the\nmobile design shows the two separately.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY, Service.NOTIFICATIONS],
  'x-arthome-invalidates': ['home:rails'],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [ArtistIdParameter, IdempotencyKeyParameter],
  requestBody: {
    required: false,
    content: {
      'application/json': {
        schema: z.object({
          alertEnabled: z.boolean().default(false).optional(),
        }),
        example: {
          alertEnabled: true,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'The updated artist.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: ArtistSummarySchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:58:00.000Z',
            data: {
              id: '019928a0-7d31-7a10-b8c4-2f9e11a4c333',
              channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
              name: 'Compagnie Verticale',
              categoryId: 'dance-contemporary',
              followedByViewer: true,
            },
          },
        },
      },
    },
    404: NotFoundResponse,
    403: CsrfRefusedResponse,
  },
});

export const unfollowArtist: Route<{
  method: 'delete';
  version: 1;
  path: '/me/follows/{artistId}';
  parameters: readonly [
    typeof ArtistIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof ArtistSummarySchema }, z.core.$loose>
      >
    >;
    404: typeof NotFoundResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'delete',
  path: '/me/follows/{artistId}',
  operationId: 'unfollowArtist',
  summary: 'Unfollows an artist.',
  description:
    '**A state assignment, not a toggle.** Returns the updated artist, so the surface repaints\nwithout a second round trip. It does not touch the alert flag, which is a distinct setting\ncarried by `notifications`.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [ArtistIdParameter, IdempotencyKeyParameter],
  responses: {
    200: {
      description: 'The updated artist.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: ArtistSummarySchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:58:20.000Z',
            data: {
              id: '019928a0-7d31-7a10-b8c4-2f9e11a4c333',
              channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
              name: 'Compagnie Verticale',
              categoryId: 'dance-contemporary',
              followedByViewer: false,
            },
          },
        },
      },
    },
    404: NotFoundResponse,
    403: CsrfRefusedResponse,
  },
});

export const setReminder: Route<{
  method: 'put';
  version: 1;
  path: '/me/reminders/{dateId}';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<
                { reminderSet: z.ZodOptional<z.ZodBoolean>; remindAt: z.ZodOptional<z.ZodString> },
                z.core.$loose
              >
            >;
          },
          z.core.$loose
        >
      >
    >;
    404: typeof NotFoundResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'put',
  path: '/me/reminders/{dateId}',
  operationId: 'setReminder',
  summary: 'Sets a dated reminder on a date.',
  description:
    '**A reminder is a dated promise.** If the date is postponed, the reminder **follows** the\npostponement; if it is cancelled, the reminder is **cancelled** and not sent into the void.\nThe lead time (30 min) is a **served** domain constant, not a surface choice.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.NOTIFICATIONS],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [DateIdParameter, IdempotencyKeyParameter],
  responses: {
    200: {
      description: 'Reminder set.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  reminderSet: z.boolean().optional(),
                  remindAt: InstantOut.optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:59:00.000Z',
            data: {
              reminderSet: true,
              remindAt: '2026-09-21T18:30:00Z',
            },
          },
        },
      },
    },
    404: NotFoundResponse,
    403: CsrfRefusedResponse,
  },
});

export const clearReminder: Route<{
  method: 'delete';
  version: 1;
  path: '/me/reminders/{dateId}';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<{ reminderSet: z.ZodOptional<z.ZodBoolean> }, z.core.$loose>
            >;
          },
          z.core.$loose
        >
      >
    >;
    404: typeof NotFoundResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'delete',
  path: '/me/reminders/{dateId}',
  operationId: 'clearReminder',
  summary: 'Clears the reminder.',
  description:
    'Clears the reminder. Replayed on an already-cleared reminder, it succeeds — it is queued\noffline, so it must be safe on replay.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.NOTIFICATIONS],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [DateIdParameter, IdempotencyKeyParameter],
  responses: {
    200: {
      description: 'Reminder cleared.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  reminderSet: z.boolean().optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:59:20.000Z',
            data: {
              reminderSet: false,
            },
          },
        },
      },
    },
    404: NotFoundResponse,
    403: CsrfRefusedResponse,
  },
});

export const listSavedSearches: Route<{
  method: 'get';
  version: 1;
  path: '/me/saved-searches';
  parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ items: z.ZodArray<typeof SavedSearchSchema> }, z.core.$loose>
      >
    >;
    401: typeof UnauthorizedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'get',
  path: '/me/saved-searches',
  operationId: 'listSavedSearches',
  summary: 'My saved searches, with their new-match counter.',
  description:
    '**Zero counting queries on opening.** The "new since your last visit" counter is incremented\nby the index\'s percolator when a new date matches, and reset to zero on read. The two other\noptions would cost ten aggregations per display, for a figure whose accuracy nobody will ever\nmeasure.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.CATALOG],
  'x-arthome-freshness': 300,
  responses: {
    200: {
      description: 'The saved searches.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              items: z.array(SavedSearchSchema),
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:00:00.000Z',
            items: [
              {
                id: '019928fa-0000-7000-8000-000000000001',
                scope: 'search',
                name: 'Danse à Paris',
                criteria: {
                  categoryIds: ['dance-contemporary'],
                  cityIds: ['paris'],
                },
                criteriaVersion: 2,
                criteriaSignature: '7f3a1c',
                stale: false,
                channels: [NotificationChannel.PUSH],
                active: true,
                newMatchesSinceLastVisit: 3,
              },
            ],
          },
        },
      },
    },
    401: UnauthorizedResponse,
  },
});

export const createSavedSearch: Route<{
  method: 'post';
  version: 1;
  path: '/me/saved-searches';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        scope: VocabularyIn<typeof CREATE_SAVED_SEARCH_SCOPE>;
        categoryId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        queryText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        criteria: z.ZodObject<Record<never, never>, z.core.$loose>;
        channels: z.ZodOptional<z.ZodArray<VocabularyIn<typeof NOTIFICATION_CHANNELS>>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    201: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof SavedSearchSchema }, z.core.$loose>
      >
    >;
    409: typeof ConflictResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = savedSearches.create({
  operationId: 'createSavedSearch',
  summary: 'Saves a search.',
  description:
    'The **signature** is produced by `normalizeSearchCriteria()` in `@arthome/core`,\nserver-side, once. It is what deduplicates: a replay **never** creates two identical\nalerts.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.CATALOG],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  item: SavedSearchSchema,
  body: z.object({
    scope: vocabularyIn(CREATE_SAVED_SEARCH_SCOPE).meta({
      'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
      'x-arthome-vocabulary-reason':
        'A vocabulary local to this contract. The domain neither produces nor consumes these values — they describe what this endpoint offers, and a new member is an endpoint change.',
    }),
    categoryId: z.string().nullable().optional(),
    name: z.string().max(80).nullable().optional(),
    queryText: z.string().nullable().optional(),
    criteria: z.looseObject({}),
    channels: z
      .array(
        vocabularyIn(NOTIFICATION_CHANNELS).meta({
          'x-arthome-vocabulary-source': 'NOTIFICATION_CHANNELS',
        }),
      )
      .optional(),
  }),
  example: {
    scope: 'search',
    name: 'Danse à Paris',
    criteria: {
      categoryIds: ['dance-contemporary'],
      cityIds: ['paris'],
    },
    channels: [NotificationChannel.PUSH],
  },
  responses: {
    201: {
      description: 'Search saved.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: SavedSearchSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:00:20.000Z',
            data: {
              id: '019928fa-0000-7000-8000-000000000001',
              scope: 'search',
              name: 'Danse à Paris',
              criteria: {},
              criteriaVersion: 2,
              criteriaSignature: '7f3a1c',
              channels: [NotificationChannel.PUSH],
              active: true,
              newMatchesSinceLastVisit: 0,
            },
          },
        },
      },
    },
    409: ConflictResponse,
    403: CsrfRefusedResponse,
  },
});

export const updateSavedSearch: Route<{
  method: 'patch';
  version: 1;
  path: '/me/saved-searches/{savedSearchId}';
  parameters: readonly [
    PathParameter<'savedSearchId', z.ZodString>,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        active: z.ZodOptional<z.ZodBoolean>;
        channels: z.ZodOptional<z.ZodArray<VocabularyIn<typeof NOTIFICATION_CHANNELS>>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof SavedSearchSchema }, z.core.$loose>
      >
    >;
    404: typeof NotFoundResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'patch',
  path: '/me/saved-searches/{savedSearchId}',
  operationId: 'updateSavedSearch',
  summary: 'Renames, activates, or changes the channels of a saved search.',
  description:
    '**Field-by-field** write, never a whole document. A saved search is queued offline: a replay\nmust converge to the same state, not invert it.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.CATALOG],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [
    {
      name: 'savedSearchId',
      in: 'path',
      required: true,
      schema: uuidIn(),
    },
    IdempotencyKeyParameter,
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z
          .object({
            name: z.string().nullable().optional(),
            active: z.boolean().optional(),
            channels: z
              .array(
                vocabularyIn(NOTIFICATION_CHANNELS).meta({
                  'x-arthome-vocabulary-source': 'NOTIFICATION_CHANNELS',
                }),
              )
              .optional(),
          })
          .meta({
            description: '**Field-by-field** write, never a whole document.',
          }),
        example: {
          active: false,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'The updated search.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: SavedSearchSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:01:00.000Z',
            data: {
              id: '019928fa-0000-7000-8000-000000000001',
              scope: 'search',
              criteria: {},
              criteriaVersion: 2,
              criteriaSignature: '7f3a1c',
              channels: [NotificationChannel.PUSH],
              active: false,
              newMatchesSinceLastVisit: 0,
            },
          },
        },
      },
    },
    404: NotFoundResponse,
    403: CsrfRefusedResponse,
  },
});

export const deleteSavedSearch: Route<{
  method: 'delete';
  version: 1;
  path: '/me/saved-searches/{savedSearchId}';
  parameters: readonly [
    PathParameter<'savedSearchId', z.ZodString>,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<{ deleted: z.ZodOptional<z.ZodBoolean> }, z.core.$loose>
            >;
          },
          z.core.$loose
        >
      >
    >;
    404: typeof NotFoundResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'delete',
  path: '/me/saved-searches/{savedSearchId}',
  operationId: 'deleteSavedSearch',
  summary: 'Deletes a saved search.',
  description:
    '**Replayed on an already-deleted entry, it succeeds** — that is what an offline queue requires.',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.CATALOG],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [
    {
      name: 'savedSearchId',
      in: 'path',
      required: true,
      schema: uuidIn(),
    },
    IdempotencyKeyParameter,
  ],
  responses: {
    200: {
      description: 'Deleted.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  deleted: z.boolean().optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:01:20.000Z',
            data: {
              deleted: true,
            },
          },
        },
      },
    },
    404: NotFoundResponse,
    403: CsrfRefusedResponse,
  },
});

export const listMyOrders: Route<{
  method: 'get';
  version: 1;
  path: '/me/orders';
  parameters: readonly [
    typeof CursorParameter,
    typeof LimitParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            items: z.ZodArray<
              z.ZodObject<
                {
                  order: z.ZodOptional<typeof OrderSchema>;
                  external: z.ZodOptional<typeof ExternalOrderRefSchema>;
                },
                z.core.$loose
              >
            >;
            page: typeof StorefrontCursorPageInfoSchema;
          },
          z.core.$loose
        >
      >
    >;
    401: typeof UnauthorizedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'get',
  path: '/me/orders',
  operationId: 'listMyOrders',
  summary: 'My orders, including the reflection of orders placed with a third party.',
  description:
    'An order may **not be ours**. `externalRef` is served **with its age**: what we guarantee is\nfreshness as of `syncedAt`, nothing more. When the external host does not answer, the age\ngrows — **nothing fails**.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING],
  'x-arthome-freshness': 300,
  parameters: [CursorParameter, LimitParameter],
  responses: {
    200: {
      description: 'Page of orders.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              items: z.array(
                z.looseObject({
                  order: OrderSchema.optional(),
                  external: ExternalOrderRefSchema.optional(),
                }),
              ),
              page: StorefrontCursorPageInfoSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:02:00.000Z',
            items: [
              {
                external: {
                  externalRef: 'SHOP-9912',
                  externalHost: 'boutique.compagnie-verticale.fr',
                  state: 'external',
                  syncedAt: '2026-09-20T22:14:00Z',
                  syncSource: 'shopify',
                },
              },
            ],
            page: {
              hasMore: false,
              emptyReason: EmptyReason.NO_ORDER_YET,
              emptyActionCode: 'browse_shop',
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
  },
});

export const listNotifications: Route<{
  method: 'get';
  version: 1;
  path: '/me/notifications';
  parameters: readonly [
    typeof CursorParameter,
    typeof LimitParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            items: z.ZodArray<typeof NotificationEntrySchema>;
            unreadCount: z.ZodInt;
            page: typeof StorefrontCursorPageInfoSchema;
          },
          z.core.$loose
        >
      >
    >;
    401: typeof UnauthorizedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'get',
  path: '/me/notifications',
  operationId: 'listNotifications',
  summary: 'The notification centre, and the global badge.',
  description:
    'The `unreadCount` badge is **global**, not the page\'s: otherwise the surface would display\n"3" having loaded only the last twenty.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.NOTIFICATIONS],
  'x-arthome-freshness': 60,
  parameters: [CursorParameter, LimitParameter],
  responses: {
    200: {
      description: "Page of notifications, plus the **global** unread count — not the page's.",
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              items: z.array(NotificationEntrySchema),
              unreadCount: z.int().meta({ minimum: undefined, maximum: undefined }),
              page: StorefrontCursorPageInfoSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:03:00.000Z',
            unreadCount: 2,
            items: [
              {
                id: '019928fb-0000-7000-8000-000000000001',
                triggerCode: 'date_starts_soon',
                params: {
                  dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                },
                createdAt: '2026-09-21T18:30:00Z',
                read: false,
              },
            ],
            page: {
              hasMore: false,
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
  },
});

export const markNotificationsRead: Route<{
  method: 'post';
  version: 1;
  path: '/me/notifications';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        notificationIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
        all: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<{ unreadCount: z.ZodOptional<z.ZodInt> }, z.core.$loose>
            >;
          },
          z.core.$loose
        >
      >
    >;
    401: typeof UnauthorizedResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'post',
  path: '/me/notifications',
  operationId: 'markNotificationsRead',
  summary: 'Marks notifications as read.',
  description:
    '**Monotonic: one does not un-read.** Replayed, it changes nothing — which is what makes it safe in an offline queue.',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.NOTIFICATIONS],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [IdempotencyKeyParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          notificationIds: z.array(uuidOut()).optional(),
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
      description: 'Badge updated.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  unreadCount: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:03:20.000Z',
            data: {
              unreadCount: 0,
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
    403: CsrfRefusedResponse,
  },
});

export const updateProfile: Route<{
  method: 'patch';
  version: 1;
  path: '/me/profile';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        expectedVersion: z.ZodInt;
        displayName: z.ZodOptional<z.ZodString>;
        publicHandle: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            version: z.ZodOptional<z.ZodInt>;
            data: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>;
          },
          z.core.$loose
        >
      >
    >;
    409: typeof ConflictResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'patch',
  path: '/me/profile',
  operationId: 'updateProfile',
  summary: 'Changes the displayed identity.',
  description:
    '**Field by field**, never a whole document, and conditioned on `expectedVersion`: two devices do not silently overwrite each other.',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  'x-arthome-invalidates': ['account:profile'],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [IdempotencyKeyParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          expectedVersion: z.int().meta({ minimum: undefined, maximum: undefined }),
          displayName: z.string().max(80).optional(),
          publicHandle: z.string().regex(new RegExp('^@[a-z0-9._-]{3,30}$')).optional(),
          city: z.string().nullable().optional(),
        }),
        example: {
          expectedVersion: 7,
          displayName: 'Marie J.',
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Profile updated.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              version: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
              data: z.looseObject({}).optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:04:00.000Z',
            version: 8,
            data: {
              displayName: 'Marie J.',
              publicHandle: '@marie.j',
            },
          },
        },
      },
    },
    409: ConflictResponse,
    403: CsrfRefusedResponse,
  },
});

export const updatePreferences: Route<{
  method: 'patch';
  version: 1;
  path: '/me/preferences';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        account: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>;
        device: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>;
        deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof ViewerPreferencesSchema }, z.core.$loose>
      >
    >;
    401: typeof UnauthorizedResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'patch',
  path: '/me/preferences',
  operationId: 'updatePreferences',
  summary: 'Writes a preference, at its scope.',
  description:
    '**Two scopes, and the contract separates them field by field**: `account` follows the\nperson, `device` follows the device and the room. A single scope would be wrong half the\ntime.\n\n**Additive and tolerant**: a key unknown to one version of the application is neither\nrejected nor erased on the next write — otherwise the mobile version stuck in store review\nwould overwrite settings made from the web.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [IdempotencyKeyParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          account: z.looseObject({}).optional(),
          device: z.looseObject({}).optional(),
          deviceId: uuidOut().nullable().optional(),
        }),
        example: {
          device: {
            subtitleSizeStep: 2,
            reduceMotion: true,
          },
          deviceId: '019928f4-1b6c-7c3a-9f2e-6a1d0c4b8e77',
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Preferences updated, both scopes served together.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: ViewerPreferencesSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:04:30.000Z',
            data: {
              account: {
                interfaceLocale: Locale.FR,
                readingTimezone: 'Europe/Paris',
              },
              device: {
                subtitleSizeStep: 2,
                reduceMotion: true,
              },
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
    403: CsrfRefusedResponse,
  },
});

export const updateNotificationPreferences: Route<{
  method: 'patch';
  version: 1;
  path: '/me/notification-preferences';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        triggers: z.ZodOptional<
          z.ZodObject<
            Record<never, never>,
            z.core.$catchall<z.ZodArray<VocabularyIn<typeof NOTIFICATION_CHANNELS>>>
          >
        >;
        quietHours: z.ZodOptional<
          z.ZodObject<
            {
              enabled: z.ZodOptional<z.ZodBoolean>;
              fromHour: z.ZodOptional<z.ZodInt>;
              toHour: z.ZodOptional<z.ZodInt>;
              bypassWhenTicketHeld: z.ZodOptional<z.ZodBoolean>;
            },
            z.core.$strip
          >
        >;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof NotificationPreferencesSchema }, z.core.$loose>
      >
    >;
    401: typeof UnauthorizedResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'patch',
  path: '/me/notification-preferences',
  operationId: 'updateNotificationPreferences',
  summary: 'Five triggers, three channels, and quiet hours.',
  description:
    '**The quiet-hours exception is conditioned on holding a seat**: that is a business rule, not\nan interface setting — one does not miss a show one paid for because it starts at 11:15 pm.\nThe **thresholds** that fire an alert live in `@arthome/core` and are served in\n`ViewerContext`; `notifications` reads them, it does not invent them.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.NOTIFICATIONS],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [IdempotencyKeyParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          triggers: z
            .object({})
            .catchall(
              z.array(
                vocabularyIn(NOTIFICATION_CHANNELS).meta({
                  'x-arthome-vocabulary-source': 'NOTIFICATION_CHANNELS',
                }),
              ),
            )
            .optional(),
          quietHours: z
            .object({
              enabled: z.boolean().optional(),
              fromHour: z.int().min(0).max(23).optional(),
              toHour: z.int().min(0).max(23).optional(),
              bypassWhenTicketHeld: z.boolean().optional(),
            })
            .optional(),
        }),
        example: {
          triggers: {
            date_starts_soon: [NotificationChannel.PUSH],
          },
          quietHours: {
            enabled: true,
            fromHour: 23,
            toHour: 9,
            bypassWhenTicketHeld: true,
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Notification preferences updated.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: NotificationPreferencesSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:05:00.000Z',
            data: {
              triggers: {
                date_starts_soon: [NotificationChannel.PUSH],
              },
              quietHours: {
                enabled: true,
                fromHour: 23,
                toHour: 9,
                bypassWhenTicketHeld: true,
              },
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
    403: CsrfRefusedResponse,
  },
});

export const updateConsents: Route<{
  method: 'put';
  version: 1;
  path: '/me/consents';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        purposes: z.ZodObject<
          {
            audience: z.ZodBoolean;
            perso: z.ZodBoolean;
            partners: z.ZodBoolean;
            ads: z.ZodBoolean;
          },
          z.core.$strip
        >;
        cookieCategories: z.ZodOptional<
          z.ZodObject<Record<never, never>, z.core.$catchall<z.ZodBoolean>>
        >;
        textVersion: z.ZodInt;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof ConsentsSchema }, z.core.$loose>
      >
    >;
    400: typeof BadRequestResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'put',
  path: '/me/consents',
  operationId: 'updateConsents',
  summary: 'Records consents, timestamped and versioned by the server.',
  description:
    '**Never queued offline**: a consent has evidential value, it must be timestamped **by the\nserver** and carry the **version of the text accepted**. A consent without a version or a\ndate is worth nothing. `ads` defaults to `false`, and that default is **a contract\ndecision**, not a setting.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [IdempotencyKeyParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          purposes: z.object({
            audience: z.boolean(),
            perso: z.boolean(),
            partners: z.boolean(),
            ads: z.boolean(),
          }),
          cookieCategories: z.object({}).catchall(z.boolean()).optional(),
          textVersion: z.int().meta({ minimum: undefined, maximum: undefined }),
        }),
        example: {
          purposes: {
            audience: true,
            perso: true,
            partners: false,
            ads: false,
          },
          textVersion: 3,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Consents recorded, with the server timestamp.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: ConsentsSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:05:30.000Z',
            data: {
              purposes: {
                audience: true,
                perso: true,
                partners: false,
                ads: false,
              },
              textVersion: 3,
              recordedAt: '2026-09-21T19:05:30Z',
            },
          },
        },
      },
    },
    400: BadRequestResponse,
    403: CsrfRefusedResponse,
  },
});

export const revokeDevice: Route<{
  method: 'delete';
  version: 1;
  path: '/me/devices/{deviceId}';
  parameters: readonly [
    PathParameter<'deviceId', z.ZodString>,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<
                {
                  devices: z.ZodOptional<z.ZodArray<typeof DeviceSchema>>;
                  playbackCutWithinSec: z.ZodOptional<z.ZodInt>;
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
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'delete',
  path: '/me/devices/{deviceId}',
  operationId: 'revokeDevice',
  summary: 'Revokes a device — and cuts its playback.',
  description:
    '**An observable effect on the targeted device, within 120 seconds at most.** Revoking\nremoves the `Device`, **all** its `DeviceSession`s **and its playback leases**: `identity`\npublishes `device_revoked`, `streaming` consumes it and refuses the **next renewal** of the\ntoken. The device displays `identity.signed_out_elsewhere`, **not a network error**.\n\n**Never queued offline**: this is a security command, it must fail loudly rather than be\nreplayed blind.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  'x-arthome-invalidates': ['account:devices'],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [
    {
      name: 'deviceId',
      in: 'path',
      required: true,
      schema: uuidIn(),
    },
    IdempotencyKeyParameter,
  ],
  responses: {
    200: {
      description:
        'Device revoked. `playbackCutWithinSec` states how long playback **actually** takes to\nstop.\n',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  devices: z.array(DeviceSchema).optional(),
                  playbackCutWithinSec: z
                    .int()
                    .meta({ minimum: undefined, maximum: undefined })
                    .meta({
                      description:
                        "**120, not 60.** Revocation does not revoke the token in hand: it **refuses the next\nrenewal**. The CDN's prefix signature expires with the token, so the edge keeps serving valid\nsegments for the whole lifetime of the token held — that is, up to **120 s**, in the case\nwhere it has just been renewed at the instant of revocation. In steady state: 45 to 75 s.\n\nThe 60 served until now was the **renewal interval** presented as a guarantee of stopping.\nThat was rule 15 violated on a security constant, and the plausible number had been kept\nbecause it satisfied the question that was asked.\n",
                      examples: [120],
                    })
                    .optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:06:00.000Z',
            data: {
              devices: [],
              playbackCutWithinSec: 120,
            },
          },
        },
      },
    },
    404: NotFoundResponse,
    403: CsrfRefusedResponse,
  },
});

export const signOutProfile: Route<{
  method: 'delete';
  version: 1;
  path: '/me/device-sessions/{sessionId}';
  parameters: readonly [
    PathParameter<'sessionId', z.ZodString>,
    typeof IdempotencyKeyParameter,
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
    404: typeof NotFoundResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'delete',
  path: '/me/device-sessions/{sessionId}',
  operationId: 'signOutProfile',
  summary: 'Signs one profile out of this device — the others stay signed in.',
  description:
    '**Two gestures, and they do not do the same thing.** This one closes a `DeviceSession`: the\nliving-room television keeps its four other profiles. `revokeDevice` removes the device and\neverything attached to it.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [
    {
      name: 'sessionId',
      in: 'path',
      required: true,
      schema: uuidIn(),
    },
    IdempotencyKeyParameter,
  ],
  responses: {
    200: {
      description: 'The updated context, with the remaining profiles.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: ViewerContextSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:06:30.000Z',
            data: {
              deviceId: '019928f4-1b6c-7c3a-9f2e-6a1d0c4b8e77',
              signedIn: true,
              profiles: [],
              constants: {
                roomOpensMinutesBefore: 30,
                cancelDeadlineMinutesBefore: 60,
                scarcityThresholdBps: 8500,
                billboardPreviewDelaySec: 4,
                waitlistPriorityWindowHours: 2,
                chatRateLimitPerSecond: 2,
                reminderLeadMinutes: 30,
                replayExpiryWarningHours: 6,
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
            },
          },
        },
      },
    },
    404: NotFoundResponse,
    403: CsrfRefusedResponse,
  },
});

export const requestExport: Route<{
  method: 'post';
  version: 1;
  path: '/me/exports';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        kind: VocabularyIn<typeof REQUEST_EXPORT_KIND>;
        fromDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        toDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    202: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof ExportRequestSchema }, z.core.$loose>
      >
    >;
    429: typeof TooManyRequestsResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'post',
  path: '/me/exports',
  operationId: 'requestExport',
  summary: 'Requests an export — personal data or invoices.',
  description:
    '**Asynchronous.** A tax ledger or a GDPR export is not an HTTP response: the command returns\nan acknowledgement and an identifier, the state is pollable, and the document arrives through\na short-lived signed address — **usable without a session cookie**, because an export\nprotected by a cookie is undownloadable from a native shell.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY, Service.TICKETING],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [IdempotencyKeyParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          kind: vocabularyIn(REQUEST_EXPORT_KIND).meta({
            'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
            'x-arthome-vocabulary-reason':
              "A document or export format. It names an accounting tool or a file type, which is the outside world's vocabulary rather than ours.",
          }),
          fromDate: z
            .string()
            .nullable()
            .meta({
              format: 'date',
            })
            .optional(),
          toDate: z
            .string()
            .nullable()
            .meta({
              format: 'date',
            })
            .optional(),
        }),
        example: {
          kind: 'invoices',
          fromDate: '2026-01-01',
          toDate: '2026-09-21',
        },
      },
    },
  },
  responses: {
    202: {
      description: 'Request accepted.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: ExportRequestSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:07:00.000Z',
            data: {
              exportId: '019928fc-0000-7000-8000-000000000001',
              kind: 'invoices',
              state: 'queued',
              requestedAt: '2026-09-21T19:07:00Z',
            },
          },
        },
      },
    },
    429: TooManyRequestsResponse,
    403: CsrfRefusedResponse,
  },
});

export const getExport: Route<{
  method: 'get';
  version: 1;
  path: '/me/exports/{exportId}';
  parameters: readonly [
    PathParameter<'exportId', z.ZodString>,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof ExportRequestSchema }, z.core.$loose>
      >
    >;
    404: typeof NotFoundResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'get',
  path: '/me/exports/{exportId}',
  operationId: 'getExport',
  summary: 'The state of an export, and its signed address once ready.',
  description:
    'An export is an **asynchronous job**. Until it is `ready`, `downloadUrl` is null: the\ncontract never serves an address that would not answer. The address is valid for 60 minutes\nand works **without a session cookie**.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY, Service.TICKETING],
  parameters: [
    {
      name: 'exportId',
      in: 'path',
      required: true,
      schema: uuidIn(),
    },
  ],
  responses: {
    200: {
      description: 'The state, and the address once ready (valid 60 min).',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: ExportRequestSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:12:00.000Z',
            data: {
              exportId: '019928fc-0000-7000-8000-000000000001',
              kind: 'invoices',
              state: 'ready',
              requestedAt: '2026-09-21T19:07:00Z',
              downloadUrl: 'https://files.arthome.fr/exports/019928fc?sig=abc',
              downloadExpiresAt: '2026-09-21T20:12:00Z',
            },
          },
        },
      },
    },
    404: NotFoundResponse,
  },
});

export const requestAccountDeletion: Route<{
  method: 'post';
  version: 1;
  path: '/me/deletion';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<z.ZodObject<{ confirmHandle: z.ZodString }, z.core.$strip>>;
  responses: {
    202: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<
                {
                  state: z.ZodOptional<z.ZodString>;
                  graceUntil: z.ZodOptional<z.ZodString>;
                  cancelledSeatsCount: z.ZodOptional<z.ZodInt>;
                },
                z.core.$loose
              >
            >;
          },
          z.core.$loose
        >
      >
    >;
    409: typeof ConflictResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'post',
  path: '/me/deletion',
  operationId: 'requestAccountDeletion',
  summary: 'Requests deletion of the account.',
  description:
    '**A financial command as much as a personal one.** "Deletion cancels unused seats": it\ntherefore triggers refunds, touches payouts that may already be computed, and runs into the\nten-year accounting retention. It **can be neither synchronous nor total**.\n\nThe sequence is a **persistent saga**: the account moves to `deletion_requested`, sign-ins\nare blocked, `ticketing` cancels and refunds, `payouts` recomputes; a **30-day grace period**\nruns, during which the account is **reactivated by simply signing in** — which is what makes\nthe irreversible acceptable; at the end, `identity` **anonymises** instead of deleting.\nInvoices keep their frozen contents.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [IdempotencyKeyParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          confirmHandle: z.string(),
        }),
        example: {
          confirmHandle: '@marie.j',
        },
      },
    },
  },
  responses: {
    202: {
      description: 'Request recorded, with the end of the grace period.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  state: z.string().optional(),
                  graceUntil: InstantOut.optional(),
                  cancelledSeatsCount: z
                    .int()
                    .meta({ minimum: undefined, maximum: undefined })
                    .optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:13:00.000Z',
            data: {
              state: 'requested',
              graceUntil: '2026-10-21T19:13:00Z',
              cancelledSeatsCount: 2,
            },
          },
        },
      },
    },
    409: ConflictResponse,
    403: CsrfRefusedResponse,
  },
});

export const cancelAccountDeletion: Route<{
  method: 'delete';
  version: 1;
  path: '/me/deletion';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<z.ZodObject<{ state: z.ZodOptional<z.ZodString> }, z.core.$loose>>;
          },
          z.core.$loose
        >
      >
    >;
    409: typeof ConflictResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'delete',
  path: '/me/deletion',
  operationId: 'cancelAccountDeletion',
  summary: 'Cancels the deletion request during the grace period.',
  description:
    'The account is **reactivated by simply signing in** during the 30 days of grace, and that is\nexactly what makes the irreversible acceptable. What this command **does not undo**: seats\nalready cancelled and refunded. The contract says so rather than letting anyone assume\notherwise.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [IdempotencyKeyParameter],
  responses: {
    200: {
      description:
        'Deletion cancelled. Seats already refunded do not come back — the contract says so rather than letting anyone assume otherwise.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  state: z.string().optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-25T10:00:00.000Z',
            data: {
              state: AccountStatus.ACTIVE,
            },
          },
        },
      },
    },
    409: ConflictResponse,
    403: CsrfRefusedResponse,
  },
});

export const contactSupport: Route<{
  method: 'post';
  version: 1;
  path: '/support/requests';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        topic: VocabularyIn<typeof CONTACT_SUPPORT_TOPIC>;
        message: z.ZodString;
        context: z.ZodOptional<
          z.ZodObject<
            {
              dateId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
              seatId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
              orderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
              traceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            },
            z.core.$strip
          >
        >;
      },
      z.core.$strip
    >
  >;
  responses: {
    202: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<
                {
                  requestId: z.ZodOptional<z.ZodString>;
                  reference: z.ZodOptional<z.ZodString>;
                  priorityCode: z.ZodOptional<z.ZodString>;
                },
                z.core.$loose
              >
            >;
          },
          z.core.$loose
        >
      >
    >;
    429: typeof TooManyRequestsResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = accountRoutes.defineRoute({
  method: 'post',
  path: '/support/requests',
  operationId: 'contactSupport',
  summary: 'Opens a support request, with its context.',
  description:
    '**The topic routes, the context prioritises.** "Requests related to a live show in progress\nare handled first": without attached context — date, seat, order — that prioritisation is\nimpossible to honour, and the copy promises something the system cannot do.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.NOTIFICATIONS],
  security: [
    {
      sessionCookie: [],
      csrfToken: [],
    },
    {
      bearerToken: [],
    },
  ],
  parameters: [IdempotencyKeyParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          topic: vocabularyIn(CONTACT_SUPPORT_TOPIC).meta({
            'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
            'x-arthome-vocabulary-reason':
              'An account-management shape, local to this endpoint: what the person asked for, not a fact the domain reasons about.',
          }),
          message: z.string().min(10).max(4000),
          context: z
            .object({
              dateId: uuidOut().nullable().optional(),
              seatId: uuidOut().nullable().optional(),
              orderId: uuidOut().nullable().optional(),
              traceId: z.string().nullable().optional(),
            })
            .optional(),
        }),
        example: {
          topic: 'playback_quality',
          message: "L'image se fige toutes les deux minutes depuis le début.",
          context: {
            dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
            traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
          },
        },
      },
    },
  },
  responses: {
    202: {
      description: 'Request opened, with its reference and its priority computed server-side.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  requestId: uuidOut().optional(),
                  reference: z.string().optional(),
                  priorityCode: z.string().optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T19:14:00.000Z',
            data: {
              requestId: '019928fd-0000-7000-8000-000000000001',
              reference: 'SUP-2026-0912',
              priorityCode: 'live_in_progress',
            },
          },
        },
      },
    },
    429: TooManyRequestsResponse,
    403: CsrfRefusedResponse,
  },
});
