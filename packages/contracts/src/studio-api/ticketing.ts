import { z } from 'zod';

import {
  CatalogErrorCode,
  FailureNature,
  PRICE_TIERS,
  PriceTier,
  RefundReason,
  Service,
} from '@arthome/core';
import type { VocabularyIn, VocabularyOut } from '@arthome/core/schema';
import {
  InstantOut,
  MoneyOut,
  uuidOut,
  vocabularyIn,
  vocabularyOut,
  vocabularyOutLocal,
  uuidIn,
  dateIn,
} from '@arthome/core/schema';

import {
  ChannelIdParameter,
  ConflictResponse,
  DateIdParameter,
  ForbiddenResponse,
  IdempotencyKeyParameter,
  IfRightsVersionParameter,
  NotFoundResponse,
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  operator,
  studioV1,
} from './components.js';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import type {
  JsonRequestBody,
  JsonResponse,
  PathParameter,
  QueryParameter,
  Route,
  IdentifiedAccess,
} from '../http/index.js';
import { DateSalesPaneSchema } from '../studio-money/index.js';

const ticketingRoutes = studioV1
  .tags(StudioTag.TICKETING)
  .headers(SurfaceParameter, IfRightsVersionParameter, TraceparentParameter);
const ticketingReads = ticketingRoutes.errors({ 403: ForbiddenResponse });
const ticketingWrites = ticketingRoutes.headers(IdempotencyKeyParameter);
const ticketingDates = studioV1
  .identity(operator)
  .tags(StudioTag.TICKETING)
  .headers(SurfaceParameter, TraceparentParameter)
  .errors({ 403: ForbiddenResponse, 404: NotFoundResponse });
const date = ticketingDates.resource('dates', { id: DateIdParameter });
const SeatIdParameter: PathParameter<'seatId', z.ZodString> = {
  name: 'seatId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};
const seats = ticketingWrites.resource('seats', { id: SeatIdParameter });

const REFUND_SEAT_REFUND_REASON_CODE: readonly [
  typeof RefundReason.DATE_CANCELLED,
  typeof RefundReason.GOODWILL,
  typeof RefundReason.DUPLICATE,
  typeof RefundReason.DISPUTE,
] = [
  RefundReason.DATE_CANCELLED,
  RefundReason.GOODWILL,
  RefundReason.DUPLICATE,
  RefundReason.DISPUTE,
];
const GET_CHANNEL_TICKETING_KIND = ['refund', 'seat_transfer', 'chargeback'] as const;

export const getDateTicketsPane: Route<{
  method: 'get';
  version: 1;
  path: '/dates/{dateId}/panes/tickets';
  parameters: readonly [
    typeof DateIdParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof DateSalesPaneSchema }, z.core.$loose>
      >
    >;
    403: typeof ForbiddenResponse;
    404: typeof NotFoundResponse;
  };
}> = date.path('panes').defineRoute({
  method: 'get',
  path: '/tickets',
  operationId: 'getDateTicketsPane',
  summary: "A date's ticketing pane.",
  description:
    'Served by `ticketing`, **projected according to the role**: `grossRevenue` is absent without\n`canRevenue`. The pane is open to `artist`, `production` and `treasury`.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING],
  responses: {
    200: {
      description: 'Jauge, paliers, tarifs, promotions, provision technique.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: DateSalesPaneSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:03:20.000Z',
            rightsVersion: 412,
            data: {
              dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
              capacityTotal: 200,
              seatsAvailable: 26,
              seatsSold: 174,
              waitlistCount: 12,
              fillRateBps: 8700,
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
              pricesLocked: true,
              technicalProvision: {
                required: false,
                threshold: 10000,
                provisionedCapacity: null,
                revisableUntil: null,
              },
              version: 12,
            },
          },
        },
      },
    },
    404: NotFoundResponse,
  },
});

export const setDatePrices: Route<{
  method: 'put';
  version: 1;
  path: '/dates/{dateId}/prices';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        expectedVersion: z.ZodInt;
        tiers: z.ZodArray<
          z.ZodObject<
            {
              tier: VocabularyIn<typeof PRICE_TIERS>;
              amountMinor: z.ZodInt;
              currencyCode: z.ZodString;
              active: z.ZodBoolean;
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
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof DateSalesPaneSchema }, z.core.$loose>
      >
    >;
    409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
  };
}> = date.single('prices').replace({
  operationId: 'setDatePrices',
  item: DateSalesPaneSchema,
  summary: "Sets a date's prices.",
  description:
    '**`ticketing` applies its own lock**, it asks `catalog` for nothing: it refuses as soon as it\nhas consumed `publication.engaged`, with its own code and its own trace. This is the answer to\nthe reproach "an aggregate straddling three contexts" — publication publishes a fact, each\nowner locks what it owns.\n\n**"Apply to the series" excludes prices**: each date commits its own buyers.\n\n**One currency per date**, its billing market\'s (D-016): tiers in two currencies are refused\nwith `date.prices_currency_mismatch`, whose `params` name the stray `tier`, its `currency`,\nand the `expected` one.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING],
  body: z.object({
    expectedVersion: z.int().meta({ minimum: undefined, maximum: undefined }),
    tiers: z.array(
      z.object({
        tier: vocabularyIn(PRICE_TIERS).meta({
          'x-arthome-vocabulary-source': 'PRICE_TIERS',
        }),
        amountMinor: z.int().min(0).meta({ maximum: undefined }),
        currencyCode: z.string().regex(new RegExp('^[A-Z]{3}$')),
        active: z.boolean(),
      }),
    ),
  }),
  example: {
    expectedVersion: 12,
    tiers: [
      {
        tier: PriceTier.FULL,
        amountMinor: 2400,
        currencyCode: 'EUR',
        active: true,
      },
      {
        tier: PriceTier.REDUCED,
        amountMinor: 1600,
        currencyCode: 'EUR',
        active: true,
      },
    ],
  },
  responses: {
    200: {
      description: 'Prices up to date.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: DateSalesPaneSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:05:00.000Z',
            rightsVersion: 412,
            data: {
              dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
              capacityTotal: 200,
              seatsAvailable: 26,
              priceTiers: [],
              pricesLocked: false,
              version: 13,
            },
          },
        },
      },
    },
    409: {
      description:
        '`date.prices_locked` when publication is committed, `date.prices_currency_mismatch` when the tiers mix currencies, `state.conflict` on a stale version.',
      content: {
        'application/json': {
          schema: StudioErrorEnvelopeSchema,
          example: {
            error: {
              code: CatalogErrorCode.PRICES_LOCKED,
              nature: FailureNature.REFUSED,
              params: {
                lockedAt: '2026-09-21T18:04:00Z',
              },
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T18:05:00.000Z',
          },
        },
      },
    },
  },
});

export const openCapacityTier: Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/capacity-tiers';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        additionalCapacity: z.ZodInt;
        expectedVersion: z.ZodInt;
        notifyWaitlist: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
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
            data: z.ZodObject<
              {
                sales: z.ZodOptional<typeof DateSalesPaneSchema>;
                waitlistNotified: z.ZodOptional<z.ZodInt>;
                priorityUntil: z.ZodOptional<z.ZodString>;
              },
              z.core.$loose
            >;
          },
          z.core.$loose
        >
      >
    >;
    409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
  };
}> = date.action('capacity-tiers', {
  operationId: 'openCapacityTier',
  summary: 'Opens a capacity tier, and warns the waiting list in the same gesture.',
  description:
    '**One transactional command, not two.** Two calls would let the scarcity dissipate between\nthem: the priority window (2 h) is a **domain parameter**, served and not copied out.\n\n**Capacity widens in tiers and never shrinks** once the sale has opened: a reduction is\nrefused with `capacity.tier_must_widen`.\n\nBeyond `TECHNICAL_PROVISION_THRESHOLD` seats (`@arthome/core`), the technical provision is\nrequired: a capacity no recorded provision covers is refused with\n`date.technical_provision_required`, whose `params` name the `threshold`, the `capacityTotal`\nasked for, the `provisionedCapacity` when one is recorded, and `revisableUntil`,\n`PROVISION_REVISION_HOURS` before the start, once the date has one. The studio records the\nprovision first, with `setTechnicalProvision`. Threshold, provision, deadline and exposure to\nthe penalty are **contract data**.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING],
  body: z.object({
    additionalCapacity: z.int().min(1).meta({ maximum: undefined }),
    expectedVersion: z.int().meta({ minimum: undefined, maximum: undefined }),
    notifyWaitlist: z.boolean().default(true).optional(),
  }),
  example: {
    additionalCapacity: 50,
    expectedVersion: 12,
    notifyWaitlist: true,
  },
  responses: {
    200: {
      description: 'Tier opened and waiting list warned, in the same transaction.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({
                sales: DateSalesPaneSchema.optional(),
                waitlistNotified: z
                  .int()
                  .meta({ minimum: undefined, maximum: undefined })
                  .optional(),
                priorityUntil: InstantOut.optional(),
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:06:00.000Z',
            rightsVersion: 412,
            data: {
              sales: {
                dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                capacityTotal: 250,
                seatsAvailable: 76,
                priceTiers: [],
                pricesLocked: true,
                version: 13,
              },
              waitlistNotified: 12,
              priorityUntil: '2026-09-21T20:06:00Z',
            },
          },
        },
      },
    },
    409: {
      description:
        '`capacity.tier_must_widen`, or `date.technical_provision_required` beyond the threshold without a provision covering the new capacity: record one with `setTechnicalProvision`.',
      content: {
        'application/json': {
          schema: StudioErrorEnvelopeSchema,
          example: {
            error: {
              code: CatalogErrorCode.TECHNICAL_PROVISION_REQUIRED,
              nature: FailureNature.REFUSED,
              params: {
                threshold: 10000,
                capacityTotal: 10050,
                revisableUntil: '2026-09-18T19:00:00Z',
              },
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T18:06:00.000Z',
          },
        },
      },
    },
  },
});

export const setTechnicalProvision: Route<{
  method: 'put';
  version: 1;
  path: '/dates/{dateId}/technical-provision';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  requestBody: JsonRequestBody<
    z.ZodObject<{ provisionedCapacity: z.ZodInt; expectedVersion: z.ZodInt }, z.core.$strip>
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof DateSalesPaneSchema }, z.core.$loose>
      >
    >;
    409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
  };
}> = date.single('technical-provision').replace({
  operationId: 'setTechnicalProvision',
  item: DateSalesPaneSchema,
  summary: "Records or revises a date's technical provision.",
  description:
    'Beyond `TECHNICAL_PROVISION_THRESHOLD` seats (`@arthome/core`), `openCapacityTier` refuses a\ncapacity no recorded provision covers (D-088). This records the capacity the infrastructure\nis provisioned for, and replaces the one recorded before.\n\n**Revisable until `revisableUntil`**, `PROVISION_REVISION_HOURS` before the start: from then\non it is refused with `date.provision_deadline_passed`. A date with no start yet has no\ndeadline. A provision below the capacity already open covers nothing and is refused with\n`date.provision_below_capacity`, whose `params` name both figures.\n\nThe penalty for a forecast far above the real figure is not defined yet (D-088).\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING],
  body: z.object({
    provisionedCapacity: z.int().min(1).meta({ maximum: undefined }),
    expectedVersion: z.int().meta({ minimum: undefined, maximum: undefined }),
  }),
  example: {
    provisionedCapacity: 15000,
    expectedVersion: 12,
  },
  responses: {
    200: {
      description: 'Provision recorded.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: DateSalesPaneSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-15T10:00:00.000Z',
            rightsVersion: 412,
            data: {
              dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
              capacityTotal: 8000,
              seatsAvailable: 1200,
              priceTiers: [],
              pricesLocked: true,
              technicalProvision: {
                required: false,
                threshold: 10000,
                provisionedCapacity: 15000,
                revisableUntil: '2026-09-18T19:00:00Z',
              },
              version: 13,
            },
          },
        },
      },
    },
    409: {
      description:
        '`date.provision_deadline_passed` from the revision deadline on, `date.provision_below_capacity` below the capacity already open, `state.conflict` on a stale version.',
      content: {
        'application/json': {
          schema: StudioErrorEnvelopeSchema,
          example: {
            error: {
              code: CatalogErrorCode.PROVISION_DEADLINE_PASSED,
              nature: FailureNature.REFUSED,
              params: {
                revisableUntil: '2026-09-18T19:00:00Z',
              },
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-19T10:00:00.000Z',
          },
        },
      },
    },
  },
});

export const refundSeat: Route<{
  method: 'post';
  version: 1;
  path: '/seats/{seatId}/refund';
  parameters: readonly [
    PathParameter<'seatId', z.ZodString>,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        refundReasonCode: VocabularyIn<typeof REFUND_SEAT_REFUND_REASON_CODE>;
        partialAmountMinor: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
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
              z.ZodObject<
                {
                  refunded: z.ZodOptional<typeof MoneyOut>;
                  commissionRefunded: z.ZodOptional<typeof MoneyOut>;
                  payoutId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                },
                z.core.$loose
              >
            >;
          },
          z.core.$loose
        >
      >
    >;
    403: typeof ForbiddenResponse;
    409: typeof ConflictResponse;
  };
}> = seats.action('refund', {
  operationId: 'refundSeat',
  summary: 'Refunds a seat from the studio.',
  description:
    '**The refund refunds the commission too**: we do not keep 12% of a show that did not happen.\nIt is not merely decent, it is what the copy promises.\n\n**Never queued offline**: it is a money command, it is refused locally with\n`offline_forbidden`.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.TICKETING],
  body: z.object({
    refundReasonCode: vocabularyIn(REFUND_SEAT_REFUND_REASON_CODE).meta({
      'x-arthome-vocabulary-source': 'REFUND_REASONS',
      'x-arthome-vocabulary-narrowing':
        "The four an operator may choose. The others are raised by the system: a viewer's own cancellation, an account's deletion, and a payment confirmed after its hold expired with no seat left (D-082).",
    }),
    partialAmountMinor: z.int().min(1).meta({ maximum: undefined }).nullable().optional(),
  }),
  example: {
    refundReasonCode: RefundReason.GOODWILL,
  },
  responses: {
    200: {
      description: 'Refund recorded, with its effect on the payout.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  refunded: MoneyOut.meta({
                    'x-arthome-tax-basis': 'inherited',
                  }).optional(),
                  commissionRefunded: MoneyOut.meta({
                    'x-arthome-tax-basis': 'inherited',
                  }).optional(),
                  payoutId: uuidOut().nullable().optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:35:00.000Z',
            rightsVersion: 412,
            data: {
              refunded: {
                amountMinor: 2400,
                currencyCode: 'EUR',
              },
              commissionRefunded: {
                amountMinor: 273,
                currencyCode: 'EUR',
              },
              payoutId: '019928e5-0000-7000-8000-000000000001',
            },
          },
        },
      },
    },
    403: ForbiddenResponse,
    409: ConflictResponse,
  },
});

export const issueComplimentary: Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/complimentaries';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        categoryId: z.ZodString;
        quantity: z.ZodInt;
        note: z.ZodOptional<z.ZodNullable<z.ZodString>>;
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
            data: z.ZodOptional<
              z.ZodObject<
                {
                  seatCodes: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  sales: z.ZodOptional<typeof DateSalesPaneSchema>;
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
  };
}> = date.action('complimentaries', {
  operationId: 'issueComplimentary',
  summary: 'Issues complimentary tickets, by category.',
  description:
    'Complimentary tickets **by category** are one of the six shapes the sources did not carry.\nThey enter the `ticketing` contract at tier 3, **marked provisional**.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.TICKETING],
  body: z.object({
    categoryId: z.string(),
    quantity: z.int().min(1).max(100),
    note: z.string().nullable().optional(),
  }),
  example: {
    categoryId: 'press',
    quantity: 4,
    note: 'Invitations presse',
  },
  responses: {
    201: {
      description: 'Complimentary tickets issued.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  seatCodes: z.array(z.string()).optional(),
                  sales: DateSalesPaneSchema.optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:36:00.000Z',
            rightsVersion: 412,
            data: {
              seatCodes: ['ATH-2P4K-8M', 'ATH-9L1D-3X'],
              sales: {
                dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                capacityTotal: 200,
                seatsAvailable: 24,
                priceTiers: [],
                pricesLocked: true,
                version: 14,
              },
            },
          },
        },
      },
    },
    409: ConflictResponse,
  },
});

export const getChannelTicketing: Route<{
  method: 'get';
  version: 1;
  path: '/channels/{channelId}/ticketing';
  parameters: readonly [
    typeof ChannelIdParameter,
    QueryParameter<'from', z.ZodString, true>,
    QueryParameter<'to', z.ZodString, true>,
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
                byTier: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        tier: z.ZodOptional<VocabularyOut>;
                        seatsSold: z.ZodOptional<z.ZodInt>;
                        gross: z.ZodOptional<typeof MoneyOut>;
                      },
                      z.core.$loose
                    >
                  >
                >;
                waitlistByDate: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        dateId: z.ZodOptional<z.ZodString>;
                        title: z.ZodOptional<z.ZodString>;
                        waitlistCount: z.ZodOptional<z.ZodInt>;
                      },
                      z.core.$loose
                    >
                  >
                >;
                complimentaries: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        categoryId: z.ZodOptional<z.ZodString>;
                        issued: z.ZodOptional<z.ZodInt>;
                        allocated: z.ZodOptional<z.ZodInt>;
                      },
                      z.core.$loose
                    >
                  >
                >;
                pendingRequests: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        requestId: z.ZodString;
                        kind: VocabularyOut;
                        dateId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                        seatId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                        amount: z.ZodOptional<typeof MoneyOut>;
                        openedAt: z.ZodString;
                        respondBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                      },
                      z.core.$loose
                    >
                  >
                >;
              },
              z.core.$loose
            >;
          },
          z.core.$loose
        >
      >
    >;
    403: typeof ForbiddenResponse;
  };
}> = ticketingReads.defineRoute({
  method: 'get',
  path: '/channels/{channelId}/ticketing',
  operationId: 'getChannelTicketing',
  summary: 'Ticketing at channel level — breakdown, waiting list, and the requests in flight.',
  description:
    'The commands existed (`refundSeat`, `issueComplimentary`); **the collection they act on did\nnot**. The "requests in flight" are the three the screen lists — refund, seat transfer, bank\ndispute — and two of them had no read surface at all.\n\n**Reserved to roles with `canRevenue`**: the whole page, not only its columns.\n',
  'x-arthome-maturity': 'provisional',
  'x-arthome-upstream': [Service.TICKETING],
  parameters: [
    ChannelIdParameter,
    {
      name: 'from',
      in: 'query',
      required: true,
      schema: dateIn(),
    },
    {
      name: 'to',
      in: 'query',
      required: true,
      schema: dateIn(),
    },
  ],
  responses: {
    200: {
      description:
        'Breakdown by price tier, waiting lists, complimentary tickets, requests in flight.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({
                byTier: z
                  .array(
                    z.looseObject({
                      tier: vocabularyOut(PRICE_TIERS).optional(),
                      seatsSold: z
                        .int()
                        .meta({ minimum: undefined, maximum: undefined })
                        .optional(),
                      gross: MoneyOut.meta({
                        'x-arthome-tax-basis': 'inclusive',
                      }).optional(),
                    }),
                  )
                  .optional(),
                waitlistByDate: z
                  .array(
                    z.looseObject({
                      dateId: uuidOut().optional(),
                      title: z.string().optional(),
                      waitlistCount: z
                        .int()
                        .meta({ minimum: undefined, maximum: undefined })
                        .optional(),
                    }),
                  )
                  .optional(),
                complimentaries: z
                  .array(
                    z.looseObject({
                      categoryId: z.string().optional(),
                      issued: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
                      allocated: z
                        .int()
                        .meta({ minimum: undefined, maximum: undefined })
                        .optional(),
                    }),
                  )
                  .optional(),
                pendingRequests: z
                  .array(
                    z.looseObject({
                      requestId: uuidOut(),
                      kind: vocabularyOutLocal(
                        GET_CHANNEL_TICKETING_KIND,
                        'A vocabulary local to this contract. The domain neither produces nor consumes these values — they describe what this endpoint offers, and a new member is an endpoint change.',
                      ),
                      dateId: uuidOut().nullable().optional(),
                      seatId: uuidOut().nullable().optional(),
                      amount: MoneyOut.meta({
                        'x-arthome-tax-basis': 'inherited',
                      }).optional(),
                      openedAt: InstantOut,
                      respondBy: InstantOut.nullable().optional(),
                    }),
                  )
                  .meta({
                    description:
                      '**The three kinds, in a single collection**: a refund requested, a\nseat transfer to authorise, a bank dispute to answer within 24 h.\nTwo of them had no read path.\n',
                  })
                  .optional(),
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:14:00.000Z',
            rightsVersion: 412,
            data: {
              byTier: [
                {
                  tier: PriceTier.FULL,
                  seatsSold: 174,
                  gross: {
                    amountMinor: 417600,
                    currencyCode: 'EUR',
                  },
                },
              ],
              waitlistByDate: [
                {
                  dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                  title: 'Nuit blanche',
                  waitlistCount: 12,
                },
              ],
              complimentaries: [],
              pendingRequests: [
                {
                  requestId: '019928ea-0000-7000-8000-000000000001',
                  kind: 'chargeback',
                  seatId: '019928f5-0000-7000-8000-000000000001',
                  amount: {
                    amountMinor: 2400,
                    currencyCode: 'EUR',
                  },
                  openedAt: '2026-09-21T09:00:00Z',
                  respondBy: '2026-09-22T09:00:00Z',
                },
              ],
            },
          },
        },
      },
    },
  },
});
