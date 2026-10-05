import { ModerationReason, ModerationVerdict } from '@arthome/core';

import type { SettleModerationItemBody } from './schemas.js';
import { SettleModerationItemBodySchema } from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const settleModerationItemBody: SettleModerationItemBody = {
  verdict: ModerationVerdict.MUTE,
  reason: ModerationReason.HARASSMENT,
  muteUntil: '2026-09-21T20:30:00Z',
  expectedDecisionVersion: 0,
};

export const moderationExamples: ModuleExamples = [
  [SettleModerationItemBodySchema, [settleModerationItemBody]],
];
