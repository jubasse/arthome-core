import type { z } from 'zod';

import {
  ChatMode,
  CrewRole,
  DisplayState,
  FilterSeverity,
  Locale,
  MemberRole,
  Surface,
} from '@arthome/core';

import type {
  AgendaList,
  ChangeMemberRolesBody,
  ChannelDefaults,
  ChannelMemberPage,
  InviteMemberBody,
  OwnershipTransfer,
  StatsAnswer,
  TransferChannelOwnershipBody,
  ChannelIdentity,
  ChannelReplay,
  ChannelSettings,
  MerchItemList,
  UpdateChannelIdentityBody,
  UpdateChannelSettingsBody,
  UpsertMerchItemBody,
} from './schemas.js';
import {
  AgendaListSchema,
  ChangeMemberRolesBodySchema,
  ChannelDefaultsSchema,
  ChannelMemberPageSchema,
  InviteMemberBodySchema,
  OwnershipTransferSchema,
  StatsAnswerSchema,
  TransferChannelOwnershipBodySchema,
  ChannelIdentitySchema,
  ChannelReplaySchema,
  ChannelSettingsSchema,
  MerchItemListSchema,
  UpdateChannelIdentityBodySchema,
  UpdateChannelSettingsBodySchema,
  UpsertMerchItemBodySchema,
} from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';
import { ChannelMemberSchema } from '../../studio-access/index.js';
import { JournalEntrySchema } from '../../studio-desk/index.js';
import { DashboardScreenSchema } from '../../studio-money/index.js';
import { EventsRowSchema, MerchItemAdminSchema } from '../../studio-stage/index.js';

const channelReplay: ChannelReplay = {
  dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
  title: 'Nuit blanche',
  state: 'online',
  expiresAt: '2026-09-24T22:00:00Z',
  durationSec: 5700,
  views: 412,
};

const channelIdentity: ChannelIdentity = {
  publicName: 'Compagnie Verticale',
  slug: 'compagnie-verticale',
  categoryId: 'dance-contemporary',
  verified: true,
  version: 5,
};

const channelSettings: ChannelSettings = {
  identity: channelIdentity,
  moderationDefaults: {
    filterSeverity: FilterSeverity.MEDIUM,
    slowModeSec: 0,
    holdersOnly: false,
    retroactiveFilter: true,
    chatMode: ChatMode.OPEN,
    version: 2,
  },
  merchIntegration: null,
};

const updateChannelSettingsBody: UpdateChannelSettingsBody = {
  moderationDefaults: { filterSeverity: FilterSeverity.HIGH, slowModeSec: 5 },
};

const channelDefaults: ChannelDefaults = {
  moderationDefaults: {
    filterSeverity: FilterSeverity.HIGH,
    slowModeSec: 5,
    holdersOnly: false,
    retroactiveFilter: true,
    chatMode: ChatMode.OPEN,
    version: 3,
  },
  version: 3,
};

const journalEntry: z.output<typeof JournalEntrySchema> = {
  id: '019928e7-0000-7000-8000-000000000001',
  nature: 'event',
  occurredAt: '2026-09-21T18:04:00Z',
  actor: {
    personId: '019928b0-0000-7000-8000-000000000001',
    displayName: 'Claire D.',
    surface: Surface.STUDIO_WEB,
  },
  code: 'publication.transition.applied',
  params: { from: DisplayState.RESERVE, to: DisplayState.SCHEDULED },
  dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
};

const merchItem: z.output<typeof MerchItemAdminSchema> = {
  id: '019928a0-7d31-7a10-b8c4-2f9e11a4d001',
  label: { contentLanguage: Locale.FR, text: 'T-shirt Nuit blanche' },
  variants: [
    {
      id: 'M',
      label: 'M',
      stock: 24,
      price: { amountMinor: 2500, currencyCode: 'EUR' },
    },
  ],
  state: 'on_sale',
  source: 'arthome',
  version: 4,
};

const merchItemList: MerchItemList = {
  servedAt: '2026-09-21T18:46:00.000Z',
  rightsVersion: 412,
  items: [merchItem],
};

const upsertMerchItemBody: UpsertMerchItemBody = {
  labels: [
    { contentLanguage: Locale.FR, text: 'T-shirt Nuit blanche' },
    { contentLanguage: Locale.EN, text: 'Nuit blanche tee' },
  ],
  variants: [{ id: 'M', label: 'M', stock: 24, priceMinor: 2500, currencyCode: 'EUR' }],
  expectedVersion: 3,
};

const updateChannelIdentityBody: UpdateChannelIdentityBody = {
  publicName: 'Compagnie Verticale',
  categoryId: 'dance-contemporary',
};

const channelMember: z.output<typeof ChannelMemberSchema> = {
  personId: '019928b0-0000-7000-8000-000000000001',
  displayName: 'Claire D.',
  email: 'claire@example.org',
  roles: [MemberRole.PRODUCTION, MemberRole.COORDINATION],
  isOwner: false,
  joinedAt: '2025-11-02T09:00:00Z',
  version: 2,
};

const channelMemberPage: ChannelMemberPage = {
  servedAt: '2026-09-21T18:15:00.000Z',
  rightsVersion: 412,
  items: [channelMember],
  roleCounts: { production: 4, coordination: 2, director: 3 },
  page: { page: 1, pageSize: 20, totalItems: 11, totalPages: 1 },
};

const inviteMemberBody: InviteMemberBody = {
  email: 'yann@example.org',
  roles: [CrewRole.VIDEO],
  note: 'Renfort captation novembre',
};

const changeMemberRolesBody: ChangeMemberRolesBody = {
  roles: [CrewRole.VIDEO, CrewRole.SOUND],
  expectedVersion: 2,
};

const transferChannelOwnershipBody: TransferChannelOwnershipBody = {
  toPersonId: '019928b2-0000-7000-8000-000000000001',
  reauthToken: 'ott_9f2ac1',
};

const ownershipTransfer: OwnershipTransfer = {
  state: 'pending_acceptance',
  expiresAt: '2026-09-28T18:21:00Z',
};

const eventsRow: z.output<typeof EventsRowSchema> = {
  dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
  title: 'Nuit blanche',
  startsAt: '2026-09-21T19:00:00Z',
  state: DisplayState.SCHEDULED,
  orderRank: 3,
  lowestPrice: { amountMinor: 2400, currencyCode: 'EUR' },
  fillRateBps: 8700,
  seatsSold: 174,
  grossRevenue: { amountMinor: 417600, currencyCode: 'EUR' },
};

const PERIOD_BOUNDS = {
  preset: 'last_30_days',
  from: '2026-08-22',
  to: '2026-09-21',
  days: 30,
  datesCovered: 7,
};

const dashboardScreen: z.output<typeof DashboardScreenSchema> = {
  period: PERIOD_BOUNDS,
  tiles: [
    {
      id: 'shop_sales',
      value: 184200,
      unit: 'currency_minor',
      currencyCode: 'EUR',
      seriesGranularity: 'per_date',
      series: [
        {
          at: '2026-09-04T19:00:00Z',
          value: 42100,
          dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
        },
      ],
    },
    {
      id: 'followers_gained',
      value: 312,
      unit: 'count',
      seriesGranularity: 'per_date',
      series: [{ at: '2026-09-04T19:00:00Z', value: 48 }],
    },
    {
      id: 'replay_views',
      value: 1840,
      unit: 'count',
      seriesGranularity: 'per_date',
      series: [{ at: '2026-09-04T19:00:00Z', value: 412 }],
    },
    {
      id: 'fill_rate',
      value: 87,
      unit: 'percent',
      seriesGranularity: 'per_date',
      series: [{ at: '2026-09-04T19:00:00Z', value: 84 }],
    },
  ],
  reminders: [
    {
      id: 'rem-1',
      kind: 'technical_check_missing',
      severity: 'urgent',
      textCode: 'dashboard.reminder.technical_check_missing',
      params: { title: 'Nuit blanche' },
      targetPage: 'regie',
      dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
      countdownTo: '2026-09-21T19:00:00Z',
      actionable: true,
    },
  ],
  revenueByDate: {
    total: { amountMinor: 14049600, currencyCode: 'EUR' },
    totalScope: 'channel_period',
    items: [
      {
        dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
        title: 'Nuit blanche',
        startsAt: '2026-09-21T19:00:00Z',
        gross: { amountMinor: 417600, currencyCode: 'EUR' },
      },
    ],
  },
};

const statsAnswer: StatsAnswer = {
  servedAt: '2026-09-21T18:06:00.000Z',
  rightsVersion: 412,
  audience: {
    period: PERIOD_BOUNDS,
    headline: {
      viewersTotal: 18420,
      averageFillRateBps: 8700,
      datesCount: 7,
      netRevenue: { amountMinor: 1240000, currencyCode: 'EUR' },
    },
    fillByDate: [
      {
        dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
        title: 'Nuit blanche',
        startsAt: '2026-09-21T19:00:00Z',
        fillRateBps: 8700,
        seatsSold: 174,
        capacityTotal: 200,
        onSale: true,
      },
    ],
    audienceByDate: [
      {
        dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
        title: 'Nuit blanche',
        startsAt: '2026-09-21T19:00:00Z',
        displayState: DisplayState.LIVE,
        seatsSold: 174,
        liveViewersPeak: 1842,
        replayViews: 412,
        fillRateBps: 8700,
      },
    ],
  },
};

const agendaList: AgendaList = {
  servedAt: '2026-09-21T18:01:20.000Z',
  rightsVersion: 412,
  items: [eventsRow],
};

export const channelsExamples: ModuleExamples = [
  [ChannelReplaySchema, [channelReplay]],
  [ChannelIdentitySchema, [channelIdentity]],
  [ChannelSettingsSchema, [channelSettings]],
  [UpdateChannelSettingsBodySchema, [updateChannelSettingsBody]],
  [ChannelDefaultsSchema, [channelDefaults]],
  [JournalEntrySchema, [journalEntry]],
  [MerchItemAdminSchema, [merchItem]],
  [MerchItemListSchema, [merchItemList]],
  [UpsertMerchItemBodySchema, [upsertMerchItemBody]],
  [UpdateChannelIdentityBodySchema, [updateChannelIdentityBody]],
  [ChannelMemberSchema, [channelMember]],
  [ChannelMemberPageSchema, [channelMemberPage]],
  [InviteMemberBodySchema, [inviteMemberBody]],
  [ChangeMemberRolesBodySchema, [changeMemberRolesBody]],
  [TransferChannelOwnershipBodySchema, [transferChannelOwnershipBody]],
  [OwnershipTransferSchema, [ownershipTransfer]],
  [EventsRowSchema, [eventsRow]],
  [DashboardScreenSchema, [dashboardScreen]],
  [StatsAnswerSchema, [statsAnswer]],
  [AgendaListSchema, [agendaList]],
];
