import type { z } from 'zod';

import { ModerationItemState, ModerationVerdict, StateChangeOrigin, Surface } from '@arthome/core';

import { Acknowledged, Deleted, ReauthProof } from '../http/index.js';
import type { ModuleExamples } from '../openapi/docs.js';
import { ModerationItemSchema } from '../studio-desk/index.js';
import { BankChangeRequestSchema, ExportJobSchema } from '../studio-money/index.js';

const bankChangeRequest: z.output<typeof BankChangeRequestSchema> = {
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
};

const claimedModerationItem: z.output<typeof ModerationItemSchema> = {
  id: '019928e0-0000-7000-8000-000000000001',
  messageId: '019928f8-0000-7000-8000-000000000009',
  dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
  state: ModerationItemState.CLAIMED,
  reportsCount: 3,
  atMediaSec: 1812,
  claimedBy: {
    personId: '019928b0-0000-7000-8000-000000000001',
    displayName: 'Claire D.',
    surface: Surface.STUDIO_MOBILE,
  },
  claimExpiresAt: '2026-09-21T19:32:10Z',
  version: 2,
  decisionVersion: 0,
};

const releasedModerationItem: z.output<typeof ModerationItemSchema> = {
  id: '019928e0-0000-7000-8000-000000000001',
  messageId: '019928f8-0000-7000-8000-000000000009',
  dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
  state: ModerationItemState.REPORTED,
  reportsCount: 3,
  atMediaSec: 1812,
  version: 3,
};

const settledModerationItem: z.output<typeof ModerationItemSchema> = {
  id: '019928e0-0000-7000-8000-000000000001',
  messageId: '019928f8-0000-7000-8000-000000000009',
  dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
  state: ModerationItemState.SETTLED,
  verdict: ModerationVerdict.MUTE,
  reportsCount: 3,
  atMediaSec: 1812,
  settledBy: {
    personId: '019928b0-0000-7000-8000-000000000001',
    displayName: 'Claire D.',
    surface: Surface.STUDIO_MOBILE,
  },
  settledAt: '2026-09-21T19:31:20Z',
  origin: StateChangeOrigin.HUMAN_VERDICT,
  version: 3,
  decisionVersion: 1,
};

const exportJob: z.output<typeof ExportJobSchema> = {
  exportId: '019928e8-0000-7000-8000-000000000001',
  kind: 'fec',
  state: 'ready',
  requestedAt: '2026-09-21T18:39:00Z',
  downloadUrl: 'https://files.arthome.fr/exports/019928e8?sig=abc',
  downloadExpiresAt: '2026-09-21T19:44:00Z',
};

/**
 * The examples of the schemas several modules answer: the factories of `./http`, and the records
 * of a subpath more than one module shows. A schema is registered once per api.
 */
export const sharedExamples: ModuleExamples = [
  [Deleted, [{ deleted: true }]],
  [Acknowledged, [{ accepted: true }]],
  [ReauthProof, [{ reauthToken: 'ott_9f2ac1' }]],
  [ExportJobSchema, [exportJob]],
  [BankChangeRequestSchema, [bankChangeRequest]],
  [ModerationItemSchema, [claimedModerationItem, releasedModerationItem, settledModerationItem]],
];
