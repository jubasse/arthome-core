import { z } from 'zod';
import { CHAT_MODES, FILTER_SEVERITIES } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { MoneyOut } from '@arthome/core/schema';
import { StudioEnvelopeMetaSchema } from '../../envelope/index.js';
import type { PathParameter, Period, QueryParameter } from '../../http/index.js';
import { MerchItemAdminSchema } from '../../studio-stage/index.js';
declare const CHANNEL_REPLAY_STATES: readonly ["online", "expired", "archived"];
export declare const ChannelReplayStateParameter: QueryParameter<'state', VocabularyIn<typeof CHANNEL_REPLAY_STATES>>;
export declare const ChannelReplaySchema: z.ZodObject<{
    dateId: z.ZodString;
    title: z.ZodString;
    state: z.ZodString;
    expiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    durationSec: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    views: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    revenue: z.ZodOptional<typeof MoneyOut>;
}, z.core.$loose>;
export declare const ChannelIdentitySchema: z.ZodObject<{
    publicName: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.ZodString>;
    verified: z.ZodOptional<z.ZodBoolean>;
    version: z.ZodOptional<z.ZodInt>;
}, z.core.$loose>;
export declare const ModerationDefaultsSchema: z.ZodObject<{
    filterSeverity: z.ZodOptional<z.ZodString>;
    slowModeSec: z.ZodOptional<z.ZodInt>;
    holdersOnly: z.ZodOptional<z.ZodBoolean>;
    retroactiveFilter: z.ZodOptional<z.ZodBoolean>;
    chatMode: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodInt>;
}, z.core.$loose>;
export declare const ChannelSettingsSchema: z.ZodObject<{
    identity: z.ZodOptional<typeof ChannelIdentitySchema>;
    moderationDefaults: z.ZodOptional<typeof ModerationDefaultsSchema>;
    merchIntegration: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        source: z.ZodOptional<z.ZodString>;
        merchantUrl: z.ZodOptional<z.ZodString>;
        connectedAt: z.ZodOptional<z.ZodString>;
        lastSyncedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$loose>>>;
}, z.core.$loose>;
declare const INGEST_PROTOCOLS: readonly ["rtmps", "srt", "whip"];
export declare const UpdateChannelSettingsBodySchema: z.ZodObject<{
    moderationDefaults: z.ZodOptional<z.ZodObject<{
        filterSeverity: z.ZodOptional<VocabularyIn<typeof FILTER_SEVERITIES>>;
        slowModeSec: z.ZodOptional<z.ZodInt>;
        holdersOnly: z.ZodOptional<z.ZodBoolean>;
        retroactiveFilter: z.ZodOptional<z.ZodBoolean>;
        chatMode: z.ZodOptional<VocabularyIn<typeof CHAT_MODES>>;
    }, z.core.$strip>>;
    broadcastDefaults: z.ZodOptional<z.ZodObject<{
        ingestProtocol: z.ZodOptional<VocabularyIn<typeof INGEST_PROTOCOLS>>;
        holdScreenAutoAfterSec: z.ZodOptional<z.ZodInt>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const ChannelDefaultsSchema: z.ZodObject<{
    moderationDefaults: z.ZodOptional<typeof ModerationDefaultsSchema>;
    broadcastDefaults: z.ZodOptional<z.ZodObject<{
        ingestProtocol: z.ZodOptional<z.ZodString>;
        holdScreenAutoAfterSec: z.ZodOptional<z.ZodInt>;
    }, z.core.$loose>>;
    version: z.ZodInt;
}, z.core.$loose>;
declare const JOURNAL_NATURES: readonly ["air", "mod", "event", "access", "money"];
export declare const JournalPeriod: Period;
export declare const JournalNatureParameter: QueryParameter<'nature', VocabularyIn<typeof JOURNAL_NATURES>>;
export declare const JournalDateParameter: QueryParameter<'dateId', z.ZodString>;
export declare const MerchItemIdParameter: PathParameter<'itemId', z.ZodString>;
export declare const UpsertMerchItemBodySchema: z.ZodObject<{
    showId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    labels: z.ZodArray<z.ZodObject<{
        contentLanguage: z.ZodString;
        text: z.ZodString;
    }, z.core.$strip>>;
    variants: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        stock: z.ZodInt;
        priceMinor: z.ZodInt;
        currencyCode: z.ZodString;
    }, z.core.$strip>>;
    expectedVersion: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
}, z.core.$strip>;
export declare const UpdateChannelIdentityBodySchema: z.ZodObject<{
    publicName: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    biography: z.ZodOptional<z.ZodArray<z.ZodObject<{
        contentLanguage: z.ZodString;
        text: z.ZodString;
    }, z.core.$strip>>>;
    categoryId: z.ZodOptional<z.ZodString>;
    avatarAssetId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const MerchItemListSchema: z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
    items: z.ZodArray<typeof MerchItemAdminSchema>;
}, z.core.$loose>>;
export type ChannelReplay = z.output<typeof ChannelReplaySchema>;
export type ChannelIdentity = z.output<typeof ChannelIdentitySchema>;
export type ChannelSettings = z.output<typeof ChannelSettingsSchema>;
export type UpdateChannelSettingsBody = z.output<typeof UpdateChannelSettingsBodySchema>;
export type ChannelDefaults = z.output<typeof ChannelDefaultsSchema>;
export type UpsertMerchItemBody = z.output<typeof UpsertMerchItemBodySchema>;
export type UpdateChannelIdentityBody = z.output<typeof UpdateChannelIdentityBodySchema>;
export type MerchItemList = z.output<typeof MerchItemListSchema>;
export type ModerationDefaults = z.output<typeof ModerationDefaultsSchema>;
export {};
//# sourceMappingURL=schemas.d.ts.map