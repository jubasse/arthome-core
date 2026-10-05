import { z } from 'zod';

import { PRICE_TIERS, PriceTier, Service } from '@arthome/core';
import type { VocabularyOut } from '@arthome/core/schema';
import {
  InstantOut,
  MoneyOut,
  uuidOut,
  vocabularyOut,
  vocabularyOutLocal,
  dateIn,
} from '@arthome/core/schema';

import {
  ChannelIdParameter,
  ForbiddenResponse,
  IfRightsVersionParameter,
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  studioV1,
} from './components.js';
import { StudioEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonResponse, QueryParameter, Route } from '../http/index.js';

const ticketingRoutes = studioV1
  .tags(StudioTag.TICKETING)
  .headers(SurfaceParameter, IfRightsVersionParameter, TraceparentParameter);
const ticketingReads = ticketingRoutes.errors({ 403: ForbiddenResponse });

const GET_CHANNEL_TICKETING_KIND = ['refund', 'seat_transfer', 'chargeback'] as const;

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
