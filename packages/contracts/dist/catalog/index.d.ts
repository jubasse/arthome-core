/**
 * `@arthome/contracts/catalog` — The catalogue a viewer browses: dates, artists, rails, media, and the constants and label artefacts a surface boots with.
 *
 * EVERY SCHEMA HERE EMITS A NAMED SCHEMA OF `openapi/storefront.yaml` EXACTLY, and
 * `pnpm run check:emit-diff` is what proves it: the document is authoritative
 * (D-058), so where the two differ the schema changes.
 *
 * The rules this file follows, each of which was a defect the gate found (D-060, D-065):
 *
 *   - `z.looseObject()` on everything a server sends — a closed schema makes a
 *     generated client reject a server that added a field.
 *   - `int64()`, never `z.int()` — the latter emits JavaScript's safe range,
 *     which is in no document.
 *   - `vocabularyOut` / `vocabularyOutNullable` for every enumerated value, never
 *     `z.enum()`: a strict enum fails the whole payload when a member is added,
 *     and televisions run year-old builds. A vocabulary local to the contract
 *     is declared here, passed as `'none'` and carries its reason.
 *   - vocabulary members in `examples` are the named constants, never literals.
 *   - identifiers and instants are `format: uuid` / `format: date-time` WITHOUT a
 *     `pattern`, because that is what the document publishes for these fields;
 *     core's `*IdSchema` and `InstantSchema` add a `pattern` the document does
 *     not carry here. Once the document gains it (D-065 family D), the local
 *     `uuidOut()` and `InstantOut` become those core schemas, one edit per file.
 */
import { z } from 'zod';
import { DisplayState, LANGUAGE_DEPENDENCIES, REPLAY_POLICIES } from '@arthome/core';
import { MoneyOut, VenueClockSchema, type VocabularyIn, type VocabularyOut, type VocabularyOutNullable } from '@arthome/core/schema';
import { WatchVerdictSchema } from '../entitlement/index.js';
import { StorefrontLocalizedTextSchema } from '../text/index.js';
export declare const ImageRenditionSchema: z.ZodObject<{
    url: z.ZodString;
    widthPx: z.ZodNumber;
    heightPx: z.ZodNumber;
}, z.core.$loose>;
export declare const MediaSetSchema: z.ZodObject<{
    wide: z.ZodOptional<z.ZodArray<typeof ImageRenditionSchema>>;
    poster: z.ZodOptional<z.ZodArray<typeof ImageRenditionSchema>>;
}, z.core.$loose>;
export declare const DomainConstantsSchema: z.ZodObject<{
    roomOpensMinutesBefore: z.ZodNumber;
    cancelDeadlineMinutesBefore: z.ZodNumber;
    scarcityThresholdBps: z.ZodNumber;
    billboardPreviewDelaySec: z.ZodNumber;
    waitlistPriorityWindowHours: z.ZodNumber;
    chatRateLimitPerSecond: z.ZodNumber;
    chatCatchUpMessages: z.ZodOptional<z.ZodNumber>;
    reactionQuotaPerDate: z.ZodNumber;
    reminderLeadMinutes: z.ZodNumber;
    replayExpiryWarningHours: z.ZodNumber;
    previewSecondsTotal: z.ZodOptional<z.ZodNumber>;
    searchExactTotalLimit: z.ZodOptional<z.ZodNumber>;
    creditDelayCode: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
export declare const LabelArtifactRefSchema: z.ZodObject<{
    domain: VocabularyOut;
    locale: VocabularyOut;
    version: z.ZodNumber;
    url: z.ZodString;
}, z.core.$loose>;
export declare const ChapterSchema: z.ZodObject<{
    id: z.ZodString;
    vocabId: z.ZodString;
    atMediaSec: z.ZodNumber;
}, z.core.$loose>;
export declare const FacetSchema: z.ZodObject<{
    facetId: z.ZodString;
    values: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        count: z.ZodNumber;
    }, z.core.$loose>>;
}, z.core.$loose>;
export declare const DateCardSchema: z.ZodObject<{
    id: z.ZodString;
    showId: z.ZodString;
    channelId: z.ZodString;
    artist: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        verified: z.ZodOptional<z.ZodBoolean>;
        avatar: z.ZodOptional<typeof ImageRenditionSchema>;
    }, z.core.$loose>>;
    slug: z.ZodString;
    canonicalUrl: z.ZodString;
    title: z.ZodString;
    categoryId: z.ZodOptional<z.ZodString>;
    genreIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    tagIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    startsAt: z.ZodString;
    venueClock: typeof VenueClockSchema;
    runtimeMin: z.ZodNumber;
    venue: z.ZodOptional<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        countryCode: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>>;
    roomOpensAt: z.ZodOptional<z.ZodString>;
    displayState: VocabularyOut;
    displayStateValidUntil: z.ZodString;
    outcome: z.ZodOptional<VocabularyOutNullable>;
    rescheduledTo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    viewers: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    availability: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        seatsAvailable: z.ZodOptional<z.ZodNumber>;
        waitlistCount: z.ZodOptional<z.ZodNumber>;
        fillRateBps: z.ZodOptional<z.ZodNumber>;
        soldOut: z.ZodOptional<z.ZodBoolean>;
        lowestPrice: z.ZodOptional<typeof MoneyOut>;
        promotion: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            reason: z.ZodOptional<VocabularyOut>;
            struckPrice: z.ZodOptional<typeof MoneyOut>;
            currentPrice: z.ZodOptional<typeof MoneyOut>;
            validUntil: z.ZodOptional<z.ZodString>;
        }, z.core.$loose>>>;
    }, z.core.$loose>>>;
    replay: z.ZodObject<{
        policy: VocabularyOut;
        windowHours: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        availableFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        expiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        unitPrice: z.ZodOptional<typeof MoneyOut>;
    }, z.core.$loose>;
    rights: z.ZodObject<{
        scope: VocabularyOut;
        blackoutCountries: z.ZodOptional<z.ZodArray<z.ZodString>>;
        blackoutReasonCode: z.ZodOptional<VocabularyOutNullable>;
    }, z.core.$loose>;
    chatMode: z.ZodOptional<VocabularyOut>;
    media: typeof MediaSetSchema;
    languageDependency: z.ZodOptional<VocabularyOut>;
    watchVerdict: z.ZodOptional<typeof WatchVerdictSchema>;
    viewerRelations: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        inWatchlist: z.ZodOptional<z.ZodBoolean>;
        reminderSet: z.ZodOptional<z.ZodBoolean>;
        followsArtist: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$loose>>>;
    viewerProgress: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        positionSec: z.ZodOptional<z.ZodNumber>;
        durationSec: z.ZodOptional<z.ZodNumber>;
        completed: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$loose>>>;
}, z.core.$loose>;
export declare const ArtistSummarySchema: z.ZodObject<{
    id: z.ZodString;
    channelId: z.ZodString;
    name: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodString;
    countryCode: z.ZodOptional<z.ZodString>;
    verified: z.ZodOptional<z.ZodBoolean>;
    media: z.ZodOptional<typeof MediaSetSchema>;
    followers: z.ZodOptional<z.ZodNumber>;
    avgViewers: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    isLiveNow: z.ZodOptional<z.ZodBoolean>;
    followedByViewer: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    alertEnabled: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    nextDate: z.ZodOptional<typeof DateCardSchema>;
}, z.core.$loose>;
export declare const RailSchema: z.ZodObject<{
    id: z.ZodString;
    titleCode: z.ZodString;
    kind: VocabularyOut;
    itemKind: VocabularyOut;
    cardForm: VocabularyOut;
    items: z.ZodArray<z.ZodXor<readonly [typeof DateCardSchema, typeof ArtistSummarySchema]>>;
    total: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    totalIsLowerBound: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    nextCursor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$loose>;
export declare const ScheduleSlotSchema: z.ZodObject<{
    localHourLabelKey: z.ZodString;
    startsAt: z.ZodOptional<z.ZodString>;
    dates: z.ZodArray<typeof DateCardSchema>;
}, z.core.$loose>;
declare const PUBLIC_SEARCH_STATES: readonly [
    typeof DisplayState.SCHEDULED,
    typeof DisplayState.ROOM_OPEN,
    typeof DisplayState.LIVE,
    typeof DisplayState.REPLAY,
    typeof DisplayState.ENDED
];
export declare const HomeScreenSchema: z.ZodObject<{
    billboard: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        date: z.ZodOptional<typeof DateCardSchema>;
        previewStartsAfterSec: z.ZodOptional<z.ZodNumber>;
        previewUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$loose>>>;
    rails: z.ZodArray<typeof RailSchema>;
}, z.core.$loose>;
export declare const LiveScreenSchema: z.ZodObject<{
    featured: z.ZodOptional<typeof DateCardSchema>;
    slots: z.ZodArray<typeof ScheduleSlotSchema>;
}, z.core.$loose>;
export declare const CategoryTileSchema: z.ZodObject<{
    id: z.ZodString;
    universe: VocabularyOut;
    rank: z.ZodNumber;
    datesCount: z.ZodNumber;
    liveCount: z.ZodNumber;
    media: z.ZodOptional<typeof MediaSetSchema>;
    featured: z.ZodOptional<z.ZodBoolean>;
}, z.core.$loose>;
export declare const CategoryScreenSchema: z.ZodObject<{
    categoryId: z.ZodString;
    hero: z.ZodOptional<typeof DateCardSchema>;
    subGenres: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        rank: z.ZodOptional<z.ZodNumber>;
    }, z.core.$loose>>>;
    sections: z.ZodArray<z.ZodObject<{
        id: VocabularyOut;
        titleCode: z.ZodOptional<z.ZodString>;
        items: z.ZodArray<typeof DateCardSchema>;
        nextCursor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$loose>>;
    facets: z.ZodOptional<z.ZodArray<typeof FacetSchema>>;
}, z.core.$loose>;
export declare const StructuredFilterSchema: z.ZodObject<{
    filterId: z.ZodString;
    kind: VocabularyOut;
    min: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    max: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, z.core.$loose>;
export declare const SearchCriteriaSchema: z.ZodObject<{
    categoryIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    genreIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    tagIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    artistIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    cityIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    countryCodes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    languageDependency: z.ZodOptional<z.ZodArray<VocabularyIn<typeof LANGUAGE_DEPENDENCIES>>>;
    replayPolicy: z.ZodOptional<z.ZodArray<VocabularyIn<typeof REPLAY_POLICIES>>>;
    displayStates: z.ZodOptional<z.ZodArray<VocabularyIn<typeof PUBLIC_SEARCH_STATES>>>;
    priceMinMinor: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    priceMaxMinor: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    startsAfter: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    startsBefore: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    almostSoldOut: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    onPromotion: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    accessibility: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strict>;
export declare const ShowGroupSchema: z.ZodObject<{
    showId: z.ZodString;
    title: z.ZodString;
    representativeDate: typeof DateCardSchema;
    matchingDatesCount: z.ZodNumber;
}, z.core.$loose>;
export declare const SavedSearchSchema: z.ZodObject<{
    id: z.ZodString;
    scope: VocabularyOut;
    categoryId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    queryText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    criteria: z.ZodObject<Record<string, never>, z.core.$catchall<z.ZodUnknown>>;
    criteriaVersion: z.ZodNumber;
    criteriaSignature: z.ZodString;
    stale: z.ZodOptional<z.ZodBoolean>;
    channels: z.ZodArray<VocabularyOut>;
    active: z.ZodBoolean;
    newMatchesSinceLastVisit: z.ZodNumber;
}, z.core.$loose>;
/**
 * An item of merchandise sold alongside an artist or a date.
 *
 * IT LIVES IN THE CATALOGUE, NOT IN `ticketing`, and so does `PriceTier`: the
 *   catalogue describes what exists, ticketing describes transactions over it. A cart
 *   line references a merch item; a merch item knows nothing about carts. That keeps
 *   `ticketing -> catalog` one-way.
 */
export declare const MerchItemSchema: z.ZodObject<{
    id: z.ZodString;
    channelId: z.ZodString;
    showId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    label: typeof StorefrontLocalizedTextSchema;
    variants: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        inStock: z.ZodBoolean;
        price: z.ZodOptional<typeof MoneyOut>;
    }, z.core.$loose>>>;
    price: z.ZodOptional<typeof MoneyOut>;
    state: VocabularyOut;
    source: VocabularyOut;
    merchantUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    pinnedDuringLive: z.ZodOptional<z.ZodBoolean>;
    media: z.ZodOptional<typeof MediaSetSchema>;
}, z.core.$loose>;
export declare const PriceTierSchema: z.ZodObject<{
    tier: VocabularyOut;
    amount: typeof MoneyOut;
    active: z.ZodBoolean;
    validUntil: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$loose>;
/**
 * `ArtistDetail` and `DateDetail` — the two pages.
 *
 * THEY ARE `z.intersection`, WHICH IS `allOf` WITH TWO REAL MEMBERS, not the
 *   `allOf: [{$ref}]` wrapper removed from these documents — an OpenAPI 3.0 habit
 *   for generators that ignored `$ref` siblings, and these declare 3.1.1.
 */
export declare const ArtistDetailSchema: z.ZodIntersection<typeof ArtistSummarySchema, z.ZodObject<{
    biography: z.ZodOptional<typeof StorefrontLocalizedTextSchema>;
    joinedAt: z.ZodOptional<z.ZodString>;
    upcomingDates: z.ZodOptional<z.ZodArray<typeof DateCardSchema>>;
    pastDates: z.ZodOptional<z.ZodArray<typeof DateCardSchema>>;
    replays: z.ZodOptional<z.ZodArray<typeof DateCardSchema>>;
    merchItems: z.ZodOptional<z.ZodArray<typeof MerchItemSchema>>;
}, z.core.$loose>>;
export declare const DateDetailSchema: z.ZodIntersection<typeof DateCardSchema, z.ZodObject<z.ZodRawShape, z.core.$loose>>;
export {};
//# sourceMappingURL=index.d.ts.map