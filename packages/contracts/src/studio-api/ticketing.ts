import { z } from 'zod';

import { RefundReason, Service } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { MoneyOut, uuidOut, vocabularyIn, uuidIn } from '@arthome/core/schema';

import {
  ConflictResponse,
  ForbiddenResponse,
  IdempotencyKeyParameter,
  IfRightsVersionParameter,
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  studioV1,
} from './components.js';
import { StudioEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, Route } from '../http/index.js';

const ticketingRoutes = studioV1
  .tags(StudioTag.TICKETING)
  .headers(SurfaceParameter, IfRightsVersionParameter, TraceparentParameter);

const ticketingWrites = ticketingRoutes.headers(IdempotencyKeyParameter);
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
