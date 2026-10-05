import { z } from 'zod';

import { CHAT_MODES, FILTER_SEVERITIES } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import {
  InstantOut,
  MoneyOut,
  uuidIn,
  uuidOut,
  vocabularyIn,
  vocabularyOut,
  vocabularyOutLocal,
} from '@arthome/core/schema';

import { StudioEnvelopeMetaSchema } from '../../envelope/index.js';
import type { PathParameter, Period, QueryParameter } from '../../http/index.js';
import { localVocabulary, period, restricted } from '../../http/index.js';
import { MerchItemAdminSchema } from '../../studio-stage/index.js';

const CHANNEL_REPLAY_STATES = ['online', 'expired', 'archived'] as const;
const CHANNEL_REPLAY_STATE_REASON =
  "A state machine local to this resource. It is the contract's own, not the domain's: the domain owns the facts, this owns how far a request has got.";

export const ChannelReplayStateParameter: QueryParameter<
  'state',
  VocabularyIn<typeof CHANNEL_REPLAY_STATES>
> = {
  name: 'state',
  in: 'query',
  required: false,
  schema: localVocabulary(CHANNEL_REPLAY_STATES, CHANNEL_REPLAY_STATE_REASON),
};

export const ChannelReplaySchema: z.ZodObject<
  {
    dateId: z.ZodString;
    title: z.ZodString;
    state: z.ZodString;
    expiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    durationSec: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    views: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    revenue: z.ZodOptional<typeof MoneyOut>;
  },
  z.core.$loose
> = z.looseObject({
  dateId: uuidOut(),
  title: z.string(),
  state: vocabularyOutLocal(CHANNEL_REPLAY_STATES, CHANNEL_REPLAY_STATE_REASON),
  expiresAt: InstantOut.nullable().optional(),
  durationSec: z.int().meta({ minimum: undefined, maximum: undefined }).nullable().optional(),
  views: z.int().meta({ minimum: undefined, maximum: undefined }).nullable().optional(),
  revenue: restricted(MoneyOut, 'canRevenue', {
    'x-arthome-tax-basis': 'inclusive',
    description: '**Absent** without `canRevenue`.',
  }),
});

const MERCH_INTEGRATION_SOURCES = [
  'shopify',
  'woocommerce',
  'prestashop',
  'drupal',
  'api',
] as const;

export const ChannelIdentitySchema: z.ZodObject<
  {
    publicName: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.ZodString>;
    verified: z.ZodOptional<z.ZodBoolean>;
    version: z.ZodOptional<z.ZodInt>;
  },
  z.core.$loose
> = z.looseObject({
  publicName: z.string().optional(),
  slug: z.string().optional(),
  categoryId: z.string().optional(),
  verified: z.boolean().optional(),
  version: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
});

export const ModerationDefaultsSchema: z.ZodObject<
  {
    filterSeverity: z.ZodOptional<z.ZodString>;
    slowModeSec: z.ZodOptional<z.ZodInt>;
    holdersOnly: z.ZodOptional<z.ZodBoolean>;
    retroactiveFilter: z.ZodOptional<z.ZodBoolean>;
    chatMode: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodInt>;
  },
  z.core.$loose
> = z
  .looseObject({
    filterSeverity: vocabularyOut(FILTER_SEVERITIES).optional(),
    slowModeSec: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
    holdersOnly: z.boolean().optional(),
    retroactiveFilter: z.boolean().optional(),
    chatMode: vocabularyOut(CHAT_MODES).optional(),
    version: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
  })
  .meta({
    description:
      '**Inherited by a new date at creation**, never applied retroactively\nto an existing date — otherwise a channel setting would change the\nregime of a live show in progress.\n',
  });

export const ChannelSettingsSchema: z.ZodObject<
  {
    identity: z.ZodOptional<typeof ChannelIdentitySchema>;
    moderationDefaults: z.ZodOptional<typeof ModerationDefaultsSchema>;
    merchIntegration: z.ZodOptional<
      z.ZodNullable<
        z.ZodObject<
          {
            source: z.ZodOptional<z.ZodString>;
            merchantUrl: z.ZodOptional<z.ZodString>;
            connectedAt: z.ZodOptional<z.ZodString>;
            lastSyncedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          },
          z.core.$loose
        >
      >
    >;
  },
  z.core.$loose
> = z.looseObject({
  identity: ChannelIdentitySchema.optional(),
  moderationDefaults: ModerationDefaultsSchema.optional(),
  merchIntegration: z
    .looseObject({
      source: vocabularyOutLocal(
        MERCH_INTEGRATION_SOURCES,
        'An external provider or platform identifier. It is their vocabulary, not ours, and it changes when they change.',
      ).optional(),
      merchantUrl: z.string().meta({ format: 'uri' }).optional(),
      connectedAt: InstantOut.optional(),
      lastSyncedAt: InstantOut.nullable().optional(),
    })
    .nullable()
    .meta({
      description: '**One at a time.** `null` when the shop is served by Arthome.',
    })
    .optional(),
});

const INGEST_PROTOCOLS = ['rtmps', 'srt', 'whip'] as const;
const INGEST_PROTOCOL_REASON =
  'A transport or media capability, not a domain notion: the domain never chooses an ingest protocol, a container or a DRM system, and a new one appears because a device appeared.';

export const UpdateChannelSettingsBodySchema: z.ZodObject<
  {
    moderationDefaults: z.ZodOptional<
      z.ZodObject<
        {
          filterSeverity: z.ZodOptional<VocabularyIn<typeof FILTER_SEVERITIES>>;
          slowModeSec: z.ZodOptional<z.ZodInt>;
          holdersOnly: z.ZodOptional<z.ZodBoolean>;
          retroactiveFilter: z.ZodOptional<z.ZodBoolean>;
          chatMode: z.ZodOptional<VocabularyIn<typeof CHAT_MODES>>;
        },
        z.core.$strip
      >
    >;
    broadcastDefaults: z.ZodOptional<
      z.ZodObject<
        {
          ingestProtocol: z.ZodOptional<VocabularyIn<typeof INGEST_PROTOCOLS>>;
          holdScreenAutoAfterSec: z.ZodOptional<z.ZodInt>;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
> = z.object({
  moderationDefaults: z
    .object({
      filterSeverity: vocabularyIn(FILTER_SEVERITIES)
        .meta({ 'x-arthome-vocabulary-source': 'FILTER_SEVERITIES' })
        .optional(),
      slowModeSec: z.int().min(0).max(300).optional(),
      holdersOnly: z.boolean().optional(),
      retroactiveFilter: z.boolean().optional(),
      chatMode: vocabularyIn(CHAT_MODES)
        .meta({ 'x-arthome-vocabulary-source': 'CHAT_MODES' })
        .optional(),
    })
    .optional(),
  broadcastDefaults: z
    .object({
      ingestProtocol: localVocabulary(INGEST_PROTOCOLS, INGEST_PROTOCOL_REASON).optional(),
      holdScreenAutoAfterSec: z.int().min(5).max(120).optional(),
    })
    .optional(),
});

export const ChannelDefaultsSchema: z.ZodObject<
  {
    moderationDefaults: z.ZodOptional<typeof ModerationDefaultsSchema>;
    broadcastDefaults: z.ZodOptional<
      z.ZodObject<
        {
          ingestProtocol: z.ZodOptional<z.ZodString>;
          holdScreenAutoAfterSec: z.ZodOptional<z.ZodInt>;
        },
        z.core.$loose
      >
    >;
    version: z.ZodInt;
  },
  z.core.$loose
> = z.looseObject({
  moderationDefaults: ModerationDefaultsSchema.optional(),
  broadcastDefaults: z
    .looseObject({
      ingestProtocol: vocabularyOutLocal(INGEST_PROTOCOLS, INGEST_PROTOCOL_REASON).optional(),
      holdScreenAutoAfterSec: z.int().meta({ minimum: undefined, maximum: undefined }).optional(),
    })
    .optional(),
  version: z.int().meta({ minimum: undefined, maximum: undefined }),
});

const JOURNAL_NATURES = ['air', 'mod', 'event', 'access', 'money'] as const;

export const JournalPeriod: Period = period({ type: 'dateTime' });

export const JournalNatureParameter: QueryParameter<
  'nature',
  VocabularyIn<typeof JOURNAL_NATURES>
> = {
  name: 'nature',
  in: 'query',
  required: false,
  schema: localVocabulary(
    JOURNAL_NATURES,
    'A vocabulary local to this contract: four of the five are endpoint concerns and a vocabulary of query filters does not belong in the domain. The exception is `money`, which @arthome/core does not produce but DOES reason about — data-model.md:624 and context-map.md:402 key the redaction rule to it, so the `money` kind is absent from the response without canRevenue. Renaming that one member silently falsifies two domain documents; the other four are ours alone.',
  ),
};

export const JournalDateParameter: QueryParameter<'dateId', z.ZodString> = {
  name: 'dateId',
  in: 'query',
  required: false,
  schema: uuidIn(),
};

export const MerchItemIdParameter: PathParameter<'itemId', z.ZodString> = {
  name: 'itemId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const UpsertMerchItemBodySchema: z.ZodObject<
  {
    showId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    labels: z.ZodArray<
      z.ZodObject<{ contentLanguage: z.ZodString; text: z.ZodString }, z.core.$strip>
    >;
    variants: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          label: z.ZodString;
          stock: z.ZodInt;
          priceMinor: z.ZodInt;
          currencyCode: z.ZodString;
        },
        z.core.$strip
      >
    >;
    expectedVersion: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
  },
  z.core.$strip
> = z.object({
  showId: uuidOut().nullable().optional(),
  labels: z
    .array(
      z.object({
        contentLanguage: z.string(),
        text: z.string(),
      }),
    )
    .min(1),
  variants: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        stock: z.int().min(0).meta({ maximum: undefined }),
        priceMinor: z.int().min(0).meta({ maximum: undefined }),
        currencyCode: z.string().regex(new RegExp('^[A-Z]{3}$')),
      }),
    )
    .min(1),
  expectedVersion: z.int().meta({ minimum: undefined, maximum: undefined }).nullable().optional(),
});

export const UpdateChannelIdentityBodySchema: z.ZodObject<
  {
    publicName: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    biography: z.ZodOptional<
      z.ZodArray<z.ZodObject<{ contentLanguage: z.ZodString; text: z.ZodString }, z.core.$strip>>
    >;
    categoryId: z.ZodOptional<z.ZodString>;
    avatarAssetId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$strip
> = z.object({
  publicName: z.string().max(120).optional(),
  slug: z.string().regex(new RegExp('^[a-z0-9-]{3,80}$')).optional(),
  biography: z
    .array(
      z.object({
        contentLanguage: z.string(),
        text: z.string().max(4000),
      }),
    )
    .optional(),
  categoryId: z.string().optional(),
  avatarAssetId: uuidOut().nullable().optional(),
});

export const MerchItemListSchema: z.ZodIntersection<
  typeof StudioEnvelopeMetaSchema,
  z.ZodObject<{ items: z.ZodArray<typeof MerchItemAdminSchema> }, z.core.$loose>
> = z.intersection(
  StudioEnvelopeMetaSchema,
  z.looseObject({
    items: z.array(MerchItemAdminSchema),
  }),
);

export type ChannelReplay = z.output<typeof ChannelReplaySchema>;
export type ChannelIdentity = z.output<typeof ChannelIdentitySchema>;
export type ChannelSettings = z.output<typeof ChannelSettingsSchema>;
export type UpdateChannelSettingsBody = z.output<typeof UpdateChannelSettingsBodySchema>;
export type ChannelDefaults = z.output<typeof ChannelDefaultsSchema>;
export type UpsertMerchItemBody = z.output<typeof UpsertMerchItemBodySchema>;
export type UpdateChannelIdentityBody = z.output<typeof UpdateChannelIdentityBodySchema>;
export type MerchItemList = z.output<typeof MerchItemListSchema>;

export type ModerationDefaults = z.output<typeof ModerationDefaultsSchema>;
