import { z } from 'zod';
import { NOTIFICATION_CHANNELS } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { SavedSearchSchema } from '../../catalog/index.js';
import { NotificationEntrySchema } from '../../engagement/index.js';
import { StorefrontEnvelopeMetaSchema } from '../../envelope/index.js';
import type { PathParameter, QueryParameter } from '../../http/index.js';
import { DeviceSchema } from '../../identity/index.js';
import { StorefrontCursorPageInfoSchema } from '../../pagination/index.js';
import { ExternalOrderRefSchema, OrderSchema } from '../../ticketing/index.js';
declare const TICKET_WINDOWS: readonly ["upcoming", "past"];
declare const FOLLOWED_ARTISTS_SORTS: readonly ["alpha", "followers", "next_date"];
declare const SAVED_SEARCH_SCOPES: readonly ["search", "category"];
declare const EXPORT_KINDS: readonly ["personal_data", "invoices"];
export declare const PasskeyIdParameter: PathParameter<'passkeyId', z.ZodString>;
export declare const PaymentMethodIdParameter: PathParameter<'paymentMethodId', z.ZodString>;
export declare const SavedSearchIdParameter: PathParameter<'savedSearchId', z.ZodString>;
export declare const DeviceIdParameter: PathParameter<'deviceId', z.ZodString>;
export declare const DeviceSessionIdParameter: PathParameter<'sessionId', z.ZodString>;
export declare const ExportIdParameter: PathParameter<'exportId', z.ZodString>;
export declare const TicketWindowParameter: QueryParameter<'window', z.ZodDefault<VocabularyIn<typeof TICKET_WINDOWS>>>;
export declare const FollowedArtistsSortParameter: QueryParameter<'sort', z.ZodDefault<VocabularyIn<typeof FOLLOWED_ARTISTS_SORTS>>>;
export declare const LiveOnlyParameter: QueryParameter<'liveOnly', z.ZodDefault<z.ZodBoolean>>;
export declare const AddPasskeyBodySchema: z.ZodObject<{
    label: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const PasskeyEnrolmentSchema: z.ZodObject<{
    registrationOptions: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>;
    expiresAt: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
export declare const AddPaymentMethodBodySchema: z.ZodObject<{
    returnPath: z.ZodString;
    setAsDefault: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const PaymentMethodSetupSchema: z.ZodObject<{
    setupIntentRef: z.ZodString;
    clientSecret: z.ZodString;
    returnUrl: z.ZodString;
    expiresAt: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
export declare const FollowArtistBodySchema: z.ZodObject<{
    alertEnabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const ReminderSchema: z.ZodOptional<z.ZodObject<{
    reminderSet: z.ZodOptional<z.ZodBoolean>;
    remindAt: z.ZodOptional<z.ZodString>;
}, z.core.$loose>>;
export declare const SavedSearchListSchema: z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
    items: z.ZodArray<typeof SavedSearchSchema>;
}, z.core.$loose>>;
export declare const CreateSavedSearchBodySchema: z.ZodObject<{
    scope: VocabularyIn<typeof SAVED_SEARCH_SCOPES>;
    categoryId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    queryText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    criteria: z.ZodObject<Record<never, never>, z.core.$loose>;
    channels: z.ZodOptional<z.ZodArray<VocabularyIn<typeof NOTIFICATION_CHANNELS>>>;
}, z.core.$strip>;
export declare const UpdateSavedSearchBodySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    active: z.ZodOptional<z.ZodBoolean>;
    channels: z.ZodOptional<z.ZodArray<VocabularyIn<typeof NOTIFICATION_CHANNELS>>>;
}, z.core.$strip>;
export declare const OrderEntrySchema: z.ZodObject<{
    order: z.ZodOptional<typeof OrderSchema>;
    external: z.ZodOptional<typeof ExternalOrderRefSchema>;
}, z.core.$loose>;
export declare const NotificationPageSchema: z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
    items: z.ZodArray<typeof NotificationEntrySchema>;
    unreadCount: z.ZodInt;
    page: typeof StorefrontCursorPageInfoSchema;
}, z.core.$loose>>;
export declare const MarkNotificationsReadBodySchema: z.ZodObject<{
    notificationIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    all: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const NotificationBadgeAnswerSchema: z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
    data: z.ZodOptional<z.ZodObject<{
        unreadCount: z.ZodOptional<z.ZodInt>;
    }, z.core.$loose>>;
}, z.core.$loose>>;
export declare const UpdateProfileBodySchema: z.ZodObject<{
    displayName: z.ZodOptional<z.ZodString>;
    publicHandle: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const ProfileUpdateAnswerSchema: z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
    version: z.ZodOptional<z.ZodInt>;
    data: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>;
}, z.core.$loose>>;
export declare const UpdatePreferencesBodySchema: z.ZodObject<{
    account: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>;
    device: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>;
    deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const UpdateNotificationPreferencesBodySchema: z.ZodObject<{
    triggers: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$catchall<z.ZodArray<VocabularyIn<typeof NOTIFICATION_CHANNELS>>>>>;
    quietHours: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodOptional<z.ZodBoolean>;
        fromHour: z.ZodOptional<z.ZodInt>;
        toHour: z.ZodOptional<z.ZodInt>;
        bypassWhenTicketHeld: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const UpdateConsentsBodySchema: z.ZodObject<{
    purposes: z.ZodObject<{
        audience: z.ZodBoolean;
        perso: z.ZodBoolean;
        partners: z.ZodBoolean;
        ads: z.ZodBoolean;
    }, z.core.$strip>;
    cookieCategories: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$catchall<z.ZodBoolean>>>;
    textVersion: z.ZodInt;
}, z.core.$strip>;
export declare const DeviceRevocationSchema: z.ZodOptional<z.ZodObject<{
    devices: z.ZodOptional<z.ZodArray<typeof DeviceSchema>>;
    playbackCutWithinSec: z.ZodOptional<z.ZodInt>;
}, z.core.$loose>>;
export declare const RequestExportBodySchema: z.ZodObject<{
    kind: VocabularyIn<typeof EXPORT_KINDS>;
    fromDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    toDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const RequestAccountDeletionBodySchema: z.ZodObject<{
    confirmHandle: z.ZodString;
}, z.core.$strip>;
export declare const AccountDeletionSchema: z.ZodOptional<z.ZodObject<{
    state: z.ZodOptional<z.ZodString>;
    graceUntil: z.ZodOptional<z.ZodString>;
    cancelledSeatsCount: z.ZodOptional<z.ZodInt>;
}, z.core.$loose>>;
export declare const DeletionCancellationSchema: z.ZodOptional<z.ZodObject<{
    state: z.ZodOptional<z.ZodString>;
}, z.core.$loose>>;
export declare const RecordPlaybackPositionBodySchema: z.ZodObject<{
    positionSec: z.ZodInt;
    deviceId: z.ZodString;
    completed: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const PlaybackPositionSchema: z.ZodOptional<z.ZodObject<{
    positionSec: z.ZodOptional<z.ZodInt>;
    version: z.ZodOptional<z.ZodInt>;
}, z.core.$loose>>;
export type AddPasskeyBody = z.output<typeof AddPasskeyBodySchema>;
export type PasskeyEnrolment = z.output<typeof PasskeyEnrolmentSchema>;
export type AddPaymentMethodBody = z.output<typeof AddPaymentMethodBodySchema>;
export type PaymentMethodSetup = z.output<typeof PaymentMethodSetupSchema>;
export type FollowArtistBody = z.output<typeof FollowArtistBodySchema>;
export type Reminder = z.output<typeof ReminderSchema>;
export type SavedSearchList = z.output<typeof SavedSearchListSchema>;
export type CreateSavedSearchBody = z.output<typeof CreateSavedSearchBodySchema>;
export type UpdateSavedSearchBody = z.output<typeof UpdateSavedSearchBodySchema>;
export type OrderEntry = z.output<typeof OrderEntrySchema>;
export type NotificationPage = z.output<typeof NotificationPageSchema>;
export type MarkNotificationsReadBody = z.output<typeof MarkNotificationsReadBodySchema>;
export type NotificationBadgeAnswer = z.output<typeof NotificationBadgeAnswerSchema>;
export type UpdateProfileBody = z.output<typeof UpdateProfileBodySchema>;
export type ProfileUpdateAnswer = z.output<typeof ProfileUpdateAnswerSchema>;
export type UpdatePreferencesBody = z.output<typeof UpdatePreferencesBodySchema>;
export type UpdateNotificationPreferencesBody = z.output<typeof UpdateNotificationPreferencesBodySchema>;
export type UpdateConsentsBody = z.output<typeof UpdateConsentsBodySchema>;
export type DeviceRevocation = z.output<typeof DeviceRevocationSchema>;
export type RequestExportBody = z.output<typeof RequestExportBodySchema>;
export type RequestAccountDeletionBody = z.output<typeof RequestAccountDeletionBodySchema>;
export type AccountDeletion = z.output<typeof AccountDeletionSchema>;
export type DeletionCancellation = z.output<typeof DeletionCancellationSchema>;
export type RecordPlaybackPositionBody = z.output<typeof RecordPlaybackPositionBodySchema>;
export type PlaybackPosition = z.output<typeof PlaybackPositionSchema>;
export {};
//# sourceMappingURL=schemas.d.ts.map