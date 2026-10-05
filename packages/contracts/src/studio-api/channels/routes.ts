import { ApiErrorCode, DomainErrorCode } from '@arthome/core';

import {
  ChannelDefaultsSchema,
  ChannelIdentitySchema,
  ChannelReplaySchema,
  ChannelReplayStateParameter,
  ChannelSettingsSchema,
  JournalDateParameter,
  JournalNatureParameter,
  JournalPeriod,
  MerchItemIdParameter,
  MerchItemListSchema,
  UpdateChannelIdentityBodySchema,
  UpdateChannelSettingsBodySchema,
  UpsertMerchItemBodySchema,
} from './schemas.js';
import type {
  GetChannelSettingsRoute,
  ListChannelJournalRoute,
  ListChannelMerchItemsRoute,
  ListChannelReplaysRoute,
  UpdateChannelIdentityRoute,
  UpdateChannelSettingsRoute,
  UpsertMerchItemRoute,
} from './types.js';
import { pages } from '../../http/index.js';
import { JournalEntrySchema } from '../../studio-desk/index.js';
import { MerchItemAdminSchema } from '../../studio-stage/index.js';
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
