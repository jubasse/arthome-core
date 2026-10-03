import { z } from 'zod';
import { PAYOUT_STATES } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { MoneyOut } from '@arthome/core/schema';
import { ChannelIdParameter, ConflictResponse, ForbiddenResponse, GoneResponse, IdempotencyKeyParameter, IfRightsVersionParameter, NotFoundResponse, PageParameter, PageSizeParameter, SortByParameter, SortDirParameter, SurfaceParameter, TraceparentParameter } from './components.js';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, QueryParameter, Route } from '../http/index.js';
import { OffsetPageInfoSchema } from '../pagination/index.js';
import { BankChangeRequestSchema, ExportJobSchema, PayoutLineSchema } from '../studio-money/index.js';
declare const COUNTERSIGN_BANK_CHANGE_DECISION: readonly ["countersign", "reject"];
declare const REQUEST_CHANNEL_EXPORT_KIND: readonly ["sales_csv", "fec", "sage", "cegid", "grouped_invoices", "journal", "schedule_ics", "stats_csv"];
export declare const listPayouts: Route<{
    method: 'get';
    version: 1;
    path: '/channels/{channelId}/payouts';
    parameters: readonly [
        typeof ChannelIdParameter,
        typeof PageParameter,
        typeof PageSizeParameter,
        typeof SortByParameter,
        typeof SortDirParameter,
        QueryParameter<'state', VocabularyIn<typeof PAYOUT_STATES>>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<typeof PayoutLineSchema>;
            balances: z.ZodArray<typeof MoneyOut>;
            pendingBankChange: z.ZodOptional<typeof BankChangeRequestSchema>;
            page: typeof OffsetPageInfoSchema;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
    };
}>;
export declare const requestBankChange: Route<{
    method: 'post';
    version: 1;
    path: '/channels/{channelId}/bank-change-requests';
    parameters: readonly [
        typeof ChannelIdParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        stripeSetupRef: z.ZodString;
        reauthToken: z.ZodString;
    }, z.core.$strip>>;
    responses: {
        202: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof BankChangeRequestSchema;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
        409: typeof ConflictResponse;
    };
}>;
export declare const countersignBankChange: Route<{
    method: 'post';
    version: 1;
    path: '/bank-change-requests/{requestId}/countersign';
    parameters: readonly [
        PathParameter<'requestId', z.ZodString>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        decision: VocabularyIn<typeof COUNTERSIGN_BANK_CHANGE_DECISION>;
        reauthToken: z.ZodString;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof BankChangeRequestSchema;
        }, z.core.$loose>>>;
        403: JsonResponse<typeof StudioErrorEnvelopeSchema>;
        410: typeof GoneResponse;
    };
}>;
export declare const closeReconciliationPeriod: Route<{
    method: 'post';
    version: 1;
    path: '/channels/{channelId}/reconciliation-periods/{periodId}/close';
    parameters: readonly [
        typeof ChannelIdParameter,
        PathParameter<'periodId', z.ZodString>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        explanations: z.ZodOptional<z.ZodArray<z.ZodObject<{
            payoutId: z.ZodOptional<z.ZodString>;
            note: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>, false>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                periodId: z.ZodOptional<z.ZodString>;
                closedAt: z.ZodOptional<z.ZodString>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
    };
}>;
export declare const requestChannelExport: Route<{
    method: 'post';
    version: 1;
    path: '/channels/{channelId}/exports';
    parameters: readonly [
        typeof ChannelIdParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        kind: VocabularyIn<typeof REQUEST_CHANNEL_EXPORT_KIND>;
        from: z.ZodString;
        to: z.ZodString;
    }, z.core.$strip>>;
    responses: {
        202: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof ExportJobSchema;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
    };
}>;
export declare const getChannelExport: Route<{
    method: 'get';
    version: 1;
    path: '/exports/{exportId}';
    parameters: readonly [
        PathParameter<'exportId', z.ZodString>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof ExportJobSchema;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
    };
}>;
export {};
//# sourceMappingURL=payouts.d.ts.map