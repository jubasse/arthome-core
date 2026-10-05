import { z } from 'zod';
import { AUDIENCE_SANCTIONS, CHAT_MODES, FILTER_SEVERITIES, MEMBER_ROLES, MODERATION_REASONS, PAYOUT_STATES, REPLAY_POLICIES } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { MoneyOut } from '@arthome/core/schema';
import { StudioEnvelopeMetaSchema } from '../../envelope/index.js';
import type { PathParameter, Period, QueryParameter } from '../../http/index.js';
import { Deleted } from '../../http/index.js';
import { OffsetPageInfoSchema } from '../../pagination/index.js';
import { ChannelMemberSchema } from '../../studio-access/index.js';
import { BankChangeRequestSchema, PayoutLineSchema, StatsAudienceSchema, StatsSeriesSchema } from '../../studio-money/index.js';
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
    items: z.ZodArray<typeof ChannelMemberSchema>;
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
export declare const MemberRoleParameter: QueryParameter<'role', VocabularyIn<typeof MEMBER_ROLES>>;
export declare const MemberSearch: QueryParameter<'q', z.ZodString>;
export declare const PersonIdParameter: PathParameter<'personId', z.ZodString>;
export declare const ChannelMemberPageSchema: z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
    items: z.ZodArray<typeof ChannelMemberSchema>;
    roleCounts: z.ZodObject<Record<never, never>, z.core.$catchall<z.ZodInt>>;
    page: typeof OffsetPageInfoSchema;
}, z.core.$loose>>;
export declare const InviteMemberBodySchema: z.ZodObject<{
    email: z.ZodString;
    roles: z.ZodArray<VocabularyIn<typeof MEMBER_ROLES>>;
    note: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const ChangeMemberRolesBodySchema: z.ZodObject<{
    roles: z.ZodArray<VocabularyIn<typeof MEMBER_ROLES>>;
    expectedVersion: z.ZodInt;
}, z.core.$strip>;
export declare const TransferChannelOwnershipBodySchema: z.ZodObject<{
    reauthToken: z.ZodString;
    toPersonId: z.ZodString;
}, z.core.$strip>;
export declare const OwnershipTransferSchema: z.ZodOptional<z.ZodObject<{
    state: z.ZodOptional<z.ZodString>;
    expiresAt: z.ZodOptional<z.ZodString>;
}, z.core.$loose>>;
export type ChannelMemberPage = z.output<typeof ChannelMemberPageSchema>;
export type InviteMemberBody = z.output<typeof InviteMemberBodySchema>;
export type ChangeMemberRolesBody = z.output<typeof ChangeMemberRolesBodySchema>;
export type TransferChannelOwnershipBody = z.output<typeof TransferChannelOwnershipBodySchema>;
export type OwnershipTransfer = z.output<typeof OwnershipTransferSchema>;
declare const EVENTS_WINDOWS: readonly ["upcoming", "past"];
export declare const EventsWindowParameter: QueryParameter<'window', z.ZodDefault<VocabularyIn<typeof EVENTS_WINDOWS>>>;
export declare const EventStatesParameter: QueryParameter<'states', z.ZodString>;
export declare const EventSearch: QueryParameter<'q', z.ZodString>;
declare const STATS_PERIOD_PRESETS: readonly ["last_7_days", "last_30_days", "last_90_days", "season", "custom"];
export declare const StatsPeriodPresetParameter: QueryParameter<'period', z.ZodDefault<VocabularyIn<typeof STATS_PERIOD_PRESETS>>>;
export declare const DashboardPeriod: Period<false>;
export declare const StatsPeriod: Period<false>;
export declare const AgendaPeriod: Period;
declare const STATS_TABS: readonly ["audience", "series"];
export declare const StatsTabParameter: QueryParameter<'tab', z.ZodDefault<VocabularyIn<typeof STATS_TABS>>>;
export declare const StatsShowParameter: QueryParameter<'showId', z.ZodString>;
export declare const StatsAnswerSchema: z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
    audience: z.ZodOptional<typeof StatsAudienceSchema>;
    series: z.ZodOptional<typeof StatsSeriesSchema>;
}, z.core.$loose>>;
export declare const AgendaListSchema: z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
    items: z.ZodArray<typeof ChannelMemberSchema>;
}, z.core.$loose>>;
export type StatsAnswer = z.output<typeof StatsAnswerSchema>;
export type AgendaList = z.output<typeof AgendaListSchema>;
export declare const PayoutStateParameter: QueryParameter<'state', VocabularyIn<typeof PAYOUT_STATES>>;
export declare const PayoutPageSchema: z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
    items: z.ZodArray<typeof PayoutLineSchema>;
    balances: z.ZodArray<typeof MoneyOut>;
    pendingBankChange: z.ZodOptional<typeof BankChangeRequestSchema>;
    page: typeof OffsetPageInfoSchema;
}, z.core.$loose>>;
export declare const RequestBankChangeBodySchema: z.ZodObject<{
    reauthToken: z.ZodString;
    stripeSetupRef: z.ZodString;
}, z.core.$strip>;
export declare const ReconciliationPeriodIdParameter: PathParameter<'periodId', z.ZodString>;
export declare const CloseReconciliationPeriodBodySchema: z.ZodObject<{
    explanations: z.ZodOptional<z.ZodArray<z.ZodObject<{
        payoutId: z.ZodOptional<z.ZodString>;
        note: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const ReconciliationClosureSchema: z.ZodOptional<z.ZodObject<{
    periodId: z.ZodOptional<z.ZodString>;
    closedAt: z.ZodOptional<z.ZodString>;
}, z.core.$loose>>;
declare const EXPORT_KINDS: readonly ["sales_csv", "fec", "sage", "cegid", "grouped_invoices", "journal", "schedule_ics", "stats_csv"];
export declare const RequestChannelExportBodySchema: z.ZodObject<{
    kind: VocabularyIn<typeof EXPORT_KINDS>;
    from: z.ZodString;
    to: z.ZodString;
}, z.core.$strip>;
export type PayoutPage = z.output<typeof PayoutPageSchema>;
export type RequestBankChangeBody = z.output<typeof RequestBankChangeBodySchema>;
export type CloseReconciliationPeriodBody = z.output<typeof CloseReconciliationPeriodBodySchema>;
export type ReconciliationClosure = z.output<typeof ReconciliationClosureSchema>;
export type RequestChannelExportBody = z.output<typeof RequestChannelExportBodySchema>;
declare const MODERATION_QUEUE_FILTERS: readonly ["all", "pending", "settled"];
export declare const ModerationDateParameter: QueryParameter<'dateId', z.ZodString>;
export declare const ModerationQueueFilterParameter: QueryParameter<'filter', z.ZodDefault<VocabularyIn<typeof MODERATION_QUEUE_FILTERS>>>;
export declare const ModerationSearch: QueryParameter<'q', z.ZodString>;
export declare const AudienceSearch: QueryParameter<'q', z.ZodString>;
export declare const PresentOnDateParameter: QueryParameter<'presentOnDateId', z.ZodString>;
export declare const AudienceSanctionParameter: QueryParameter<'sanction', VocabularyIn<typeof AUDIENCE_SANCTIONS>>;
export declare const AudienceMemberIdParameter: PathParameter<'memberId', z.ZodString>;
export declare const SanctionAudienceMemberBodySchema: z.ZodObject<{
    kind: VocabularyIn<typeof AUDIENCE_SANCTIONS>;
    expiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    reason: z.ZodOptional<VocabularyIn<typeof MODERATION_REASONS>>;
}, z.core.$strip>;
export declare const BannedWordParameter: PathParameter<'word', z.ZodString>;
export declare const AddBannedWordBodySchema: z.ZodObject<{
    word: z.ZodString;
    retroactive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const BannedWordAdditionSchema: z.ZodOptional<z.ZodObject<{
    word: z.ZodOptional<z.ZodString>;
    reprocessing: z.ZodOptional<z.ZodBoolean>;
    estimatedAffectedMessages: z.ZodOptional<z.ZodInt>;
}, z.core.$loose>>;
export type SanctionAudienceMemberBody = z.output<typeof SanctionAudienceMemberBodySchema>;
export type AddBannedWordBody = z.output<typeof AddBannedWordBodySchema>;
export type BannedWordAddition = z.output<typeof BannedWordAdditionSchema>;
export declare const ChannelStreamSettingsSchema: z.ZodObject<{
    ingestUrl: z.ZodOptional<z.ZodString>;
    recommendedProtocol: z.ZodOptional<z.ZodString>;
    recommendedBitrateKbps: z.ZodOptional<z.ZodInt>;
    lastMeasuredUpKbps: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    defaults: z.ZodOptional<z.ZodObject<{
        ingestProtocol: z.ZodOptional<z.ZodString>;
        qualityLadder: z.ZodOptional<z.ZodArray<z.ZodString>>;
        holdScreenAutoAfterSec: z.ZodOptional<z.ZodInt>;
    }, z.core.$loose>>;
    recentChecks: z.ZodOptional<z.ZodArray<z.ZodObject<{
        dateId: z.ZodOptional<z.ZodString>;
        passed: z.ZodOptional<z.ZodBoolean>;
        passedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$loose>>>;
    preflightPending: z.ZodOptional<z.ZodInt>;
}, z.core.$loose>;
export declare const TicketingPeriod: Period;
export declare const ChannelTicketingSchema: z.ZodObject<{
    byTier: z.ZodOptional<z.ZodArray<z.ZodObject<{
        tier: z.ZodOptional<z.ZodString>;
        seatsSold: z.ZodOptional<z.ZodInt>;
        gross: z.ZodOptional<typeof MoneyOut>;
    }, z.core.$loose>>>;
    waitlistByDate: z.ZodOptional<z.ZodArray<z.ZodObject<{
        dateId: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        waitlistCount: z.ZodOptional<z.ZodInt>;
    }, z.core.$loose>>>;
    complimentaries: z.ZodOptional<z.ZodArray<z.ZodObject<{
        categoryId: z.ZodOptional<z.ZodString>;
        issued: z.ZodOptional<z.ZodInt>;
        allocated: z.ZodOptional<z.ZodInt>;
    }, z.core.$loose>>>;
    pendingRequests: z.ZodOptional<z.ZodArray<z.ZodObject<{
        requestId: z.ZodString;
        kind: z.ZodString;
        dateId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        seatId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        amount: z.ZodOptional<typeof MoneyOut>;
        openedAt: z.ZodString;
        respondBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$loose>>>;
}, z.core.$loose>;
export declare const CreateDateDraftBodySchema: z.ZodObject<{
    dateId: z.ZodString;
    showId: z.ZodString;
    venueId: z.ZodString;
    startsAt: z.ZodString;
    replayPolicy: VocabularyIn<typeof REPLAY_POLICIES>;
    replayWindowHours: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
}, z.core.$strip>;
export type ChannelStreamSettings = z.output<typeof ChannelStreamSettingsSchema>;
export type ChannelTicketing = z.output<typeof ChannelTicketingSchema>;
export type CreateDateDraftBody = z.output<typeof CreateDateDraftBodySchema>;
export declare const DeleteChannelBodySchema: z.ZodObject<{
    reauthToken: z.ZodString;
    confirmName: z.ZodString;
}, z.core.$strip>;
export type DeleteChannelBody = z.output<typeof DeleteChannelBodySchema>;
export declare const ChannelDeletionAnswerSchema: z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
    data: typeof Deleted;
}, z.core.$loose>>;
export type ChannelDeletionAnswer = z.output<typeof ChannelDeletionAnswerSchema>;
export {};
//# sourceMappingURL=schemas.d.ts.map