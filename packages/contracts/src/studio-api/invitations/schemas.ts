import { z } from 'zod';

import type { VocabularyIn } from '@arthome/core/schema';
import { uuidIn } from '@arthome/core/schema';

import type { PathParameter } from '../../http/index.js';
import { localVocabulary } from '../../http/index.js';

const INVITATION_DECISIONS = ['accept', 'decline'] as const;

export const InvitationIdParameter: PathParameter<'invitationId', z.ZodString> = {
  name: 'invitationId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const RespondToInvitationBodySchema: z.ZodObject<
  { decision: VocabularyIn<typeof INVITATION_DECISIONS> },
  z.core.$strip
> = z.object({
  decision: localVocabulary(
    INVITATION_DECISIONS,
    "The two answers this one command accepts. It is the command's shape, not a vocabulary: a third answer would be a third command.",
  ),
});

export type RespondToInvitationBody = z.output<typeof RespondToInvitationBodySchema>;
