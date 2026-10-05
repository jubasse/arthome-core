/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { z } from 'zod';
import type { ApiErrorCode, DomainErrorCode, NOTIFICATION_CHANNELS } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import type { ArtistSummarySchema, DateCardSchema, SavedSearchSchema } from '../../catalog/index.js';
import type { NotificationPreferencesSchema } from '../../engagement/index.js';
import type { Deleted, IdentifiedAccess, ItemResponse, JsonRequestBody, JsonResponse, Route } from '../../http/index.js';
import type { AccountScreenSchema, ConsentsSchema, ViewerContextSchema, ViewerPreferencesSchema } from '../../identity/index.js';
import type { ExportRequestSchema } from '../../ticketing/index.js';
import type { ArtistIdParameter, CursorDirectionParameter, CursorParameter, DateIdParameter, IdempotencyKeyParameter, LimitParameter, SurfaceParameter, TraceparentParameter, storefrontConventions, viewer } from '../components.js';
import type { AccountDeletionSchema, AddPasskeyBodySchema, AddPaymentMethodBodySchema, ArtistSummaryPageSchema, CreateSavedSearchBodySchema, DateCardPageSchema, DeletionCancellationSchema, DeviceIdParameter, DeviceRevocationSchema, DeviceSessionIdParameter, ExportIdParameter, ExportRequestAcceptedSchema, FollowArtistBodySchema, FollowedArtistsSortParameter, LiveOnlyParameter, MarkNotificationsReadBodySchema, NotificationBadgeAnswerSchema, NotificationPageSchema, OrderEntryPageSchema, PasskeyEnrolmentSchema, PasskeyIdParameter, PaymentMethodIdParameter, PaymentMethodSetupSchema, PlaybackPositionSchema, ProfileUpdateAnswerSchema, RecordPlaybackPositionBodySchema, ReminderSchema, RequestAccountDeletionBodySchema, RequestExportBodySchema, SavedSearchIdParameter, SavedSearchListSchema, TicketCardPageSchema, TicketWindowParameter } from './schemas.js';
export type AddPasskeyRoute = Route<{
    method: 'post';
    version: 1;
    path: '/me/passkeys';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<typeof AddPasskeyBodySchema, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        201: ItemResponse<typeof storefrontConventions, typeof PasskeyEnrolmentSchema, unknown>;
    };
    errorCodes: {
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type RemovePasskeyRoute = Route<{
    method: 'delete';
    version: 1;
    path: '/me/passkeys/{passkeyId}';
    parameters: readonly [
        typeof PasskeyIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof Deleted, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type AddPaymentMethodRoute = Route<{
    method: 'post';
    version: 1;
    path: '/me/payment-methods';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<typeof AddPaymentMethodBodySchema, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        201: ItemResponse<typeof storefrontConventions, typeof PaymentMethodSetupSchema, unknown>;
    };
    errorCodes: {
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type RemovePaymentMethodRoute = Route<{
    method: 'delete';
    version: 1;
    path: '/me/payment-methods/{paymentMethodId}';
    parameters: readonly [
        typeof PaymentMethodIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof Deleted, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type GetAccountScreenRoute = Route<{
    method: 'get';
    version: 1;
    path: '/me/account';
    parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof AccountScreenSchema, unknown>;
    };
}>;
export type ListMyTicketsRoute = Route<{
    method: 'get';
    version: 1;
    path: '/me/tickets';
    parameters: readonly [
        typeof CursorParameter,
        typeof LimitParameter,
        typeof CursorDirectionParameter,
        typeof TicketWindowParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: {
            readonly description: 'Page of seats.';
            readonly content: {
                readonly 'application/json': {
                    readonly schema: typeof TicketCardPageSchema;
                };
            };
        };
    };
    errorCodes: {
        400: readonly (typeof ApiErrorCode.SCHEMA_INVALID)[];
    };
}>;
export type ListMyReplaysRoute = Route<{
    method: 'get';
    version: 1;
    path: '/me/replays';
    parameters: readonly [
        typeof CursorParameter,
        typeof LimitParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: {
            readonly description: 'Page of replays.';
            readonly content: {
                readonly 'application/json': {
                    readonly schema: typeof DateCardPageSchema;
                };
            };
        };
    };
    errorCodes: {
        400: readonly (typeof ApiErrorCode.SCHEMA_INVALID)[];
    };
}>;
export type ListWatchlistRoute = Route<{
    method: 'get';
    version: 1;
    path: '/me/watchlist';
    parameters: readonly [
        typeof CursorParameter,
        typeof LimitParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: {
            readonly description: 'Page of dates set aside.';
            readonly content: {
                readonly 'application/json': {
                    readonly schema: typeof DateCardPageSchema;
                };
            };
        };
    };
    errorCodes: {
        400: readonly (typeof ApiErrorCode.SCHEMA_INVALID)[];
    };
}>;
export type AddToWatchlistRoute = Route<{
    method: 'put';
    version: 1;
    path: '/me/watchlist/{dateId}';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof DateCardSchema, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type RemoveFromWatchlistRoute = Route<{
    method: 'delete';
    version: 1;
    path: '/me/watchlist/{dateId}';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof DateCardSchema, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type ListFollowedArtistsRoute = Route<{
    method: 'get';
    version: 1;
    path: '/me/follows';
    parameters: readonly [
        typeof CursorParameter,
        typeof LimitParameter,
        typeof FollowedArtistsSortParameter,
        typeof LiveOnlyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: {
            readonly description: 'Page of followed artists. Each carries `alertEnabled` — **following and being alerted are two\nsettings** — and `nextDate` when there is one, which gives the split the screen displays\nwithout a call per artist.\n';
            readonly content: {
                readonly 'application/json': {
                    readonly schema: typeof ArtistSummaryPageSchema;
                };
            };
        };
    };
    errorCodes: {
        400: readonly (typeof ApiErrorCode.SCHEMA_INVALID)[];
    };
}>;
export type FollowArtistRoute = Route<{
    method: 'put';
    version: 1;
    path: '/me/follows/{artistId}';
    parameters: readonly [
        typeof ArtistIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<typeof FollowArtistBodySchema, false>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof ArtistSummarySchema, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type UnfollowArtistRoute = Route<{
    method: 'delete';
    version: 1;
    path: '/me/follows/{artistId}';
    parameters: readonly [
        typeof ArtistIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof ArtistSummarySchema, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type SetReminderRoute = Route<{
    method: 'put';
    version: 1;
    path: '/me/reminders/{dateId}';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof ReminderSchema, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type ClearReminderRoute = Route<{
    method: 'delete';
    version: 1;
    path: '/me/reminders/{dateId}';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof Deleted, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type ListSavedSearchesRoute = Route<{
    method: 'get';
    version: 1;
    path: '/me/saved-searches';
    parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: {
            readonly description: 'The saved searches.';
            readonly content: {
                readonly 'application/json': {
                    readonly schema: typeof SavedSearchListSchema;
                };
            };
        };
    };
}>;
export type CreateSavedSearchRoute = Route<{
    method: 'post';
    version: 1;
    path: '/me/saved-searches';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<typeof CreateSavedSearchBodySchema, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        201: ItemResponse<typeof storefrontConventions, typeof SavedSearchSchema, unknown>;
    };
    errorCodes: {
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type UpdateSavedSearchRoute = Route<{
    method: 'patch';
    version: 1;
    path: '/me/saved-searches/{savedSearchId}';
    parameters: readonly [
        typeof SavedSearchIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        readonly name: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        readonly active: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
        readonly channels: z.ZodOptional<z.ZodOptional<z.ZodArray<VocabularyIn<typeof NOTIFICATION_CHANNELS>>>>;
    } & Record<never, never>, z.core.$strip>, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof SavedSearchSchema, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type DeleteSavedSearchRoute = Route<{
    method: 'delete';
    version: 1;
    path: '/me/saved-searches/{savedSearchId}';
    parameters: readonly [
        typeof SavedSearchIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof Deleted, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type ListMyOrdersRoute = Route<{
    method: 'get';
    version: 1;
    path: '/me/orders';
    parameters: readonly [
        typeof CursorParameter,
        typeof LimitParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: {
            readonly description: 'Page of orders.';
            readonly content: {
                readonly 'application/json': {
                    readonly schema: typeof OrderEntryPageSchema;
                };
            };
        };
    };
    errorCodes: {
        400: readonly (typeof ApiErrorCode.SCHEMA_INVALID)[];
    };
}>;
export type ListNotificationsRoute = Route<{
    method: 'get';
    version: 1;
    path: '/me/notifications';
    parameters: readonly [
        typeof CursorParameter,
        typeof LimitParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: {
            readonly description: "Page of notifications, plus the **global** unread count — not the page's.";
            readonly content: {
                readonly 'application/json': {
                    readonly schema: typeof NotificationPageSchema;
                };
            };
        };
    };
    errorCodes: {
        400: readonly (typeof ApiErrorCode.SCHEMA_INVALID)[];
    };
}>;
export type MarkNotificationsReadRoute = Route<{
    method: 'post';
    version: 1;
    path: '/me/notifications';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<typeof MarkNotificationsReadBodySchema, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: {
            readonly description: 'Badge updated.';
            readonly content: {
                readonly 'application/json': {
                    readonly schema: typeof NotificationBadgeAnswerSchema;
                };
            };
        };
    };
    errorCodes: {
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type UpdateProfileRoute = Route<{
    method: 'patch';
    version: 1;
    path: '/me/profile';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        readonly displayName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        readonly publicHandle: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        readonly city: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    } & {
        readonly expectedVersion: z.ZodNumber;
    }, z.core.$strip>, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: {
            readonly description: 'Profile updated.';
            readonly content: {
                readonly 'application/json': {
                    readonly schema: typeof ProfileUpdateAnswerSchema;
                };
            };
        };
    };
    errorCodes: {
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED | typeof DomainErrorCode.STATE_CONFLICT)[];
    };
}>;
export type UpdatePreferencesRoute = Route<{
    method: 'patch';
    version: 1;
    path: '/me/preferences';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        readonly account: z.ZodOptional<z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>>;
        readonly device: z.ZodOptional<z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>>;
        readonly deviceId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    } & Record<never, never>, z.core.$strip>, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof ViewerPreferencesSchema, unknown>;
    };
    errorCodes: {
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type UpdateNotificationPreferencesRoute = Route<{
    method: 'patch';
    version: 1;
    path: '/me/notification-preferences';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        readonly triggers: z.ZodOptional<z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$catchall<z.ZodArray<VocabularyIn<typeof NOTIFICATION_CHANNELS>>>>>>;
        readonly quietHours: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            fromHour: z.ZodOptional<z.ZodInt>;
            toHour: z.ZodOptional<z.ZodInt>;
            bypassWhenTicketHeld: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>>;
    } & Record<never, never>, z.core.$strip>, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof NotificationPreferencesSchema, unknown>;
    };
    errorCodes: {
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type UpdateConsentsRoute = Route<{
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
    } & Record<never, never>, z.core.$strip>, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof ConsentsSchema, unknown>;
    };
    errorCodes: {
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type RevokeDeviceRoute = Route<{
    method: 'delete';
    version: 1;
    path: '/me/devices/{deviceId}';
    parameters: readonly [
        typeof DeviceIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof DeviceRevocationSchema, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type SignOutProfileRoute = Route<{
    method: 'delete';
    version: 1;
    path: '/me/device-sessions/{sessionId}';
    parameters: readonly [
        typeof DeviceSessionIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof ViewerContextSchema, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type RequestExportRoute = Route<{
    method: 'post';
    version: 1;
    path: '/me/exports';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<typeof RequestExportBodySchema, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        202: JsonResponse<typeof ExportRequestAcceptedSchema>;
    };
    errorCodes: {
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type GetExportRoute = Route<{
    method: 'get';
    version: 1;
    path: '/me/exports/{exportId}';
    parameters: readonly [
        typeof ExportIdParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof ExportRequestSchema, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    };
}>;
export type RequestAccountDeletionRoute = Route<{
    method: 'post';
    version: 1;
    path: '/me/deletion';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<typeof RequestAccountDeletionBodySchema, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        202: ItemResponse<typeof storefrontConventions, typeof AccountDeletionSchema, unknown>;
    };
    errorCodes: {
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type CancelAccountDeletionRoute = Route<{
    method: 'delete';
    version: 1;
    path: '/me/deletion';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof DeletionCancellationSchema, unknown>;
    };
    errorCodes: {
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type RecordPlaybackPositionRoute = Route<{
    method: 'put';
    version: 1;
    path: '/me/progress/{dateId}';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<typeof RecordPlaybackPositionBodySchema, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof PlaybackPositionSchema, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    };
}>;
//# sourceMappingURL=types.d.ts.map