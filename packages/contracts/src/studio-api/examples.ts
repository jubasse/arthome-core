import type { z } from 'zod';

import {
  AudienceSanction,
  Locale,
  ModerationItemState,
  ModerationReason,
  StateChangeOrigin,
  Surface,
} from '@arthome/core';

import { Acknowledged, Deleted, ReauthProof } from '../http/index.js';
import type { ModuleExamples } from '../openapi/docs.js';
import { ModerationItemSchema } from '../studio-desk/index.js';
import { BankChangeRequestSchema, ExportJobSchema } from '../studio-money/index.js';

const bankChangeRequests: readonly z.output<typeof BankChangeRequestSchema>[] = [
  {
    requestId: '019928e6-0000-7000-8000-000000000001',
    state: 'pending_countersignature',
    maskedAccountTail: '4417',
    requestedBy: {
      personId: '019928b0-0000-7000-8000-000000000001',
      displayName: 'Claire D.',
      surface: Surface.STUDIO_WEB,
    },
    requestedAt: '2026-09-21T18:26:00Z',
    expiresAt: '2026-09-28T18:26:00Z',
    suspendsPayoutIds: ['019928e5-0000-7000-8000-000000000001'],
  },
  {
    requestId: '019928e6-0000-7000-8000-000000000001',
    state: 'countersigned',
    maskedAccountTail: '4417',
    requestedAt: '2026-09-21T18:26:00Z',
    expiresAt: '2026-09-28T18:26:00Z',
    countersignedBy: {
      personId: '019928b4-0000-7000-8000-000000000001',
      displayName: 'Léa M.',
      surface: Surface.STUDIO_WEB,
    },
  },
];

const moderationItem: z.output<typeof ModerationItemSchema> = {
  id: '019928e0-0000-7000-8000-000000000001',
  messageId: '019928f8-0000-7000-8000-000000000009',
  dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
  channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
  state: ModerationItemState.REPORTED,
  reason: ModerationReason.HARASSMENT,
  reportsCount: 3,
  atMediaSec: 1812,
  sentAt: '2026-09-21T19:29:42Z',
  authorHandle: '@anon.7742',
  authorSanction: AudienceSanction.NONE,
  body: { contentLanguage: Locale.FR, text: '…' },
  origin: StateChangeOrigin.HUMAN_VERDICT,
  version: 1,
};

const exportJobs: readonly z.output<typeof ExportJobSchema>[] = [
  {
    exportId: '019928e8-0000-7000-8000-000000000001',
    kind: 'fec',
    state: 'queued',
    requestedAt: '2026-09-21T18:39:00Z',
  },
  {
    exportId: '019928e8-0000-7000-8000-000000000001',
    kind: 'fec',
    state: 'ready',
    requestedAt: '2026-09-21T18:39:00Z',
    downloadUrl: 'https://files.arthome.fr/exports/019928e8?sig=abc',
    downloadExpiresAt: '2026-09-21T19:44:00Z',
  },
];

/**
 * The examples of the schemas several modules answer: the factories of `./http`, and the records
 * of a subpath more than one module shows. A schema is registered once per api.
 */
export const sharedExamples: ModuleExamples = [
  [Deleted, [{ deleted: true }]],
  [Acknowledged, [{ accepted: true }]],
  [ReauthProof, [{ reauthToken: 'ott_9f2ac1' }]],
  [BankChangeRequestSchema, bankChangeRequests],
  [ExportJobSchema, exportJobs],
  [ModerationItemSchema, [moderationItem]],
];
