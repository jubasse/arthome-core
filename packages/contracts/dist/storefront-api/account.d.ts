import { z } from 'zod';
import { LOCALES, NOTIFICATION_CHANNELS } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { ArtistIdParameter, BadRequestResponse, ConflictResponse, CsrfRefusedResponse, CursorDirectionParameter, CursorParameter, DateIdParameter, GoneResponse, IdempotencyKeyParameter, LimitParameter, NotFoundResponse, SurfaceParameter, TooManyRequestsResponse, TraceparentParameter, UnauthorizedResponse } from './components.js';
import { ArtistSummarySchema, DateCardSchema, SavedSearchSchema } from '../catalog/index.js';
import { NotificationEntrySchema, NotificationPreferencesSchema } from '../engagement/index.js';
import { StorefrontEnvelopeMetaSchema, StorefrontErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, QueryParameter, Route } from '../http/index.js';
import { AccountScreenSchema, ConsentsSchema, DeviceSchema, StorefrontSessionEstablishedSchema, StorefrontSessionModeSchema, ViewerContextSchema, ViewerPreferencesSchema } from '../identity/index.js';
import { StorefrontCursorPageInfoSchema } from '../pagination/index.js';
import { ExportRequestSchema, ExternalOrderRefSchema, OrderSchema, TicketCardSchema } from '../ticketing/index.js';
declare const START_SOCIAL_SIGN_IN_PROVIDER: readonly ["google", "facebook"];
declare const LIST_MY_TICKETS_WINDOW: readonly ["upcoming", "past"];
declare const LIST_FOLLOWED_ARTISTS_SORT: readonly ["alpha", "followers", "next_date"];
declare const CREATE_SAVED_SEARCH_SCOPE: readonly ["search", "category"];
declare const REQUEST_EXPORT_KIND: readonly ["personal_data", "invoices"];
declare const CONTACT_SUPPORT_TOPIC: readonly ["ticketing_refund", "playback_quality", "replay", "store_shipping", "account_signin", "personal_data"];
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
export declare const addPasskey: Route<{
    method: 'post';
    version: 1;
    path: '/me/passkeys';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        label: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, false>;
    responses: {
        201: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                registrationOptions: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>;
                expiresAt: z.ZodOptional<z.ZodString>;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const removePasskey: Route<{
    method: 'delete';
    version: 1;
    path: '/me/passkeys/{passkeyId}';
    parameters: readonly [
        PathParameter<'passkeyId', z.ZodString>,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                removed: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        409: typeof ConflictResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const addPaymentMethod: Route<{
    method: 'post';
    version: 1;
    path: '/me/payment-methods';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        returnPath: z.ZodString;
        setAsDefault: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, z.core.$strip>>;
    responses: {
        201: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                setupIntentRef: z.ZodString;
                clientSecret: z.ZodString;
                returnUrl: z.ZodString;
                expiresAt: z.ZodOptional<z.ZodString>;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const removePaymentMethod: Route<{
    method: 'delete';
    version: 1;
    path: '/me/payment-methods/{paymentMethodId}';
    parameters: readonly [
        PathParameter<'paymentMethodId', z.ZodString>,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                removed: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        409: typeof ConflictResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const getAccountScreen: Route<{
    method: 'get';
    version: 1;
    path: '/me/account';
    parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof AccountScreenSchema;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
    };
}>;
export declare const listMyTickets: Route<{
    method: 'get';
    version: 1;
    path: '/me/tickets';
    parameters: readonly [
        typeof CursorParameter,
        typeof CursorDirectionParameter,
        typeof LimitParameter,
        QueryParameter<'window', z.ZodDefault<VocabularyIn<typeof LIST_MY_TICKETS_WINDOW>>>,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<typeof TicketCardSchema>;
            page: typeof StorefrontCursorPageInfoSchema;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
        410: typeof GoneResponse;
    };
}>;
export declare const listMyReplays: Route<{
    method: 'get';
    version: 1;
    path: '/me/replays';
    parameters: readonly [
        typeof CursorParameter,
        typeof LimitParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<typeof DateCardSchema>;
            page: typeof StorefrontCursorPageInfoSchema;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
    };
}>;
export declare const listWatchlist: Route<{
    method: 'get';
    version: 1;
    path: '/me/watchlist';
    parameters: readonly [
        typeof CursorParameter,
        typeof LimitParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<typeof DateCardSchema>;
            page: typeof StorefrontCursorPageInfoSchema;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
    };
}>;
export declare const addToWatchlist: Route<{
    method: 'put';
    version: 1;
    path: '/me/watchlist/{dateId}';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof DateCardSchema;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const removeFromWatchlist: Route<{
    method: 'delete';
    version: 1;
    path: '/me/watchlist/{dateId}';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof DateCardSchema;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const listFollowedArtists: Route<{
    method: 'get';
    version: 1;
    path: '/me/follows';
    parameters: readonly [
        typeof CursorParameter,
        typeof LimitParameter,
        QueryParameter<'sort', z.ZodDefault<VocabularyIn<typeof LIST_FOLLOWED_ARTISTS_SORT>>>,
        QueryParameter<'liveOnly', z.ZodDefault<z.ZodBoolean>>,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<typeof ArtistSummarySchema>;
            page: typeof StorefrontCursorPageInfoSchema;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
        410: typeof GoneResponse;
    };
}>;
export declare const followArtist: Route<{
    method: 'put';
    version: 1;
    path: '/me/follows/{artistId}';
    parameters: readonly [
        typeof ArtistIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        alertEnabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, z.core.$strip>, false>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof ArtistSummarySchema;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const unfollowArtist: Route<{
    method: 'delete';
    version: 1;
    path: '/me/follows/{artistId}';
    parameters: readonly [
        typeof ArtistIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof ArtistSummarySchema;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const setReminder: Route<{
    method: 'put';
    version: 1;
    path: '/me/reminders/{dateId}';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                reminderSet: z.ZodOptional<z.ZodBoolean>;
                remindAt: z.ZodOptional<z.ZodString>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const clearReminder: Route<{
    method: 'delete';
    version: 1;
    path: '/me/reminders/{dateId}';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                reminderSet: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const listSavedSearches: Route<{
    method: 'get';
    version: 1;
    path: '/me/saved-searches';
    parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<typeof SavedSearchSchema>;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
    };
}>;
export declare const createSavedSearch: Route<{
    method: 'post';
    version: 1;
    path: '/me/saved-searches';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        scope: VocabularyIn<typeof CREATE_SAVED_SEARCH_SCOPE>;
        categoryId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        queryText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        criteria: z.ZodObject<Record<never, never>, z.core.$loose>;
        channels: z.ZodOptional<z.ZodArray<VocabularyIn<typeof NOTIFICATION_CHANNELS>>>;
    }, z.core.$strip>>;
    responses: {
        201: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof SavedSearchSchema;
        }, z.core.$loose>>>;
        409: typeof ConflictResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const updateSavedSearch: Route<{
    method: 'patch';
    version: 1;
    path: '/me/saved-searches/{savedSearchId}';
    parameters: readonly [
        PathParameter<'savedSearchId', z.ZodString>,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        active: z.ZodOptional<z.ZodBoolean>;
        channels: z.ZodOptional<z.ZodArray<VocabularyIn<typeof NOTIFICATION_CHANNELS>>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof SavedSearchSchema;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const deleteSavedSearch: Route<{
    method: 'delete';
    version: 1;
    path: '/me/saved-searches/{savedSearchId}';
    parameters: readonly [
        PathParameter<'savedSearchId', z.ZodString>,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                deleted: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const listMyOrders: Route<{
    method: 'get';
    version: 1;
    path: '/me/orders';
    parameters: readonly [
        typeof CursorParameter,
        typeof LimitParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<z.ZodObject<{
                order: z.ZodOptional<typeof OrderSchema>;
                external: z.ZodOptional<typeof ExternalOrderRefSchema>;
            }, z.core.$loose>>;
            page: typeof StorefrontCursorPageInfoSchema;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
    };
}>;
export declare const listNotifications: Route<{
    method: 'get';
    version: 1;
    path: '/me/notifications';
    parameters: readonly [
        typeof CursorParameter,
        typeof LimitParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<typeof NotificationEntrySchema>;
            unreadCount: z.ZodInt;
            page: typeof StorefrontCursorPageInfoSchema;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
    };
}>;
export declare const markNotificationsRead: Route<{
    method: 'post';
    version: 1;
    path: '/me/notifications';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        notificationIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
        all: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                unreadCount: z.ZodOptional<z.ZodInt>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const updateProfile: Route<{
    method: 'patch';
    version: 1;
    path: '/me/profile';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        expectedVersion: z.ZodInt;
        displayName: z.ZodOptional<z.ZodString>;
        publicHandle: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            version: z.ZodOptional<z.ZodInt>;
            data: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>;
        }, z.core.$loose>>>;
        409: typeof ConflictResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const updatePreferences: Route<{
    method: 'patch';
    version: 1;
    path: '/me/preferences';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        account: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>;
        device: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>;
        deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof ViewerPreferencesSchema;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const updateNotificationPreferences: Route<{
    method: 'patch';
    version: 1;
    path: '/me/notification-preferences';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        triggers: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$catchall<z.ZodArray<VocabularyIn<typeof NOTIFICATION_CHANNELS>>>>>;
        quietHours: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            fromHour: z.ZodOptional<z.ZodInt>;
            toHour: z.ZodOptional<z.ZodInt>;
            bypassWhenTicketHeld: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof NotificationPreferencesSchema;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const updateConsents: Route<{
    method: 'put';
    version: 1;
    path: '/me/consents';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        purposes: z.ZodObject<{
            audience: z.ZodBoolean;
            perso: z.ZodBoolean;
            partners: z.ZodBoolean;
            ads: z.ZodBoolean;
        }, z.core.$strip>;
        cookieCategories: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$catchall<z.ZodBoolean>>>;
        textVersion: z.ZodInt;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof ConsentsSchema;
        }, z.core.$loose>>>;
        400: typeof BadRequestResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const revokeDevice: Route<{
    method: 'delete';
    version: 1;
    path: '/me/devices/{deviceId}';
    parameters: readonly [
        PathParameter<'deviceId', z.ZodString>,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                devices: z.ZodOptional<z.ZodArray<typeof DeviceSchema>>;
                playbackCutWithinSec: z.ZodOptional<z.ZodInt>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const signOutProfile: Route<{
    method: 'delete';
    version: 1;
    path: '/me/device-sessions/{sessionId}';
    parameters: readonly [
        PathParameter<'sessionId', z.ZodString>,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof ViewerContextSchema;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const requestExport: Route<{
    method: 'post';
    version: 1;
    path: '/me/exports';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        kind: VocabularyIn<typeof REQUEST_EXPORT_KIND>;
        fromDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        toDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    responses: {
        202: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof ExportRequestSchema;
        }, z.core.$loose>>>;
        429: typeof TooManyRequestsResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const getExport: Route<{
    method: 'get';
    version: 1;
    path: '/me/exports/{exportId}';
    parameters: readonly [
        PathParameter<'exportId', z.ZodString>,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof ExportRequestSchema;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
    };
}>;
export declare const requestAccountDeletion: Route<{
    method: 'post';
    version: 1;
    path: '/me/deletion';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        confirmHandle: z.ZodString;
    }, z.core.$strip>>;
    responses: {
        202: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                state: z.ZodOptional<z.ZodString>;
                graceUntil: z.ZodOptional<z.ZodString>;
                cancelledSeatsCount: z.ZodOptional<z.ZodInt>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        409: typeof ConflictResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const cancelAccountDeletion: Route<{
    method: 'delete';
    version: 1;
    path: '/me/deletion';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                state: z.ZodOptional<z.ZodString>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        409: typeof ConflictResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export declare const contactSupport: Route<{
    method: 'post';
    version: 1;
    path: '/support/requests';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        topic: VocabularyIn<typeof CONTACT_SUPPORT_TOPIC>;
        message: z.ZodString;
        context: z.ZodOptional<z.ZodObject<{
            dateId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            seatId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            orderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            traceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    responses: {
        202: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                requestId: z.ZodOptional<z.ZodString>;
                reference: z.ZodOptional<z.ZodString>;
                priorityCode: z.ZodOptional<z.ZodString>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        429: typeof TooManyRequestsResponse;
        403: typeof CsrfRefusedResponse;
    };
}>;
export {};
//# sourceMappingURL=account.d.ts.map