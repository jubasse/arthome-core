import { z } from 'zod';
import { RefundReason } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { MoneyOut } from '@arthome/core/schema';
import { ConflictResponse, ForbiddenResponse, IdempotencyKeyParameter, IfRightsVersionParameter, SurfaceParameter, TraceparentParameter } from './components.js';
import { StudioEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, Route } from '../http/index.js';
declare const REFUND_SEAT_REFUND_REASON_CODE: readonly [
    typeof RefundReason.DATE_CANCELLED,
    typeof RefundReason.GOODWILL,
    typeof RefundReason.DUPLICATE,
    typeof RefundReason.DISPUTE
];
export declare const refundSeat: Route<{
    method: 'post';
    version: 1;
    path: '/seats/{seatId}/refund';
    parameters: readonly [
        PathParameter<'seatId', z.ZodString>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        refundReasonCode: VocabularyIn<typeof REFUND_SEAT_REFUND_REASON_CODE>;
        partialAmountMinor: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                refunded: z.ZodOptional<typeof MoneyOut>;
                commissionRefunded: z.ZodOptional<typeof MoneyOut>;
                payoutId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
        409: typeof ConflictResponse;
    };
}>;
export {};
//# sourceMappingURL=ticketing.d.ts.map