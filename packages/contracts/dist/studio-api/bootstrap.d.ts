import { z } from 'zod';
import { LOCALES } from '@arthome/core';
import type { VocabularyIn, VocabularyOut } from '@arthome/core/schema';
import { BadRequestResponse, ForbiddenResponse, GoneResponse, IdempotencyKeyParameter, IfRightsVersionParameter, NotFoundResponse, PageParameter, PageSizeParameter, SurfaceParameter, TooManyRequestsResponse, TraceparentParameter, UnauthorizedResponse, UnavailableResponse } from './components.js';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, QueryParameter, Route } from '../http/index.js';
import { OffsetPageInfoSchema } from '../pagination/index.js';
import { StudioBootstrapSchema, StudioCountersSchema, StudioSessionEstablishedSchema, StudioSessionModeSchema } from '../studio-access/index.js';
import { InboxEntrySchema } from '../studio-desk/index.js';
declare const CREATE_REAUTH_TOKEN_INTENT: readonly ["reveal_stream_key", "rotate_stream_key", "transfer_ownership", "delete_channel", "change_bank_details"];
declare const CREATE_REAUTH_TOKEN_FACTOR: readonly ["platform_biometric", "password", "totp", "backup_code"];
declare const REGISTER_STUDIO_PUSH_TOKEN_PLATFORM: readonly ["fcm", "apns"];
export declare const signInStudio: Route<{
    method: 'post';
    path: '/v1/auth/sign-in';
    parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
    requestBody: JsonRequestBody<z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
        mode: typeof StudioSessionModeSchema;
        deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        deviceLabel: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof StudioSessionEstablishedSchema;
        }, z.core.$loose>>>;
        401: JsonResponse<typeof StudioErrorEnvelopeSchema>;
        429: typeof TooManyRequestsResponse;
    };
}>;
export declare const verifyTwoFactorStudio: Route<{
    method: 'post';
    path: '/v1/auth/two-factor/verify';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        challengeId: z.ZodString;
        code: z.ZodString;
        mode: typeof StudioSessionModeSchema;
        deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof StudioSessionEstablishedSchema;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
        410: typeof GoneResponse;
    };
}>;
export declare const requestPasswordResetStudio: Route<{
    method: 'post';
    path: '/v1/auth/forget-password';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        email: z.ZodString;
        locale: z.ZodOptional<VocabularyIn<typeof LOCALES>>;
    }, z.core.$strip>>;
    responses: {
        202: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                accepted: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        429: typeof TooManyRequestsResponse;
    };
}>;
export declare const getStudioBootstrap: Route<{
    method: 'get';
    path: '/v1/bootstrap';
    parameters: readonly [
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof StudioBootstrapSchema;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
        503: typeof UnavailableResponse;
    };
}>;
export declare const listInbox: Route<{
    method: 'get';
    path: '/v1/inbox';
    parameters: readonly [
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof PageParameter,
        typeof PageSizeParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<typeof InboxEntrySchema>;
            page: typeof OffsetPageInfoSchema;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
    };
}>;
export declare const markInboxRead: Route<{
    method: 'post';
    path: '/v1/inbox';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        entryIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
        all: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof StudioCountersSchema;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
    };
}>;
export declare const createReauthToken: Route<{
    method: 'post';
    path: '/v1/me/reauth';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        intent: VocabularyIn<typeof CREATE_REAUTH_TOKEN_INTENT>;
        factor: VocabularyIn<typeof CREATE_REAUTH_TOKEN_FACTOR>;
        proof: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    responses: {
        201: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                reauthToken: z.ZodString;
                intent: z.ZodString;
                expiresAt: z.ZodString;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
        403: typeof ForbiddenResponse;
        429: typeof TooManyRequestsResponse;
    };
}>;
export declare const listReauthFactors: Route<{
    method: 'get';
    path: '/v1/me/reauth';
    parameters: readonly [
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                acceptedFactors: z.ZodOptional<z.ZodArray<VocabularyOut>>;
                platformBiometricEnrolled: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
    };
}>;
export declare const listStudioDevices: Route<{
    method: 'get';
    path: '/v1/me/devices';
    parameters: readonly [
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<z.ZodObject<{
                deviceId: z.ZodString;
                label: z.ZodString;
                platform: z.ZodOptional<VocabularyOut>;
                city: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                lastSeenAt: z.ZodString;
                isCurrent: z.ZodBoolean;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
    };
}>;
export declare const revokeStudioDevice: Route<{
    method: 'delete';
    path: '/v1/me/devices/{deviceId}';
    parameters: readonly [
        PathParameter<'deviceId', z.ZodString>,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                revoked: z.ZodOptional<z.ZodBoolean>;
                commandsStopWithinSec: z.ZodOptional<z.ZodInt>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
    };
}>;
export declare const signOutStudio: Route<{
    method: 'delete';
    path: '/v1/me/session';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                signedOut: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
    };
}>;
export declare const registerStudioPushToken: Route<{
    method: 'put';
    path: '/v1/me/push-registrations';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        platform: VocabularyIn<typeof REGISTER_STUDIO_PUSH_TOKEN_PLATFORM>;
        token: z.ZodString;
        deviceId: z.ZodString;
        locale: z.ZodOptional<VocabularyIn<typeof LOCALES>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                registered: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
    };
}>;
export declare const listStudioChanges: Route<{
    method: 'get';
    path: '/v1/changes';
    parameters: readonly [
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        QueryParameter<'since', z.ZodString, true>,
        QueryParameter<'channelId', z.ZodString>
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            invalidated: z.ZodArray<VocabularyOut>;
            complete: z.ZodBoolean;
        }, z.core.$loose>>>;
        400: typeof BadRequestResponse;
        401: typeof UnauthorizedResponse;
    };
}>;
export declare const updateStudioPreferences: Route<{
    method: 'patch';
    path: '/v1/me/preferences';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        readingTimezone: z.ZodOptional<z.ZodString>;
        runDeskLayout: z.ZodOptional<z.ZodString>;
        encodingProfileName: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
    };
}>;
export {};
//# sourceMappingURL=bootstrap.d.ts.map