import { z } from 'zod';

import { MODERATION_REASONS } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { uuidIn, vocabularyIn } from '@arthome/core/schema';

import type { PathParameter } from '../../http/index.js';

export const ChatMessageIdParameter: PathParameter<'messageId', z.ZodString> = {
  name: 'messageId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const ReportChatMessageBodySchema: z.ZodObject<
  { reason: VocabularyIn<typeof MODERATION_REASONS> },
  z.core.$strip
> = z.object({
  reason: vocabularyIn(MODERATION_REASONS).meta({
    'x-arthome-vocabulary-source': 'MODERATION_REASONS',
    description:
      '**The vocabulary from `shared/`, which is authoritative and had no competitor.** `spoiler` —\n"gives away the show" — is the only reason specific to live performance and it is translated\nin the i18n catalogue; it had disappeared, as had `insult`. `hate` and `filter` had been\ninvented, and `filter` is not a reason but an **origin** — the contract already carries it\ncorrectly elsewhere, and putting it in `reason` as well gave one field two axes.\n',
  }),
});

export type ReportChatMessageBody = z.output<typeof ReportChatMessageBodySchema>;
