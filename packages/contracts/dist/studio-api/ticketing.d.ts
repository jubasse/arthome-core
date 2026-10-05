import { z } from 'zod';
import type { VocabularyOut } from '@arthome/core/schema';
import { MoneyOut } from '@arthome/core/schema';
import { ChannelIdParameter, ForbiddenResponse, IfRightsVersionParameter, SurfaceParameter, TraceparentParameter } from './components.js';
import { StudioEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonResponse, QueryParameter, Route } from '../http/index.js';
export declare const getChannelTicketing: Route<{
    method: 'get';
    version: 1;
    path: '/channels/{channelId}/ticketing';
    parameters: readonly [
        typeof ChannelIdParameter,
        QueryParameter<'from', z.ZodString, true>,
        QueryParameter<'to', z.ZodString, true>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                byTier: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    tier: z.ZodOptional<VocabularyOut>;
                    seatsSold: z.ZodOptional<z.ZodInt>;
                    gross: z.ZodOptional<typeof MoneyOut>;
                }, z.core.$loose>>>;
                waitlistByDate: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    dateId: z.ZodOptional<z.ZodString>;
                    title: z.ZodOptional<z.ZodString>;
                    waitlistCount: z.ZodOptional<z.ZodInt>;
                }, z.core.$loose>>>;
                complimentaries: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    categoryId: z.ZodOptional<z.ZodString>;
                    issued: z.ZodOptional<z.ZodInt>;
                    allocated: z.ZodOptional<z.ZodInt>;
                }, z.core.$loose>>>;
                pendingRequests: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    requestId: z.ZodString;
                    kind: VocabularyOut;
                    dateId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    seatId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    amount: z.ZodOptional<typeof MoneyOut>;
                    openedAt: z.ZodString;
                    respondBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$loose>>>;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
    };
}>;
//# sourceMappingURL=ticketing.d.ts.map