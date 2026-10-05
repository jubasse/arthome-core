import { z } from 'zod';

import type { PublicationPromise } from '@arthome/core';
import {
  BLACKOUT_REASONS,
  CHAT_MODES,
  CREW_ROLES,
  DATE_OUTCOMES,
  FILTER_SEVERITIES,
  INCIDENT_CAUSES,
  INCIDENT_KINDS,
  MESSAGE_STATES,
  MODERATION_BADGES,
  PRICE_TIERS,
  PUBLICATION_PROMISES,
  RUN_STATES,
  PublicationState,
  REPLAY_POLICIES,
  RIGHTS_SCOPES,
} from '@arthome/core';
import type { VocabularyIn, VocabularyOutNullable } from '@arthome/core/schema';
import {
  InstantOut,
  MoneyOut,
  int64,
  uuidIn,
  uuidOut,
  vocabularyIn,
  vocabularyOut,
  vocabularyOutLocal,
  vocabularyOutNullable,
} from '@arthome/core/schema';

import type { PathParameter, QueryParameter } from '../../http/index.js';
import { ReauthProof, restricted } from '../../http/index.js';
import { DateAccessGrantSchema } from '../../studio-access/index.js';
import { ChatPolicySchema } from '../../studio-desk/index.js';
import { DateSalesPaneSchema } from '../../studio-money/index.js';
import { HealthSampleSchema } from '../../studio-stage/index.js';
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

export const SetDatePricesBodySchema: z.ZodObject<
  {
    tiers: z.ZodArray<
      z.ZodObject<
        {
          tier: VocabularyIn<typeof PRICE_TIERS>;
          amountMinor: z.ZodInt;
          currencyCode: z.ZodString;
          active: z.ZodBoolean;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
> = z.object({
  tiers: z.array(
    z.object({
      tier: vocabularyIn(PRICE_TIERS).meta({ 'x-arthome-vocabulary-source': 'PRICE_TIERS' }),
      amountMinor: z.int().min(0).meta({ maximum: undefined }),
      currencyCode: z.string().regex(new RegExp('^[A-Z]{3}$')),
      active: z.boolean(),
    }),
  ),
});

export const OpenCapacityTierBodySchema: z.ZodObject<
  {
    additionalCapacity: z.ZodInt;
    expectedVersion: z.ZodInt;
    notifyWaitlist: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
  },
  z.core.$strip
> = z.object({
  additionalCapacity: z.int().min(1).meta({ maximum: undefined }),
  expectedVersion: z.int().meta({ minimum: undefined, maximum: undefined }),
  notifyWaitlist: z.boolean().default(true).optional(),
});

export const CapacityTierOpeningSchema: z.ZodObject<
  {
    sales: z.ZodOptional<typeof DateSalesPaneSchema>;
    waitlistNotified: z.ZodOptional<z.ZodInt>;
    priorityUntil: z.ZodOptional<z.ZodString>;
  },
  z.core.$loose
> = z.looseObject({
  sales: DateSalesPaneSchema.optional(),
  waitlistNotified: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
  priorityUntil: InstantOut.optional(),
});

export const SetTechnicalProvisionBodySchema: z.ZodObject<
  { provisionedCapacity: z.ZodInt },
  z.core.$strip
> = z.object({
  provisionedCapacity: z.int().min(1).meta({ maximum: undefined }),
});

export const IssueComplimentaryBodySchema: z.ZodObject<
  { categoryId: z.ZodString; quantity: z.ZodInt; note: z.ZodOptional<z.ZodNullable<z.ZodString>> },
  z.core.$strip
> = z.object({
  categoryId: z.string(),
  quantity: z.int().min(1).max(100),
  note: z.string().nullable().optional(),
});

export const ComplimentaryIssueSchema: z.ZodOptional<
  z.ZodObject<
    {
      seatCodes: z.ZodOptional<z.ZodArray<z.ZodString>>;
      sales: z.ZodOptional<typeof DateSalesPaneSchema>;
    },
    z.core.$loose
  >
> = z
  .looseObject({
    seatCodes: z.array(z.string()).optional(),
    sales: DateSalesPaneSchema.optional(),
  })
  .optional();

export const DateChatPaneSchema: z.ZodObject<
  {
    policy: z.ZodOptional<typeof ChatPolicySchema>;
    throughputPerMinute: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    pendingModerationCount: z.ZodOptional<z.ZodInt>;
    assignedModerators: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          { personId: z.ZodOptional<z.ZodString>; displayName: z.ZodOptional<z.ZodString> },
          z.core.$loose
        >
      >
    >;
  },
  z.core.$loose
> = z.looseObject({
  policy: ChatPolicySchema.optional(),
  throughputPerMinute: z
    .int()
    .meta({ minimum: undefined, maximum: undefined })
    .nullable()
    .optional(),
  pendingModerationCount: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
  assignedModerators: z
    .array(z.looseObject({ personId: uuidOut().optional(), displayName: z.string().optional() }))
    .optional(),
});

export const SetDateChatPolicyBodySchema: z.ZodObject<
  {
    mode: z.ZodOptional<VocabularyIn<typeof CHAT_MODES>>;
    filterSeverity: z.ZodOptional<VocabularyIn<typeof FILTER_SEVERITIES>>;
    slowModeSec: z.ZodOptional<z.ZodInt>;
    holdersOnly: z.ZodOptional<z.ZodBoolean>;
    retroactiveFilter: z.ZodOptional<z.ZodBoolean>;
  },
  z.core.$strip
> = z.object({
  mode: vocabularyIn(CHAT_MODES).meta({ 'x-arthome-vocabulary-source': 'CHAT_MODES' }).optional(),
  filterSeverity: vocabularyIn(FILTER_SEVERITIES)
    .meta({ 'x-arthome-vocabulary-source': 'FILTER_SEVERITIES' })
    .optional(),
  slowModeSec: z.int().min(0).max(300).optional(),
  holdersOnly: z.boolean().optional(),
  retroactiveFilter: z.boolean().optional(),
});

export const SinceSeqParameter: QueryParameter<'sinceSeq', z.ZodNumber> = {
  name: 'sinceSeq',
  in: 'query',
  description: 'Resume by sequence number after a channel break.',
  schema: int64(),
};

export const ChatMessageIdParameter: PathParameter<'messageId', z.ZodString> = {
  name: 'messageId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const StudioChatMessageSchema: z.ZodObject<
  {
    id: z.ZodString;
    seq: z.ZodNumber;
    authorHandle: z.ZodString;
    atMediaSec: z.ZodInt;
    sentAt: z.ZodString;
    state: z.ZodString;
    badge: z.ZodString;
    body: typeof StudioLocalizedTextSchema;
  },
  z.core.$loose
> = z.looseObject({
  id: uuidOut(),
  seq: int64(),
  authorHandle: z.string(),
  atMediaSec: z.int().meta({ minimum: undefined, maximum: undefined }),
  sentAt: InstantOut,
  state: vocabularyOut(MESSAGE_STATES),
  badge: vocabularyOut(MODERATION_BADGES).meta({
    description:
      '**Derived** by `moderationBadgeOf` and served. Precedence: banned > silenced > removed > published.',
  }),
  body: StudioLocalizedTextSchema,
});

const INGEST_PROTOCOLS = ['rtmps', 'srt', 'whip'] as const;
const MONITOR_PATHS = ['whep', 'll_hls'] as const;
const MEDIA_CAPABILITY =
  'A transport or media capability, not a domain notion: the domain never chooses an ingest protocol, a container or a DRM system, and a new one appears because a device appeared.';

export const DateTechPaneSchema: z.ZodObject<
  {
    runState: z.ZodOptional<z.ZodString>;
    ingestProtocol: z.ZodOptional<z.ZodString>;
    monitorPath: z.ZodOptional<z.ZodString>;
    ingestUrl: z.ZodOptional<z.ZodString>;
    technicalCheckPassedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    preflight: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodOptional<z.ZodString>;
            satisfied: z.ZodOptional<z.ZodBoolean>;
            measuredAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          },
          z.core.$loose
        >
      >
    >;
    qualityLadder: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            renditionId: z.ZodOptional<z.ZodString>;
            heightPx: z.ZodOptional<z.ZodInt>;
            enabled: z.ZodOptional<z.ZodBoolean>;
          },
          z.core.$loose
        >
      >
    >;
    version: z.ZodOptional<z.ZodInt>;
  },
  z.core.$loose
> = z.looseObject({
  runState: vocabularyOut(RUN_STATES).optional(),
  ingestProtocol: vocabularyOutLocal(INGEST_PROTOCOLS, MEDIA_CAPABILITY).optional(),
  monitorPath: vocabularyOutLocal(MONITOR_PATHS, MEDIA_CAPABILITY).optional(),
  ingestUrl: z.string().meta({ format: 'uri' }).optional(),
  technicalCheckPassedAt: InstantOut.nullable().optional(),
  preflight: z
    .array(
      z.looseObject({
        id: z.string().optional(),
        satisfied: z.boolean().optional(),
        measuredAt: InstantOut.nullable().optional(),
      }),
    )
    .meta({
      description:
        'The pre-flight checklist, **served** — each point with its state and its last measurement.',
    })
    .optional(),
  qualityLadder: z
    .array(
      z.looseObject({
        renditionId: z.string().optional(),
        heightPx: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
        enabled: z.boolean().optional(),
      }),
    )
    .optional(),
  version: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
});

export const TechnicalCheckSchema: z.ZodObject<
  {
    passed: z.ZodOptional<z.ZodBoolean>;
    passedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    failures: z.ZodOptional<z.ZodArray<z.ZodString>>;
    sample: z.ZodOptional<typeof HealthSampleSchema>;
  },
  z.core.$loose
> = z.looseObject({
  passed: z.boolean().optional(),
  passedAt: InstantOut.nullable().optional(),
  failures: z.array(z.string()).optional(),
  sample: HealthSampleSchema.optional(),
});

export const RunTransitionBodySchema: z.ZodObject<{ expectedVersion: z.ZodInt }, z.core.$strip> =
  z.object({
    expectedVersion: z.int().meta({ minimum: undefined, maximum: undefined }),
  });

export const SetQualityProfileBodySchema: z.ZodObject<
  {
    renditions: z.ZodArray<
      z.ZodObject<{ renditionId: z.ZodString; enabled: z.ZodBoolean }, z.core.$strip>
    >;
  },
  z.core.$strip
> = z.object({
  renditions: z.array(z.object({ renditionId: z.string(), enabled: z.boolean() })),
});

export const HealthWindowParameter: QueryParameter<'windowSec', z.ZodDefault<z.ZodInt>> = {
  name: 'windowSec',
  in: 'query',
  required: false,
  description:
    'The window, in seconds, ending now. The server **caps** it and serves back the window it\napplied (`HealthSeries.windowSec`), rather than refusing: an operator asking for too much\nwants a curve, not an error.\n',
  schema: z.int().min(30).max(3600).default(180),
};

export const SubmitHealthSampleBodySchema: z.ZodObject<
  {
    measuredAt: z.ZodString;
    latencyMs: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    deviceUpKbps: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    jitterMs: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
  },
  z.core.$strip
> = z.object({
  measuredAt: z
    .string()
    .regex(new RegExp('^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$'))
    .meta({ format: 'date-time' }),
  latencyMs: z.int().meta({ minimum: undefined, maximum: undefined }).nullable().optional(),
  deviceUpKbps: z.int().meta({ minimum: undefined, maximum: undefined }).nullable().optional(),
  jitterMs: z.int().meta({ minimum: undefined, maximum: undefined }).nullable().optional(),
});

export const ChapterIdParameter: PathParameter<'chapterId', z.ZodString> = {
  name: 'chapterId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const PostChapterBodySchema: z.ZodObject<
  { chapterId: z.ZodString; vocabId: z.ZodString; atMediaSec: z.ZodInt },
  z.core.$strip
> = z.object({
  chapterId: uuidOut(),
  vocabId: z.string(),
  atMediaSec: z.int().min(0).meta({ maximum: undefined }),
});

export const ChapterSchema: z.ZodOptional<
  z.ZodObject<
    {
      id: z.ZodOptional<z.ZodString>;
      vocabId: z.ZodOptional<z.ZodString>;
      atMediaSec: z.ZodOptional<z.ZodInt>;
    },
    z.core.$loose
  >
> = z
  .looseObject({
    id: uuidOut().optional(),
    vocabId: z.string().optional(),
    atMediaSec: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
  })
  .optional();

export const IncidentIdParameter: PathParameter<'incidentId', z.ZodString> = {
  name: 'incidentId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const RaiseIncidentBodySchema: z.ZodObject<
  {
    incidentId: z.ZodString;
    kind: VocabularyIn<typeof INCIDENT_KINDS>;
    cause: VocabularyIn<typeof INCIDENT_CAUSES>;
    message: z.ZodObject<{ contentLanguage: z.ZodString; text: z.ZodString }, z.core.$strip>;
  },
  z.core.$strip
> = z.object({
  incidentId: uuidOut(),
  kind: vocabularyIn(INCIDENT_KINDS).meta({ 'x-arthome-vocabulary-source': 'INCIDENT_KINDS' }),
  cause: vocabularyIn(INCIDENT_CAUSES).meta({ 'x-arthome-vocabulary-source': 'INCIDENT_CAUSES' }),
  message: z.object({ contentLanguage: z.string(), text: z.string().max(400) }),
});

export const RotateStreamKeyBodySchema: z.ZodObject<
  { reauthToken: z.ZodString; confirmDuringRun: z.ZodOptional<z.ZodDefault<z.ZodBoolean>> },
  z.core.$strip
> = ReauthProof.extend({
  confirmDuringRun: z.boolean().default(false).optional(),
});

const CREW_MEMBERSHIP_KINDS = ['member', 'grant'] as const;

export const DateCrewPaneSchema: z.ZodObject<
  {
    slots: z.ZodArray<
      z.ZodObject<
        {
          crewRole: z.ZodString;
          covered: z.ZodBoolean;
          personId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          displayName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          membershipKind: z.ZodOptional<z.ZodString>;
        },
        z.core.$loose
      >
    >;
    grants: z.ZodArray<typeof DateAccessGrantSchema>;
    missingRoles: z.ZodOptional<z.ZodArray<z.ZodString>>;
  },
  z.core.$loose
> = z.looseObject({
  slots: z
    .array(
      z.looseObject({
        crewRole: vocabularyOut(CREW_ROLES),
        covered: z.boolean(),
        personId: uuidOut().nullable().optional(),
        displayName: z.string().nullable().optional(),
        membershipKind: vocabularyOutLocal(
          CREW_MEMBERSHIP_KINDS,
          'A vocabulary local to this contract. The domain neither produces nor consumes these values — they describe what this endpoint offers, and a new member is an endpoint change.',
        )
          .meta({
            description:
              '**The two scales, distinguished on read**: `member` is a permanent\nmembership assigned to a post, `grant` is a one-off stand-in\nthat expires.\n',
          })
          .optional(),
      }),
    )
    .meta({
      description: 'One post per slot, covered or not. **`missing` is served, never inferred.**',
    }),
  grants: z.array(DateAccessGrantSchema),
  missingRoles: z.array(z.string()).optional(),
});

export const GrantDateAccessBodySchema: z.ZodObject<
  { personId: z.ZodString; crewRole: VocabularyIn<typeof CREW_ROLES>; expiresAt: z.ZodString },
  z.core.$strip
> = z.object({
  personId: uuidOut(),
  crewRole: vocabularyIn(CREW_ROLES).meta({ 'x-arthome-vocabulary-source': 'CREW_ROLES' }),
  expiresAt: z
    .string()
    .regex(new RegExp('^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$'))
    .meta({ format: 'date-time' }),
});

export const PinMerchDuringLiveBodySchema: z.ZodObject<
  { itemId: z.ZodOptional<z.ZodNullable<z.ZodString>> },
  z.core.$strip
> = z.object({
  itemId: uuidOut().nullable().meta({ description: '`null` removes the pin.' }).optional(),
});

export const MerchPinSchema: z.ZodOptional<
  z.ZodObject<{ pinnedItemId: z.ZodOptional<z.ZodNullable<z.ZodString>> }, z.core.$loose>
> = z.looseObject({ pinnedItemId: uuidOut().nullable().optional() }).optional();

export const ReopenReplayWindowBodySchema: z.ZodObject<
  { additionalHours: z.ZodInt },
  z.core.$strip
> = z.object({
  additionalHours: z.int().min(1).max(720),
});

export const ReplayWindowSchema: z.ZodOptional<
  z.ZodObject<
    { expiresAt: z.ZodOptional<z.ZodString>; windowHours: z.ZodOptional<z.ZodInt> },
    z.core.$loose
  >
> = z
  .looseObject({
    expiresAt: InstantOut.optional(),
    windowHours: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
  })
  .optional();

export type DatePublicPane = z.output<typeof DatePublicPaneSchema>;
export type DateReplayPane = z.output<typeof DateReplayPaneSchema>;
export type MoveDatePublicationStateBody = z.output<typeof MoveDatePublicationStateBodySchema>;
export type SetDateReplayPolicyBody = z.output<typeof SetDateReplayPolicyBodySchema>;
export type DuplicateDateBody = z.output<typeof DuplicateDateBodySchema>;
export type DecideDateOutcomeBody = z.output<typeof DecideDateOutcomeBodySchema>;
export type DateOutcomeDecision = z.output<typeof DateOutcomeDecisionSchema>;

export type SetDatePricesBody = z.output<typeof SetDatePricesBodySchema>;
export type OpenCapacityTierBody = z.output<typeof OpenCapacityTierBodySchema>;
export type CapacityTierOpening = z.output<typeof CapacityTierOpeningSchema>;
export type SetTechnicalProvisionBody = z.output<typeof SetTechnicalProvisionBodySchema>;
export type IssueComplimentaryBody = z.output<typeof IssueComplimentaryBodySchema>;
export type ComplimentaryIssue = z.output<typeof ComplimentaryIssueSchema>;
export type DateChatPane = z.output<typeof DateChatPaneSchema>;
export type SetDateChatPolicyBody = z.output<typeof SetDateChatPolicyBodySchema>;
export type StudioChatMessage = z.output<typeof StudioChatMessageSchema>;
export type DateTechPane = z.output<typeof DateTechPaneSchema>;
export type TechnicalCheck = z.output<typeof TechnicalCheckSchema>;
export type RunTransitionBody = z.output<typeof RunTransitionBodySchema>;
export type SetQualityProfileBody = z.output<typeof SetQualityProfileBodySchema>;
export type SubmitHealthSampleBody = z.output<typeof SubmitHealthSampleBodySchema>;
export type PostChapterBody = z.output<typeof PostChapterBodySchema>;
export type Chapter = z.output<typeof ChapterSchema>;
export type RaiseIncidentBody = z.output<typeof RaiseIncidentBodySchema>;
export type RotateStreamKeyBody = z.output<typeof RotateStreamKeyBodySchema>;
export type DateCrewPane = z.output<typeof DateCrewPaneSchema>;
export type GrantDateAccessBody = z.output<typeof GrantDateAccessBodySchema>;
export type PinMerchDuringLiveBody = z.output<typeof PinMerchDuringLiveBodySchema>;
export type MerchPin = z.output<typeof MerchPinSchema>;
export type ReopenReplayWindowBody = z.output<typeof ReopenReplayWindowBodySchema>;
export type ReplayWindow = z.output<typeof ReplayWindowSchema>;
