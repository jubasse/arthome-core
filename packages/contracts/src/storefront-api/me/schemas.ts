import { z } from 'zod';

import { NOTIFICATION_CHANNELS } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { InstantOut, uuidIn, uuidOut, vocabularyIn } from '@arthome/core/schema';

import { ArtistSummarySchema, DateCardSchema, SavedSearchSchema } from '../../catalog/index.js';
import { NotificationEntrySchema } from '../../engagement/index.js';
import { StorefrontEnvelopeMetaSchema } from '../../envelope/index.js';
import type { PathParameter, QueryParameter } from '../../http/index.js';
import { localVocabulary, sensitive } from '../../http/index.js';
import { DeviceSchema } from '../../identity/index.js';
import { StorefrontCursorPageInfoSchema } from '../../pagination/index.js';
import {
  ExportRequestSchema,
  ExternalOrderRefSchema,
  OrderSchema,
  TicketCardSchema,
} from '../../ticketing/index.js';

const SORT_OR_FILTER_KEY =
  "A sort or filter key. It is a property of THIS endpoint's list — which orders it offers — not of the domain, and adding one is an endpoint change rather than a vocabulary change.";
const TICKET_WINDOWS = ['upcoming', 'past'] as const;
const FOLLOWED_ARTISTS_SORTS = ['alpha', 'followers', 'next_date'] as const;
const SAVED_SEARCH_SCOPES = ['search', 'category'] as const;
const EXPORT_KINDS = ['personal_data', 'invoices'] as const;

export const PasskeyIdParameter: PathParameter<'passkeyId', z.ZodString> = {
  name: 'passkeyId',
  in: 'path',
  required: true,
  schema: z.string(),
};

export const PaymentMethodIdParameter: PathParameter<'paymentMethodId', z.ZodString> = {
  name: 'paymentMethodId',
  in: 'path',
  required: true,
  schema: z.string(),
};

export const SavedSearchIdParameter: PathParameter<'savedSearchId', z.ZodString> = {
  name: 'savedSearchId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const DeviceIdParameter: PathParameter<'deviceId', z.ZodString> = {
  name: 'deviceId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const DeviceSessionIdParameter: PathParameter<'sessionId', z.ZodString> = {
  name: 'sessionId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const ExportIdParameter: PathParameter<'exportId', z.ZodString> = {
  name: 'exportId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const TicketWindowParameter: QueryParameter<
  'window',
  z.ZodDefault<VocabularyIn<typeof TICKET_WINDOWS>>
> = {
  name: 'window',
  in: 'query',
  schema: localVocabulary(TICKET_WINDOWS, SORT_OR_FILTER_KEY).default('upcoming'),
};

export const FollowedArtistsSortParameter: QueryParameter<
  'sort',
  z.ZodDefault<VocabularyIn<typeof FOLLOWED_ARTISTS_SORTS>>
> = {
  name: 'sort',
  in: 'query',
  schema: localVocabulary(FOLLOWED_ARTISTS_SORTS, SORT_OR_FILTER_KEY).default('next_date'),
};

export const LiveOnlyParameter: QueryParameter<'liveOnly', z.ZodDefault<z.ZodBoolean>> = {
  name: 'liveOnly',
  in: 'query',
  description: '**The "Following live" section**, served rather than filtered client-side.',
  schema: z.boolean().default(false),
};

export const AddPasskeyBodySchema: z.ZodObject<
  { label: z.ZodOptional<z.ZodString> },
  z.core.$strip
> = z.object({
  label: z.string().max(80).optional(),
});

export const PasskeyEnrolmentSchema: z.ZodObject<
  {
    registrationOptions: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>;
    expiresAt: z.ZodOptional<z.ZodString>;
  },
  z.core.$loose
> = z.looseObject({
  registrationOptions: sensitive(z.looseObject({})).optional(),
  expiresAt: InstantOut.optional(),
});

export const AddPaymentMethodBodySchema: z.ZodObject<
  { returnPath: z.ZodString; setAsDefault: z.ZodOptional<z.ZodDefault<z.ZodBoolean>> },
  z.core.$strip
> = z.object({
  returnPath: z.string().meta({
    description: '**Relative** path inside the surface. An absolute address is refused.',
  }),
  setAsDefault: z.boolean().default(false).optional(),
});

export const PaymentMethodSetupSchema: z.ZodObject<
  {
    setupIntentRef: z.ZodString;
    clientSecret: z.ZodString;
    returnUrl: z.ZodString;
    expiresAt: z.ZodOptional<z.ZodString>;
  },
  z.core.$loose
> = z.looseObject({
  setupIntentRef: z.string(),
  clientSecret: sensitive(z.string()),
  returnUrl: z.string().meta({
    format: 'uri',
  }),
  expiresAt: InstantOut.optional(),
});

export const TicketCardPageSchema: z.ZodIntersection<
  typeof StorefrontEnvelopeMetaSchema,
  z.ZodObject<
    { items: z.ZodArray<typeof TicketCardSchema>; page: typeof StorefrontCursorPageInfoSchema },
    z.core.$loose
  >
> = z.intersection(
  StorefrontEnvelopeMetaSchema,
  z.looseObject({
    items: z.array(TicketCardSchema),
    page: StorefrontCursorPageInfoSchema,
  }),
);

export const DateCardPageSchema: z.ZodIntersection<
  typeof StorefrontEnvelopeMetaSchema,
  z.ZodObject<
    { items: z.ZodArray<typeof DateCardSchema>; page: typeof StorefrontCursorPageInfoSchema },
    z.core.$loose
  >
> = z.intersection(
  StorefrontEnvelopeMetaSchema,
  z.looseObject({
    items: z.array(DateCardSchema),
    page: StorefrontCursorPageInfoSchema,
  }),
);

export const ArtistSummaryPageSchema: z.ZodIntersection<
  typeof StorefrontEnvelopeMetaSchema,
  z.ZodObject<
    { items: z.ZodArray<typeof ArtistSummarySchema>; page: typeof StorefrontCursorPageInfoSchema },
    z.core.$loose
  >
> = z.intersection(
  StorefrontEnvelopeMetaSchema,
  z.looseObject({
    items: z.array(ArtistSummarySchema),
    page: StorefrontCursorPageInfoSchema,
  }),
);

export const FollowArtistBodySchema: z.ZodObject<
  { alertEnabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>> },
  z.core.$strip
> = z.object({
  alertEnabled: z.boolean().default(false).optional(),
});

export const ReminderSchema: z.ZodOptional<
  z.ZodObject<
    { reminderSet: z.ZodOptional<z.ZodBoolean>; remindAt: z.ZodOptional<z.ZodString> },
    z.core.$loose
  >
> = z
  .looseObject({
    reminderSet: z.boolean().optional(),
    remindAt: InstantOut.optional(),
  })
  .optional();

export const SavedSearchListSchema: z.ZodIntersection<
  typeof StorefrontEnvelopeMetaSchema,
  z.ZodObject<{ items: z.ZodArray<typeof SavedSearchSchema> }, z.core.$loose>
> = z.intersection(
  StorefrontEnvelopeMetaSchema,
  z.looseObject({
    items: z.array(SavedSearchSchema),
  }),
);

export const CreateSavedSearchBodySchema: z.ZodObject<
  {
    scope: VocabularyIn<typeof SAVED_SEARCH_SCOPES>;
    categoryId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    queryText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    criteria: z.ZodObject<Record<never, never>, z.core.$loose>;
    channels: z.ZodOptional<z.ZodArray<VocabularyIn<typeof NOTIFICATION_CHANNELS>>>;
  },
  z.core.$strip
> = z.object({
  scope: localVocabulary(
    SAVED_SEARCH_SCOPES,
    'A vocabulary local to this contract. The domain neither produces nor consumes these values — they describe what this endpoint offers, and a new member is an endpoint change.',
  ),
  categoryId: z.string().nullable().optional(),
  name: z.string().max(80).nullable().optional(),
  queryText: z.string().nullable().optional(),
  criteria: z.looseObject({}),
  channels: z
    .array(
      vocabularyIn(NOTIFICATION_CHANNELS).meta({
        'x-arthome-vocabulary-source': 'NOTIFICATION_CHANNELS',
      }),
    )
    .optional(),
});

export const UpdateSavedSearchBodySchema: z.ZodObject<
  {
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    active: z.ZodOptional<z.ZodBoolean>;
    channels: z.ZodOptional<z.ZodArray<VocabularyIn<typeof NOTIFICATION_CHANNELS>>>;
  },
  z.core.$strip
> = z
  .object({
    name: z.string().nullable().optional(),
    active: z.boolean().optional(),
    channels: z
      .array(
        vocabularyIn(NOTIFICATION_CHANNELS).meta({
          'x-arthome-vocabulary-source': 'NOTIFICATION_CHANNELS',
        }),
      )
      .optional(),
  })
  .meta({
    description: '**Field-by-field** write, never a whole document.',
  });

export const OrderEntrySchema: z.ZodObject<
  {
    order: z.ZodOptional<typeof OrderSchema>;
    external: z.ZodOptional<typeof ExternalOrderRefSchema>;
  },
  z.core.$loose
> = z.looseObject({
  order: OrderSchema.optional(),
  external: ExternalOrderRefSchema.optional(),
});

export const OrderEntryPageSchema: z.ZodIntersection<
  typeof StorefrontEnvelopeMetaSchema,
  z.ZodObject<
    { items: z.ZodArray<typeof OrderEntrySchema>; page: typeof StorefrontCursorPageInfoSchema },
    z.core.$loose
  >
> = z.intersection(
  StorefrontEnvelopeMetaSchema,
  z.looseObject({
    items: z.array(OrderEntrySchema),
    page: StorefrontCursorPageInfoSchema,
  }),
);

export const NotificationPageSchema: z.ZodIntersection<
  typeof StorefrontEnvelopeMetaSchema,
  z.ZodObject<
    {
      items: z.ZodArray<typeof NotificationEntrySchema>;
      unreadCount: z.ZodInt;
      page: typeof StorefrontCursorPageInfoSchema;
    },
    z.core.$loose
  >
> = z.intersection(
  StorefrontEnvelopeMetaSchema,
  z.looseObject({
    items: z.array(NotificationEntrySchema),
    unreadCount: z.int().meta({ minimum: undefined, maximum: undefined }),
    page: StorefrontCursorPageInfoSchema,
  }),
);

export const MarkNotificationsReadBodySchema: z.ZodObject<
  {
    notificationIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    all: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
  },
  z.core.$strip
> = z.object({
  notificationIds: z.array(uuidOut()).optional(),
  all: z.boolean().default(false).optional(),
});

export const NotificationBadgeAnswerSchema: z.ZodIntersection<
  typeof StorefrontEnvelopeMetaSchema,
  z.ZodObject<
    { data: z.ZodOptional<z.ZodObject<{ unreadCount: z.ZodOptional<z.ZodInt> }, z.core.$loose>> },
    z.core.$loose
  >
> = z.intersection(
  StorefrontEnvelopeMetaSchema,
  z.looseObject({
    data: z
      .looseObject({
        unreadCount: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
      })
      .optional(),
  }),
);

export const UpdateProfileBodySchema: z.ZodObject<
  {
    displayName: z.ZodOptional<z.ZodString>;
    publicHandle: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$strip
> = z.object({
  displayName: z.string().max(80).optional(),
  publicHandle: z.string().regex(new RegExp('^@[a-z0-9._-]{3,30}$')).optional(),
  city: z.string().nullable().optional(),
});

export const ProfileUpdateAnswerSchema: z.ZodIntersection<
  typeof StorefrontEnvelopeMetaSchema,
  z.ZodObject<
    {
      version: z.ZodOptional<z.ZodInt>;
      data: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>;
    },
    z.core.$loose
  >
> = z.intersection(
  StorefrontEnvelopeMetaSchema,
  z.looseObject({
    version: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
    data: z.looseObject({}).optional(),
  }),
);

export const UpdatePreferencesBodySchema: z.ZodObject<
  {
    account: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>;
    device: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>;
    deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$strip
> = z.object({
  account: z.looseObject({}).optional(),
  device: z.looseObject({}).optional(),
  deviceId: uuidOut().nullable().optional(),
});

export const UpdateNotificationPreferencesBodySchema: z.ZodObject<
  {
    triggers: z.ZodOptional<
      z.ZodObject<
        Record<never, never>,
        z.core.$catchall<z.ZodArray<VocabularyIn<typeof NOTIFICATION_CHANNELS>>>
      >
    >;
    quietHours: z.ZodOptional<
      z.ZodObject<
        {
          enabled: z.ZodOptional<z.ZodBoolean>;
          fromHour: z.ZodOptional<z.ZodInt>;
          toHour: z.ZodOptional<z.ZodInt>;
          bypassWhenTicketHeld: z.ZodOptional<z.ZodBoolean>;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
> = z.object({
  triggers: z
    .object({})
    .catchall(
      z.array(
        vocabularyIn(NOTIFICATION_CHANNELS).meta({
          'x-arthome-vocabulary-source': 'NOTIFICATION_CHANNELS',
        }),
      ),
    )
    .optional(),
  quietHours: z
    .object({
      enabled: z.boolean().optional(),
      fromHour: z.int().min(0).max(23).optional(),
      toHour: z.int().min(0).max(23).optional(),
      bypassWhenTicketHeld: z.boolean().optional(),
    })
    .optional(),
});

export const UpdateConsentsBodySchema: z.ZodObject<
  {
    purposes: z.ZodObject<
      { audience: z.ZodBoolean; perso: z.ZodBoolean; partners: z.ZodBoolean; ads: z.ZodBoolean },
      z.core.$strip
    >;
    cookieCategories: z.ZodOptional<
      z.ZodObject<Record<never, never>, z.core.$catchall<z.ZodBoolean>>
    >;
    textVersion: z.ZodInt;
  },
  z.core.$strip
> = z.object({
  purposes: z.object({
    audience: z.boolean(),
    perso: z.boolean(),
    partners: z.boolean(),
    ads: z.boolean(),
  }),
  cookieCategories: z.object({}).catchall(z.boolean()).optional(),
  textVersion: z.int().meta({ minimum: undefined, maximum: undefined }),
});

export const DeviceRevocationSchema: z.ZodOptional<
  z.ZodObject<
    {
      devices: z.ZodOptional<z.ZodArray<typeof DeviceSchema>>;
      playbackCutWithinSec: z.ZodOptional<z.ZodInt>;
    },
    z.core.$loose
  >
> = z
  .looseObject({
    devices: z.array(DeviceSchema).optional(),
    playbackCutWithinSec: z
      .int()
      .meta({ minimum: undefined, maximum: undefined })
      .meta({
        description:
          "**120, not 60.** Revocation does not revoke the token in hand: it **refuses the next\nrenewal**. The CDN's prefix signature expires with the token, so the edge keeps serving valid\nsegments for the whole lifetime of the token held — that is, up to **120 s**, in the case\nwhere it has just been renewed at the instant of revocation. In steady state: 45 to 75 s.\n\nThe 60 served until now was the **renewal interval** presented as a guarantee of stopping.\nThat was rule 15 violated on a security constant, and the plausible number had been kept\nbecause it satisfied the question that was asked.\n",
        examples: [120],
      })
      .optional(),
  })
  .optional();

export const RequestExportBodySchema: z.ZodObject<
  {
    kind: VocabularyIn<typeof EXPORT_KINDS>;
    fromDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    toDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$strip
> = z.object({
  kind: localVocabulary(
    EXPORT_KINDS,
    "A document or export format. It names an accounting tool or a file type, which is the outside world's vocabulary rather than ours.",
  ),
  fromDate: z
    .string()
    .nullable()
    .meta({
      format: 'date',
    })
    .optional(),
  toDate: z
    .string()
    .nullable()
    .meta({
      format: 'date',
    })
    .optional(),
});

export const ExportRequestAcceptedSchema: z.ZodIntersection<
  typeof StorefrontEnvelopeMetaSchema,
  z.ZodObject<{ data: typeof ExportRequestSchema }, z.core.$loose>
> = z.intersection(
  StorefrontEnvelopeMetaSchema,
  z.looseObject({
    data: ExportRequestSchema,
  }),
);

export const RequestAccountDeletionBodySchema: z.ZodObject<
  { confirmHandle: z.ZodString },
  z.core.$strip
> = z.object({
  confirmHandle: z.string(),
});

export const AccountDeletionSchema: z.ZodOptional<
  z.ZodObject<
    {
      state: z.ZodOptional<z.ZodString>;
      graceUntil: z.ZodOptional<z.ZodString>;
      cancelledSeatsCount: z.ZodOptional<z.ZodInt>;
    },
    z.core.$loose
  >
> = z
  .looseObject({
    state: z.string().optional(),
    graceUntil: InstantOut.optional(),
    cancelledSeatsCount: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
  })
  .optional();

export const DeletionCancellationSchema: z.ZodOptional<
  z.ZodObject<{ state: z.ZodOptional<z.ZodString> }, z.core.$loose>
> = z
  .looseObject({
    state: z.string().optional(),
  })
  .optional();

export const RecordPlaybackPositionBodySchema: z.ZodObject<
  {
    positionSec: z.ZodInt;
    deviceId: z.ZodString;
    completed: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
  },
  z.core.$strip
> = z.object({
  positionSec: z.int().min(0).meta({ maximum: undefined }),
  deviceId: uuidOut(),
  completed: z.boolean().default(false).optional(),
});

export const PlaybackPositionSchema: z.ZodOptional<
  z.ZodObject<
    { positionSec: z.ZodOptional<z.ZodInt>; version: z.ZodOptional<z.ZodInt> },
    z.core.$loose
  >
> = z
  .looseObject({
    positionSec: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
    version: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
  })
  .optional();

export type AddPasskeyBody = z.output<typeof AddPasskeyBodySchema>;
export type PasskeyEnrolment = z.output<typeof PasskeyEnrolmentSchema>;
export type AddPaymentMethodBody = z.output<typeof AddPaymentMethodBodySchema>;
export type PaymentMethodSetup = z.output<typeof PaymentMethodSetupSchema>;
export type TicketCardPage = z.output<typeof TicketCardPageSchema>;
export type DateCardPage = z.output<typeof DateCardPageSchema>;
export type ArtistSummaryPage = z.output<typeof ArtistSummaryPageSchema>;
export type FollowArtistBody = z.output<typeof FollowArtistBodySchema>;
export type Reminder = z.output<typeof ReminderSchema>;
export type SavedSearchList = z.output<typeof SavedSearchListSchema>;
export type CreateSavedSearchBody = z.output<typeof CreateSavedSearchBodySchema>;
export type UpdateSavedSearchBody = z.output<typeof UpdateSavedSearchBodySchema>;
export type OrderEntry = z.output<typeof OrderEntrySchema>;
export type OrderEntryPage = z.output<typeof OrderEntryPageSchema>;
export type NotificationPage = z.output<typeof NotificationPageSchema>;
export type MarkNotificationsReadBody = z.output<typeof MarkNotificationsReadBodySchema>;
export type NotificationBadgeAnswer = z.output<typeof NotificationBadgeAnswerSchema>;
export type UpdateProfileBody = z.output<typeof UpdateProfileBodySchema>;
export type ProfileUpdateAnswer = z.output<typeof ProfileUpdateAnswerSchema>;
export type UpdatePreferencesBody = z.output<typeof UpdatePreferencesBodySchema>;
export type UpdateNotificationPreferencesBody = z.output<
  typeof UpdateNotificationPreferencesBodySchema
>;
export type UpdateConsentsBody = z.output<typeof UpdateConsentsBodySchema>;
export type DeviceRevocation = z.output<typeof DeviceRevocationSchema>;
export type RequestExportBody = z.output<typeof RequestExportBodySchema>;
export type ExportRequestAccepted = z.output<typeof ExportRequestAcceptedSchema>;
export type RequestAccountDeletionBody = z.output<typeof RequestAccountDeletionBodySchema>;
export type AccountDeletion = z.output<typeof AccountDeletionSchema>;
export type DeletionCancellation = z.output<typeof DeletionCancellationSchema>;
export type RecordPlaybackPositionBody = z.output<typeof RecordPlaybackPositionBodySchema>;
export type PlaybackPosition = z.output<typeof PlaybackPositionSchema>;
