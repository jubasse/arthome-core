import { z } from 'zod';

import {
  AccountStatus,
  DisplayState,
  FailureNature,
  OrderErrorCode,
  OrderKind,
  OrderState,
  PLAN_TIERS,
  PlanTier,
  PRICE_TIERS,
  PriceTier,
  RefundReason,
  ReplayPolicy,
  RightsScope,
  Service,
} from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import {
  MoneyOut,
  uuidOut,
  VOCABULARY_SOURCE_LOCAL,
  vocabularyIn,
  uuidIn,
} from '@arthome/core/schema';

import {
  AdmissionTokenParameter,
  BadRequestResponse,
  CacheControlPublicHeader,
  ConflictResponse,
  CsrfRefusedResponse,
  DateIdParameter,
  GoneResponse,
  IdempotencyKeyParameter,
  IdempotencyReplayedHeader,
  LateEntryAcknowledgedParameter,
  NotFoundResponse,
  ServedAtHeader,
  StorefrontTag,
  SurfaceParameter,
  TooManyRequestsResponse,
  TraceparentParameter,
  UnauthorizedResponse,
  UnavailableResponse,
  VaryAuthHeader,
  PublicReadSecurity,
  storefrontV1,
} from './components.js';
import { DateCardSchema, PriceTierSchema } from '../catalog/index.js';
import { StorefrontEnvelopeMetaSchema, StorefrontErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, Route } from '../http/index.js';
import {
  CartQuoteSchema,
  CartSchema,
  OrderSchema,
  PaymentHandoffSchema,
  SalesQueuePositionSchema,
  SeatQuoteSchema,
  SubscriptionSchema,
  TicketCardSchema,
} from '../ticketing/index.js';

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
const SeatIdParameter: PathParameter<'seatId', z.ZodString> = {
  name: 'seatId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};
const seats = commerceWrites.resource('seats', { id: SeatIdParameter });

const CANCEL_SEAT_CANCEL_REASON_CODE = ['viewer_request'] as const;

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

export const purchaseSeat: Route<{
  method: 'post';
  version: 1;
  path: '/orders/seats';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof AdmissionTokenParameter,
    typeof LateEntryAcknowledgedParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        dateId: z.ZodString;
        tier: VocabularyIn<typeof PRICE_TIERS>;
        quantity: z.ZodInt;
        expectedTotal: typeof MoneyOut;
        contributionMinor: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
        applyCreditId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        profileId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        declaredTaxLocation: z.ZodOptional<
          z.ZodNullable<
            z.ZodObject<
              {
                country: z.ZodOptional<z.ZodString>;
                subdivision: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                postalCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
              },
              z.core.$strip
            >
          >
        >;
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
              {
                tickets: z.ZodArray<typeof TicketCardSchema>;
                date: typeof DateCardSchema;
                order: typeof OrderSchema;
              },
              z.core.$loose
            >;
          },
          z.core.$loose
        >
      >
    >;
    202: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof PaymentHandoffSchema }, z.core.$loose>
      >
    >;
    400: typeof BadRequestResponse;
    401: typeof UnauthorizedResponse;
    403: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
    409: typeof ConflictResponse;
    503: typeof UnavailableResponse;
  };
}> = commerceWrites.defineRoute({
  method: 'post',
  path: '/orders/seats',
  operationId: 'purchaseSeat',
  summary: 'Buys one or more seats.',
  description:
    "**A double click never creates two seats**: `Idempotency-Key` is mandatory, generated by the\nsurface **before sending and persisted before sending**. A replayed key returns the first\nattempt's response, never an error — that is the difference between safe resumption and a\nlost seat.\n\n**The expected price is sent and verified.** The refusal carries `order.price_stale`, **distinct**\nfrom a payment failure, with the current price as a parameter: with five promotion reasons,\none of them computed pro rata to elapsed time, the gap between the displayed price and the\nvalid price is **structural**, not accidental.\n\n**The command returns the projected state, not an acknowledgement**: the seat **and** the\nupdated date, so the surface repaints in a single round trip.\n\n**While the date's sales queue is armed, the purchase carries its admission** (D-081,\nprovisional), and without a valid one it is refused with `403`\n`order.sales_queue_admission_required`. A `403` because the admission is a time-boxed right\nthat `ticketing` checks itself, like the others of that status; not a `409`, since nothing in\nthe date conflicts with the request, and not a `429`, whose `unavailable` invites a retry that\ncannot succeed without an admission and would land on the date at its busiest.\n\n**The admission travels in a header, `X-Arthome-Admission-Token`, never in the body.** The\nidempotency fingerprint covers the body (`transport.md` §5.4), so a token there would turn the\nreplay of a completed purchase, sent after the admission lapsed, into\n`api.idempotency_key_reused` instead of the original response. And it is a credential bound to\nan account and a date, which travels beside `X-Arthome-Device-Token`, not inside the order. A\nreplayed key answers its original response without asking for an admission again.\n\n**Once the live has started, the purchase carries the buyer's acknowledgement** (D-089), in\n`X-Arthome-Late-Entry-Acknowledged: true`, once the surface has said what\n`SeatQuote.lateEntry` says. Without it the purchase is refused with `409`\n`order.late_entry_unacknowledged`, `startedAt`, `minutesElapsed` and `salesEndAt` in its\nparams, before any seat is held. Seats sell until thirty minutes after the start; past it,\n`409` `order.sales_closed` with `salesEndAt`, never `order.sold_out`, which is the waiting\nlist's cue.\n",
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING],
  'x-arthome-invalidates': ['account:tickets', 'date:{dateId}:availability'],
  parameters: [IdempotencyKeyParameter, AdmissionTokenParameter, LateEntryAcknowledgedParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          dateId: uuidOut(),
          tier: vocabularyIn(PRICE_TIERS).meta({
            'x-arthome-vocabulary-source': 'PRICE_TIERS',
          }),
          quantity: z.int().min(1).max(10),
          expectedTotal: MoneyOut.meta({
            'x-arthome-tax-basis': 'inclusive',
          }),
          contributionMinor: z
            .int()
            .meta({ minimum: undefined, maximum: undefined })
            .nullable()
            .optional(),
          applyCreditId: uuidOut().nullable().optional(),
          profileId: uuidOut().nullable().optional(),
          declaredTaxLocation: z
            .object({
              country: z.string().regex(new RegExp('^[A-Z]{2}$')).optional(),
              subdivision: z.string().nullable().optional(),
              postalCode: z.string().nullable().optional(),
            })
            .nullable()
            .meta({
              description:
                'Location **declared by the buyer**, when the surface asks for it. It enters the register as\none piece of evidence among the others (`declared_by_buyer`) — **it does not replace them**:\nthe server arbitrates, and two pieces of evidence that contradict each other produce\n`evidenceConflicting`, never a refused purchase.\n',
            })
            .optional(),
        }),
        example: {
          dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
          tier: PriceTier.FULL,
          quantity: 2,
          expectedTotal: {
            amountMinor: 4620,
            currencyCode: 'EUR',
          },
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Seats created, and the updated date.',
      headers: {
        'X-Arthome-Served-At': ServedAtHeader,
        'Idempotency-Replayed': IdempotencyReplayedHeader,
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({
                tickets: z.array(TicketCardSchema),
                date: DateCardSchema,
                order: OrderSchema,
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:41:30.000Z',
            data: {
              tickets: [
                {
                  seatId: '019928f5-0000-7000-8000-000000000001',
                  dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                  orderId: '019928f5-0000-7000-8000-0000000000aa',
                  seatCode: 'ATH-7QK2-4M',
                  tier: PriceTier.FULL,
                  state: AccountStatus.ACTIVE,
                  cancelDeadline: '2026-09-21T18:00:00Z',
                  date: {
                    id: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                    showId: '019928a0-7d31-7a10-b8c4-2f9e11a4c111',
                    channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
                    slug: '2026-09-21',
                    canonicalUrl: 'https://arthome.fr/show/nuit-blanche/date/2026-09-21',
                    title: 'Nuit blanche',
                    startsAt: '2026-09-21T19:00:00Z',
                    venueClock: {
                      venueTimezone: 'Europe/Paris',
                      venueUtcOffsetMin: 120,
                    },
                    runtimeMin: 95,
                    roomOpensAt: '2026-09-21T18:30:00Z',
                    displayState: DisplayState.LIVE,
                    displayStateValidUntil: '2026-09-21T20:35:00Z',
                    replay: {
                      policy: ReplayPolicy.INCLUDED,
                      windowHours: 72,
                    },
                    rights: {
                      scope: RightsScope.WORLDWIDE,
                      blackoutCountries: [],
                    },
                    media: {
                      wide: [],
                      poster: [],
                    },
                  },
                },
              ],
              date: {
                id: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                showId: '019928a0-7d31-7a10-b8c4-2f9e11a4c111',
                channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
                slug: '2026-09-21',
                canonicalUrl: 'https://arthome.fr/show/nuit-blanche/date/2026-09-21',
                title: 'Nuit blanche',
                startsAt: '2026-09-21T19:00:00Z',
                venueClock: {
                  venueTimezone: 'Europe/Paris',
                  venueUtcOffsetMin: 120,
                },
                runtimeMin: 95,
                roomOpensAt: '2026-09-21T18:30:00Z',
                displayState: DisplayState.LIVE,
                displayStateValidUntil: '2026-09-21T20:35:00Z',
                replay: {
                  policy: ReplayPolicy.INCLUDED,
                  windowHours: 72,
                },
                rights: {
                  scope: RightsScope.WORLDWIDE,
                  blackoutCountries: [],
                },
                media: {
                  wide: [],
                  poster: [],
                },
              },
              order: {
                id: '019928f5-0000-7000-8000-0000000000aa',
                reference: 'ATH-2026-00042',
                kind: OrderKind.SEAT,
                state: OrderState.PAID,
                placedAt: '2026-09-21T18:41:30Z',
              },
            },
          },
        },
      },
    },
    202: {
      description:
        '**Strong authentication required** — the order exists, the payment is not complete. The\nsurface presents the payment element with the `clientSecret`, then follows the state through\n`getOrder`. It **never** concludes from the return URL.\n',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: PaymentHandoffSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:41:30.000Z',
            data: {
              orderId: '019928f5-0000-7000-8000-0000000000aa',
              state: OrderState.AWAITING_ACTION,
              paymentIntentRef: 'pi_3Ab2Cd',
              clientSecret: 'pi_3Ab2Cd_secret_9f2',
              nextAction: {
                kind: 'redirect_to_url',
                redirectUrl: 'https://hooks.stripe.com/3ds/authenticate',
              },
              returnUrl:
                'https://arthome.fr/paiement/retour?order=019928f5-0000-7000-8000-0000000000aa',
              expiresAt: '2026-09-21T18:56:30Z',
            },
          },
        },
      },
    },
    400: BadRequestResponse,
    401: UnauthorizedResponse,
    403: {
      description:
        "`order.sales_queue_admission_required`: the date's sales queue is armed and the admission is\nabsent, lapsed, or issued to another account or date. The surface enters the queue\n(`enterSalesQueue`) and comes back with the admission it is served.\n\nAlso `api.forbidden` when a write with the session cookie lacks its `X-Arthome-Csrf` token, or carries another session's (`CsrfRefused`).\n",
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
            servedAt: '2026-09-21T18:00:01.000Z',
          },
        },
      },
    },
    409: ConflictResponse,
    503: UnavailableResponse,
  },
});

export const getOrder: Route<{
  method: 'get';
  version: 1;
  path: '/orders/{orderId}';
  parameters: readonly [
    PathParameter<'orderId', z.ZodString>,
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
                order: typeof OrderSchema;
                tickets: z.ZodOptional<z.ZodArray<typeof TicketCardSchema>>;
                handoff: z.ZodOptional<typeof PaymentHandoffSchema>;
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
  path: '/orders/{orderId}',
  operationId: 'getOrder',
  summary: 'The state of an order — **the only source of truth after a payment**.',
  description:
    '**This is the operation that resumes an order left in `awaiting_action`**, and it is the one\nthe surface polls on return from strong authentication. The return URL says **where to go**;\nit never says **what changed**: our state only advances on a verified webhook, never on a\nbrowser parameter.\n\n**`no-store`**: the state of a payment is not cached.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING],
  parameters: [
    {
      name: 'orderId',
      in: 'path',
      required: true,
      schema: uuidIn(),
    },
  ],
  responses: {
    200: {
      description: 'The order, and what it produced once it is `paid`.',
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
                order: OrderSchema,
                tickets: z.array(TicketCardSchema).optional(),
                handoff: PaymentHandoffSchema.meta({
                  description:
                    'Present while the order is `awaiting_action` — this is what allows an abandoned authentication to be **resumed**.',
                }).optional(),
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:43:00.000Z',
            data: {
              order: {
                id: '019928f5-0000-7000-8000-0000000000aa',
                reference: 'ATH-2026-00042',
                kind: OrderKind.SEAT,
                state: OrderState.PAID,
                placedAt: '2026-09-21T18:41:30Z',
                invoiceAvailable: true,
              },
              tickets: [],
            },
          },
        },
      },
    },
    404: NotFoundResponse,
  },
});

export const cancelSeat: Route<{
  method: 'post';
  version: 1;
  path: '/seats/{seatId}/cancel';
  parameters: readonly [
    PathParameter<'seatId', z.ZodString>,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      { cancelReasonCode: z.ZodOptional<VocabularyIn<typeof CANCEL_SEAT_CANCEL_REASON_CODE>> },
      z.core.$strip
    >,
    false
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodObject<
              {
                ticket: z.ZodOptional<typeof TicketCardSchema>;
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
}> = seats.action('cancel', {
  operationId: 'cancelSeat',
  summary: 'Cancels a seat before its deadline.',
  description:
    'The deadline is **served as an instant** on the seat (`cancelDeadline`), never as the\nsentence "up to 1 h before". The refusal after the deadline carries\n`seat.cancel_deadline_passed`, with the instant as a parameter.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING],
  'x-arthome-invalidates': ['account:tickets', 'date:{dateId}:availability'],
  body: z.object({
    cancelReasonCode: vocabularyIn(CANCEL_SEAT_CANCEL_REASON_CODE)
      .meta({
        'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
        'x-arthome-vocabulary-reason':
          'A single-member enum: it records the actor on an audit line, and this path has exactly one actor. Flagged in the description as a question, not settled as a vocabulary.',
        description:
          '**One member, and that is a question rather than a vocabulary.** A field whose\nenum has a single value carries no information: every request that reaches this\npath says the same thing. It is here because the audit line must record *who*\nasked — and a viewer cancelling their own seat is the only actor this path has.\n\n**What would make it a vocabulary is a second actor**, and there is one in the\ndomain already: the studio cancels seats too, through `refundSeat`, with its own\nfour-member `refundReasonCode`. If those two paths ever merge, this field becomes\nthe merged reason and the single member becomes the first of several. Until then\nit is a placeholder that is honest about being one.\n',
      })
      .optional(),
  }),
  example: {
    cancelReasonCode: RefundReason.VIEWER_REQUEST,
  },
  optionalBody: true,
  responses: {
    200: {
      description: 'Seat cancelled, with the refund and its delay code.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({
                ticket: TicketCardSchema.optional(),
                date: DateCardSchema.optional(),
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T17:10:00.000Z',
            data: {
              ticket: {
                seatId: '019928f5-0000-7000-8000-000000000001',
                dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                seatCode: 'ATH-7QK2-4M',
                tier: PriceTier.FULL,
                state: OrderState.REFUNDED,
                date: {
                  id: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                  showId: '019928a0-7d31-7a10-b8c4-2f9e11a4c111',
                  channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
                  slug: '2026-09-21',
                  canonicalUrl: 'https://arthome.fr/show/nuit-blanche/date/2026-09-21',
                  title: 'Nuit blanche',
                  startsAt: '2026-09-21T19:00:00Z',
                  venueClock: {
                    venueTimezone: 'Europe/Paris',
                    venueUtcOffsetMin: 120,
                  },
                  runtimeMin: 95,
                  roomOpensAt: '2026-09-21T18:30:00Z',
                  displayState: DisplayState.SCHEDULED,
                  displayStateValidUntil: '2026-09-21T18:30:00Z',
                  replay: {
                    policy: ReplayPolicy.INCLUDED,
                    windowHours: 72,
                  },
                  rights: {
                    scope: RightsScope.WORLDWIDE,
                    blackoutCountries: [],
                  },
                  media: {
                    wide: [],
                    poster: [],
                  },
                },
                refund: {
                  amount: {
                    amountMinor: 2400,
                    currencyCode: 'EUR',
                  },
                  delayCode: 'refund_delay_business_days_3_5',
                  method: 'original_payment_method',
                  refundReasonCode: RefundReason.VIEWER_REQUEST,
                },
              },
              date: {
                id: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                showId: '019928a0-7d31-7a10-b8c4-2f9e11a4c111',
                channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
                slug: '2026-09-21',
                canonicalUrl: 'https://arthome.fr/show/nuit-blanche/date/2026-09-21',
                title: 'Nuit blanche',
                startsAt: '2026-09-21T19:00:00Z',
                venueClock: {
                  venueTimezone: 'Europe/Paris',
                  venueUtcOffsetMin: 120,
                },
                runtimeMin: 95,
                roomOpensAt: '2026-09-21T18:30:00Z',
                displayState: DisplayState.SCHEDULED,
                displayStateValidUntil: '2026-09-21T18:30:00Z',
                replay: {
                  policy: ReplayPolicy.INCLUDED,
                  windowHours: 72,
                },
                rights: {
                  scope: RightsScope.WORLDWIDE,
                  blackoutCountries: [],
                },
                media: {
                  wide: [],
                  poster: [],
                },
              },
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

export const getCart: Route<{
  method: 'get';
  version: 1;
  path: '/cart';
  parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof CartSchema }, z.core.$loose>
      >
    >;
    401: typeof UnauthorizedResponse;
  };
}> = commerceRoutes.defineRoute({
  method: 'get',
  path: '/cart',
  operationId: 'getCart',
  summary: "The account's cart, split by vendor.",
  description:
    "The cart lives **on the account**, not in the browser: it is persistent in the header, it is\nbuilt up across several sessions from a live show's shop, and all three storefronts display\nit. It is served **already split by vendor**, because that is how it will be paid.\n",
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING],
  responses: {
    200: {
      description: 'The cart.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: CartSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:44:00.000Z',
            data: {
              lines: [],
              vendorGroups: [],
            },
          },
        },
      },
    },
    401: UnauthorizedResponse,
  },
});

export const addCartLine: Route<{
  method: 'post';
  version: 1;
  path: '/cart/lines';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<{ itemId: z.ZodString; variantId: z.ZodString; quantity: z.ZodInt }, z.core.$strip>
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof CartSchema }, z.core.$loose>
      >
    >;
    409: typeof ConflictResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = commerceWrites.defineRoute({
  method: 'post',
  path: '/cart/lines',
  operationId: 'addCartLine',
  summary: 'Adds a line to the cart.',
  description:
    'A line references a **variant**, never a bare item: a T-shirt without a size is not\nsellable. Shipping is **not** computed here — it is computed at quoting time.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING],
  'x-arthome-invalidates': ['account:cart'],
  parameters: [IdempotencyKeyParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          itemId: uuidOut(),
          variantId: z.string(),
          quantity: z.int().min(1).max(20),
        }),
        example: {
          itemId: '019928a0-7d31-7a10-b8c4-2f9e11a4d001',
          variantId: 'M',
          quantity: 1,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'The updated cart.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: CartSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:44:20.000Z',
            data: {
              lines: [
                {
                  id: '019928f6-0000-7000-8000-000000000001',
                  itemId: '019928a0-7d31-7a10-b8c4-2f9e11a4d001',
                  variantId: 'M',
                  channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
                  quantity: 1,
                  unitPrice: {
                    amountMinor: 2500,
                    currencyCode: 'EUR',
                  },
                  version: 1,
                },
              ],
              vendorGroups: [
                {
                  channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
                  lineIds: ['019928f6-0000-7000-8000-000000000001'],
                },
              ],
            },
          },
        },
      },
    },
    409: ConflictResponse,
    403: CsrfRefusedResponse,
  },
});

export const updateCartLine: Route<{
  method: 'patch';
  version: 1;
  path: '/cart/lines/{lineId}';
  parameters: readonly [
    PathParameter<'lineId', z.ZodString>,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<{ quantity: z.ZodInt; expectedVersion: z.ZodInt }, z.core.$strip>
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof CartSchema }, z.core.$loose>
      >
    >;
    404: typeof NotFoundResponse;
    409: typeof ConflictResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = commerceWrites.defineRoute({
  method: 'patch',
  path: '/cart/lines/{lineId}',
  operationId: 'updateCartLine',
  summary: 'Changes the quantity of a line.',
  description:
    '**Conflict between two devices: per line, last writer wins, and the ordering comes from the\nserver** — `version`, never a date from the phone, whose clock drifts and jumps.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING],
  parameters: [
    {
      name: 'lineId',
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
        schema: z.object({
          quantity: z.int().min(1).max(20),
          expectedVersion: z.int().meta({ minimum: undefined, maximum: undefined }),
        }),
        example: {
          quantity: 2,
          expectedVersion: 1,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'The updated cart.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: CartSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:44:40.000Z',
            data: {
              lines: [],
              vendorGroups: [],
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

export const removeCartLine: Route<{
  method: 'delete';
  version: 1;
  path: '/cart/lines/{lineId}';
  parameters: readonly [
    PathParameter<'lineId', z.ZodString>,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof CartSchema }, z.core.$loose>
      >
    >;
    404: typeof NotFoundResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = commerceWrites.defineRoute({
  method: 'delete',
  path: '/cart/lines/{lineId}',
  operationId: 'removeCartLine',
  summary: 'Removes a line from the cart.',
  description:
    'Replayed on an already-removed line, it **succeeds**. Returns the whole cart, split by\nvendor, so the surface repaints without a second round trip.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING],
  parameters: [
    {
      name: 'lineId',
      in: 'path',
      required: true,
      schema: uuidIn(),
    },
    IdempotencyKeyParameter,
  ],
  responses: {
    200: {
      description: 'The updated cart. A removal replayed on an already-removed line **succeeds**.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: CartSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:45:00.000Z',
            data: {
              lines: [],
              vendorGroups: [],
            },
          },
        },
      },
    },
    404: NotFoundResponse,
    403: CsrfRefusedResponse,
  },
});

export const quoteCart: Route<{
  method: 'post';
  version: 1;
  path: '/cart/quote';
  parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        shippingCountryCode: z.ZodString;
        shippingPostalCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof CartQuoteSchema }, z.core.$loose>
      >
    >;
    409: typeof ConflictResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = commerceWrites.defineRoute({
  method: 'post',
  path: '/cart/quote',
  operationId: 'quoteCart',
  summary: "The cart's binding quote, per vendor.",
  description:
    '**The total presented is the one that will be charged**, for 15 minutes. Shipping is computed\n**here**, not on adding. A cart spanning two channels returns **two groups**: it will split\ninto two orders at payment.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING],
  'x-arthome-idempotency-exemption':
    '**A read disguised as a `POST`**, for the same reason as `quoteSeat`: the cart and the\nshipping address do not fit in a URL. A quote computes shipping and discounts; it creates\nneither an order nor a reservation.\n\n**A key would protect nothing here** — `checkoutCart` carries the `quoteId` and refuses a\nstale quote — **and it would do harm**: the total presented is the one that will be charged,\nand that promise holds for **fifteen minutes**. Serving a memorised quote would return a\ntotal whose window is part-spent or closed, that is, **a binding quote that no longer\nbinds**. A replay therefore produces a fresh quote, with its own window.\n',
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          shippingCountryCode: z.string().regex(new RegExp('^[A-Z]{2}$')),
          shippingPostalCode: z.string().nullable().optional(),
        }),
        example: {
          shippingCountryCode: 'FR',
          shippingPostalCode: '75011',
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
              data: CartQuoteSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:45:20.000Z',
            validUntil: '2026-09-21T19:00:20.000Z',
            data: {
              validUntil: '2026-09-21T19:00:20.000Z',
              groups: [
                {
                  channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
                  subtotal: {
                    amountMinor: 5000,
                    currencyCode: 'EUR',
                  },
                  shipping: {
                    amountMinor: 590,
                    currencyCode: 'EUR',
                  },
                  discount: {
                    discountReasonCode: 'plan_shop_discount',
                    amount: {
                      amountMinor: -750,
                      currencyCode: 'EUR',
                    },
                  },
                  total: {
                    amountMinor: 4840,
                    currencyCode: 'EUR',
                  },
                },
              ],
            },
          },
        },
      },
    },
    409: ConflictResponse,
    403: CsrfRefusedResponse,
  },
});

export const checkoutCart: Route<{
  method: 'post';
  version: 1;
  path: '/orders/merch';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        quoteId: z.ZodString;
        shippingAddress: z.ZodObject<
          {
            line1: z.ZodString;
            line2: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            city: z.ZodString;
            postalCode: z.ZodString;
            countryCode: z.ZodString;
          },
          z.core.$strip
        >;
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
              { orders: z.ZodArray<typeof OrderSchema>; cart: typeof CartSchema },
              z.core.$loose
            >;
          },
          z.core.$loose
        >
      >
    >;
    202: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof PaymentHandoffSchema }, z.core.$loose>
      >
    >;
    409: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
    410: typeof GoneResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = commerceWrites.defineRoute({
  method: 'post',
  path: '/orders/merch',
  operationId: 'checkoutCart',
  summary: 'Pays for the cart — one order per vendor.',
  description:
    "**The cart is emptied by the response**, never by a local timeout.\n\n**The contract settles partial failure**: an out-of-stock line **refuses its group's order\noutright**, with `params.unavailableLineIds`, and does not truncate it. Reason: a truncated\norder charges an amount the viewer never saw, and the quote is binding — truncating it would\nmake it false.\n",
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING],
  'x-arthome-invalidates': ['account:orders', 'account:cart'],
  parameters: [IdempotencyKeyParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          quoteId: uuidOut(),
          shippingAddress: z.object({
            line1: z.string(),
            line2: z.string().nullable().optional(),
            city: z.string(),
            postalCode: z.string(),
            countryCode: z.string().regex(new RegExp('^[A-Z]{2}$')),
          }),
        }),
        example: {
          quoteId: '019928f6-1111-7000-8000-000000000001',
          shippingAddress: {
            line1: '12 rue du Théâtre',
            city: 'Paris',
            postalCode: '75011',
            countryCode: 'FR',
          },
        },
      },
    },
  },
  responses: {
    201: {
      description: 'One order per vendor.',
      headers: {
        'Idempotency-Replayed': IdempotencyReplayedHeader,
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({
                orders: z.array(OrderSchema),
                cart: CartSchema,
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:46:00.000Z',
            data: {
              orders: [
                {
                  id: '019928f6-2222-7000-8000-000000000001',
                  reference: 'ATH-2026-00043',
                  kind: OrderKind.MERCH,
                  state: OrderState.PAID,
                  placedAt: '2026-09-21T18:46:00Z',
                },
              ],
              cart: {
                lines: [],
                vendorGroups: [],
              },
            },
          },
        },
      },
    },
    202: {
      description:
        '**Strong authentication required.** See `PaymentHandoff` — the return URL concludes nothing, `getOrder` is authoritative.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: PaymentHandoffSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:46:00.000Z',
            data: {
              orderId: '019928f6-2222-7000-8000-000000000001',
              state: OrderState.AWAITING_ACTION,
              paymentIntentRef: 'pi_3Ef4Gh',
              clientSecret: 'pi_3Ef4Gh_secret_1a2',
              nextAction: {
                kind: 'redirect_to_url',
                redirectUrl: 'https://hooks.stripe.com/3ds/authenticate',
              },
              returnUrl:
                'https://arthome.fr/paiement/retour?order=019928f6-2222-7000-8000-000000000001',
              expiresAt: '2026-09-21T19:01:00Z',
            },
          },
        },
      },
    },
    409: {
      description:
        '`order.checkout_line_unavailable` (with `unavailableLineIds`), `order.quote_address_mismatch`, or\n`order.price_stale`.\n\n**`order.quote_address_mismatch` closes a gap**: the quote computes shipping from a country and a\npostcode, the payment receives a full address, and nothing required them to match. **A\nbinding quote whose address changes in between no longer binds** — it needs a new quote, not\na silently different charge.\n',
      content: {
        'application/json': {
          schema: StorefrontErrorEnvelopeSchema,
          example: {
            error: {
              code: OrderErrorCode.QUOTE_ADDRESS_MISMATCH,
              nature: FailureNature.REFUSED,
              params: {
                quotedCountryCode: 'FR',
                quotedPostalCode: '75011',
              },
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T18:46:00.000Z',
          },
        },
      },
    },
    410: GoneResponse,
    403: CsrfRefusedResponse,
  },
});

export const setSubscriptionPlan: Route<{
  method: 'post';
  version: 1;
  path: '/subscription/change-plan';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        planTier: VocabularyIn<typeof PLAN_TIERS>;
        paymentMethodRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof SubscriptionSchema }, z.core.$loose>
      >
    >;
    202: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof PaymentHandoffSchema }, z.core.$loose>
      >
    >;
    402: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
    409: typeof ConflictResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = commerceWrites.defineRoute({
  method: 'post',
  path: '/subscription/change-plan',
  operationId: 'setSubscriptionPlan',
  summary: 'Subscribes or changes plan.',
  description:
    '**A state assignment**, not a toggle. The effect is **immediately visible** on displayed\nprices: `x-arthome-invalidates` names the reads that become false, so the surface\ninvalidates exactly what it must. The **right to watch**, on the other hand, is never\ndecided here: it is returned by `streaming` when the player opens, on fresh data.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING],
  'x-arthome-invalidates': ['account:subscription', 'home:rails', 'account:tickets'],
  parameters: [IdempotencyKeyParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          planTier: vocabularyIn(PLAN_TIERS).meta({
            'x-arthome-vocabulary-source': 'PLAN_TIERS',
          }),
          paymentMethodRef: z.string().nullable().optional(),
        }),
        example: {
          planTier: PlanTier.PREMIUM,
          paymentMethodRef: 'pm_1Ab2Cd',
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Subscription updated.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: SubscriptionSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:47:00.000Z',
            data: {
              planTier: PlanTier.PREMIUM,
              state: AccountStatus.ACTIVE,
              startedAt: '2026-09-21T18:47:00Z',
              currentPeriodEnd: '2026-10-21T18:47:00Z',
              cancelAtPeriodEnd: false,
            },
          },
        },
      },
    },
    202: {
      description:
        '**Strong authentication required.** See `PaymentHandoff` — the return URL concludes nothing, `getOrder` is authoritative.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: PaymentHandoffSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:47:00.000Z',
            data: {
              orderId: '019928f7-3333-7000-8000-000000000001',
              state: OrderState.AWAITING_ACTION,
              paymentIntentRef: 'pi_3Ij5Kl',
              clientSecret: 'pi_3Ij5Kl_secret_3c4',
              nextAction: {
                kind: 'redirect_to_url',
                redirectUrl: 'https://hooks.stripe.com/3ds/authenticate',
              },
              returnUrl:
                'https://arthome.fr/paiement/retour?order=019928f7-3333-7000-8000-000000000001',
              expiresAt: '2026-09-21T19:02:00Z',
            },
          },
        },
      },
    },
    402: {
      description: 'Payment declined by the provider. **Distinct** from a business refusal.',
      content: {
        'application/json': {
          schema: StorefrontErrorEnvelopeSchema,
          example: {
            error: {
              code: OrderErrorCode.PAYMENT_DECLINED,
              nature: FailureNature.REFUSED,
              params: {
                declineCode: 'insufficient_funds',
              },
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T18:47:00.000Z',
          },
        },
      },
    },
    409: ConflictResponse,
    403: CsrfRefusedResponse,
  },
});

export const cancelSubscription: Route<{
  method: 'post';
  version: 1;
  path: '/subscription/cancel';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StorefrontEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof SubscriptionSchema }, z.core.$loose>
      >
    >;
    409: typeof ConflictResponse;
    403: typeof CsrfRefusedResponse;
  };
}> = commerceWrites.defineRoute({
  method: 'post',
  path: '/subscription/cancel',
  operationId: 'cancelSubscription',
  summary: 'Cancels the subscription at the end of the period.',
  description:
    'Cancellation takes effect **at the end of the period**: the rights run until\n`currentPeriodEnd`, and the contract serves it as an **instant** rather than letting five\nsurfaces compute "12 days left".\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING],
  'x-arthome-invalidates': ['account:subscription'],
  parameters: [IdempotencyKeyParameter],
  responses: {
    200: {
      description: 'Cancellation recorded. Rights run until `currentPeriodEnd`.',
      content: {
        'application/json': {
          schema: z.intersection(
            StorefrontEnvelopeMetaSchema,
            z.looseObject({
              data: SubscriptionSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:48:00.000Z',
            data: {
              planTier: PlanTier.PREMIUM,
              state: AccountStatus.ACTIVE,
              currentPeriodEnd: '2026-10-21T18:47:00Z',
              cancelAtPeriodEnd: true,
            },
          },
        },
      },
    },
    409: ConflictResponse,
    403: CsrfRefusedResponse,
  },
});
