/**
 * `@arthome/contracts/studio-money` — the dashboard: the period it is read over, the tiles
 * aggregated over it, the reminders routed to a person, and the badge counters.
 *
 * Nothing here computes anything. A tile carries no variation (`trendOf` derives it from the
 * series in `@arthome/core`), no literal unit, and its value is bounded by the requested period:
 * see the document's prose, copied verbatim below.
 *
 * EVERY VOCABULARY IN THIS FILE IS LOCAL TO THE CONTRACT — the domain has no opinion on which
 * rails a screen shows — so each goes through `localVocabulary`, which emits `none` and the
 * document's own reason, rather than a source name that does not exist.
 */
import { z } from 'zod';
import { MoneyOut } from '@arthome/core/schema';
import { ActorSchema } from '../studio-access/index.js';
export declare const PeriodBoundsSchema: z.ZodObject<{
    preset: z.ZodString;
    from: z.ZodString;
    to: z.ZodString;
    days: z.ZodNumber;
    datesCovered: z.ZodNumber;
}, z.core.$loose>;
/** A single template: identifier, value, unit, series. */
export declare const MetricTileSchema: z.ZodObject<{
    id: z.ZodString;
    value: z.ZodNumber;
    unit: z.ZodString;
    currencyCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    series: z.ZodArray<z.ZodObject<{
        at: z.ZodString;
        value: z.ZodNumber;
        dateId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$loose>>;
    seriesGranularity: z.ZodString;
}, z.core.$loose>;
/** A routed list, like the inbox: kind, severity, target and role scope decided server-side. */
export declare const DashboardReminderSchema: z.ZodObject<{
    id: z.ZodString;
    kind: z.ZodString;
    severity: z.ZodString;
    textCode: z.ZodString;
    params: z.ZodObject<Record<string, never>, z.core.$loose>;
    targetPage: z.ZodString;
    dateId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    countdownTo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    actionable: z.ZodBoolean;
}, z.core.$loose>;
type Money = typeof MoneyOut;
type Looseness = z.core.$loose;
declare const RevenueByDateRowSchema: z.ZodObject<{
    dateId: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    startsAt: z.ZodOptional<z.ZodString>;
    gross: z.ZodOptional<Money>;
}, Looseness>;
declare const RevenueByDateSchema: z.ZodOptional<z.ZodNullable<z.ZodObject<{
    total: z.ZodOptional<Money>;
    totalScope: z.ZodOptional<z.ZodString>;
    items: z.ZodOptional<z.ZodArray<typeof RevenueByDateRowSchema>>;
}, Looseness>>>;
export declare const DashboardScreenSchema: z.ZodObject<{
    period: typeof PeriodBoundsSchema;
    tiles: z.ZodArray<typeof MetricTileSchema>;
    reminders: z.ZodArray<typeof DashboardReminderSchema>;
    revenueByDate: typeof RevenueByDateSchema;
}, z.core.$loose>;
declare const StatsAudienceHeadlineSchema: z.ZodObject<{
    viewersTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    averageFillRateBps: z.ZodOptional<z.ZodNumber>;
    datesCount: z.ZodOptional<z.ZodNumber>;
    netRevenue: z.ZodOptional<Money>;
}, Looseness>;
declare const FillByDateRowSchema: z.ZodObject<{
    dateId: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    startsAt: z.ZodOptional<z.ZodString>;
    fillRateBps: z.ZodOptional<z.ZodNumber>;
    seatsSold: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    capacityTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    onSale: z.ZodOptional<z.ZodBoolean>;
}, Looseness>;
declare const AudienceByDateRowSchema: z.ZodObject<{
    dateId: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    startsAt: z.ZodOptional<z.ZodString>;
    displayState: z.ZodOptional<z.ZodString>;
    seatsSold: z.ZodOptional<z.ZodNumber>;
    liveViewersPeak: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    replayViews: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    fillRateBps: z.ZodOptional<z.ZodNumber>;
}, Looseness>;
export declare const StatsAudienceSchema: z.ZodObject<{
    period: typeof PeriodBoundsSchema;
    headline: typeof StatsAudienceHeadlineSchema;
    fillByDate: z.ZodArray<typeof FillByDateRowSchema>;
    audienceByDate: z.ZodArray<typeof AudienceByDateRowSchema>;
}, Looseness>;
declare const StatsSeriesHeadlineSchema: z.ZodObject<{
    seriesCount: z.ZodOptional<z.ZodNumber>;
    bestFillRateBps: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    bestFillShowId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    averageGapPoints: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    pendingDecisionCount: z.ZodOptional<z.ZodNumber>;
}, Looseness>;
declare const SeriesDateSchema: z.ZodObject<{
    dateId: z.ZodString;
    startsAt: z.ZodString;
    displayState: z.ZodOptional<z.ZodString>;
    fillRateBps: z.ZodNumber;
    seatsSold: z.ZodOptional<z.ZodNumber>;
    revenue: z.ZodOptional<Money>;
    isReference: z.ZodBoolean;
    fillGapPoints: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    revenueGapPct: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    canOpenSale: z.ZodOptional<z.ZodBoolean>;
}, Looseness>;
declare const SeriesGroupSchema: z.ZodObject<{
    showId: z.ZodString;
    title: z.ZodString;
    referenceDateId: z.ZodString;
    dates: z.ZodArray<typeof SeriesDateSchema>;
}, Looseness>;
export declare const StatsSeriesSchema: z.ZodObject<{
    period: typeof PeriodBoundsSchema;
    headline: typeof StatsSeriesHeadlineSchema;
    series: z.ZodArray<typeof SeriesGroupSchema>;
}, Looseness>;
declare const CapacityTierSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    capacity: z.ZodOptional<z.ZodNumber>;
    openedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, Looseness>;
declare const PriceTierSchema: z.ZodObject<{
    tier: z.ZodString;
    amount: Money;
    active: z.ZodBoolean;
}, Looseness>;
declare const PromotionSchema: z.ZodObject<{
    reason: z.ZodOptional<z.ZodString>;
    struckPrice: z.ZodOptional<Money>;
    currentPrice: z.ZodOptional<Money>;
    validFrom: z.ZodOptional<z.ZodString>;
    validUntil: z.ZodOptional<z.ZodString>;
}, Looseness>;
declare const ComplimentarySchema: z.ZodObject<{
    categoryId: z.ZodOptional<z.ZodString>;
    issued: z.ZodOptional<z.ZodNumber>;
    allocated: z.ZodOptional<z.ZodNumber>;
}, Looseness>;
declare const TechnicalProvisionSchema: z.ZodOptional<z.ZodObject<{
    required: z.ZodOptional<z.ZodBoolean>;
    threshold: z.ZodOptional<z.ZodNumber>;
    revisableUntil: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    malusExposure: z.ZodOptional<Money>;
}, Looseness>>;
/** The `tickets` pane of a date. */
export declare const DateSalesPaneSchema: z.ZodObject<{
    dateId: z.ZodString;
    capacityTotal: z.ZodNumber;
    capacityTiers: z.ZodOptional<z.ZodArray<typeof CapacityTierSchema>>;
    seatsAvailable: z.ZodNumber;
    seatsSold: z.ZodOptional<z.ZodNumber>;
    waitlistCount: z.ZodOptional<z.ZodNumber>;
    fillRateBps: z.ZodOptional<z.ZodNumber>;
    priceTiers: z.ZodArray<typeof PriceTierSchema>;
    promotions: z.ZodOptional<z.ZodArray<typeof PromotionSchema>>;
    serviceFeePerSeat: z.ZodOptional<Money>;
    pricesLocked: z.ZodBoolean;
    replayUnitPrice: z.ZodOptional<Money>;
    complimentaries: z.ZodOptional<z.ZodArray<typeof ComplimentarySchema>>;
    technicalProvision: typeof TechnicalProvisionSchema;
    grossRevenue: z.ZodOptional<Money>;
    version: z.ZodOptional<z.ZodNumber>;
}, Looseness>;
declare const PayoutVatLineSchema: z.ZodObject<{
    rateBps: z.ZodNumber;
    base: Money;
    amount: Money;
    jurisdictionCode: z.ZodString;
    jurisdictionLevel: z.ZodString;
    supplyKind: z.ZodString;
}, Looseness>;
/**
 * One payout, with the whole derivation served.
 *
 * `grossTtc` is TAX-INCLUSIVE and the emitted annotation says so; `vat` is one line per
 * jurisdiction (D-059), so a payout is never a bare number that moved for no stated reason.
 */
export declare const PayoutLineSchema: z.ZodObject<{
    payoutId: z.ZodString;
    dateId: z.ZodString;
    channelId: z.ZodOptional<z.ZodString>;
    state: z.ZodString;
    grossTtc: Money;
    vat: z.ZodArray<typeof PayoutVatLineSchema>;
    grossHt: Money;
    commissionRateBps: z.ZodNumber;
    commission: Money;
    net: Money;
    refunded: z.ZodOptional<Money>;
    credited: z.ZodOptional<Money>;
    dueAt: z.ZodString;
    stripeTransferRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    reconciledAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    discrepancy: z.ZodOptional<Money>;
    taxEvidenceConflicts: z.ZodOptional<z.ZodNumber>;
}, Looseness>;
/** A change of bank details, countersigned by a second role. */
export declare const BankChangeRequestSchema: z.ZodObject<{
    requestId: z.ZodString;
    state: z.ZodString;
    maskedAccountTail: z.ZodString;
    requestedBy: z.ZodOptional<typeof ActorSchema>;
    requestedAt: z.ZodString;
    expiresAt: z.ZodString;
    countersignedBy: z.ZodOptional<typeof ActorSchema>;
    suspendsPayoutIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, Looseness>;
/** An asynchronous export. */
export declare const ExportJobSchema: z.ZodObject<{
    exportId: z.ZodString;
    kind: z.ZodString;
    state: z.ZodString;
    requestedAt: z.ZodString;
    downloadUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    downloadExpiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, Looseness>;
export {};
//# sourceMappingURL=index.d.ts.map