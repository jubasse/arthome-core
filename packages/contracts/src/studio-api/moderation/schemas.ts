import { z } from 'zod';

import { MODERATION_REASONS, MODERATION_VERDICTS } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { uuidIn, vocabularyIn } from '@arthome/core/schema';

import type { PathParameter } from '../../http/index.js';

export const ModerationItemIdParameter: PathParameter<'itemId', z.ZodString> = {
  name: 'itemId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const SettleModerationItemBodySchema: z.ZodObject<
  {
    verdict: VocabularyIn<typeof MODERATION_VERDICTS>;
    expectedDecisionVersion: z.ZodInt;
    reason: z.ZodOptional<VocabularyIn<typeof MODERATION_REASONS>>;
    muteUntil: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    expectedVersion: z.ZodOptional<z.ZodInt>;
  },
  z.core.$strip
> = z.object({
  verdict: vocabularyIn(MODERATION_VERDICTS).meta({
    'x-arthome-vocabulary-source': 'MODERATION_VERDICTS',
  }),
  expectedDecisionVersion: z.int().meta({ minimum: undefined, maximum: undefined }).meta({
    description:
      '**The settlement axis, not the lease axis.** A verdict is accepted as long as\nno other verdict has been rendered — including when a colleague holds the row\nclaimed. Refused only by `moderation.already_settled`, which carries the winning\nverdict and its author.\n',
  }),
  reason: vocabularyIn(MODERATION_REASONS)
    .meta({
      'x-arthome-vocabulary-source': 'MODERATION_REASONS',
    })
    .optional(),
  muteUntil: z
    .string()
    .regex(new RegExp('^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$'))
    .nullable()
    .meta({
      format: 'date-time',
      description: '**An instant**, never a label. Absent = no limit.',
    })
    .optional(),
  expectedVersion: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
});

export type SettleModerationItemBody = z.output<typeof SettleModerationItemBodySchema>;
