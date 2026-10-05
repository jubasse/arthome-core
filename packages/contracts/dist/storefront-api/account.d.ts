import { z } from 'zod';
import { LOCALES } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { BadRequestResponse, CsrfRefusedResponse, GoneResponse, IdempotencyKeyParameter, SurfaceParameter, TooManyRequestsResponse, TraceparentParameter, UnauthorizedResponse } from './components.js';
import { StorefrontEnvelopeMetaSchema, StorefrontErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, Route } from '../http/index.js';
import { StorefrontSessionEstablishedSchema, StorefrontSessionModeSchema } from '../identity/index.js';
declare const START_SOCIAL_SIGN_IN_PROVIDER: readonly ["google", "facebook"];
export declare const signUp: Route<{
    method: 'post';
    version: 1;
    path: '/auth/sign-up';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
        displayName: z.ZodOptional<z.ZodString>;
        mode: typeof StorefrontSessionModeSchema;
        deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        acceptedTermsVersion: z.ZodInt;
        locale: VocabularyIn<typeof LOCALES>;
    }, z.core.$strip>>;
    responses: {
        201: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof StorefrontSessionEstablishedSchema;
        }, z.core.$loose>>>;
        400: typeof BadRequestResponse;
        409: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
        429: typeof TooManyRequestsResponse;
    };
}>;
export declare const signIn: Route<{
    method: 'post';
    version: 1;
    path: '/auth/sign-in';
    parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
    requestBody: JsonRequestBody<z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
        mode: typeof StorefrontSessionModeSchema;
        deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof StorefrontSessionEstablishedSchema;
        }, z.core.$loose>>>;
        401: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
        429: typeof TooManyRequestsResponse;
    };
}>;
export declare const signOut: Route<{
    method: 'post';
    version: 1;
    path: '/auth/sign-out';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                signedOut: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
    };
}>;
export declare const confirmEmailVerification: Route<{
    method: 'post';
    version: 1;
    path: '/auth/verify-email';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        token: z.ZodString;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                verified: z.ZodBoolean;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        400: typeof BadRequestResponse;
        410: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
        429: typeof TooManyRequestsResponse;
    };
}>;
export declare const resendEmailVerification: Route<{
    method: 'post';
    version: 1;
    path: '/auth/verify-email/resend';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                queued: z.ZodBoolean;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
        403: typeof CsrfRefusedResponse;
        429: typeof TooManyRequestsResponse;
    };
}>;
export declare const requestPasswordReset: Route<{
    method: 'post';
    version: 1;
    path: '/auth/forget-password';
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
        202: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                accepted: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        429: typeof TooManyRequestsResponse;
    };
}>;
export declare const resetPassword: Route<{
    method: 'post';
    version: 1;
    path: '/auth/reset-password';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        token: z.ZodString;
        password: z.ZodString;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                changed: z.ZodOptional<z.ZodBoolean>;
                otherSessionsRevoked: z.ZodOptional<z.ZodInt>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        400: typeof BadRequestResponse;
        410: typeof GoneResponse;
    };
}>;
export declare const startSocialSignIn: Route<{
    method: 'post';
    version: 1;
    path: '/auth/social/{provider}/start';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        PathParameter<'provider', VocabularyIn<typeof START_SOCIAL_SIGN_IN_PROVIDER>>,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        mode: typeof StorefrontSessionModeSchema;
        deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        returnPath: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                authorizationUrl: z.ZodString;
                state: z.ZodString;
                expiresAt: z.ZodString;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        400: typeof BadRequestResponse;
    };
}>;
export declare const exchangeOneTimeToken: Route<{
    method: 'post';
    version: 1;
    path: '/auth/exchange';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        state: z.ZodString;
        mode: typeof StorefrontSessionModeSchema;
        deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof StorefrontSessionEstablishedSchema;
        }, z.core.$loose>>>;
        410: typeof GoneResponse;
    };
}>;
export declare const changePassword: Route<{
    method: 'post';
    version: 1;
    path: '/auth/change-password';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        currentPassword: z.ZodString;
        newPassword: z.ZodString;
        revokeOtherSessions: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                changed: z.ZodOptional<z.ZodBoolean>;
                otherSessionsRevoked: z.ZodOptional<z.ZodInt>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
        403: typeof CsrfRefusedResponse;
        429: typeof TooManyRequestsResponse;
    };
}>;
export declare const enableTwoFactor: Route<{
    method: 'post';
    version: 1;
    path: '/auth/two-factor';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        password: z.ZodString;
    }, z.core.$strip>>;
    responses: {
        201: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                otpauthUri: z.ZodString;
                backupCodes: z.ZodArray<z.ZodString>;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const disableTwoFactor: Route<{
    method: 'delete';
    version: 1;
    path: '/auth/two-factor';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        password: z.ZodString;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                twoFactorEnabled: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const verifyTwoFactor: Route<{
    method: 'post';
    version: 1;
    path: '/auth/two-factor/verify';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        challengeId: z.ZodString;
        code: z.ZodString;
        mode: typeof StorefrontSessionModeSchema;
        deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof StorefrontSessionEstablishedSchema;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
        410: typeof GoneResponse;
    };
}>;
export {};
//# sourceMappingURL=account.d.ts.map