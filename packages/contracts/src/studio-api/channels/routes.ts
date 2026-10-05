import { ApiErrorCode, ChannelErrorCode, DomainErrorCode } from '@arthome/core';

import {
  AgendaListSchema,
  AgendaPeriod,
  ChangeMemberRolesBodySchema,
  ChannelDefaultsSchema,
  ChannelMemberPageSchema,
  ChannelIdentitySchema,
  ChannelReplaySchema,
  ChannelReplayStateParameter,
  ChannelSettingsSchema,
  DashboardPeriod,
  EventSearch,
  EventStatesParameter,
  EventsWindowParameter,
  JournalDateParameter,
  JournalNatureParameter,
  InviteMemberBodySchema,
  JournalPeriod,
  MemberRoleParameter,
  MemberSearch,
  OwnershipTransferSchema,
  PersonIdParameter,
  StatsAnswerSchema,
  StatsPeriod,
  StatsPeriodPresetParameter,
  StatsShowParameter,
  StatsTabParameter,
  TransferChannelOwnershipBodySchema,
  MerchItemIdParameter,
  MerchItemListSchema,
  UpdateChannelIdentityBodySchema,
  UpdateChannelSettingsBodySchema,
  UpsertMerchItemBodySchema,
} from './schemas.js';
import type {
  ChangeMemberRolesRoute,
  GetChannelAgendaRoute,
  GetChannelDashboardRoute,
  GetChannelSettingsRoute,
  GetChannelStatsRoute,
  InviteMemberRoute,
  ListChannelEventsRoute,
  ListChannelJournalRoute,
  ListChannelMembersRoute,
  ListChannelMerchItemsRoute,
  ListChannelReplaysRoute,
  RemoveMemberRoute,
  TransferChannelOwnershipRoute,
  UpdateChannelIdentityRoute,
  UpdateChannelSettingsRoute,
  UpsertMerchItemRoute,
} from './types.js';
import { Deleted, Freshness, cache, pages, recentAuth } from '../../http/index.js';
import { ChannelMemberSchema } from '../../studio-access/index.js';
import { JournalEntrySchema } from '../../studio-desk/index.js';
import { DashboardScreenSchema } from '../../studio-money/index.js';
import { EventsRowSchema, MerchItemAdminSchema } from '../../studio-stage/index.js';
import {
  ChannelIdParameter,
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
