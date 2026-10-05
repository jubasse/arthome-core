import { z } from 'zod';

import {
  AUDIENCE_SANCTIONS,
  CHAT_MODES,
  FILTER_SEVERITIES,
  MEMBER_ROLES,
  MODERATION_REASONS,
  OrderState,
  PAYOUT_STATES,
} from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import {
  InstantOut,
  MoneyOut,
  uuidIn,
  uuidOut,
  vocabularyIn,
  vocabularyOut,
  vocabularyOutLocal,
} from '@arthome/core/schema';

import { StudioEnvelopeMetaSchema } from '../../envelope/index.js';
import type { PathParameter, Period, QueryParameter } from '../../http/index.js';
import { ReauthProof, localVocabulary, period, restricted, searchText } from '../../http/index.js';
import { OffsetPageInfoSchema } from '../../pagination/index.js';
import { ChannelMemberSchema } from '../../studio-access/index.js';
import {
  BankChangeRequestSchema,
  PayoutLineSchema,
  StatsAudienceSchema,
  StatsSeriesSchema,
} from '../../studio-money/index.js';
import { EventsRowSchema, MerchItemAdminSchema } from '../../studio-stage/index.js';

const CHANNEL_REPLAY_STATES = ['online', 'expired', 'archived'] as const;
const CHANNEL_REPLAY_STATE_REASON =
  "A state machine local to this resource. It is the contract's own, not the domain's: the domain owns the facts, this owns how far a request has got.";

export const ChannelReplayStateParameter: QueryParameter<
  'state',
  VocabularyIn<typeof CHANNEL_REPLAY_STATES>
> = {
  name: 'state',
  in: 'query',
  required: false,
  schema: localVocabulary(CHANNEL_REPLAY_STATES, CHANNEL_REPLAY_STATE_REASON),
};

export const ChannelReplaySchema: z.ZodObject<
  {
    dateId: z.ZodString;
    title: z.ZodString;
    state: z.ZodString;
    expiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    durationSec: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    views: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    revenue: z.ZodOptional<typeof MoneyOut>;
  },
  z.core.$loose
> = z.looseObject({
  dateId: uuidOut(),
  title: z.string(),
  state: vocabularyOutLocal(CHANNEL_REPLAY_STATES, CHANNEL_REPLAY_STATE_REASON),
  expiresAt: InstantOut.nullable().optional(),
  durationSec: z.int().meta({ minimum: undefined, maximum: undefined }).nullable().optional(),
  views: z.int().meta({ minimum: undefined, maximum: undefined }).nullable().optional(),
  revenue: restricted(MoneyOut, 'canRevenue', {
    'x-arthome-tax-basis': 'inclusive',
    description: '**Absent** without `canRevenue`.',
  }),
});

const MERCH_INTEGRATION_SOURCES = [
  'shopify',
  'woocommerce',
  'prestashop',
  'drupal',
  'api',
] as const;

export const ChannelIdentitySchema: z.ZodObject<
  {
    publicName: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.ZodString>;
    verified: z.ZodOptional<z.ZodBoolean>;
    version: z.ZodOptional<z.ZodInt>;
  },
  z.core.$loose
> = z.looseObject({
  publicName: z.string().optional(),
  slug: z.string().optional(),
  categoryId: z.string().optional(),
  verified: z.boolean().optional(),
  version: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
});

export const ModerationDefaultsSchema: z.ZodObject<
  {
    filterSeverity: z.ZodOptional<z.ZodString>;
    slowModeSec: z.ZodOptional<z.ZodInt>;
    holdersOnly: z.ZodOptional<z.ZodBoolean>;
    retroactiveFilter: z.ZodOptional<z.ZodBoolean>;
    chatMode: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodInt>;
  },
  z.core.$loose
> = z
  .looseObject({
    filterSeverity: vocabularyOut(FILTER_SEVERITIES).optional(),
    slowModeSec: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
    holdersOnly: z.boolean().optional(),
    retroactiveFilter: z.boolean().optional(),
    chatMode: vocabularyOut(CHAT_MODES).optional(),
    version: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
  })
  .meta({
    description:
      '**Inherited by a new date at creation**, never applied retroactively\nto an existing date — otherwise a channel setting would change the\nregime of a live show in progress.\n',
  });

export const ChannelSettingsSchema: z.ZodObject<
  {
    identity: z.ZodOptional<typeof ChannelIdentitySchema>;
    moderationDefaults: z.ZodOptional<typeof ModerationDefaultsSchema>;
    merchIntegration: z.ZodOptional<
      z.ZodNullable<
        z.ZodObject<
          {
            source: z.ZodOptional<z.ZodString>;
            merchantUrl: z.ZodOptional<z.ZodString>;
            connectedAt: z.ZodOptional<z.ZodString>;
            lastSyncedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          },
          z.core.$loose
        >
      >
    >;
  },
  z.core.$loose
> = z.looseObject({
  identity: ChannelIdentitySchema.optional(),
  moderationDefaults: ModerationDefaultsSchema.optional(),
  merchIntegration: z
    .looseObject({
      source: vocabularyOutLocal(
        MERCH_INTEGRATION_SOURCES,
        'An external provider or platform identifier. It is their vocabulary, not ours, and it changes when they change.',
      ).optional(),
      merchantUrl: z.string().meta({ format: 'uri' }).optional(),
      connectedAt: InstantOut.optional(),
      lastSyncedAt: InstantOut.nullable().optional(),
    })
    .nullable()
    .meta({
      description: '**One at a time.** `null` when the shop is served by Arthome.',
    })
    .optional(),
});

const INGEST_PROTOCOLS = ['rtmps', 'srt', 'whip'] as const;
const INGEST_PROTOCOL_REASON =
  'A transport or media capability, not a domain notion: the domain never chooses an ingest protocol, a container or a DRM system, and a new one appears because a device appeared.';

export const UpdateChannelSettingsBodySchema: z.ZodObject<
  {
    moderationDefaults: z.ZodOptional<
      z.ZodObject<
        {
          filterSeverity: z.ZodOptional<VocabularyIn<typeof FILTER_SEVERITIES>>;
          slowModeSec: z.ZodOptional<z.ZodInt>;
          holdersOnly: z.ZodOptional<z.ZodBoolean>;
          retroactiveFilter: z.ZodOptional<z.ZodBoolean>;
          chatMode: z.ZodOptional<VocabularyIn<typeof CHAT_MODES>>;
        },
        z.core.$strip
      >
    >;
    broadcastDefaults: z.ZodOptional<
      z.ZodObject<
        {
          ingestProtocol: z.ZodOptional<VocabularyIn<typeof INGEST_PROTOCOLS>>;
          holdScreenAutoAfterSec: z.ZodOptional<z.ZodInt>;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
> = z.object({
  moderationDefaults: z
    .object({
      filterSeverity: vocabularyIn(FILTER_SEVERITIES)
        .meta({ 'x-arthome-vocabulary-source': 'FILTER_SEVERITIES' })
        .optional(),
      slowModeSec: z.int().min(0).max(300).optional(),
      holdersOnly: z.boolean().optional(),
      retroactiveFilter: z.boolean().optional(),
      chatMode: vocabularyIn(CHAT_MODES)
        .meta({ 'x-arthome-vocabulary-source': 'CHAT_MODES' })
        .optional(),
    })
    .optional(),
  broadcastDefaults: z
    .object({
      ingestProtocol: localVocabulary(INGEST_PROTOCOLS, INGEST_PROTOCOL_REASON).optional(),
      holdScreenAutoAfterSec: z.int().min(5).max(120).optional(),
    })
    .optional(),
});

export const ChannelDefaultsSchema: z.ZodObject<
  {
    moderationDefaults: z.ZodOptional<typeof ModerationDefaultsSchema>;
    broadcastDefaults: z.ZodOptional<
      z.ZodObject<
        {
          ingestProtocol: z.ZodOptional<z.ZodString>;
          holdScreenAutoAfterSec: z.ZodOptional<z.ZodInt>;
        },
        z.core.$loose
      >
    >;
    version: z.ZodInt;
  },
  z.core.$loose
> = z.looseObject({
  moderationDefaults: ModerationDefaultsSchema.optional(),
  broadcastDefaults: z
    .looseObject({
      ingestProtocol: vocabularyOutLocal(INGEST_PROTOCOLS, INGEST_PROTOCOL_REASON).optional(),
      holdScreenAutoAfterSec: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
    })
    .optional(),
  version: z.int().meta({ minimum: undefined, maximum: undefined }),
});

const JOURNAL_NATURES = ['air', 'mod', 'event', 'access', 'money'] as const;

export const JournalPeriod: Period = period({ type: 'dateTime' });

export const JournalNatureParameter: QueryParameter<
  'nature',
  VocabularyIn<typeof JOURNAL_NATURES>
> = {
  name: 'nature',
  in: 'query',
  required: false,
  schema: localVocabulary(
    JOURNAL_NATURES,
    'A vocabulary local to this contract: four of the five are endpoint concerns and a vocabulary of query filters does not belong in the domain. The exception is `money`, which @arthome/core does not produce but DOES reason about — data-model.md:624 and context-map.md:402 key the redaction rule to it, so the `money` kind is absent from the response without canRevenue. Renaming that one member silently falsifies two domain documents; the other four are ours alone.',
  ),
};

export const JournalDateParameter: QueryParameter<'dateId', z.ZodString> = {
  name: 'dateId',
  in: 'query',
  required: false,
  schema: uuidIn(),
};

export const MerchItemIdParameter: PathParameter<'itemId', z.ZodString> = {
  name: 'itemId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const UpsertMerchItemBodySchema: z.ZodObject<
  {
    showId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    labels: z.ZodArray<
      z.ZodObject<{ contentLanguage: z.ZodString; text: z.ZodString }, z.core.$strip>
    >;
    variants: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          label: z.ZodString;
          stock: z.ZodInt;
          priceMinor: z.ZodInt;
          currencyCode: z.ZodString;
        },
        z.core.$strip
      >
    >;
    expectedVersion: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
  },
  z.core.$strip
> = z.object({
  showId: uuidOut().nullable().optional(),
  labels: z
    .array(
      z.object({
        contentLanguage: z.string(),
        text: z.string(),
      }),
    )
    .min(1),
  variants: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        stock: z.int().min(0).meta({ maximum: undefined }),
        priceMinor: z.int().min(0).meta({ maximum: undefined }),
        currencyCode: z.string().regex(new RegExp('^[A-Z]{3}$')),
      }),
    )
    .min(1),
  expectedVersion: z.int().meta({ minimum: undefined, maximum: undefined }).nullable().optional(),
});

export const UpdateChannelIdentityBodySchema: z.ZodObject<
  {
    publicName: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    biography: z.ZodOptional<
      z.ZodArray<z.ZodObject<{ contentLanguage: z.ZodString; text: z.ZodString }, z.core.$strip>>
    >;
    categoryId: z.ZodOptional<z.ZodString>;
    avatarAssetId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$strip
> = z.object({
  publicName: z.string().max(120).optional(),
  slug: z.string().regex(new RegExp('^[a-z0-9-]{3,80}$')).optional(),
  biography: z
    .array(
      z.object({
        contentLanguage: z.string(),
        text: z.string().max(4000),
      }),
    )
    .optional(),
  categoryId: z.string().optional(),
  avatarAssetId: uuidOut().nullable().optional(),
});

export const MerchItemListSchema: z.ZodIntersection<
  typeof StudioEnvelopeMetaSchema,
  z.ZodObject<{ items: z.ZodArray<typeof ChannelMemberSchema> }, z.core.$loose>
> = z.intersection(
  StudioEnvelopeMetaSchema,
  z.looseObject({
    items: z.array(MerchItemAdminSchema),
  }),
);

export type ChannelReplay = z.output<typeof ChannelReplaySchema>;
export type ChannelIdentity = z.output<typeof ChannelIdentitySchema>;
export type ChannelSettings = z.output<typeof ChannelSettingsSchema>;
export type UpdateChannelSettingsBody = z.output<typeof UpdateChannelSettingsBodySchema>;
export type ChannelDefaults = z.output<typeof ChannelDefaultsSchema>;
export type UpsertMerchItemBody = z.output<typeof UpsertMerchItemBodySchema>;
export type UpdateChannelIdentityBody = z.output<typeof UpdateChannelIdentityBodySchema>;
export type MerchItemList = z.output<typeof MerchItemListSchema>;

export type ModerationDefaults = z.output<typeof ModerationDefaultsSchema>;

export const MemberRoleParameter: QueryParameter<'role', VocabularyIn<typeof MEMBER_ROLES>> = {
  name: 'role',
  in: 'query',
  required: false,
  schema: vocabularyIn(MEMBER_ROLES).meta({ 'x-arthome-vocabulary-source': 'MEMBER_ROLES' }),
};

export const MemberSearch: QueryParameter<'q', z.ZodString> = searchText();

export const PersonIdParameter: PathParameter<'personId', z.ZodString> = {
  name: 'personId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const ChannelMemberPageSchema: z.ZodIntersection<
  typeof StudioEnvelopeMetaSchema,
  z.ZodObject<
    {
      items: z.ZodArray<typeof ChannelMemberSchema>;
      roleCounts: z.ZodObject<Record<never, never>, z.core.$catchall<z.ZodInt>>;
      page: typeof OffsetPageInfoSchema;
    },
    z.core.$loose
  >
> = z.intersection(
  StudioEnvelopeMetaSchema,
  z.looseObject({
    items: z.array(ChannelMemberSchema),
    roleCounts: z.object({}).catchall(z.int().meta({ minimum: undefined, maximum: undefined })),
    page: OffsetPageInfoSchema,
  }),
);

export const InviteMemberBodySchema: z.ZodObject<
  {
    email: z.ZodString;
    roles: z.ZodArray<VocabularyIn<typeof MEMBER_ROLES>>;
    note: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$strip
> = z.object({
  email: z.string().meta({ format: 'email' }),
  roles: z
    .array(vocabularyIn(MEMBER_ROLES).meta({ 'x-arthome-vocabulary-source': 'MEMBER_ROLES' }))
    .min(1),
  note: z.string().max(200).nullable().optional(),
});

export const ChangeMemberRolesBodySchema: z.ZodObject<
  { roles: z.ZodArray<VocabularyIn<typeof MEMBER_ROLES>>; expectedVersion: z.ZodInt },
  z.core.$strip
> = z.object({
  roles: z
    .array(vocabularyIn(MEMBER_ROLES).meta({ 'x-arthome-vocabulary-source': 'MEMBER_ROLES' }))
    .min(1),
  expectedVersion: z.int().meta({ minimum: undefined, maximum: undefined }),
});

export const TransferChannelOwnershipBodySchema: z.ZodObject<
  { reauthToken: z.ZodString; toPersonId: z.ZodString },
  z.core.$strip
> = ReauthProof.extend({
  toPersonId: uuidOut(),
});

export const OwnershipTransferSchema: z.ZodOptional<
  z.ZodObject<
    { state: z.ZodOptional<z.ZodString>; expiresAt: z.ZodOptional<z.ZodString> },
    z.core.$loose
  >
> = z
  .looseObject({
    state: z.string().optional(),
    expiresAt: InstantOut.optional(),
  })
  .optional();

export type ChannelMemberPage = z.output<typeof ChannelMemberPageSchema>;
export type InviteMemberBody = z.output<typeof InviteMemberBodySchema>;
export type ChangeMemberRolesBody = z.output<typeof ChangeMemberRolesBodySchema>;
export type TransferChannelOwnershipBody = z.output<typeof TransferChannelOwnershipBodySchema>;
export type OwnershipTransfer = z.output<typeof OwnershipTransferSchema>;

const EVENTS_WINDOWS = ['upcoming', 'past'] as const;

export const EventsWindowParameter: QueryParameter<
  'window',
  z.ZodDefault<VocabularyIn<typeof EVENTS_WINDOWS>>
> = {
  name: 'window',
  in: 'query',
  required: false,
  schema: localVocabulary(
    EVENTS_WINDOWS,
    "A sort or filter key. It is a property of THIS endpoint's list — which orders it offers — not of the domain, and adding one is an endpoint change rather than a vocabulary change.",
  ).default('upcoming'),
};

export const EventStatesParameter: QueryParameter<'states', z.ZodString> = {
  name: 'states',
  in: 'query',
  required: false,
  description: '**Multi-state** filter, comma-separated.',
  schema: z.string().meta({ examples: ['scheduled,technical'] }),
};

export const EventSearch: QueryParameter<'q', z.ZodString> = searchText({
  description: 'Free-text search over the title and the metadata, **server-side**.',
});

const STATS_PERIOD_PRESETS = [
  'last_7_days',
  'last_30_days',
  'last_90_days',
  'season',
  'custom',
] as const;

export const StatsPeriodPresetParameter: QueryParameter<
  'period',
  z.ZodDefault<VocabularyIn<typeof STATS_PERIOD_PRESETS>>
> = {
  name: 'period',
  in: 'query',
  required: false,
  schema: localVocabulary(
    STATS_PERIOD_PRESETS,
    'A period selector for this screen. The bounds it resolves to are served (`seasonBounds`, `periodStart`/`periodEnd`); this only names which preset the person chose.',
  ).default('last_30_days'),
};

export const DashboardPeriod: Period<false> = period({
  type: 'date',
  required: false,
  descriptions: { from: 'Required when `period` is `custom`.' },
});

export const StatsPeriod: Period<false> = period({ type: 'date', required: false });

export const AgendaPeriod: Period = period({ type: 'date' });

const STATS_TABS = ['audience', 'series'] as const;

export const StatsTabParameter: QueryParameter<
  'tab',
  z.ZodDefault<VocabularyIn<typeof STATS_TABS>>
> = {
  name: 'tab',
  in: 'query',
  required: false,
  schema: localVocabulary(
    STATS_TABS,
    "A sort or filter key. It is a property of THIS endpoint's list — which orders it offers — not of the domain, and adding one is an endpoint change rather than a vocabulary change.",
  ).default('audience'),
};

export const StatsShowParameter: QueryParameter<'showId', z.ZodString> = {
  name: 'showId',
  in: 'query',
  required: false,
  description: 'Restricts the `series` tab to one series. Absent, every series is served.',
  schema: uuidIn(),
};

export const StatsAnswerSchema: z.ZodIntersection<
  typeof StudioEnvelopeMetaSchema,
  z.ZodObject<
    {
      audience: z.ZodOptional<typeof StatsAudienceSchema>;
      series: z.ZodOptional<typeof StatsSeriesSchema>;
    },
    z.core.$loose
  >
> = z.intersection(
  StudioEnvelopeMetaSchema,
  z.looseObject({
    audience: StatsAudienceSchema.optional(),
    series: StatsSeriesSchema.optional(),
  }),
);

export const AgendaListSchema: z.ZodIntersection<
  typeof StudioEnvelopeMetaSchema,
  z.ZodObject<{ items: z.ZodArray<typeof ChannelMemberSchema> }, z.core.$loose>
> = z.intersection(
  StudioEnvelopeMetaSchema,
  z.looseObject({
    items: z.array(EventsRowSchema),
  }),
);

export type StatsAnswer = z.output<typeof StatsAnswerSchema>;
export type AgendaList = z.output<typeof AgendaListSchema>;

export const PayoutStateParameter: QueryParameter<'state', VocabularyIn<typeof PAYOUT_STATES>> = {
  name: 'state',
  in: 'query',
  required: false,
  schema: vocabularyIn(PAYOUT_STATES).meta({ 'x-arthome-vocabulary-source': 'PAYOUT_STATES' }),
};

export const PayoutPageSchema: z.ZodIntersection<
  typeof StudioEnvelopeMetaSchema,
  z.ZodObject<
    {
      items: z.ZodArray<typeof PayoutLineSchema>;
      balances: z.ZodArray<typeof MoneyOut>;
      pendingBankChange: z.ZodOptional<typeof BankChangeRequestSchema>;
      page: typeof OffsetPageInfoSchema;
    },
    z.core.$loose
  >
> = z.intersection(
  StudioEnvelopeMetaSchema,
  z.looseObject({
    items: z.array(PayoutLineSchema),
    balances: z
      .array(MoneyOut.meta({ 'x-arthome-tax-basis': 'inclusive' }))
      .meta({ description: '**One balance per currency.** Never aggregated.' }),
    pendingBankChange: BankChangeRequestSchema.optional(),
    page: OffsetPageInfoSchema,
  }),
);

export const RequestBankChangeBodySchema: z.ZodObject<
  { reauthToken: z.ZodString; stripeSetupRef: z.ZodString },
  z.core.$strip
> = ReauthProof.extend({
  stripeSetupRef: z.string().meta({
    description:
      '**Opaque** reference to the hosted flow. No provider identifier crosses the domain.,',
  }),
});

export const ReconciliationPeriodIdParameter: PathParameter<'periodId', z.ZodString> = {
  name: 'periodId',
  in: 'path',
  required: true,
  schema: z.string(),
};

export const CloseReconciliationPeriodBodySchema: z.ZodObject<
  {
    explanations: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          { payoutId: z.ZodOptional<z.ZodString>; note: z.ZodOptional<z.ZodString> },
          z.core.$strip
        >
      >
    >;
  },
  z.core.$strip
> = z.object({
  explanations: z
    .array(
      z.object({
        payoutId: uuidOut().optional(),
        note: z.string().optional(),
      }),
    )
    .optional(),
});

export const ReconciliationClosureSchema: z.ZodOptional<
  z.ZodObject<
    { periodId: z.ZodOptional<z.ZodString>; closedAt: z.ZodOptional<z.ZodString> },
    z.core.$loose
  >
> = z
  .looseObject({
    periodId: z.string().optional(),
    closedAt: InstantOut.optional(),
  })
  .optional();

const EXPORT_KINDS = [
  'sales_csv',
  'fec',
  'sage',
  'cegid',
  'grouped_invoices',
  'journal',
  'schedule_ics',
  'stats_csv',
] as const;

export const RequestChannelExportBodySchema: z.ZodObject<
  { kind: VocabularyIn<typeof EXPORT_KINDS>; from: z.ZodString; to: z.ZodString },
  z.core.$strip
> = z.object({
  kind: localVocabulary(
    EXPORT_KINDS,
    "A document or export format. It names an accounting tool or a file type, which is the outside world's vocabulary rather than ours.",
  ),
  from: z.string().meta({ format: 'date' }),
  to: z.string().meta({ format: 'date' }),
});

export type PayoutPage = z.output<typeof PayoutPageSchema>;
export type RequestBankChangeBody = z.output<typeof RequestBankChangeBodySchema>;
export type CloseReconciliationPeriodBody = z.output<typeof CloseReconciliationPeriodBodySchema>;
export type ReconciliationClosure = z.output<typeof ReconciliationClosureSchema>;
export type RequestChannelExportBody = z.output<typeof RequestChannelExportBodySchema>;

const MODERATION_QUEUE_FILTERS = ['all', 'pending', 'settled'] as const;

export const ModerationDateParameter: QueryParameter<'dateId', z.ZodString> = {
  name: 'dateId',
  in: 'query',
  required: false,
  schema: uuidIn(),
};

export const ModerationQueueFilterParameter: QueryParameter<
  'filter',
  z.ZodDefault<VocabularyIn<typeof MODERATION_QUEUE_FILTERS>>
> = {
  name: 'filter',
  in: 'query',
  required: false,
  schema: localVocabulary(
    MODERATION_QUEUE_FILTERS,
    "A sort or filter key. It is a property of THIS endpoint's list — which orders it offers — not of the domain, and adding one is an endpoint change rather than a vocabulary change.",
  ).default(OrderState.PENDING),
};

export const ModerationSearch: QueryParameter<'q', z.ZodString> = searchText({
  description: '**Server-side** search on the nickname and the text.',
});

export const AudienceSearch: QueryParameter<'q', z.ZodString> = searchText();

export const PresentOnDateParameter: QueryParameter<'presentOnDateId', z.ZodString> = {
  name: 'presentOnDateId',
  in: 'query',
  required: false,
  schema: uuidIn(),
};

export const AudienceSanctionParameter: QueryParameter<
  'sanction',
  VocabularyIn<typeof AUDIENCE_SANCTIONS>
> = {
  name: 'sanction',
  in: 'query',
  required: false,
  schema: vocabularyIn(AUDIENCE_SANCTIONS).meta({
    'x-arthome-vocabulary-source': 'AUDIENCE_SANCTIONS',
  }),
};

export const AudienceMemberIdParameter: PathParameter<'memberId', z.ZodString> = {
  name: 'memberId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const SanctionAudienceMemberBodySchema: z.ZodObject<
  {
    kind: VocabularyIn<typeof AUDIENCE_SANCTIONS>;
    expiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    reason: z.ZodOptional<VocabularyIn<typeof MODERATION_REASONS>>;
  },
  z.core.$strip
> = z.object({
  kind: vocabularyIn(AUDIENCE_SANCTIONS).meta({
    'x-arthome-vocabulary-source': 'AUDIENCE_SANCTIONS',
  }),
  expiresAt: z
    .string()
    .regex(new RegExp('^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$'))
    .nullable()
    .meta({ format: 'date-time' })
    .optional(),
  reason: vocabularyIn(MODERATION_REASONS)
    .meta({ 'x-arthome-vocabulary-source': 'MODERATION_REASONS' })
    .optional(),
});

export const BannedWordParameter: PathParameter<'word', z.ZodString> = {
  name: 'word',
  in: 'path',
  required: true,
  schema: z.string(),
};

export const AddBannedWordBodySchema: z.ZodObject<
  { word: z.ZodString; retroactive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>> },
  z.core.$strip
> = z.object({
  word: z.string().min(1).max(60),
  retroactive: z.boolean().default(false).optional(),
});

export const BannedWordAdditionSchema: z.ZodOptional<
  z.ZodObject<
    {
      word: z.ZodOptional<z.ZodString>;
      reprocessing: z.ZodOptional<z.ZodBoolean>;
      estimatedAffectedMessages: z.ZodOptional<z.ZodInt>;
    },
    z.core.$loose
  >
> = z
  .looseObject({
    word: z.string().optional(),
    reprocessing: z.boolean().optional(),
    estimatedAffectedMessages: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
  })
  .optional();

export type SanctionAudienceMemberBody = z.output<typeof SanctionAudienceMemberBodySchema>;
export type AddBannedWordBody = z.output<typeof AddBannedWordBodySchema>;
export type BannedWordAddition = z.output<typeof BannedWordAdditionSchema>;
