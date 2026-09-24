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

import { NavigationEntry } from '@arthome/core';
import { int64, vocabularyOutLocal } from '@arthome/core/schema';

const LOCAL_REASON =
  'A vocabulary local to this contract. The domain neither produces nor consumes these values — they describe what this endpoint offers, and a new member is an endpoint change.';

/** A vocabulary local to this contract: `none` as its source, and the reason the document gives. */
const localVocabulary = (
  values: readonly [string, ...string[]],
  reason: string = LOCAL_REASON,
): z.ZodString => vocabularyOutLocal(values, reason);

/**
 * An instant with `format: date-time` and NO `pattern`: these documents carry the format
 * alone here, where `InstantSchema` would add its regex.
 */
const instant = (): z.ZodString => z.string().meta({ format: 'date-time' });
const instantNullable = (): z.ZodNullable<z.ZodString> =>
  z.string().nullable().meta({ format: 'date-time' });

/** An integer with no format, as the document writes `type: integer`. */
const int = (): z.ZodNumber => int64().meta({ format: undefined });

const PRESENTATION_REASON =
  'A presentation choice the contract serves so that five surfaces do not each invent one. The domain has no opinion on it.';

const uuidNullable = (): z.ZodNullable<z.ZodString> =>
  z.string().nullable().meta({ format: 'uuid' });

/** The badges, served at bootstrap and kept up to date by the real-time channel. */
export const StudioCountersSchema: z.ZodObject<
  {
    moderationPending: z.ZodOptional<z.ZodNumber>;
    inboxUnread: z.ZodOptional<z.ZodNumber>;
    dutiesTonight: z.ZodOptional<z.ZodNumber>;
    invitationsPending: z.ZodOptional<z.ZodNumber>;
    datesToCover: z.ZodOptional<z.ZodNumber>;
    payoutsDue: z.ZodOptional<z.ZodNumber>;
  },
  z.core.$loose
> = z
  .looseObject({
    moderationPending: int()
      .optional()
      .meta({ examples: [14] }),
    inboxUnread: int()
      .optional()
      .meta({ examples: [2] }),
    dutiesTonight: int()
      .optional()
      .meta({ examples: [3] }),
    invitationsPending: int().optional(),
    datesToCover: int().optional(),
    payoutsDue: int().optional(),
  })
  .describe(
    '**The badges, served at bootstrap and kept up to date by the real-time channel.** None of\nthese numbers may require fetching a page: otherwise the bottom bar costs five requests every\ntime it opens.\n',
  );

/** The period's effective bounds, computed by the server. */
export const PeriodBoundsSchema: z.ZodObject<
  {
    preset: z.ZodString;
    from: z.ZodString;
    to: z.ZodString;
    days: z.ZodNumber;
    datesCovered: z.ZodNumber;
  },
  z.core.$loose
> = z
  .looseObject({
    preset: localVocabulary(
      ['last_7_days', 'last_30_days', 'last_90_days', 'season', 'custom'],
      'A period selector for this screen. The bounds it resolves to are served (`seasonBounds`, `periodStart`/`periodEnd`); this only names which preset the person chose.',
    ),
    from: z.string().meta({ format: 'date' }),
    to: z.string().meta({ format: 'date' }),
    days: int().meta({ examples: [94] }),
    datesCovered: int().meta({ examples: [7] }),
  })
  .describe(
    '**The period\'s effective bounds, computed by the server.** A custom range displays\n"94 days · 7 dates": both numbers are served, because they depend on the channel\'s calendar\nand because `SEASON` is a domain notion (1 September → 31 August) whose bounds are already\nserved at bootstrap.\n',
  );

/** A single template: identifier, value, unit, series. */
export const MetricTileSchema: z.ZodObject<
  {
    id: z.ZodString;
    value: z.ZodNumber;
    unit: z.ZodString;
    currencyCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    series: z.ZodArray<
      z.ZodObject<
        {
          at: z.ZodString;
          value: z.ZodNumber;
          dateId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        },
        z.core.$loose
      >
    >;
    seriesGranularity: z.ZodString;
  },
  z.core.$loose
> = z
  .looseObject({
    id: localVocabulary(
      [
        'shop_sales',
        'followers_gained',
        'replay_views',
        'fill_rate',
        'moderated_messages',
        'signal_quality',
      ],
      'A screen composition the server decides so that five surfaces do not each decide it differently. The domain has no opinion on which rails exist.',
    ),
    value: z.number(),
    unit: localVocabulary(['currency_minor', 'count', 'percent', 'points'], PRESENTATION_REASON),
    currencyCode: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .nullable()
      .optional(),
    series: z
      .array(
        z.looseObject({
          at: instant(),
          value: z.number(),
          dateId: uuidNullable().optional(),
        }),
      )
      .describe(
        '**The sparkline takes the last 14 points.** Serving more costs little and lets the client\nchoose; serving fewer would make the variation inexpressible.\n',
      ),
    seriesGranularity: localVocabulary(['per_date', 'per_day'], PRESENTATION_REASON)
      .meta({ examples: ['per_date'] })
      .describe(
        '**Declared, because it is not obvious.** In the design the series is **one value per date**,\nnever per day — a daily granularity appears nowhere in it. Declaring it makes `per_day`\naddable later **without breaking a client**: it reads what the server announces instead of\nassuming.\n',
      ),
  })
  .describe(
    '**A single template: identifier, value, unit, series.** Three things it does not carry, and\neach one is a decision:\n\n**1. No variation.** It is **derived** from the series by `trendOf` in `@arthome/core` — the\naverage of the first half against the second, **nothing below 4 series points nor below a\n0.1% gap** — as a percentage except for fill rate, which is in **points**. Serving it on top\nof the series would be the same value computed in two places.\n\n**2. No literal unit.** `unit` is a **code**, and the period comes from the request. The\ndesign carried "over 30 d" hardcoded on a tile although a period selector sits beside it: the\nlabel would have lied from the first click.\n\n**3. The value is bounded by the period requested**, all six tiles without exception. The\ndesign froze `SUBSCRIBERS GAINED` at thirty days **and then multiplied it** by a period\ncoefficient — a frozen counter, scaled. The contract aggregates over the period, or does not\nserve the tile.\n',
  );

/** A routed list, like the inbox: kind, severity, target and role scope decided server-side. */
export const DashboardReminderSchema: z.ZodObject<
  {
    id: z.ZodString;
    kind: z.ZodString;
    severity: z.ZodString;
    textCode: z.ZodString;
    params: z.ZodObject<Record<string, never>, z.core.$loose>;
    targetPage: z.ZodString;
    dateId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    countdownTo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    actionable: z.ZodBoolean;
  },
  z.core.$loose
> = z
  .looseObject({
    id: z.string(),
    kind: localVocabulary([
      'publication_incomplete',
      'technical_check_missing',
      'moderator_unassigned',
      'near_sold_out',
      'moderation_backlog',
    ]),
    severity: localVocabulary(['info', 'warning', 'urgent'], PRESENTATION_REASON),
    textCode: z.string().describe('An i18n **code**, never the authored sentence.'),
    params: z.looseObject({}),
    targetPage: localVocabulary([
      'event',
      'regie',
      NavigationEntry.CREW,
      NavigationEntry.EVENTS,
      NavigationEntry.MODERATION,
    ]).describe(
      '**The union of two vocabularies, and it carried a stale spelling of one of them.** A\nreminder points either at a menu entry (`NAVIGATION_ENTRIES` — `crew`, `events`,\n`moderation_page`) or at a contextual page (`event`, `regie`), because those are the two\nkinds of destination this studio has. It read `moderation` here while core and\n`EffectiveRights.navigation` read `moderation_page`, so a surface routing on this field\nmatched nothing for that one destination — and `moderation_backlog` is the most frequent\nreminder the dashboard produces.\n',
    ),
    dateId: uuidNullable().optional(),
    countdownTo: instantNullable()
      .optional()
      .describe('**An instant**, not a sentence: the countdown is computed against `servedAt`.'),
    actionable: z.boolean(),
  })
  .describe(
    '**A routed list, like the inbox**: kind, severity, target and role scope decided\n**server-side**. `actionable` says whether the destination page is open to this person — the\nrow stays visible otherwise, but is not clickable, and it is the server that knows, since it\nis the server that holds the effective rights.\n',
  );
