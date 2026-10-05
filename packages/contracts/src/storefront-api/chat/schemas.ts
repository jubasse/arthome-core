import { z } from 'zod';

import { MODERATION_REASONS } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { int64, uuidIn, vocabularyIn } from '@arthome/core/schema';

import type { PathParameter, QueryParameter } from '../../http/index.js';
import { localVocabulary } from '../../http/index.js';

const REACTION_IDS = ['applause', 'heart', 'bravo', 'laugh', 'wow', 'sad'] as const;
const REACTION_REASON =
  'A vocabulary local to this contract. The domain neither produces nor consumes these values — they describe what this endpoint offers, and a new member is an endpoint change.';

export const ChatMessageIdParameter: PathParameter<'messageId', z.ZodString> = {
  name: 'messageId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const ChatSinceSeqParameter: QueryParameter<'sinceSeq', z.ZodNumber> = {
  name: 'sinceSeq',
  in: 'query',
  description: 'Resume by sequence number, after a channel break.',
  schema: int64(),
};

export const SendChatMessageBodySchema: z.ZodObject<
  { text: z.ZodString; atMediaSec: z.ZodInt },
  z.core.$strip
> = z.object({
  text: z.string().min(1).max(500),
  atMediaSec: z.int().min(0).meta({ maximum: undefined }),
});

export const SendReactionBodySchema: z.ZodObject<
  { reactionId: VocabularyIn<typeof REACTION_IDS>; atMediaSec: z.ZodInt },
  z.core.$strip
> = z.object({
  reactionId: localVocabulary(REACTION_IDS, REACTION_REASON),
  atMediaSec: z.int().min(0).meta({ maximum: undefined }),
});

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

export type SendChatMessageBody = z.output<typeof SendChatMessageBodySchema>;
export type SendReactionBody = z.output<typeof SendReactionBodySchema>;
export type ReportChatMessageBody = z.output<typeof ReportChatMessageBodySchema>;
