import { z } from 'zod';

import {
  AccountStatus,
  DateOutcome,
  FailureNature,
  OrderErrorCode,
  OrderKind,
  OrderState,
  PairingErrorCode,
  PriceTier,
  Service,
} from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { uuidOut, VOCABULARY_SOURCE_LOCAL, vocabularyIn, uuidIn } from '@arthome/core/schema';

import {
  AdmissionTokenParameter,
  BadRequestResponse,
  CsrfRefusedResponse,
  GoneResponse,
  IdempotencyKeyParameter,
  NotFoundResponse,
  RetryAfterMsHeader,
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
  AccountDeepLinkSchema,
  DevicePairingSchema,
  PairingOutcomeSchema,
} from '../identity/index.js';

const pairingRoutes = storefrontV1
  .tags(StorefrontTag.PAIRING)
  .headers(SurfaceParameter, TraceparentParameter);
const pairingWrites = pairingRoutes.headers(IdempotencyKeyParameter);

const CREATE_PAIRING_INTENT = ['signin', 'seat', 'plan', 'payment_method', 'merch'] as const;
const DECIDE_PAIRING_DECISION = ['approve', 'deny'] as const;

export const createPairing: Route<{
  method: 'post';
  version: 1;
  path: '/pairings';
  parameters: readonly [
    typeof AdmissionTokenParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        intent: VocabularyIn<typeof CREATE_PAIRING_INTENT>;
        deviceId: z.ZodString;
        payload: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    201: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof DevicePairingSchema }, z.core.$loose>
      >
    >;
    400: typeof BadRequestResponse;
    401: typeof UnauthorizedResponse;
    403: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
    429: typeof TooManyRequestsResponse;
  };
}> = pairingWrites.defineRoute({
  method: 'post',
  path: '/pairings',
  operationId: 'createPairing',
  summary: 'Opens a device pairing, for one of the five intents.',
  description:
    "**One command, one shape, one state machine, five intents.** The television accepts no input\nbeyond six characters: every payment goes through here, therefore through the phone.\n\n**`signin` is the only true RFC 8628**; the other four are **transaction appointments** —\nbuying from an already signed-in television is not a token request. What is shared is the\nstate machine; what differs is the effect of approval.\n\n**For `seat`, the pairing's lifetime is the lifetime of a seat hold placed by `ticketing` at\ncreation**: without that hold, the capacity shown on the television is false for five\nminutes — exactly the defect the television reported.\n\n`signin` opens with the **device token alone**, without a session. The other four require a\nsession on the television.\n\n**A seat pairing goes through the date's sales queue like every other purchase** (D-086).\nWhile the queue is armed, the television shows it, and `seat` opens only with the admission\nin `X-Arthome-Admission-Token`, since opening is what places the hold; without one it is\nrefused with `403` `order.sales_queue_admission_required`. First come, first served, with no\nway around it through the television.\n",
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY, Service.TICKETING],
  security: [
    {
      deviceToken: [],
    },
    {
      bearerToken: [],
    },
    {
      sessionCookie: [],
      csrfToken: [],
    },
  ],
  parameters: [AdmissionTokenParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          intent: vocabularyIn(CREATE_PAIRING_INTENT).meta({
            'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
            'x-arthome-vocabulary-reason':
              'A vocabulary local to this contract. The domain neither produces nor consumes these values — they describe what this endpoint offers, and a new member is an endpoint change.',
          }),
          deviceId: uuidOut(),
          payload: z
            .looseObject({})
            .meta({
              description:
                'Depends on the intent and stays **opaque to `identity`**, which relays it to the target\nservice. `identity` knows nothing of seats, plans or payments: it carries an appointment and\na pointer.\n',
            })
            .optional(),
        }),
        example: {
          intent: OrderKind.SEAT,
          deviceId: '019928f4-1b6c-7c3a-9f2e-6a1d0c4b8e77',
          payload: {
            dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
            tier: PriceTier.FULL,
            quantity: 2,
          },
        },
      },
    },
  },
  responses: {
    201: {
      description:
        'Pairing opened. The code, the complete QR, the expiry and the polling interval.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: DevicePairingSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:50:00.000Z',
            data: {
              pairingId: '019928f9-0000-7000-8000-000000000001',
              intent: OrderKind.SEAT,
              userCode: 'K7M2PQ',
              verificationUri: 'https://arthome.fr/appairage',
              verificationUriComplete: 'https://arthome.fr/appairage?code=K7M2PQ',
              expiresAt: '2026-09-21T18:55:00.000Z',
              pollIntervalSec: 2,
              state: OrderState.PENDING,
            },
          },
        },
      },
    },
    400: BadRequestResponse,
    401: UnauthorizedResponse,
    403: {
      description:
        "`order.sales_queue_admission_required`: a `seat` pairing on a date whose sales queue is armed,\nwithout a valid admission (D-086). The television enters the queue and opens the pairing once\nadmitted.\n\nAlso `api.forbidden` when a write with the session cookie lacks its `X-Arthome-Csrf` token, or carries another session's (`CsrfRefused`).\n",
      content: {
        'application/json': {
          schema: StorefrontErrorEnvelopeSchema,
          example: {
            error: {
              code: OrderErrorCode.SALES_QUEUE_ADMISSION_REQUIRED,
              nature: FailureNature.REFUSED,
              params: {
                dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
              },
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T18:50:00.000Z',
          },
        },
      },
    },
    429: TooManyRequestsResponse,
  },
});

export const pollPairing: Route<{
  method: 'get';
  version: 1;
  path: '/pairings/{pairingId}';
  parameters: readonly [
    PathParameter<'pairingId', z.ZodString>,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof PairingOutcomeSchema }, z.core.$loose>
      >
    >;
    404: typeof NotFoundResponse;
    410: typeof GoneResponse;
    429: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
  };
}> = pairingRoutes.defineRoute({
  method: 'get',
  path: '/pairings/{pairingId}',
  operationId: 'pollPairing',
  summary: 'Polls the outcome of a pairing — and composes the confirmation screen.',
  description:
    '**RFC 8628-compliant polling, not the real-time channel.** Bringing a device identity into\nthe WebSocket namespace at `signin` time would widen its attack surface to save a few hundred\nmilliseconds.\n\nThe requirement "switch within two seconds at most" is met by a **served decay**:\n`pollIntervalSec` is 2 for the first 60 seconds, then 5 — so it stays under the server\'s\ncontrol, and it costs thirty requests per pairing at most. **The surface never polls faster\nthan the interval it is served.**\n\n**Works with the device token alone**, without a session: that is what allows reattachment\nafter the television restarts.\n\nThe response is **complete**: the confirmation screen costs **zero further calls**.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY, Service.TICKETING, Service.CATALOG],
  security: [
    {
      deviceToken: [],
    },
    {
      bearerToken: [],
    },
    {
      sessionCookie: [],
    },
  ],
  parameters: [
    {
      name: 'pairingId',
      in: 'path',
      required: true,
      schema: uuidIn(),
    },
  ],
  responses: {
    200: {
      description: 'The outcome, and what it produced.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: PairingOutcomeSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:52:10.000Z',
            data: {
              pairingId: '019928f9-0000-7000-8000-000000000001',
              intent: OrderKind.SEAT,
              state: 'approved',
              pollIntervalSec: 5,
              ticket: {
                seatId: '019928f5-0000-7000-8000-000000000001',
                dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                seatCode: 'ATH-7QK2-4M',
                tier: PriceTier.FULL,
                state: AccountStatus.ACTIVE,
                date: {
                  id: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                },
              },
            },
          },
        },
      },
    },
    404: NotFoundResponse,
    410: GoneResponse,
    429: {
      description: 'RFC 8628 `slow_down`. The surface **slows down**, it does not retry faster.',
      headers: {
        'Retry-After-Ms': RetryAfterMsHeader,
      },
      content: {
        'application/json': {
          schema: StorefrontErrorEnvelopeSchema,
          example: {
            error: {
              code: PairingErrorCode.SLOW_DOWN,
              nature: FailureNature.UNAVAILABLE,
              params: {
                retryAfterMs: 5000,
              },
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T18:52:10.000Z',
          },
        },
      },
    },
  },
});

export const cancelPairing: Route<{
  method: 'delete';
  version: 1;
  path: '/pairings/{pairingId}';
  parameters: readonly [
    PathParameter<'pairingId', z.ZodString>,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof PairingOutcomeSchema }, z.core.$loose>
      >
    >;
    404: typeof NotFoundResponse;
    409: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
    403: typeof CsrfRefusedResponse;
  };
}> = pairingWrites.defineRoute({
  method: 'delete',
  path: '/pairings/{pairingId}',
  operationId: 'cancelPairing',
  summary: 'Closes a pending pairing.',
  description:
    'Triggered by the Back button. The television often leaves without waiting for the response.',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  security: [
    {
      deviceToken: [],
    },
    {
      bearerToken: [],
    },
    {
      sessionCookie: [],
      csrfToken: [],
    },
  ],
  parameters: [
    {
      name: 'pairingId',
      in: 'path',
      required: true,
      schema: uuidIn(),
    },
  ],
  responses: {
    200: {
      description:
        'Cancelled, or already settled — **a second call returns the original outcome, never an error**.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: PairingOutcomeSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:53:00.000Z',
            data: {
              pairingId: '019928f9-0000-7000-8000-000000000001',
              intent: OrderKind.SEAT,
              state: DateOutcome.CANCELLED,
              pollIntervalSec: 5,
            },
          },
        },
      },
    },
    404: NotFoundResponse,
    409: {
      description:
        '**`pairing.execution_engaged` — the pairing can no longer be cancelled.** The phone has\nentered the payment journey; cancelling here would orphan a purchase in flight.\n\n**What the surface does with this refusal**: it **stays on the waiting screen** and keeps\npolling. It does not go back. This is the only case in the contract where pressing Back does\nnot go up one level, and the reason is written down: we do not let a remote control cancel a\npayment it triggered itself.\n',
      content: {
        'application/json': {
          schema: StorefrontErrorEnvelopeSchema,
          example: {
            error: {
              code: PairingErrorCode.EXECUTION_ENGAGED,
              nature: FailureNature.REFUSED,
              params: {
                state: 'engaged',
                engagedAt: '2026-09-21T18:52:04Z',
              },
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T18:52:06.000Z',
          },
        },
      },
    },
    403: CsrfRefusedResponse,
  },
});

export const engagePairing: Route<{
  method: 'post';
  version: 1;
  path: '/pairings/{pairingId}/engagement';
  parameters: readonly [
    PathParameter<'pairingId', z.ZodString>,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<{ note: z.ZodOptional<z.ZodNullable<z.ZodString>> }, z.core.$strip>,
    false
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof PairingOutcomeSchema }, z.core.$loose>
      >
    >;
    403: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
    410: typeof GoneResponse;
  };
}> = pairingWrites.defineRoute({
  method: 'post',
  path: '/pairings/{pairingId}/engagement',
  operationId: 'engagePairing',
  summary: 'Marks the pairing as engaged — on entering the payment journey.',
  description:
    "**This operation exists to close a race that costs real money.**\n\nThe sequence without it: the viewer scans the QR, pays on their phone, and presses **Back**\nwhile the payment is executing. The television sends its `DELETE`; `ticketing` has already\ncharged; the decision arrives afterwards and receives `410`. **The seat is paid for, the\nphone shows a failure, the television has gone back, and the money is gone.** The contract\nhandled the reverse order — approval then cancellation — and not this one, which is the more\nlikely of the two: executing a payment takes seconds, pressing Back is instant.\n\n**Called by the BFF on the phone's behalf**, at the moment the phone enters the payment\njourney — hence **before** `ticketing` executes, not after. It moves the pairing from\n`pending` to `engaged`, and from then on `cancelPairing` answers `409`.\n\n**It applies only to the four purchase intents.** `signin` commits no money: a sign-in\npairing stays cancellable until its decision, and calling this on one is refused.\n\n**Idempotent**: a second call on an already `engaged` pairing returns the same state, not an\nerror — the phone may replay its entry into the journey on a network that switches over.\n",
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
      name: 'pairingId',
      in: 'path',
      required: true,
      schema: uuidIn(),
    },
  ],
  requestBody: {
    required: false,
    content: {
      'application/json': {
        schema: z.object({
          note: z
            .string()
            .nullable()
            .meta({
              description: 'Optional trace of the engaged journey, for the audit log.',
            })
            .optional(),
        }),
        example: {},
      },
    },
  },
  responses: {
    200: {
      description: 'Pairing engaged, therefore no longer cancellable.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: PairingOutcomeSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:52:04.000Z',
            data: {
              pairingId: '019928f9-0000-7000-8000-000000000001',
              intent: OrderKind.SEAT,
              state: 'engaged',
              pollIntervalSec: 2,
            },
          },
        },
      },
    },
    403: {
      description:
        "`pairing.identity_mismatch`, or `pairing.intent_not_engageable` on `signin`.\n\nAlso `api.forbidden` when a write with the session cookie lacks its `X-Arthome-Csrf` token, or carries another session's (`CsrfRefused`).\n",
      content: {
        'application/json': {
          schema: StorefrontErrorEnvelopeSchema,
          example: {
            error: {
              code: PairingErrorCode.INTENT_NOT_ENGAGEABLE,
              nature: FailureNature.REFUSED,
              params: {
                intent: 'signin',
              },
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T18:52:04.000Z',
          },
        },
      },
    },
    410: GoneResponse,
  },
});

export const decidePairing: Route<{
  method: 'post';
  version: 1;
  path: '/pairings/{pairingId}/decision';
  parameters: readonly [
    PathParameter<'pairingId', z.ZodString>,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        decision: VocabularyIn<typeof DECIDE_PAIRING_DECISION>;
        outcomeRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof PairingOutcomeSchema }, z.core.$loose>
      >
    >;
    403: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
    410: typeof GoneResponse;
  };
}> = pairingWrites.defineRoute({
  method: 'post',
  path: '/pairings/{pairingId}/decision',
  operationId: 'decidePairing',
  summary: 'Approves or denies a pairing, from the phone.',
  description:
    '**The ownership guard is written by us, not delegated.** CVE-2026-45337 showed what relaxing\nit costs: the plugin treated any authenticated session as the owner of any pending code.\n\nThree checks, in this order: the pairing is `pending` **or `engaged`** and not expired — an\nengaged pairing is precisely the one whose decision is awaited; if `intent = signin`, any\nvalid session suffices — **that is the nominal case, and it is the very meaning of "add an\naccount"**; otherwise, the bearer **is** the profile that opened the pairing, on pain of\n`pairing.identity_mismatch`.\n\n**No implicit profile switch.** It would charge the wrong payment method, credit the wrong\nrights and deliver the seat to the wrong account — in a living room, at the precise moment\ntwo people are watching the same screen. The phone offers "switch account": a gesture by the\nperson, never by the system.\n',
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
      name: 'pairingId',
      in: 'path',
      required: true,
      schema: uuidIn(),
    },
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          decision: vocabularyIn(DECIDE_PAIRING_DECISION).meta({
            'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
            'x-arthome-vocabulary-reason':
              "The two answers this one command accepts. It is the command's shape, not a vocabulary: a third answer would be a third command.",
          }),
          outcomeRef: z
            .string()
            .nullable()
            .meta({
              description:
                "The **opaque** pointer to what the phone's normal journey produced — set by the BFF after\n`ticketing` has executed, with **its own** `Idempotency-Key`. No duplication of ticketing:\n`ticketing` implements **no** short code.\n",
            })
            .optional(),
        }),
        example: {
          decision: 'approve',
          outcomeRef: 'seat:019928f5-0000-7000-8000-000000000001',
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Decision recorded.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: PairingOutcomeSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:52:00.000Z',
            data: {
              pairingId: '019928f9-0000-7000-8000-000000000001',
              intent: OrderKind.SEAT,
              state: 'approved',
              pollIntervalSec: 5,
            },
          },
        },
      },
    },
    403: {
      description:
        "`pairing.identity_mismatch` — the bearer is not the profile that opened the pairing. Impossible on `signin`.\n\nAlso `api.forbidden` when a write with the session cookie lacks its `X-Arthome-Csrf` token, or carries another session's (`CsrfRefused`).\n",
      content: {
        'application/json': {
          schema: StorefrontErrorEnvelopeSchema,
          example: {
            error: {
              code: PairingErrorCode.IDENTITY_MISMATCH,
              nature: FailureNature.REFUSED,
              params: {},
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T18:52:00.000Z',
          },
        },
      },
    },
    410: GoneResponse,
  },
});

export const getAccountDeepLink: Route<{
  method: 'get';
  version: 1;
  path: '/account-deep-link';
  parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof AccountDeepLinkSchema }, z.core.$loose>
      >
    >;
    401: typeof UnauthorizedResponse;
  };
}> = pairingRoutes.defineRoute({
  method: 'get',
  path: '/account-deep-link',
  operationId: 'getAccountDeepLink',
  summary: 'The QR that hands off to account management — what is NOT a pairing.',
  description:
    '**Nothing is waiting, the screen does not switch, no pairing row is opened.** Two distinct\nshapes in the contract, separated by **name** and not by an option — otherwise someone will\nimplement a wait where there is none.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  responses: {
    200: {
      description: 'The link.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: AccountDeepLinkSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:54:00.000Z',
            data: {
              url: 'https://arthome.fr/compte',
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
  },
});
