import { z } from 'zod';

import { PRICE_TIERS, PriceTier, Service } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { MoneyOut, uuidOut, vocabularyIn } from '@arthome/core/schema';

import {
  CacheControlPublicHeader,
  ConflictResponse,
  CsrfRefusedResponse,
  DateIdParameter,
  IdempotencyKeyParameter,
  NotFoundResponse,
  StorefrontTag,
  SurfaceParameter,
  TooManyRequestsResponse,
  TraceparentParameter,
  UnauthorizedResponse,
  VaryAuthHeader,
  PublicReadSecurity,
  storefrontV1,
} from './components.js';
import { DateCardSchema, PriceTierSchema } from '../catalog/index.js';
import { StorefrontEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, Route } from '../http/index.js';
import { SalesQueuePositionSchema, SeatQuoteSchema } from '../ticketing/index.js';

const commerceRoutes = storefrontV1
  .tags(StorefrontTag.COMMERCE)
  .headers(SurfaceParameter, TraceparentParameter);
const commerceWrites = commerceRoutes.security(
  {
    sessionCookie: [],
    csrfToken: [],
  },
  {
    bearerToken: [],
  },
);

export const refreshDateAvailability: Route<{
  method: 'get';
  version: 1;
  path: '/dates/{dateId}/availability';
  parameters: readonly [
    typeof DateIdParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodObject<
              {
                seatsAvailable: z.ZodOptional<z.ZodInt>;
                waitlistCount: z.ZodOptional<z.ZodInt>;
                fillRateBps: z.ZodOptional<z.ZodInt>;
                soldOut: z.ZodOptional<z.ZodBoolean>;
                priceTiers: z.ZodOptional<z.ZodArray<typeof PriceTierSchema>>;
                serviceFeePerSeat: z.ZodOptional<typeof MoneyOut>;
              },
              z.core.$loose
            >;
          },
          z.core.$loose
        >
      >
    >;
    404: typeof NotFoundResponse;
  };
}> = commerceRoutes.defineRoute({
  method: 'get',
  path: '/dates/{dateId}/availability',
  operationId: 'refreshDateAvailability',
  summary: 'Refreshes capacity and prices before showing a total.',
  description:
    'The only legitimate call from a television\'s booking screen: the date is already in hand,\nonly the capacity moves. `validUntil` is short, `AVAILABILITY_VALID_SECONDS` after `servedAt`\n(`@arthome/core`), because the "show already started" price is **pro rata to the time\nremaining**.\n\n**Public read.** Called **with no authentication at all**, this operation returns the\n**public body** — identical for every anonymous caller, hence shareable in a common\ncache. The three per-viewer overlays (`watchVerdict`, `viewerRelations`,\n`viewerProgress`) are then **absent**, never null. Called with a session or a bearer\ntoken, it returns the public body **plus** the overlays, and becomes private.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING],
  security: PublicReadSecurity,
  'x-arthome-freshness': 15,
  parameters: [DateIdParameter],
  responses: {
    200: {
      description: 'Capacity and prices at the instant of serving.',
      headers: {
        'Cache-Control': CacheControlPublicHeader,
        Vary: VaryAuthHeader,
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({
                seatsAvailable: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
                waitlistCount: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
                fillRateBps: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
                soldOut: z.boolean().optional(),
                priceTiers: z.array(PriceTierSchema).optional(),
                serviceFeePerSeat: MoneyOut.meta({
                  'x-arthome-tax-basis': 'inclusive',
                }).optional(),
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:40:00.000Z',
            validUntil: '2026-09-21T18:41:00.000Z',
            data: {
              seatsAvailable: 42,
              waitlistCount: 0,
              fillRateBps: 8700,
              soldOut: false,
              priceTiers: [
                {
                  tier: PriceTier.FULL,
                  amount: {
                    amountMinor: 2400,
                    currencyCode: 'EUR',
                  },
                  active: true,
                },
              ],
              serviceFeePerSeat: {
                amountMinor: 150,
                currencyCode: 'EUR',
              },
            },
          },
        },
      },
    },
    404: NotFoundResponse,
  },
});

export const quoteSeat: Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/seat-quote';
  parameters: readonly [
    typeof DateIdParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        tier: VocabularyIn<typeof PRICE_TIERS>;
        quantity: z.ZodInt;
        contributionMinor: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
        applyCreditId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof SeatQuoteSchema }, z.core.$loose>
      >
    >;
    404: typeof NotFoundResponse;
    409: typeof ConflictResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = commerceWrites.defineRoute({
  method: 'post',
  path: '/dates/{dateId}/seat-quote',
  operationId: 'quoteSeat',
  summary: 'The purchase summary, composed server-side.',
  description:
    '**The four lines come from the contract**: tier, service fee, subscription discount,\npromotion. Discount and promotion **do not stack** — the one most favourable to the viewer\nwins, and the rule lives in `@arthome/core` (D-017). Otherwise it would be written three\ntimes.\n\n**Past the end of seat sales**, thirty minutes after the start (D-089), the quote is refused\nwith `409` `order.sales_closed` and `salesEndAt`, as the purchase is.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING],
  'x-arthome-idempotency-exemption':
    '**A read disguised as a `POST`: it is a `POST` because its criteria do not fit in a URL, not\nbecause it writes.** A quote computes, it creates nothing — so there is no effect to\ndeduplicate.\n\n**And a key would protect nothing here**, because freshness is already guaranteed elsewhere:\nthe price carries its `validUntil`, and `expectedTotal` is **mandatory** at purchase — a\nstale price is refused by `order.price_stale` at the moment that matters, not at quoting time.\n\n**Worse: it would do harm.** The regime replays the original response **verbatim**, so a\nreplayed quote would be a quote **already part-spent, or expired** — or a price that the\npro-rata promotion has since made wrong. Same reason as a token renewal: what is being asked\nfor is a fresh value.\n',
  parameters: [DateIdParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          tier: vocabularyIn(PRICE_TIERS).meta({
            'x-arthome-vocabulary-source': 'PRICE_TIERS',
          }),
          quantity: z.int().min(1).max(10),
          contributionMinor: z
            .int()
            .meta({ minimum: undefined, maximum: undefined })
            .nullable()
            .meta({
              description:
                'Free contribution to the company, for a free seat. The amount is **open**; minimum and\nmaximum are **domain rules**, not attributes of an input field, and the refusal carries\n**`order.contribution_out_of_range`**, with both bounds as parameters.\n',
            })
            .optional(),
          applyCreditId: uuidOut().nullable().optional(),
        }),
        example: {
          tier: PriceTier.FULL,
          quantity: 2,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Devis.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: SeatQuoteSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:41:10.000Z',
            validUntil: '2026-09-21T18:42:10.000Z',
            data: {
              lines: [
                {
                  kind: 'tier',
                  amount: {
                    amountMinor: 4800,
                    currencyCode: 'EUR',
                  },
                },
                {
                  kind: 'service_fee',
                  amount: {
                    amountMinor: 300,
                    currencyCode: 'EUR',
                  },
                },
                {
                  kind: 'subscription_discount',
                  discountReasonCode: 'plan_pass',
                  amount: {
                    amountMinor: -480,
                    currencyCode: 'EUR',
                  },
                },
              ],
              total: {
                amountMinor: 4620,
                currencyCode: 'EUR',
              },
              validUntil: '2026-09-21T18:42:10.000Z',
            },
          },
        },
      },
    },
    404: NotFoundResponse,
    409: ConflictResponse,
    403: CsrfRefusedResponse,
  },
});

export const enterSalesQueue: Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/sales-queue/enter';
  parameters: readonly [
    typeof DateIdParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof SalesQueuePositionSchema }, z.core.$loose>
      >
    >;
    401: typeof UnauthorizedResponse;
    403: typeof CsrfRefusedResponse;
    404: typeof NotFoundResponse;
  };
}> = commerceWrites.defineRoute({
  method: 'post',
  path: '/dates/{dateId}/sales-queue/enter',
  operationId: 'enterSalesQueue',
  summary: "Enters a date's sales queue.",
  description:
    "**A state assignment, not a toggle**: one entry per account and date, and entering again keeps\nthe place already taken. The queue serves in arrival order (D-081). No `Idempotency-Key`: the\nentry makes a second call harmless by itself (see the exemption).\n\n**An admission that lapses unused sends the account to the end of the queue**, in the spirit\nof the waiting list's one chance per registration (D-083): a turn kept after it passed is\ntaken from everyone behind.\n\n**A queue that is not armed admits nobody**: it answers `armed: false`, and the surface goes\nback to `purchaseSeat`, which needs no admission then. Admitting there would let an account\ncollect admissions ahead of the arming and walk past the queue once it arms.\n\n**The session names the account, never the path**, and the response speaks of the caller's\nentry alone: nobody else's position, account or admission.\n",
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.TICKETING],
  'x-arthome-idempotency-exemption':
    '**Idempotent by construction**: one entry per account and date, so a second call finds the\nfirst entry and answers its current state. A key would put a durable write per entrant in\nfront of the queue built to shed that load, and would replay a position that is stale seconds\nafter it was served.\n',
  parameters: [DateIdParameter],
  responses: {
    200: {
      description: "The caller's entry, as `getSalesQueuePosition` serves it.",
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
              data: SalesQueuePositionSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:00:02.000Z',
            validUntil: '2026-09-21T18:00:04.000Z',
            data: {
              dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
              armed: true,
              state: 'waiting',
              position: 2841,
              estimatedWaitSec: 95,
              pollIntervalSec: 2,
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
    403: CsrfRefusedResponse,
    404: NotFoundResponse,
  },
});

export const getSalesQueuePosition: Route<{
  method: 'get';
  version: 1;
  path: '/dates/{dateId}/sales-queue';
  parameters: readonly [
    typeof DateIdParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof SalesQueuePositionSchema }, z.core.$loose>
      >
    >;
    401: typeof UnauthorizedResponse;
    404: typeof NotFoundResponse;
    429: typeof TooManyRequestsResponse;
  };
}> = commerceRoutes.defineRoute({
  method: 'get',
  path: '/dates/{dateId}/sales-queue',
  operationId: 'getSalesQueuePosition',
  summary: "Reads one's place in a date's sales queue, and the admission once it comes.",
  description:
    "**Polled at the cadence it serves**: `pollIntervalSec` is the pairing's served decay\n(`adr-auth.md` §5.3), not a second one, and the surface never polls faster.\n\n**`validUntil` is the next poll while `waiting`, and the admission's `expiresAt` once\n`admitted`.** Either countdown is computed against `servedAt`.\n\n**`no-store`**: a position and an admission are one account's, and perishable.\n",
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.TICKETING],
  parameters: [DateIdParameter],
  responses: {
    200: {
      description: "The caller's entry.",
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
              data: SalesQueuePositionSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:01:40.000Z',
            validUntil: '2026-09-21T18:02:40.000Z',
            data: {
              dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
              armed: true,
              state: 'admitted',
              pollIntervalSec: 5,
              admission: {
                token: 'adm_v1.eyJkIjoiMDE5OTI4YTAiLCJhIjoiMDE5OTI4ZjQifQ.3kQx',
                expiresAt: '2026-09-21T18:02:40.000Z',
              },
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
    404: NotFoundResponse,
    429: TooManyRequestsResponse,
  },
});

export const joinWaitlist: Route<{
  method: 'put';
  version: 1;
  path: '/dates/{dateId}/waitlist';
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
            data: z.ZodObject<
              {
                joined: z.ZodBoolean;
                rankDisclosed: z.ZodBoolean;
                rank: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
                priorityWindowHours: z.ZodOptional<z.ZodInt>;
                date: z.ZodOptional<typeof DateCardSchema>;
              },
              z.core.$loose
            >;
          },
          z.core.$loose
        >
      >
    >;
    404: typeof NotFoundResponse;
    409: typeof ConflictResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = commerceWrites.defineRoute({
  method: 'put',
  path: '/dates/{dateId}/waitlist',
  operationId: 'joinWaitlist',
  summary: "S'inscrit en liste d'attente.",
  description:
    '**A state assignment, not a toggle**: two submissions leave one registration. The response\n**states the rank, or states that it will not state it** — it is never silent. The priority\nwindow (2 h) is served, never hardcoded in the surface.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING],
  parameters: [DateIdParameter, IdempotencyKeyParameter],
  responses: {
    200: {
      description: 'Inscrit.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({
                joined: z.boolean(),
                rankDisclosed: z.boolean(),
                rank: z
                  .int()
                  .meta({ minimum: undefined, maximum: undefined })
                  .nullable()
                  .optional(),
                priorityWindowHours: z
                  .int()
                  .meta({ minimum: undefined, maximum: undefined })
                  .optional(),
                date: DateCardSchema.optional(),
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:42:00.000Z',
            data: {
              joined: true,
              rankDisclosed: false,
              rank: null,
              priorityWindowHours: 2,
            },
          },
        },
      },
    },
    404: NotFoundResponse,
    409: ConflictResponse,
    403: CsrfRefusedResponse,
  },
});

export const leaveWaitlist: Route<{
  method: 'delete';
  version: 1;
  path: '/dates/{dateId}/waitlist';
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
              z.ZodObject<{ joined: z.ZodOptional<z.ZodBoolean> }, z.core.$loose>
            >;
          },
          z.core.$loose
        >
      >
    >;
    404: typeof NotFoundResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = commerceWrites.defineRoute({
  method: 'delete',
  path: '/dates/{dateId}/waitlist',
  operationId: 'leaveWaitlist',
  summary: 'Leaves the waiting list.',
  description:
    '**A state assignment**, like joining. Replayed on an already-removed registration, it\nsucceeds — an offline queue replays, and a failure there would be a false negative.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING],
  parameters: [DateIdParameter, IdempotencyKeyParameter],
  responses: {
    200: {
      description:
        'Removed. A deletion replayed on an already-removed registration **succeeds**, it does not fail.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  joined: z.boolean().optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:43:00.000Z',
            data: {
              joined: false,
            },
          },
        },
      },
    },
    404: NotFoundResponse,
    403: CsrfRefusedResponse,
  },
});
