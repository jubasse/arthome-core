import type { z } from 'zod';

import type { VocabularyIn } from '@arthome/core/schema';
import { uuidIn } from '@arthome/core/schema';

import type { PathParameter } from '../../http/index.js';
import { ReauthProof, localVocabulary } from '../../http/index.js';

const COUNTERSIGN_DECISIONS = ['countersign', 'reject'] as const;

export const BankChangeRequestIdParameter: PathParameter<'requestId', z.ZodString> = {
  name: 'requestId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const CountersignBankChangeBodySchema: z.ZodObject<
  { reauthToken: z.ZodString; decision: VocabularyIn<typeof COUNTERSIGN_DECISIONS> },
  z.core.$strip
> = ReauthProof.extend({
  decision: localVocabulary(
    COUNTERSIGN_DECISIONS,
    "The two answers this one command accepts. It is the command's shape, not a vocabulary: a third answer would be a third command.",
  ),
});

export type CountersignBankChangeBody = z.output<typeof CountersignBankChangeBodySchema>;
