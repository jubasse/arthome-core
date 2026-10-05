import { z } from 'zod';

import type { PublicationPromise } from '@arthome/core';
import {
  BLACKOUT_REASONS,
  DATE_OUTCOMES,
  PUBLICATION_PROMISES,
  PublicationState,
  REPLAY_POLICIES,
  RIGHTS_SCOPES,
} from '@arthome/core';
import type { VocabularyIn, VocabularyOutNullable } from '@arthome/core/schema';
import {
  InstantOut,
  MoneyOut,
  uuidOut,
  vocabularyIn,
  vocabularyOut,
  vocabularyOutNullable,
} from '@arthome/core/schema';

import { restricted } from '../../http/index.js';
import { StudioLocalizedTextSchema } from '../../text/index.js';

export const DatePublicPaneSchema: z.ZodObject<
  {
    title: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.ZodString>;
    genreIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    tagIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    synopsis: z.ZodOptional<typeof StudioLocalizedTextSchema>;
    slug: z.ZodOptional<z.ZodString>;
    canonicalUrl: z.ZodOptional<z.ZodString>;
    rights: z.ZodOptional<
      z.ZodObject<
        {
          scope: z.ZodOptional<z.ZodString>;
          blackoutCountries: z.ZodOptional<z.ZodArray<z.ZodString>>;
          blackoutReasonCode: z.ZodOptional<VocabularyOutNullable>;
        },
        z.core.$loose
      >
    >;
    version: z.ZodOptional<z.ZodInt>;
  },
  z.core.$loose
> = z.looseObject({
  title: z.string().optional(),
  categoryId: z.string().optional(),
  genreIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  synopsis: StudioLocalizedTextSchema.optional(),
  slug: z.string().optional(),
  canonicalUrl: z.string().meta({ format: 'uri' }).optional(),
  rights: z
    .looseObject({
      scope: vocabularyOut(RIGHTS_SCOPES).optional(),
      blackoutCountries: z.array(z.string().regex(new RegExp('^[A-Z]{2}$'))).optional(),
      blackoutReasonCode: vocabularyOutNullable(BLACKOUT_REASONS).optional(),
    })
    .optional(),
  version: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
});

export const DateReplayPaneSchema: z.ZodObject<
  {
    policy: z.ZodOptional<z.ZodString>;
    windowHours: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    assetReady: z.ZodOptional<z.ZodBoolean>;
    durationSec: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    availableFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    expiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    unitPrice: z.ZodOptional<typeof MoneyOut>;
    views: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    revenue: z.ZodOptional<typeof MoneyOut>;
    version: z.ZodOptional<z.ZodInt>;
  },
  z.core.$loose
> = z.looseObject({
  policy: vocabularyOut(REPLAY_POLICIES).optional(),
  windowHours: z.int().meta({ minimum: undefined, maximum: undefined }).nullable().optional(),
  assetReady: z.boolean().optional(),
  durationSec: z.int().meta({ minimum: undefined, maximum: undefined }).nullable().optional(),
  availableFrom: InstantOut.nullable().optional(),
  expiresAt: InstantOut.nullable()
    .meta({
      description:
        '**Derived** from the end of the live show and the served window, never set by hand.',
    })
    .optional(),
  unitPrice: MoneyOut.meta({ 'x-arthome-tax-basis': 'inclusive' }).optional(),
  views: z.int().meta({ minimum: undefined, maximum: undefined }).nullable().optional(),
  revenue: restricted(MoneyOut, 'canRevenue', {
    'x-arthome-tax-basis': 'inclusive',
    description: '**Absent** without `canRevenue`.',
  }),
  version: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
});

const COMMANDABLE_PUBLICATION_STATES: readonly [
  typeof PublicationState.DRAFT,
  typeof PublicationState.RESERVE,
  typeof PublicationState.SCHEDULED,
  typeof PublicationState.TECHNICAL,
  typeof PublicationState.REPLAY_ONLINE,
] = [
  PublicationState.DRAFT,
  PublicationState.RESERVE,
  PublicationState.SCHEDULED,
  PublicationState.TECHNICAL,
  PublicationState.REPLAY_ONLINE,
];

export const MoveDatePublicationStateBodySchema: z.ZodObject<
  {
    to: VocabularyIn<typeof COMMANDABLE_PUBLICATION_STATES>;
    expectedVersion: z.ZodInt;
    acknowledgedPromiseCode: z.ZodOptional<z.ZodLiteral<PublicationPromise | null>>;
  },
  z.core.$strip
> = z.object({
  to: vocabularyIn(COMMANDABLE_PUBLICATION_STATES).meta({
    'x-arthome-vocabulary-source': 'PUBLICATION_STATES',
    'x-arthome-vocabulary-narrowing':
      '`live` and `ended` are not commands: they are caused by a streaming event, because only streaming knows whether the feed is arriving. Offering them would let a studio declare a date on air that is sending nothing.',
    description:
      "**A strict narrowing of `PUBLICATION_STATES`, and the two missing members carry the\ndocument's most important rule about this path.** `live` and `ended` are **not\ncommands**: they are caused by a `streaming` event, because only `streaming` knows\nwhether the feed is arriving. Publication does not command the broadcast, it learns\nof it. Offering them here would let a studio declare a date on air that is sending\nnothing.\n",
  }),
  expectedVersion: z.int().meta({ minimum: undefined, maximum: undefined }),
  acknowledgedPromiseCode: z
    .literal([...PUBLICATION_PROMISES, null])
    .meta({
      type: ['string', 'null'],
      'x-arthome-vocabulary-source': 'PUBLICATION_PROMISES',
      description:
        "**Mandatory for a transition with no way back.** The confirmation carries the promise's\ncode, and its wording comes from the contract: the interface does not invent it.\nMissing or different, the transition is refused with `publication.promise_unacknowledged`\nand the promise to confirm.\n",
    })
    .optional(),
});

export const SetDateReplayPolicyBodySchema: z.ZodObject<
  {
    policy: VocabularyIn<typeof REPLAY_POLICIES>;
    windowHours: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
  },
  z.core.$strip
> = z.object({
  policy: vocabularyIn(REPLAY_POLICIES).meta({
    'x-arthome-vocabulary-source': 'REPLAY_POLICIES',
  }),
  windowHours: z.int().min(1).meta({ maximum: undefined }).nullable().optional(),
});

export const DuplicateDateBodySchema: z.ZodObject<
  {
    newDateId: z.ZodString;
    startsAt: z.ZodString;
    applyToSeries: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
  },
  z.core.$strip
> = z.object({
  newDateId: uuidOut().meta({ description: 'Generated client-side by the domain.' }),
  startsAt: z
    .string()
    .regex(new RegExp('^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$'))
    .meta({ format: 'date-time' }),
  applyToSeries: z.boolean().default(false).optional(),
});

export const DecideDateOutcomeBodySchema: z.ZodObject<
  {
    outcome: VocabularyIn<typeof DATE_OUTCOMES>;
    message: z.ZodObject<{ contentLanguage: z.ZodString; text: z.ZodString }, z.core.$strip>;
    rescheduledTo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    expectedVersion: z.ZodInt;
  },
  z.core.$strip
> = z.object({
  outcome: vocabularyIn(DATE_OUTCOMES).meta({ 'x-arthome-vocabulary-source': 'DATE_OUTCOMES' }),
  message: z.object({ contentLanguage: z.string(), text: z.string().max(600) }),
  rescheduledTo: z
    .string()
    .regex(new RegExp('^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$'))
    .nullable()
    .meta({
      format: 'date-time',
      description: '**Required, and only permitted,** for `postponed`.',
    })
    .optional(),
  expectedVersion: z.int().meta({ minimum: undefined, maximum: undefined }),
});

export const DateOutcomeDecisionSchema: z.ZodObject<
  {
    outcome: z.ZodOptional<z.ZodString>;
    declaredAt: z.ZodOptional<z.ZodString>;
    moneyEffectCode: z.ZodOptional<z.ZodString>;
    affectedSeats: z.ZodOptional<z.ZodInt>;
  },
  z.core.$loose
> = z.looseObject({
  outcome: z.string().optional(),
  declaredAt: InstantOut.optional(),
  moneyEffectCode: z
    .string()
    .meta({
      description:
        '`full_refund` · `account_credit` · `no_movement`. A **code**, never a sentence.',
    })
    .optional(),
  affectedSeats: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
});

export type DatePublicPane = z.output<typeof DatePublicPaneSchema>;
export type DateReplayPane = z.output<typeof DateReplayPaneSchema>;
export type MoveDatePublicationStateBody = z.output<typeof MoveDatePublicationStateBodySchema>;
export type SetDateReplayPolicyBody = z.output<typeof SetDateReplayPolicyBodySchema>;
export type DuplicateDateBody = z.output<typeof DuplicateDateBodySchema>;
export type DecideDateOutcomeBody = z.output<typeof DecideDateOutcomeBodySchema>;
export type DateOutcomeDecision = z.output<typeof DateOutcomeDecisionSchema>;
