import { ApiErrorCode } from '@arthome/core';

import {
  AccountDeletionSchema,
  AddPasskeyBodySchema,
  AddPaymentMethodBodySchema,
  ArtistSummaryPageSchema,
  CreateSavedSearchBodySchema,
  DateCardPageSchema,
  DeletionCancellationSchema,
  DeviceIdParameter,
  DeviceRevocationSchema,
  DeviceSessionIdParameter,
  ExportIdParameter,
  ExportRequestAcceptedSchema,
  FollowArtistBodySchema,
  FollowedArtistsSortParameter,
  LiveOnlyParameter,
  MarkNotificationsReadBodySchema,
  NotificationBadgeAnswerSchema,
  NotificationPageSchema,
  OrderEntryPageSchema,
  PasskeyEnrolmentSchema,
  PasskeyIdParameter,
  PaymentMethodIdParameter,
  PaymentMethodSetupSchema,
  PlaybackPositionSchema,
  ProfileUpdateAnswerSchema,
  RecordPlaybackPositionBodySchema,
  ReminderSchema,
  RequestAccountDeletionBodySchema,
  RequestExportBodySchema,
  SavedSearchIdParameter,
  SavedSearchListSchema,
  TicketCardPageSchema,
  TicketWindowParameter,
  UpdateConsentsBodySchema,
  UpdateNotificationPreferencesBodySchema,
  UpdatePreferencesBodySchema,
  UpdateProfileBodySchema,
  UpdateSavedSearchBodySchema,
} from './schemas.js';
import type {
  AddPasskeyRoute,
  AddPaymentMethodRoute,
  AddToWatchlistRoute,
  CancelAccountDeletionRoute,
  ClearReminderRoute,
  CreateSavedSearchRoute,
  DeleteSavedSearchRoute,
  FollowArtistRoute,
  GetAccountScreenRoute,
  GetExportRoute,
  ListFollowedArtistsRoute,
  ListMyOrdersRoute,
  ListMyReplaysRoute,
  ListMyTicketsRoute,
  ListNotificationsRoute,
  ListSavedSearchesRoute,
  ListWatchlistRoute,
  MarkNotificationsReadRoute,
  RecordPlaybackPositionRoute,
  RemoveFromWatchlistRoute,
  RemovePasskeyRoute,
  RemovePaymentMethodRoute,
  RequestAccountDeletionRoute,
  RequestExportRoute,
  RevokeDeviceRoute,
  SetReminderRoute,
  SignOutProfileRoute,
  UnfollowArtistRoute,
  UpdateConsentsRoute,
  UpdateNotificationPreferencesRoute,
  UpdatePreferencesRoute,
  UpdateProfileRoute,
  UpdateSavedSearchRoute,
} from './types.js';
import { ArtistSummarySchema, DateCardSchema, SavedSearchSchema } from '../../catalog/index.js';
import { NotificationPreferencesSchema } from '../../engagement/index.js';
import { Deleted, Freshness, accepted, cache, cursor, throttle } from '../../http/index.js';
import {
  AccountScreenSchema,
  ConsentsSchema,
  ViewerContextSchema,
  ViewerPreferencesSchema,
} from '../../identity/index.js';
import { ExportRequestSchema } from '../../ticketing/index.js';
import {
  ArtistIdParameter,
  CursorDirectionParameter,
  DateIdParameter,
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  storefrontV1,
  viewer,
} from '../components.js';

const me = storefrontV1.identity(viewer).headers(SurfaceParameter, TraceparentParameter).path('me');
const account = me.tags(StorefrontTag.ACCOUNT);

const passkeys = account.resource('passkeys', { id: PasskeyIdParameter, owner: 'caller' });

export const addPasskey: AddPasskeyRoute = passkeys.create({
  operationId: 'addPasskey',
  summary: 'Enrols a passkey.',
  body: AddPasskeyBodySchema,
  optionalBody: true,
  response: PasskeyEnrolmentSchema,
  answer: 'Enrolment options, single-use.',
});

export const removePasskey: RemovePasskeyRoute = passkeys.delete({
  operationId: 'removePasskey',
  summary: 'Removes a passkey.',
  response: Deleted,
  answer: 'Passkey removed.',
});

const paymentMethods = account.resource('payment-methods', {
  id: PaymentMethodIdParameter,
  owner: 'caller',
});

export const addPaymentMethod: AddPaymentMethodRoute = paymentMethods.create({
  operationId: 'addPaymentMethod',
  summary: 'Registers a payment method from the web.',
  'x-arthome-invalidates': ['account:payment-methods'],
  body: AddPaymentMethodBodySchema,
  response: PaymentMethodSetupSchema,
  answer: 'Setup opened. The surface presents the payment element.',
});

export const removePaymentMethod: RemovePaymentMethodRoute = paymentMethods.delete({
  operationId: 'removePaymentMethod',
  summary: 'Removes a payment method.',
  response: Deleted,
  answer: 'Method removed. Replayed on an already-removed method, it succeeds.',
});

export const getAccountScreen: GetAccountScreenRoute = account
  .single('account', { owner: 'caller' })
  .find({
    operationId: 'getAccountScreen',
    summary: "The aggregate of the account's eleven sections, in one call.",
    item: AccountScreenSchema,
    cache: cache(Freshness.FIVE_MINUTES),
    answer: 'The account.',
  });

export const listMyTickets: ListMyTicketsRoute = account
  .single('tickets', { owner: 'caller' })
  .findAll({
    operationId: 'listMyTickets',
    summary: 'My seats, upcoming or past, already ordered by the server.',
    paging: cursor({ maxLimit: 50 }),
    parameters: [CursorDirectionParameter, TicketWindowParameter],
    cache: cache(Freshness.MINUTE),
    responses: {
      200: {
        description: 'Page of seats.',
        content: { 'application/json': { schema: TicketCardPageSchema } },
      },
    },
  });

export const listMyReplays: ListMyReplaysRoute = account
  .single('replays', { owner: 'caller' })
  .findAll({
    operationId: 'listMyReplays',
    summary: 'My replays, the ones expiring first.',
    paging: cursor({ maxLimit: 50 }),
    cache: cache(Freshness.MINUTE),
    responses: {
      200: {
        description: 'Page of replays.',
        content: { 'application/json': { schema: DateCardPageSchema } },
      },
    },
  });

const watchlist = account.resource('watchlist', { id: DateIdParameter, owner: 'caller' });

export const listWatchlist: ListWatchlistRoute = watchlist.findAll({
  operationId: 'listWatchlist',
  summary: 'Ma liste.',
  paging: cursor({ maxLimit: 50 }),
  cache: cache(Freshness.MINUTE),
  responses: {
    200: {
      description: 'Page of dates set aside.',
      content: { 'application/json': { schema: DateCardPageSchema } },
    },
  },
});

export const addToWatchlist: AddToWatchlistRoute = watchlist.upsert({
  operationId: 'addToWatchlist',
  summary: 'Sets a date aside.',
  'x-arthome-invalidates': ['home:rails'],
  item: DateCardSchema,
  answer: 'The updated card.',
  errors: [ApiErrorCode.NOT_FOUND],
});

export const removeFromWatchlist: RemoveFromWatchlistRoute = watchlist.delete({
  operationId: 'removeFromWatchlist',
  summary: 'Removes a date from my list.',
  response: DateCardSchema,
  answer: 'The updated card.',
});

const follows = account.resource('follows', { id: ArtistIdParameter, owner: 'caller' });

export const listFollowedArtists: ListFollowedArtistsRoute = follows.findAll({
  operationId: 'listFollowedArtists',
  summary: 'Followed artists — the "Following" page, which had no entry point.',
  paging: cursor({ maxLimit: 50 }),
  parameters: [FollowedArtistsSortParameter, LiveOnlyParameter],
  cache: cache(Freshness.MINUTE),
  responses: {
    200: {
      description:
        'Page of followed artists. Each carries `alertEnabled` — **following and being alerted are two\nsettings** — and `nextDate` when there is one, which gives the split the screen displays\nwithout a call per artist.\n',
      content: { 'application/json': { schema: ArtistSummaryPageSchema } },
    },
  },
});

export const followArtist: FollowArtistRoute = follows.upsert({
  operationId: 'followArtist',
  summary: 'Follows an artist.',
  'x-arthome-invalidates': ['home:rails'],
  body: FollowArtistBodySchema,
  optionalBody: true,
  item: ArtistSummarySchema,
  answer: 'The updated artist.',
  errors: [ApiErrorCode.NOT_FOUND],
});

export const unfollowArtist: UnfollowArtistRoute = follows.delete({
  operationId: 'unfollowArtist',
  summary: 'Unfollows an artist.',
  response: ArtistSummarySchema,
  answer: 'The updated artist.',
});

const reminders = account.resource('reminders', { id: DateIdParameter, owner: 'caller' });

export const setReminder: SetReminderRoute = reminders.upsert({
  operationId: 'setReminder',
  summary: 'Sets a dated reminder on a date.',
  item: ReminderSchema,
  answer: 'Reminder set.',
  errors: [ApiErrorCode.NOT_FOUND],
});

export const clearReminder: ClearReminderRoute = reminders.delete({
  operationId: 'clearReminder',
  summary: 'Clears the reminder.',
  response: Deleted,
  answer: 'Reminder cleared.',
});

export const listSavedSearches: ListSavedSearchesRoute = account
  .single('saved-searches', { owner: 'caller' })
  .find({
    operationId: 'listSavedSearches',
    summary: 'My saved searches, with their new-match counter.',
    cache: cache(Freshness.FIVE_MINUTES),
    responses: {
      200: {
        description: 'The saved searches.',
        content: { 'application/json': { schema: SavedSearchListSchema } },
      },
    },
  });

const savedSearches = account.resource('saved-searches', {
  id: SavedSearchIdParameter,
  owner: 'caller',
});

export const createSavedSearch: CreateSavedSearchRoute = savedSearches.create({
  operationId: 'createSavedSearch',
  summary: 'Saves a search.',
  body: CreateSavedSearchBodySchema,
  item: SavedSearchSchema,
  answer: 'Search saved.',
});

export const updateSavedSearch: UpdateSavedSearchRoute = savedSearches.update({
  operationId: 'updateSavedSearch',
  summary: 'Renames, activates, or changes the channels of a saved search.',
  body: UpdateSavedSearchBodySchema,
  item: SavedSearchSchema,
  answer: 'The updated search.',
});

export const deleteSavedSearch: DeleteSavedSearchRoute = savedSearches.delete({
  operationId: 'deleteSavedSearch',
  summary: 'Deletes a saved search.',
  response: Deleted,
  answer: 'Deleted.',
});

export const listMyOrders: ListMyOrdersRoute = account
  .single('orders', { owner: 'caller' })
  .findAll({
    operationId: 'listMyOrders',
    summary: 'My orders, including the reflection of orders placed with a third party.',
    paging: cursor({ maxLimit: 50 }),
    cache: cache(Freshness.FIVE_MINUTES),
    responses: {
      200: {
        description: 'Page of orders.',
        content: { 'application/json': { schema: OrderEntryPageSchema } },
      },
    },
  });

const notifications = account.single('notifications', { owner: 'caller' });

export const listNotifications: ListNotificationsRoute = notifications.findAll({
  operationId: 'listNotifications',
  summary: 'The notification centre, and the global badge.',
  paging: cursor({ maxLimit: 50 }),
  cache: cache(Freshness.MINUTE),
  responses: {
    200: {
      description: "Page of notifications, plus the **global** unread count — not the page's.",
      content: { 'application/json': { schema: NotificationPageSchema } },
    },
  },
});

export const markNotificationsRead: MarkNotificationsReadRoute = notifications.create({
  operationId: 'markNotificationsRead',
  summary: 'Marks notifications as read.',
  body: MarkNotificationsReadBodySchema,
  responses: {
    200: {
      description: 'Badge updated.',
      content: { 'application/json': { schema: NotificationBadgeAnswerSchema } },
    },
  },
});

export const updateProfile: UpdateProfileRoute = account.single('profile').update({
  operationId: 'updateProfile',
  summary: 'Changes the displayed identity.',
  'x-arthome-invalidates': ['account:profile'],
  body: UpdateProfileBodySchema,
  responses: {
    200: {
      description: 'Profile updated.',
      content: { 'application/json': { schema: ProfileUpdateAnswerSchema } },
    },
  },
});

export const updatePreferences: UpdatePreferencesRoute = account
  .single('preferences', { owner: 'caller' })
  .update({
    operationId: 'updatePreferences',
    summary: 'Writes a preference, at its scope.',
    body: UpdatePreferencesBodySchema,
    item: ViewerPreferencesSchema,
    answer: 'Preferences updated, both scopes served together.',
  });

export const updateNotificationPreferences: UpdateNotificationPreferencesRoute = account
  .single('notification-preferences', { owner: 'caller' })
  .update({
    operationId: 'updateNotificationPreferences',
    summary: 'Five triggers, three channels, and quiet hours.',
    body: UpdateNotificationPreferencesBodySchema,
    item: NotificationPreferencesSchema,
    answer: 'Notification preferences updated.',
  });

export const updateConsents: UpdateConsentsRoute = account
  .single('consents', { owner: 'caller' })
  .replace({
    operationId: 'updateConsents',
    summary: 'Records consents, timestamped and versioned by the server.',
    body: UpdateConsentsBodySchema,
    item: ConsentsSchema,
    answer: 'Consents recorded, with the server timestamp.',
  });

export const revokeDevice: RevokeDeviceRoute = account
  .resource('devices', { id: DeviceIdParameter, owner: 'caller' })
  .delete({
    operationId: 'revokeDevice',
    summary: 'Revokes a device — and cuts its playback.',
    'x-arthome-invalidates': ['account:devices'],
    response: DeviceRevocationSchema,
    answer:
      'Device revoked. `playbackCutWithinSec` states how long playback **actually** takes to\nstop.\n',
  });

export const signOutProfile: SignOutProfileRoute = account
  .resource('device-sessions', { id: DeviceSessionIdParameter, owner: 'caller' })
  .delete({
    operationId: 'signOutProfile',
    summary: 'Signs one profile out of this device — the others stay signed in.',
    response: ViewerContextSchema,
    answer: 'The updated context, with the remaining profiles.',
  });

export const requestExport: RequestExportRoute = account
  .requires(throttle('export'))
  .resource('exports', { id: ExportIdParameter, owner: 'caller' })
  .create({
    operationId: 'requestExport',
    summary: 'Requests an export — personal data or invoices.',
    body: RequestExportBodySchema,
    responses: {
      202: accepted({
        operation: 'getExport',
        description: 'Request accepted.',
        body: ExportRequestAcceptedSchema,
      }),
    },
  });

export const getExport: GetExportRoute = account
  .resource('exports', { id: ExportIdParameter, owner: 'caller' })
  .find({
    operationId: 'getExport',
    summary: 'The state of an export, and its signed address once ready.',
    item: ExportRequestSchema,
    answer: 'The state, and the address once ready (valid 60 min).',
  });

const deletion = account.single('deletion', { owner: 'caller' });

export const requestAccountDeletion: RequestAccountDeletionRoute = deletion.create({
  operationId: 'requestAccountDeletion',
  summary: 'Requests deletion of the account.',
  body: RequestAccountDeletionBodySchema,
  response: AccountDeletionSchema,
  status: 202,
  answer: 'Request recorded, with the end of the grace period.',
});

export const cancelAccountDeletion: CancelAccountDeletionRoute = deletion.delete({
  operationId: 'cancelAccountDeletion',
  summary: 'Cancels the deletion request during the grace period.',
  response: DeletionCancellationSchema,
  answer:
    'Deletion cancelled. Seats already refunded do not come back — the contract says so rather than letting anyone assume otherwise.',
});

export const recordPlaybackPosition: RecordPlaybackPositionRoute = me
  .tags(StorefrontTag.PLAYBACK)
  .resource('progress', { id: DateIdParameter, owner: 'caller' })
  .upsert({
    operationId: 'recordPlaybackPosition',
    summary: 'Records the playback position.',
    idempotent: false,
    body: RecordPlaybackPositionBodySchema,
    item: PlaybackPositionSchema,
    answer: 'Position recorded, with the server ordering applied.',
    errors: [ApiErrorCode.NOT_FOUND],
  });
