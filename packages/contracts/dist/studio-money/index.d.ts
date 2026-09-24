/**
 * `@arthome/contracts/studio-money` — the dashboard: the period it is read over, the tiles
 * aggregated over it, the reminders routed to a person, and the badge counters.
 *
 * ⚠ Nothing here computes anything. A tile carries no variation (`trendOf` derives it from the
 * series in `@arthome/core`), no literal unit, and its value is bounded by the requested period:
 * see the document's prose, copied verbatim below.
 *
 * ⚠ EVERY VOCABULARY IN THIS FILE IS LOCAL TO THE CONTRACT — the domain has no opinion on which
 * rails a screen shows — so each goes through `localVocabulary`, which emits `none` and the
 * document's own reason, rather than a source name that does not exist.
 */
import { z } from 'zod';
/** The badges, served at bootstrap and kept up to date by the real-time channel. */
export declare const StudioCountersSchema: z.ZodObject<{
    moderationPending: z.ZodOptional<z.ZodNumber>;
    inboxUnread: z.ZodOptional<z.ZodNumber>;
    dutiesTonight: z.ZodOptional<z.ZodNumber>;
    invitationsPending: z.ZodOptional<z.ZodNumber>;
    datesToCover: z.ZodOptional<z.ZodNumber>;
    payoutsDue: z.ZodOptional<z.ZodNumber>;
}, z.core.$loose>;
/** The period's effective bounds, computed by the server. */
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
//# sourceMappingURL=index.d.ts.map