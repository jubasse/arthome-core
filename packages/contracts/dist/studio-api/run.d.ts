import { z } from 'zod';
import { INCIDENT_CAUSES, INCIDENT_KINDS, RunState } from '@arthome/core';
import type { VocabularyIn, VocabularyOut } from '@arthome/core/schema';
import { ChannelIdParameter, ConflictResponse, DateIdParameter, ForbiddenResponse, IdempotencyKeyParameter, IfRightsVersionParameter, NotFoundResponse, SurfaceParameter, TraceparentParameter, UnauthorizedResponse } from './components.js';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, QueryParameter, Route } from '../http/index.js';
import { HealthSampleSchema, HealthSeriesSchema, RunConsoleSchema, StreamKeyRevealSchema, StudioIncidentSchema } from '../studio-stage/index.js';
declare const SET_RUN_STATE_STATE: readonly [
    typeof RunState.IDLE,
    typeof RunState.REHEARSAL,
    typeof RunState.ON_AIR,
    typeof RunState.ENDED
];
export declare const getDateTechPane: Route<{
    method: 'get';
    path: '/v1/dates/{dateId}/panes/tech';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                runState: z.ZodOptional<VocabularyOut>;
                ingestProtocol: z.ZodOptional<VocabularyOut>;
                monitorPath: z.ZodOptional<VocabularyOut>;
                ingestUrl: z.ZodOptional<z.ZodString>;
                technicalCheckPassedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                preflight: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodOptional<z.ZodString>;
                    satisfied: z.ZodOptional<z.ZodBoolean>;
                    measuredAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                }, z.core.$loose>>>;
                qualityLadder: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    renditionId: z.ZodOptional<z.ZodString>;
                    heightPx: z.ZodOptional<z.ZodInt>;
                    enabled: z.ZodOptional<z.ZodBoolean>;
                }, z.core.$loose>>>;
                version: z.ZodOptional<z.ZodInt>;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
        404: typeof NotFoundResponse;
    };
}>;
export declare const getRunConsole: Route<{
    method: 'get';
    path: '/v1/dates/{dateId}/run';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof RunConsoleSchema;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
        404: typeof NotFoundResponse;
    };
}>;
export declare const runTechnicalCheck: Route<{
    method: 'post';
    path: '/v1/dates/{dateId}/run/technical-check';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                passed: z.ZodOptional<z.ZodBoolean>;
                passedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                failures: z.ZodOptional<z.ZodArray<z.ZodString>>;
                sample: z.ZodOptional<typeof HealthSampleSchema>;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
        409: typeof ConflictResponse;
    };
}>;
export declare const setRunState: Route<{
    method: 'put';
    path: '/v1/dates/{dateId}/run/state';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        state: VocabularyIn<typeof SET_RUN_STATE_STATE>;
        expectedVersion: z.ZodInt;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof RunConsoleSchema;
        }, z.core.$loose>>>;
        409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
    };
}>;
export declare const setQualityProfile: Route<{
    method: 'put';
    path: '/v1/dates/{dateId}/run/quality-profile';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        expectedVersion: z.ZodInt;
        renditions: z.ZodArray<z.ZodObject<{
            renditionId: z.ZodString;
            enabled: z.ZodBoolean;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof RunConsoleSchema;
        }, z.core.$loose>>>;
        409: typeof ConflictResponse;
    };
}>;
export declare const getHealthSeries: Route<{
    method: 'get';
    path: '/v1/dates/{dateId}/run/health-samples';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        QueryParameter<'windowSec', z.ZodDefault<z.ZodInt>>
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof HealthSeriesSchema;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
        404: typeof NotFoundResponse;
    };
}>;
export declare const submitHealthSample: Route<{
    method: 'post';
    path: '/v1/dates/{dateId}/run/health-samples';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        measuredAt: z.ZodString;
        latencyMs: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
        deviceUpKbps: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
        jitterMs: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    }, z.core.$strip>>;
    responses: {
        202: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                accepted: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
    };
}>;
export declare const postChapter: Route<{
    method: 'post';
    path: '/v1/dates/{dateId}/run/chapters';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        chapterId: z.ZodString;
        vocabId: z.ZodString;
        atMediaSec: z.ZodInt;
    }, z.core.$strip>>;
    responses: {
        201: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                id: z.ZodOptional<z.ZodString>;
                vocabId: z.ZodOptional<z.ZodString>;
                atMediaSec: z.ZodOptional<z.ZodInt>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
    };
}>;
export declare const removeChapter: Route<{
    method: 'delete';
    path: '/v1/dates/{dateId}/run/chapters/{chapterId}';
    parameters: readonly [
        typeof DateIdParameter,
        PathParameter<'chapterId', z.ZodString>,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                deleted: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
    };
}>;
export declare const raiseIncident: Route<{
    method: 'post';
    path: '/v1/dates/{dateId}/incidents';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        incidentId: z.ZodString;
        kind: VocabularyIn<typeof INCIDENT_KINDS>;
        cause: VocabularyIn<typeof INCIDENT_CAUSES>;
        message: z.ZodObject<{
            contentLanguage: z.ZodString;
            text: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>>;
    responses: {
        201: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof StudioIncidentSchema;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
        409: typeof ConflictResponse;
    };
}>;
export declare const resolveIncident: Route<{
    method: 'post';
    path: '/v1/incidents/{incidentId}/resolve';
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
    path: '/v1/incidents/{incidentId}/escalate';
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
export declare const revealStreamKey: Route<{
    method: 'post';
    path: '/v1/dates/{dateId}/stream-key/reveal';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        reauthToken: z.ZodString;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof StreamKeyRevealSchema;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
        403: typeof ForbiddenResponse;
    };
}>;
export declare const rotateStreamKey: Route<{
    method: 'post';
    path: '/v1/dates/{dateId}/stream-key/rotate';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        reauthToken: z.ZodString;
        confirmDuringRun: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof StreamKeyRevealSchema;
        }, z.core.$loose>>>;
        409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
    };
}>;
export declare const getChannelStreamSettings: Route<{
    method: 'get';
    path: '/v1/channels/{channelId}/stream';
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
export {};
//# sourceMappingURL=run.d.ts.map