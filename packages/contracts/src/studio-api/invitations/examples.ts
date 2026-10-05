import type { z } from 'zod';

import { CrewRole, DatePane, NavigationEntry } from '@arthome/core';

import type { RespondToInvitationBody } from './schemas.js';
import { RespondToInvitationBodySchema } from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';
import { EffectiveRightsSchema } from '../../studio-access/index.js';

const respondToInvitationBody: RespondToInvitationBody = { decision: 'accept' };

const effectiveRights: z.output<typeof EffectiveRightsSchema> = {
  channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
  channelName: 'Compagnie Verticale',
  roles: [CrewRole.VIDEO],
  isOwner: false,
  navigation: [
    NavigationEntry.EVENTS,
    NavigationEntry.STREAM,
    NavigationEntry.REPLAYS,
    NavigationEntry.HELP,
  ],
  datePanes: [DatePane.TECH],
  canRevenue: false,
  canOps: false,
  canTech: true,
  canDecideOutcome: false,
  assignableRoles: [],
};

export const invitationsExamples: ModuleExamples = [
  [RespondToInvitationBodySchema, [respondToInvitationBody]],
  [EffectiveRightsSchema, [effectiveRights]],
];
