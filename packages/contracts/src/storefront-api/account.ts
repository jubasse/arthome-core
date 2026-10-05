import { z } from 'zod';

import {
  FailureNature,
  IdentityErrorCode,
  Locale,
  LOCALES,
  MessageDomain,
  Service,
} from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { InstantOut, uuidOut, VOCABULARY_SOURCE_LOCAL, vocabularyIn } from '@arthome/core/schema';

import {
  BadRequestResponse,
  CsrfRefusedResponse,
  GoneResponse,
  IdempotencyKeyParameter,
  StorefrontTag,
  SurfaceParameter,
  TooManyRequestsResponse,
  TraceparentParameter,
  UnauthorizedResponse,
  storefrontV1,
} from './components.js';
import { StorefrontEnvelopeMetaSchema, StorefrontErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, Route } from '../http/index.js';
import {
  SessionMode,
  StorefrontSessionEstablishedSchema,
  StorefrontSessionModeSchema,
} from '../identity/index.js';

const accountRoutes = storefrontV1
  .tags(StorefrontTag.ACCOUNT)
  .headers(SurfaceParameter, TraceparentParameter);

const START_SOCIAL_SIGN_IN_PROVIDER = ['google', 'facebook'] as const;

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
  method: 'post';
  version: 1;
  path: '/auth/change-password';
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
  method: 'post',
  path: '/auth/change-password',
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
