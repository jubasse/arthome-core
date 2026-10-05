import { z } from 'zod';
import type { VocabularyIn } from '@arthome/core/schema';
import { GoneResponse, IdempotencyKeyParameter, IfRightsVersionParameter, NotFoundResponse, SurfaceParameter, TraceparentParameter } from './components.js';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, Route } from '../http/index.js';
import { BankChangeRequestSchema, ExportJobSchema } from '../studio-money/index.js';
declare const COUNTERSIGN_BANK_CHANGE_DECISION: readonly ["countersign", "reject"];
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