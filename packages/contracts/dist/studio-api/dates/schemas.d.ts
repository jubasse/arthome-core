import { z } from 'zod';
import type { PublicationPromise } from '@arthome/core';
import { CHAT_MODES, CREW_ROLES, DATE_OUTCOMES, FILTER_SEVERITIES, INCIDENT_CAUSES, INCIDENT_KINDS, PRICE_TIERS, PublicationState, REPLAY_POLICIES } from '@arthome/core';
import type { VocabularyIn, VocabularyOutNullable } from '@arthome/core/schema';
import { MoneyOut } from '@arthome/core/schema';
import type { PathParameter, QueryParameter } from '../../http/index.js';
import { DateAccessGrantSchema } from '../../studio-access/index.js';
import { ChatPolicySchema } from '../../studio-desk/index.js';
import { DateSalesPaneSchema } from '../../studio-money/index.js';
import { HealthSampleSchema } from '../../studio-stage/index.js';
import { StudioLocalizedTextSchema } from '../../text/index.js';
export declare const DatePublicPaneSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.ZodString>;
    genreIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    tagIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    synopsis: z.ZodOptional<typeof StudioLocalizedTextSchema>;
    slug: z.ZodOptional<z.ZodString>;
    canonicalUrl: z.ZodOptional<z.ZodString>;
    rights: z.ZodOptional<z.ZodObject<{
        scope: z.ZodOptional<z.ZodString>;
        blackoutCountries: z.ZodOptional<z.ZodArray<z.ZodString>>;
        blackoutReasonCode: z.ZodOptional<VocabularyOutNullable>;
    }, z.core.$loose>>;
    version: z.ZodOptional<z.ZodInt>;
}, z.core.$loose>;
export declare const DateReplayPaneSchema: z.ZodObject<{
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
}, z.core.$loose>;
declare const COMMANDABLE_PUBLICATION_STATES: readonly [
    typeof PublicationState.DRAFT,
    typeof PublicationState.RESERVE,
    typeof PublicationState.SCHEDULED,
    typeof PublicationState.TECHNICAL,
    typeof PublicationState.REPLAY_ONLINE
];
export declare const MoveDatePublicationStateBodySchema: z.ZodObject<{
    to: VocabularyIn<typeof COMMANDABLE_PUBLICATION_STATES>;
    expectedVersion: z.ZodInt;
    acknowledgedPromiseCode: z.ZodOptional<z.ZodLiteral<PublicationPromise | null>>;
}, z.core.$strip>;
export declare const SetDateReplayPolicyBodySchema: z.ZodObject<{
    policy: VocabularyIn<typeof REPLAY_POLICIES>;
    windowHours: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
}, z.core.$strip>;
export declare const DuplicateDateBodySchema: z.ZodObject<{
    newDateId: z.ZodString;
    startsAt: z.ZodString;
    applyToSeries: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const DecideDateOutcomeBodySchema: z.ZodObject<{
    outcome: VocabularyIn<typeof DATE_OUTCOMES>;
    message: z.ZodObject<{
        contentLanguage: z.ZodString;
        text: z.ZodString;
    }, z.core.$strip>;
    rescheduledTo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    expectedVersion: z.ZodInt;
}, z.core.$strip>;
export declare const DateOutcomeDecisionSchema: z.ZodObject<{
    outcome: z.ZodOptional<z.ZodString>;
    declaredAt: z.ZodOptional<z.ZodString>;
    moneyEffectCode: z.ZodOptional<z.ZodString>;
    affectedSeats: z.ZodOptional<z.ZodInt>;
    version: z.ZodOptional<z.ZodInt>;
}, z.core.$loose>;
export declare const SetDatePricesBodySchema: z.ZodObject<{
    tiers: z.ZodArray<z.ZodObject<{
        tier: VocabularyIn<typeof PRICE_TIERS>;
        amountMinor: z.ZodInt;
        currencyCode: z.ZodString;
        active: z.ZodBoolean;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const OpenCapacityTierBodySchema: z.ZodObject<{
    additionalCapacity: z.ZodInt;
    expectedVersion: z.ZodInt;
    notifyWaitlist: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const CapacityTierOpeningSchema: z.ZodObject<{
    sales: z.ZodOptional<typeof DateSalesPaneSchema>;
    waitlistNotified: z.ZodOptional<z.ZodInt>;
    priorityUntil: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodInt>;
}, z.core.$loose>;
export declare const SetTechnicalProvisionBodySchema: z.ZodObject<{
    provisionedCapacity: z.ZodInt;
}, z.core.$strip>;
export declare const IssueComplimentaryBodySchema: z.ZodObject<{
    categoryId: z.ZodString;
    quantity: z.ZodInt;
    note: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const ComplimentaryIssueSchema: z.ZodOptional<z.ZodObject<{
    seatCodes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    sales: z.ZodOptional<typeof DateSalesPaneSchema>;
}, z.core.$loose>>;
export declare const DateChatPaneSchema: z.ZodObject<{
    policy: z.ZodOptional<typeof ChatPolicySchema>;
    throughputPerMinute: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    pendingModerationCount: z.ZodOptional<z.ZodInt>;
    assignedModerators: z.ZodOptional<z.ZodArray<z.ZodObject<{
        personId: z.ZodOptional<z.ZodString>;
        displayName: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>>>;
}, z.core.$loose>;
export declare const SetDateChatPolicyBodySchema: z.ZodObject<{
    mode: z.ZodOptional<VocabularyIn<typeof CHAT_MODES>>;
    filterSeverity: z.ZodOptional<VocabularyIn<typeof FILTER_SEVERITIES>>;
    slowModeSec: z.ZodOptional<z.ZodInt>;
    holdersOnly: z.ZodOptional<z.ZodBoolean>;
    retroactiveFilter: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const SinceSeqParameter: QueryParameter<'sinceSeq', z.ZodNumber>;
export declare const ChatMessageIdParameter: PathParameter<'messageId', z.ZodString>;
export declare const StudioChatMessageSchema: z.ZodObject<{
    id: z.ZodString;
    seq: z.ZodNumber;
    authorHandle: z.ZodString;
    atMediaSec: z.ZodInt;
    sentAt: z.ZodString;
    state: z.ZodString;
    badge: z.ZodString;
    body: typeof StudioLocalizedTextSchema;
}, z.core.$loose>;
export declare const DateTechPaneSchema: z.ZodObject<{
    runState: z.ZodOptional<z.ZodString>;
    ingestProtocol: z.ZodOptional<z.ZodString>;
    monitorPath: z.ZodOptional<z.ZodString>;
    ingestUrl: z.ZodOptional<z.ZodString>;
    technicalCheckPassedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    preflight: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        satisfied: z.ZodOptional<z.ZodBoolean>;
        measuredAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$loose>>>;
    qualityLadder: z.ZodOptional<z.ZodArray<z.ZodObject<{
        renditionId: z.ZodOptional<z.ZodString>;
        heightPx: z.ZodOptional<z.ZodInt>;
        enabled: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$loose>>>;
    version: z.ZodOptional<z.ZodInt>;
}, z.core.$loose>;
export declare const TechnicalCheckSchema: z.ZodObject<{
    passed: z.ZodOptional<z.ZodBoolean>;
    passedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    failures: z.ZodOptional<z.ZodArray<z.ZodString>>;
    sample: z.ZodOptional<typeof HealthSampleSchema>;
}, z.core.$loose>;
export declare const RunTransitionBodySchema: z.ZodObject<{
    expectedVersion: z.ZodInt;
}, z.core.$strip>;
export declare const SetQualityProfileBodySchema: z.ZodObject<{
    renditions: z.ZodArray<z.ZodObject<{
        renditionId: z.ZodString;
        enabled: z.ZodBoolean;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const HealthWindowParameter: QueryParameter<'windowSec', z.ZodDefault<z.ZodInt>>;
export declare const SubmitHealthSampleBodySchema: z.ZodObject<{
    measuredAt: z.ZodString;
    latencyMs: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    deviceUpKbps: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    jitterMs: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
}, z.core.$strip>;
export declare const ChapterIdParameter: PathParameter<'chapterId', z.ZodString>;
export declare const PostChapterBodySchema: z.ZodObject<{
    chapterId: z.ZodString;
    vocabId: z.ZodString;
    atMediaSec: z.ZodInt;
}, z.core.$strip>;
export declare const ChapterSchema: z.ZodOptional<z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    vocabId: z.ZodOptional<z.ZodString>;
    atMediaSec: z.ZodOptional<z.ZodInt>;
}, z.core.$loose>>;
export declare const IncidentIdParameter: PathParameter<'incidentId', z.ZodString>;
export declare const RaiseIncidentBodySchema: z.ZodObject<{
    incidentId: z.ZodString;
    kind: VocabularyIn<typeof INCIDENT_KINDS>;
    cause: VocabularyIn<typeof INCIDENT_CAUSES>;
    message: z.ZodObject<{
        contentLanguage: z.ZodString;
        text: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const RotateStreamKeyBodySchema: z.ZodObject<{
    reauthToken: z.ZodString;
    confirmDuringRun: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const DateCrewPaneSchema: z.ZodObject<{
    slots: z.ZodArray<z.ZodObject<{
        crewRole: z.ZodString;
        covered: z.ZodBoolean;
        personId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        displayName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        membershipKind: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>>;
    grants: z.ZodArray<typeof DateAccessGrantSchema>;
    missingRoles: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$loose>;
export declare const GrantDateAccessBodySchema: z.ZodObject<{
    personId: z.ZodString;
    crewRole: VocabularyIn<typeof CREW_ROLES>;
    expiresAt: z.ZodString;
}, z.core.$strip>;
export declare const PinMerchDuringLiveBodySchema: z.ZodObject<{
    itemId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const MerchPinSchema: z.ZodOptional<z.ZodObject<{
    pinnedItemId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$loose>>;
export declare const ReopenReplayWindowBodySchema: z.ZodObject<{
    additionalHours: z.ZodInt;
}, z.core.$strip>;
export declare const ReplayWindowSchema: z.ZodOptional<z.ZodObject<{
    expiresAt: z.ZodOptional<z.ZodString>;
    windowHours: z.ZodOptional<z.ZodInt>;
}, z.core.$loose>>;
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
export {};
//# sourceMappingURL=schemas.d.ts.map