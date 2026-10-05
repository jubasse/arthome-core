import { z } from 'zod';
import type { PublicationPromise } from '@arthome/core';
import { DATE_OUTCOMES, PublicationState, REPLAY_POLICIES } from '@arthome/core';
import type { VocabularyIn, VocabularyOutNullable } from '@arthome/core/schema';
import { MoneyOut } from '@arthome/core/schema';
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
}, z.core.$loose>;
export type DatePublicPane = z.output<typeof DatePublicPaneSchema>;
export type DateReplayPane = z.output<typeof DateReplayPaneSchema>;
export type MoveDatePublicationStateBody = z.output<typeof MoveDatePublicationStateBodySchema>;
export type SetDateReplayPolicyBody = z.output<typeof SetDateReplayPolicyBodySchema>;
export type DuplicateDateBody = z.output<typeof DuplicateDateBodySchema>;
export type DecideDateOutcomeBody = z.output<typeof DecideDateOutcomeBodySchema>;
export type DateOutcomeDecision = z.output<typeof DateOutcomeDecisionSchema>;
export {};
//# sourceMappingURL=schemas.d.ts.map