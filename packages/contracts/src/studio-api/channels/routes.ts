import { ApiErrorCode, ChannelErrorCode, DomainErrorCode, PayoutErrorCode } from '@arthome/core';

import {
  AddBannedWordBodySchema,
  AgendaListSchema,
  AgendaPeriod,
  AudienceMemberIdParameter,
  AudienceSanctionParameter,
  AudienceSearch,
  BannedWordAdditionSchema,
  BannedWordParameter,
  ChangeMemberRolesBodySchema,
  ChannelDefaultsSchema,
  ChannelMemberPageSchema,
  ChannelIdentitySchema,
  ChannelReplaySchema,
  ChannelReplayStateParameter,
  ChannelSettingsSchema,
  ChannelStreamSettingsSchema,
  ChannelTicketingSchema,
  CreateDateDraftBodySchema,
  CloseReconciliationPeriodBodySchema,
  DashboardPeriod,
  EventSearch,
  EventStatesParameter,
  EventsWindowParameter,
  JournalDateParameter,
  JournalNatureParameter,
  InviteMemberBodySchema,
  JournalPeriod,
  MemberRoleParameter,
  ModerationDateParameter,
  ModerationQueueFilterParameter,
  ModerationSearch,
  MemberSearch,
  OwnershipTransferSchema,
  PayoutPageSchema,
  PayoutStateParameter,
  PresentOnDateParameter,
  PersonIdParameter,
  ReconciliationClosureSchema,
  ReconciliationPeriodIdParameter,
  RequestBankChangeBodySchema,
  RequestChannelExportBodySchema,
  SanctionAudienceMemberBodySchema,
  StatsAnswerSchema,
  StatsPeriod,
  StatsPeriodPresetParameter,
  StatsShowParameter,
  StatsTabParameter,
  TicketingPeriod,
  TransferChannelOwnershipBodySchema,
  MerchItemIdParameter,
  MerchItemListSchema,
  UpdateChannelIdentityBodySchema,
  UpdateChannelSettingsBodySchema,
  UpsertMerchItemBodySchema,
} from './schemas.js';
import type {
  AddBannedWordRoute,
  ChangeMemberRolesRoute,
  CloseReconciliationPeriodRoute,
  CreateDateDraftRoute,
  GetChannelAgendaRoute,
  GetChannelDashboardRoute,
  GetChannelSettingsRoute,
  GetChannelStatsRoute,
  GetChannelStreamSettingsRoute,
  GetChannelTicketingRoute,
  InviteMemberRoute,
  ListChannelEventsRoute,
  ListChannelJournalRoute,
  ListChannelMembersRoute,
  ListChannelMerchItemsRoute,
  ListChannelReplaysRoute,
  ListModerationQueueRoute,
  ListPayoutsRoute,
  RemoveBannedWordRoute,
  RemoveMemberRoute,
  RequestBankChangeRoute,
  RequestChannelExportRoute,
  SanctionAudienceMemberRoute,
  SearchAudienceRoute,
  TransferChannelOwnershipRoute,
  UpdateChannelIdentityRoute,
  UpdateChannelSettingsRoute,
  UpsertMerchItemRoute,
} from './types.js';
import { Deleted, Freshness, cache, cursor, pages, recentAuth } from '../../http/index.js';
import { ChannelMemberSchema } from '../../studio-access/index.js';
import {
  AudienceMemberSchema,
  JournalEntrySchema,
  ModerationItemSchema,
} from '../../studio-desk/index.js';
import {
  BankChangeRequestSchema,
  DashboardScreenSchema,
  ExportJobSchema,
  PayoutLineSchema,
} from '../../studio-money/index.js';
import {
  DateSheetSchema,
  EventsRowSchema,
  MerchItemAdminSchema,
} from '../../studio-stage/index.js';
import {
  ChannelIdParameter,
  DateIdParameter,
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  operator,
  studioV1,
} from '../components.js';

const channels = studioV1
  .identity(operator)
  .headers(SurfaceParameter, TraceparentParameter)
  .errors([ApiErrorCode.FORBIDDEN, ApiErrorCode.NOT_FOUND]);
const channelFace = channels
  .tags(StudioTag.CHANNEL)
  .resource('channels', { id: ChannelIdParameter });

export const listChannelReplays: ListChannelReplaysRoute = channelFace.single('replays').findAll({
  operationId: 'listChannelReplays',
  summary: "A channel's replay catalogue — online and archived.",
  item: ChannelReplaySchema,
  parameters: [ChannelReplayStateParameter],
  answer:
    'A page of replays, **projected according to the role** — revenue is absent without `canRevenue`.',
});

const settings = channelFace.single('settings');

export const getChannelSettings: GetChannelSettingsRoute = settings.find({
  operationId: 'getChannelSettings',
  summary: "A channel's settings — the screen had nothing to read before writing.",
  item: ChannelSettingsSchema,
  answer: 'Public identity, moderation defaults, broadcast defaults, merchant integration.',
});

export const updateChannelSettings: UpdateChannelSettingsRoute = settings.update({
  operationId: 'updateChannelSettings',
  summary: "Writes a channel's moderation and broadcast defaults.",
  body: UpdateChannelSettingsBodySchema,
  item: ChannelDefaultsSchema,
  answer: 'Settings up to date.',
});

export const listChannelJournal: ListChannelJournalRoute = channelFace.single('journal').findAll({
  operationId: 'listChannelJournal',
  summary: 'The audit log — page + total, **mandatory period filter**.',
  item: JournalEntrySchema,
  paging: pages({ maxPageSize: 100 }),
  parameters: [...JournalPeriod.parameters, JournalNatureParameter, JournalDateParameter],
  errors: [...JournalPeriod.errors],
  answer:
    'A page of the log, **projected according to the role** — the `money` kind is absent without `canRevenue`.',
});

export const listChannelMerchItems: ListChannelMerchItemsRoute = channelFace
  .single('merch-items')
  .find({
    operationId: 'listChannelMerchItems',
    summary: "The channel's shop catalogue.",
    responses: {
      200: {
        description: 'The items.',
        content: { 'application/json': { schema: MerchItemListSchema } },
      },
    },
  });

export const upsertMerchItem: UpsertMerchItemRoute = channelFace
  .resource('merch-items', { id: MerchItemIdParameter })
  .upsert({
    operationId: 'upsertMerchItem',
    summary: 'Creates or updates a shop item.',
    body: UpsertMerchItemBodySchema,
    item: MerchItemAdminSchema,
    answer: 'Item up to date.',
    errors: [DomainErrorCode.STATE_CONFLICT],
  });

export const updateChannelIdentity: UpdateChannelIdentityRoute = channelFace
  .single('identity')
  .update({
    operationId: 'updateChannelIdentity',
    summary: "Edits the channel's public face.",
    body: UpdateChannelIdentityBodySchema,
    item: ChannelIdentitySchema,
    answer: 'Public identity up to date.',
  });

const crewChannel = channels.tags(StudioTag.CREW).resource('channels', { id: ChannelIdParameter });
const members = crewChannel.resource('members', { id: PersonIdParameter });

export const listChannelMembers: ListChannelMembersRoute = members.findAll({
  operationId: 'listChannelMembers',
  summary: 'The team — page + total, with a served counter per role.',
  item: ChannelMemberSchema,
  paging: pages({ maxPageSize: 100 }),
  parameters: [MemberSearch, MemberRoleParameter],
  responses: {
    200: {
      description: 'A page of members, plus the head count per role.',
      content: { 'application/json': { schema: ChannelMemberPageSchema } },
    },
  },
});

export const inviteMember: InviteMemberRoute = crewChannel.single('invitations').create({
  operationId: 'inviteMember',
  summary: 'Invites a person, into a role the inviter has the right to assign.',
  body: InviteMemberBodySchema,
  item: ChannelMemberSchema,
  answer: 'Invitation sent, pending.',
  errors: [ChannelErrorCode.ROLE_NOT_ASSIGNABLE],
});

export const changeMemberRoles: ChangeMemberRolesRoute = members.action('change-roles', {
  operationId: 'changeMemberRoles',
  summary: "Changes a member's set of roles.",
  body: ChangeMemberRolesBodySchema,
  response: ChannelMemberSchema,
  answer: 'Member up to date.',
});

export const removeMember: RemoveMemberRoute = members.delete({
  operationId: 'removeMember',
  summary: 'Removes a member from the channel.',
  response: Deleted,
  answer: 'Member removed.',
});

export const transferChannelOwnership: TransferChannelOwnershipRoute = crewChannel.action(
  'ownership-transfer',
  {
    operationId: 'transferChannelOwnership',
    summary: 'Transfers ownership of the channel — two-stage.',
    requires: [recentAuth()],
    body: TransferChannelOwnershipBodySchema,
    response: OwnershipTransferSchema,
    status: 202,
    answer: 'Transfer pending acceptance.',
    errors: [ChannelErrorCode.TRANSFER_TARGET_INELIGIBLE],
  },
);

const agendaChannel = channels
  .tags(StudioTag.AGENDA)
  .resource('channels', { id: ChannelIdParameter });

export const listChannelEvents: ListChannelEventsRoute = agendaChannel.single('events').findAll({
  operationId: 'listChannelEvents',
  summary: 'The event board — page + total, six sort keys, multi-state filter.',
  item: EventsRowSchema,
  parameters: [EventsWindowParameter, EventStatesParameter, EventSearch],
  errors: [ApiErrorCode.SORT_KEY_FORBIDDEN],
  answer: 'A page of the event board, **projected according to the role**.',
});

export const getChannelDashboard: GetChannelDashboardRoute = agendaChannel
  .single('dashboard')
  .find({
    operationId: 'getChannelDashboard',
    summary: 'The dashboard — tiles aggregated over a period, and the "to handle" list.',
    item: DashboardScreenSchema,
    cache: cache(Freshness.FIVE_MINUTES),
    parameters: [StatsPeriodPresetParameter, ...DashboardPeriod.parameters],
    answer: 'Tiles and reminders, projected according to the role.',
  });

export const getChannelStats: GetChannelStatsRoute = agendaChannel.single('stats').find({
  operationId: 'getChannelStats',
  summary: 'Audience and revenue, or a comparison of the dates in a series.',
  cache: cache(Freshness.FIVE_MINUTES),
  parameters: [
    StatsTabParameter,
    StatsPeriodPresetParameter,
    ...StatsPeriod.parameters,
    StatsShowParameter,
  ],
  responses: {
    200: {
      description: 'The tab requested. `audience` and `series` are mutually exclusive.',
      content: { 'application/json': { schema: StatsAnswerSchema } },
    },
  },
});

export const getChannelAgenda: GetChannelAgendaRoute = agendaChannel.single('agenda').find({
  operationId: 'getChannelAgenda',
  summary: "A channel's schedule, over a period.",
  parameters: [...AgendaPeriod.parameters],
  errors: [...AgendaPeriod.errors],
  responses: {
    200: {
      description: 'The dates between the two bounds.',
      content: { 'application/json': { schema: AgendaListSchema } },
    },
  },
});

const payoutsChannel = channels
  .tags(StudioTag.PAYOUTS)
  .resource('channels', { id: ChannelIdParameter });

export const listPayouts: ListPayoutsRoute = payoutsChannel.single('payouts').findAll({
  operationId: 'listPayouts',
  summary: 'The payouts owed, one line per date sold.',
  item: PayoutLineSchema,
  parameters: [PayoutStateParameter],
  responses: {
    200: {
      description: 'A page of payout lines, and the balances **per currency**.',
      content: { 'application/json': { schema: PayoutPageSchema } },
    },
  },
});

export const requestBankChange: RequestBankChangeRoute = payoutsChannel
  .single('bank-change-requests')
  .create({
    operationId: 'requestBankChange',
    summary: 'Requests a change of bank details — dual signature.',
    requires: [recentAuth()],
    body: RequestBankChangeBodySchema,
    item: BankChangeRequestSchema,
    status: 202,
    answer: 'Request created, transfers suspended until counter-signature.',
  });

export const closeReconciliationPeriod: CloseReconciliationPeriodRoute = payoutsChannel
  .resource('reconciliation-periods', { id: ReconciliationPeriodIdParameter })
  .action('close', {
    operationId: 'closeReconciliationPeriod',
    summary: 'Closes a reconciliation period.',
    body: CloseReconciliationPeriodBodySchema,
    optionalBody: true,
    response: ReconciliationClosureSchema,
    answer: 'Period closed.',
    errors: [PayoutErrorCode.RECONCILIATION_DISCREPANCY_UNEXPLAINED],
  });

export const requestChannelExport: RequestChannelExportRoute = payoutsChannel
  .single('exports')
  .create({
    operationId: 'requestChannelExport',
    summary: 'Requests an export — sales journal, FEC, Sage, Cegid, grouped invoices.',
    body: RequestChannelExportBodySchema,
    item: ExportJobSchema,
    status: 202,
    follow: 'getChannelExport',
    answer: 'Export queued.',
  });

const moderationChannel = channels
  .tags(StudioTag.MODERATION)
  .resource('channels', { id: ChannelIdParameter });
const moderation = moderationChannel.path('moderation');

export const listModerationQueue: ListModerationQueueRoute = moderation.single('queue').findAll({
  operationId: 'listModerationQueue',
  summary: 'The moderation queue — **by cursor**, the first exception to page + total.',
  item: ModerationItemSchema,
  paging: cursor({ maxLimit: 200 }),
  parameters: [ModerationDateParameter, ModerationQueueFilterParameter, ModerationSearch],
  answer: 'A page of the queue, plus the total for the badge.',
});

const audience = moderationChannel.resource('audience', { id: AudienceMemberIdParameter });

export const searchAudience: SearchAudienceRoute = audience.findAll({
  operationId: 'searchAudience',
  summary: "A channel's audience — searchable, including those who have not written.",
  item: AudienceMemberSchema,
  paging: pages({ maxPageSize: 100 }),
  parameters: [AudienceSearch, PresentOnDateParameter, AudienceSanctionParameter],
  answer: 'A page of the audience.',
});

export const sanctionAudienceMember: SanctionAudienceMemberRoute = audience.action('sanction', {
  operationId: 'sanctionAudienceMember',
  summary: 'Sanctions a person — per channel, with an instant of expiry.',
  body: SanctionAudienceMemberBodySchema,
  response: AudienceMemberSchema,
  answer: 'Sanction applied.',
});

const bannedWords = moderation.resource('banned-words', { id: BannedWordParameter });

export const addBannedWord: AddBannedWordRoute = bannedWords.create({
  operationId: 'addBannedWord',
  summary: 'Adds a word to the dictionary — the reclassification is asynchronous.',
  body: AddBannedWordBodySchema,
  item: BannedWordAdditionSchema,
  status: 202,
  answer: 'Word added; the reclassification runs in the background.',
});

export const removeBannedWord: RemoveBannedWordRoute = bannedWords.delete({
  operationId: 'removeBannedWord',
  summary: 'Removes a word from the dictionary.',
  response: Deleted,
  answer: 'Word removed.',
});

export const getChannelStreamSettings: GetChannelStreamSettingsRoute = channels
  .tags(StudioTag.RUN)
  .resource('channels', { id: ChannelIdParameter })
  .single('stream')
  .find({
    operationId: 'getChannelStreamSettings',
    summary: "A channel's Broadcast page — ingest server, recommended profile, test history.",
    item: ChannelStreamSettingsSchema,
    answer: 'Ingest, recommended profile, measured bitrate, check history.',
  });

export const getChannelTicketing: GetChannelTicketingRoute = channels
  .tags(StudioTag.TICKETING)
  .resource('channels', { id: ChannelIdParameter })
  .single('ticketing')
  .find({
    operationId: 'getChannelTicketing',
    summary: 'Ticketing at channel level — breakdown, waiting list, and the requests in flight.',
    item: ChannelTicketingSchema,
    parameters: [...TicketingPeriod.parameters],
    errors: [...TicketingPeriod.errors],
    answer: 'Breakdown by price tier, waiting lists, complimentary tickets, requests in flight.',
  });

export const createDateDraft: CreateDateDraftRoute = channels
  .tags(StudioTag.PUBLICATION)
  .resource('channels', { id: ChannelIdParameter })
  .resource('dates', { id: DateIdParameter })
  .create({
    operationId: 'createDateDraft',
    summary: 'Creates a draft date — the identifier comes from the domain.',
    body: CreateDateDraftBodySchema,
    item: DateSheetSchema,
    answer: 'Draft created, with its publication and its checklist.',
    errors: [DomainErrorCode.STATE_CONFLICT],
  });
