import { z } from 'zod';
import type { VocabularyOut } from '@arthome/core/schema';
import { ChannelIdParameter, ForbiddenResponse, IdempotencyKeyParameter, IfRightsVersionParameter, NotFoundResponse, SurfaceParameter, TraceparentParameter } from './components.js';
import { StudioEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, Route } from '../http/index.js';
export declare const resolveIncident: Route<{
    method: 'post';
    version: 1;
    path: '/incidents/{incidentId}/resolve';
    parameters: readonly [
        PathParameter<'incidentId', z.ZodString>,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                resolvedAt: z.ZodOptional<z.ZodString>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
    };
}>;
export declare const escalateIncidentToProduction: Route<{
    method: 'post';
    version: 1;
    path: '/incidents/{incidentId}/escalate';
    parameters: readonly [
        PathParameter<'incidentId', z.ZodString>,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        note: z.ZodString;
    }, z.core.$strip>>;
    responses: {
        202: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                routedToRoles: z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
    };
}>;
export declare const getChannelStreamSettings: Route<{
    method: 'get';
    version: 1;
    path: '/channels/{channelId}/stream';
    parameters: readonly [
        typeof ChannelIdParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                ingestUrl: z.ZodOptional<z.ZodString>;
                recommendedProtocol: z.ZodOptional<VocabularyOut>;
                recommendedBitrateKbps: z.ZodOptional<z.ZodInt>;
                lastMeasuredUpKbps: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
                defaults: z.ZodOptional<z.ZodObject<{
                    ingestProtocol: z.ZodOptional<VocabularyOut>;
                    qualityLadder: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    holdScreenAutoAfterSec: z.ZodOptional<z.ZodInt>;
                }, z.core.$loose>>;
                recentChecks: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    dateId: z.ZodOptional<z.ZodString>;
                    passed: z.ZodOptional<z.ZodBoolean>;
                    passedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$loose>>>;
                preflightPending: z.ZodOptional<z.ZodInt>;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
    };
}>;
//# sourceMappingURL=run.d.ts.map