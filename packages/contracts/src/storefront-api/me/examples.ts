import type { z } from 'zod';

import { AccountStatus, Locale, MessageDomain, NotificationChannel, PlanTier } from '@arthome/core';

import type {
  AccountDeletion,
  AddPasskeyBody,
  AddPaymentMethodBody,
  CreateSavedSearchBody,
  DeletionCancellation,
  DeviceRevocation,
  FollowArtistBody,
  MarkNotificationsReadBody,
  NotificationBadgeAnswer,
  NotificationPage,
  OrderEntry,
  PasskeyEnrolment,
  PaymentMethodSetup,
  PlaybackPosition,
  ProfileUpdateAnswer,
  RecordPlaybackPositionBody,
  Reminder,
  RequestAccountDeletionBody,
  RequestExportBody,
  SavedSearchList,
  UpdateConsentsBody,
  UpdateNotificationPreferencesBody,
  UpdatePreferencesBody,
  UpdateProfileBody,
  UpdateSavedSearchBody,
} from './schemas.js';
import {
  AccountDeletionSchema,
  AddPasskeyBodySchema,
  AddPaymentMethodBodySchema,
  CreateSavedSearchBodySchema,
  DeletionCancellationSchema,
  DeviceRevocationSchema,
  FollowArtistBodySchema,
  MarkNotificationsReadBodySchema,
  NotificationBadgeAnswerSchema,
  NotificationPageSchema,
  OrderEntrySchema,
  PasskeyEnrolmentSchema,
  PaymentMethodSetupSchema,
  PlaybackPositionSchema,
  ProfileUpdateAnswerSchema,
  RecordPlaybackPositionBodySchema,
  ReminderSchema,
  RequestAccountDeletionBodySchema,
  RequestExportBodySchema,
  SavedSearchListSchema,
  UpdateConsentsBodySchema,
  UpdateNotificationPreferencesBodySchema,
  UpdatePreferencesBodySchema,
  UpdateProfileBodySchema,
  UpdateSavedSearchBodySchema,
} from './schemas.js';
import { SavedSearchSchema } from '../../catalog/index.js';
import { NotificationPreferencesSchema } from '../../engagement/index.js';
import {
  AccountScreenSchema,
  ConsentsSchema,
  ViewerContextSchema,
  ViewerPreferencesSchema,
} from '../../identity/index.js';
import type { ModuleExamples } from '../../openapi/docs.js';
import { ExportRequestSchema } from '../../ticketing/index.js';

const DEVICE_ID = '019928f4-1b6c-7c3a-9f2e-6a1d0c4b8e77';
const EXPORT_ID = '019928fc-0000-7000-8000-000000000001';

const addPasskeyBody: AddPasskeyBody = { label: 'MacBook de Marie' };

const passkeyEnrolment: PasskeyEnrolment = {
  registrationOptions: { challenge: 'k7M2pQ', rp: { id: 'arthome.fr', name: 'Arthome' } },
  expiresAt: '2026-09-21T19:04:00Z',
};

const addPaymentMethodBody: AddPaymentMethodBody = {
  returnPath: '/compte/securite',
  setAsDefault: true,
};

const paymentMethodSetup: PaymentMethodSetup = {
  setupIntentRef: 'seti_1Ab2Cd',
  clientSecret: 'seti_1Ab2Cd_secret_7f3',
  returnUrl: 'https://arthome.fr/compte/securite?setup=seti_1Ab2Cd',
  expiresAt: '2026-09-21T19:25:20Z',
};

const consents: z.output<typeof ConsentsSchema> = {
  purposes: { audience: true, perso: true, partners: false, ads: false },
  textVersion: 3,
  recordedAt: '2026-09-21T19:05:30Z',
};

const accountScreen: z.output<typeof AccountScreenSchema> = {
  profile: {
    publicHandle: '@marie.j',
    displayName: 'Marie J.',
    email: 'marie@example.org',
    emailVerified: true,
    phoneVerified: false,
    memberNumber: 'A-004212',
  },
  subscription: {
    planTier: PlanTier.PASS,
    state: AccountStatus.ACTIVE,
    currentPeriodEnd: '2026-10-21T00:00:00Z',
    cancelAtPeriodEnd: false,
  },
  credits: [],
  devices: [],
  consents: { ...consents, recordedAt: '2026-05-02T09:12:00Z' },
  deletion: null,
};

const followArtistBody: FollowArtistBody = { alertEnabled: true };

const reminder: Reminder = { reminderSet: true, remindAt: '2026-09-21T18:30:00Z' };

const savedSearch: z.output<typeof SavedSearchSchema> = {
  id: '019928fa-0000-7000-8000-000000000001',
  scope: 'search',
  name: 'Danse à Paris',
  criteria: { categoryIds: ['dance-contemporary'], cityIds: ['paris'] },
  criteriaVersion: 2,
  criteriaSignature: '7f3a1c',
  stale: false,
  channels: [NotificationChannel.PUSH],
  active: true,
  newMatchesSinceLastVisit: 3,
};

const savedSearchList: SavedSearchList = {
  servedAt: '2026-09-21T19:00:00.000Z',
  items: [savedSearch],
};

const createSavedSearchBody: CreateSavedSearchBody = {
  scope: 'search',
  name: 'Danse à Paris',
  criteria: { categoryIds: ['dance-contemporary'], cityIds: ['paris'] },
  channels: [NotificationChannel.PUSH],
};

const updateSavedSearchBody: UpdateSavedSearchBody = { active: false };

const orderEntry: OrderEntry = {
  external: {
    externalRef: 'SHOP-9912',
    externalHost: 'boutique.compagnie-verticale.fr',
    state: 'external',
    syncedAt: '2026-09-20T22:14:00Z',
    syncSource: 'shopify',
  },
};

const notificationPage: NotificationPage = {
  servedAt: '2026-09-21T19:03:00.000Z',
  unreadCount: 2,
  items: [
    {
      id: '019928fb-0000-7000-8000-000000000001',
      triggerCode: 'date_starts_soon',
      params: { dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001' },
      createdAt: '2026-09-21T18:30:00Z',
      read: false,
    },
  ],
  page: { hasMore: false },
};

const markNotificationsReadBody: MarkNotificationsReadBody = { all: true };

const notificationBadgeAnswer: NotificationBadgeAnswer = {
  servedAt: '2026-09-21T19:03:20.000Z',
  data: { unreadCount: 0 },
};

const updateProfileBody: UpdateProfileBody = { displayName: 'Marie J.' };

const profileUpdateAnswer: ProfileUpdateAnswer = {
  servedAt: '2026-09-21T19:04:00.000Z',
  version: 8,
  data: { displayName: 'Marie J.', publicHandle: '@marie.j' },
};

const updatePreferencesBody: UpdatePreferencesBody = {
  device: { subtitleSizeStep: 2, reduceMotion: true },
  deviceId: DEVICE_ID,
};

const viewerPreferences: z.output<typeof ViewerPreferencesSchema> = {
  account: { interfaceLocale: Locale.FR, readingTimezone: 'Europe/Paris' },
  device: { subtitleSizeStep: 2, reduceMotion: true },
};

const updateNotificationPreferencesBody: UpdateNotificationPreferencesBody = {
  triggers: { date_starts_soon: [NotificationChannel.PUSH] },
  quietHours: { enabled: true, fromHour: 23, toHour: 9, bypassWhenTicketHeld: true },
};

const notificationPreferences: z.output<typeof NotificationPreferencesSchema> = {
  triggers: { date_starts_soon: [NotificationChannel.PUSH] },
  quietHours: { enabled: true, fromHour: 23, toHour: 9, bypassWhenTicketHeld: true },
};

const updateConsentsBody: UpdateConsentsBody = {
  purposes: { audience: true, perso: true, partners: false, ads: false },
  textVersion: 3,
};

const deviceRevocation: DeviceRevocation = { devices: [], playbackCutWithinSec: 120 };

const viewerContext: z.output<typeof ViewerContextSchema> = {
  deviceId: DEVICE_ID,
  signedIn: true,
  profiles: [],
  constants: {
    roomOpensMinutesBefore: 30,
    cancelDeadlineMinutesBefore: 60,
    scarcityThresholdBps: 8500,
    billboardPreviewDelaySec: 4,
    waitlistPriorityWindowHours: 2,
    chatRateLimitPerSecond: 2,
    reminderLeadMinutes: 30,
    replayExpiryWarningHours: 6,
  },
  labelCatalog: {
    domain: MessageDomain.STOREFRONT,
    locale: Locale.FR,
    version: 41,
    url: 'https://cdn.arthome.fr/i18n/storefront/fr/v41.json',
  },
  taxonomyArtifact: {
    domain: MessageDomain.TAXONOMY,
    locale: Locale.FR,
    version: 12,
    url: 'https://cdn.arthome.fr/taxonomy/fr/v12.json',
  },
};

const requestExportBody: RequestExportBody = {
  kind: 'invoices',
  fromDate: '2026-01-01',
  toDate: '2026-09-21',
};

const exportRequest: z.output<typeof ExportRequestSchema> = {
  exportId: EXPORT_ID,
  kind: 'invoices',
  state: 'ready',
  requestedAt: '2026-09-21T19:07:00Z',
  downloadUrl: 'https://files.arthome.fr/exports/019928fc?sig=abc',
  downloadExpiresAt: '2026-09-21T20:12:00Z',
};

const requestAccountDeletionBody: RequestAccountDeletionBody = { confirmHandle: '@marie.j' };

const accountDeletion: AccountDeletion = {
  state: 'requested',
  graceUntil: '2026-10-21T19:13:00Z',
  cancelledSeatsCount: 2,
};

const deletionCancellation: DeletionCancellation = { state: AccountStatus.ACTIVE };

const recordPlaybackPositionBody: RecordPlaybackPositionBody = {
  positionSec: 1840,
  deviceId: DEVICE_ID,
  completed: false,
};

const playbackPosition: PlaybackPosition = { positionSec: 1840, version: 212 };

export const meExamples: ModuleExamples = [
  [AddPasskeyBodySchema, [addPasskeyBody]],
  [PasskeyEnrolmentSchema, [passkeyEnrolment]],
  [AddPaymentMethodBodySchema, [addPaymentMethodBody]],
  [PaymentMethodSetupSchema, [paymentMethodSetup]],
  [AccountScreenSchema, [accountScreen]],
  [FollowArtistBodySchema, [followArtistBody]],
  [ReminderSchema, [reminder]],
  [SavedSearchSchema, [savedSearch]],
  [SavedSearchListSchema, [savedSearchList]],
  [CreateSavedSearchBodySchema, [createSavedSearchBody]],
  [UpdateSavedSearchBodySchema, [updateSavedSearchBody]],
  [OrderEntrySchema, [orderEntry]],
  [NotificationPageSchema, [notificationPage]],
  [MarkNotificationsReadBodySchema, [markNotificationsReadBody]],
  [NotificationBadgeAnswerSchema, [notificationBadgeAnswer]],
  [UpdateProfileBodySchema, [updateProfileBody]],
  [ProfileUpdateAnswerSchema, [profileUpdateAnswer]],
  [UpdatePreferencesBodySchema, [updatePreferencesBody]],
  [ViewerPreferencesSchema, [viewerPreferences]],
  [UpdateNotificationPreferencesBodySchema, [updateNotificationPreferencesBody]],
  [NotificationPreferencesSchema, [notificationPreferences]],
  [UpdateConsentsBodySchema, [updateConsentsBody]],
  [ConsentsSchema, [consents]],
  [DeviceRevocationSchema, [deviceRevocation]],
  [ViewerContextSchema, [viewerContext]],
  [RequestExportBodySchema, [requestExportBody]],
  [ExportRequestSchema, [exportRequest]],
  [RequestAccountDeletionBodySchema, [requestAccountDeletionBody]],
  [AccountDeletionSchema, [accountDeletion]],
  [DeletionCancellationSchema, [deletionCancellation]],
  [RecordPlaybackPositionBodySchema, [recordPlaybackPositionBody]],
  [PlaybackPositionSchema, [playbackPosition]],
];
