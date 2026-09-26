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

import {
  DISPLAY_STATES,
  NavigationEntry,
  PAYOUT_STATES,
  PRICE_TIERS,
  PROMOTION_REASONS,
  TAX_JURISDICTION_LEVELS,
  TAX_SUPPLY_KINDS,
} from '@arthome/core';
import {
  InstantOut,
  MoneyOut,
  int64,
  uuidOut,
  vocabularyOut,
  vocabularyOutLocal,
} from '@arthome/core/schema';

import { ActorSchema } from '../studio-access/index.js';

const LOCAL_REASON =
  'A vocabulary local to this contract. The domain neither produces nor consumes these values — they describe what this endpoint offers, and a new member is an endpoint change.';

const localVocabulary = (
  values: readonly [string, ...string[]],
  reason: string = LOCAL_REASON,
): z.ZodString => vocabularyOutLocal(values, reason);

/** `format: date-time` and NO `pattern`, which is what these documents carry. */
const instantNullable = (): z.ZodNullable<z.ZodString> =>
  z.string().nullable().meta({ format: 'date-time' });

/** No `format`: these documents write a bare `type: integer`. */
const int = (): z.ZodNumber => int64().meta({ format: undefined });

const PRESENTATION_REASON =
  'A presentation choice the contract serves so that five surfaces do not each invent one. The domain has no opinion on it.';

const uuidNullable = (): z.ZodNullable<z.ZodString> =>
  z.string().nullable().meta({ format: 'uuid' });

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
      'A screen composition the server decides so that five surfaces do not each decide it differently.',
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
          at: InstantOut,
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

const INCLUSIVE = { 'x-arthome-tax-basis': 'inclusive' } as const;
const EXCLUSIVE = { 'x-arthome-tax-basis': 'exclusive' } as const;
const INHERITED = { 'x-arthome-tax-basis': 'inherited' } as const;

const RAILS_REASON =
  'A screen composition the server decides so that five surfaces do not each decide it differently.';

const STATE_MACHINE_REASON =
  "A state machine local to this resource. It is the contract's own, not the domain's: the domain owns the facts, this owns how far a request has got.";

type Money = typeof MoneyOut;
type Looseness = z.core.$loose;

const RevenueByDateRowSchema: z.ZodObject<
  {
    dateId: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    startsAt: z.ZodOptional<z.ZodString>;
    gross: z.ZodOptional<Money>;
  },
  Looseness
> = z.looseObject({
  dateId: uuidOut().optional(),
  title: z.string().optional(),
  startsAt: InstantOut.optional(),
  gross: MoneyOut.meta(INCLUSIVE).optional(),
});

const RevenueByDateSchema: z.ZodOptional<
  z.ZodNullable<
    z.ZodObject<
      {
        total: z.ZodOptional<Money>;
        totalScope: z.ZodOptional<z.ZodString>;
        items: z.ZodOptional<z.ZodArray<typeof RevenueByDateRowSchema>>;
      },
      Looseness
    >
  >
> = z
  .looseObject({
    total: MoneyOut.meta(INCLUSIVE).optional(),
    totalScope: localVocabulary(['channel_period', 'listed_rows'], RAILS_REASON)
      .optional()
      .describe(
        "**What the total counts, declared.** The design displays a total at the head of six rows\nwithout saying whether it is the sum of the six or the channel's total over the period — and\nthe figure there is hardcoded, so it does not settle it. The contract serves `channel_period`\nand **says so**, rather than letting two surfaces add up six bars and arrive at a different\nnumber.\n",
      ),
    items: z.array(RevenueByDateRowSchema).optional(),
  })
  .nullable()
  .optional()
  .describe('**Absent** without `canRevenue`.');

export const DashboardScreenSchema: z.ZodObject<
  {
    period: typeof PeriodBoundsSchema;
    tiles: z.ZodArray<typeof MetricTileSchema>;
    reminders: z.ZodArray<typeof DashboardReminderSchema>;
    revenueByDate: typeof RevenueByDateSchema;
  },
  z.core.$loose
> = z
  .looseObject({
    period: PeriodBoundsSchema,
    tiles: z
      .array(MetricTileSchema)
      .describe(
        '**The tile is removed from the board, not emptied** — the same mechanism as everywhere else\nin the studio: a forbidden field is absent, never present and null. `artist` and `production`\nreceive four of them, `treasury` three (not `canOps`).\n\n**Four tiles out of six are served, and that is a deliberate decision.**\n`moderated_messages` and `signal_quality` test the **primary** role — `mod` and `regie` — yet\nneither of those opens `dashboard`: they are **never** displayed. The contract serves what is\nreachable rather than carrying two dead tiles. They stay in the vocabulary, because the open\nquestion is a product one, not a contract one: **open `dashboard` to those two roles, or\nwithdraw the tiles.**\n',
      ),
    reminders: z
      .array(DashboardReminderSchema)
      .describe(
        'Bounded to five, and to **two** rows coming from the publication checklists. The order is\n**served**: severity descending, then nearest deadline.\n',
      ),
    revenueByDate: RevenueByDateSchema,
  })
  .describe(
    '**Most of this screen is a recomposition of collections already served.** This path carries\nonly what had no carrier: the tiles aggregated over a period and the "to handle" list, which\nis an aggregation **at channel level** whose ingredients all existed without anyone bringing\nthem together.\n\nThe next dates, the countdown to curtain-up, revenue per date and the number of dates held in\nreserve **are not here**: they come from `listChannelEvents`, `listPayouts` and the channel\'s\n`serverTime`. Asking for them again would have been the value composed in two places that\nrule 2 forbids.\n',
  );

const displayState = (): z.ZodString => vocabularyOut(DISPLAY_STATES);
const intNullable = (): z.ZodNullable<z.ZodNumber> => int().nullable();

const StatsAudienceHeadlineSchema: z.ZodObject<
  {
    viewersTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    averageFillRateBps: z.ZodOptional<z.ZodNumber>;
    datesCount: z.ZodOptional<z.ZodNumber>;
    netRevenue: z.ZodOptional<Money>;
  },
  Looseness
> = z.looseObject({
  viewersTotal: intNullable()
    .optional()
    .describe(
      '**This is not a count of unique individuals**, and the name does not claim so here. It is\nthe per-date sum of `max(live viewers, seats sold)` plus the replay views. The definition of a\n**unique** viewer exists nowhere in the sources; serving it under that name would have been a\npromise we do not keep.\n',
    ),
  averageFillRateBps: int().optional(),
  datesCount: int()
    .optional()
    .describe(
      '**All** the channels dates over the period, with no state filter — the way the design counts them.',
    ),
  netRevenue: MoneyOut.meta(EXCLUSIVE).optional().describe('**Absent** without `canRevenue`.'),
});

const FillByDateRowSchema: z.ZodObject<
  {
    dateId: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    startsAt: z.ZodOptional<z.ZodString>;
    fillRateBps: z.ZodOptional<z.ZodNumber>;
    seatsSold: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    capacityTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    onSale: z.ZodOptional<z.ZodBoolean>;
  },
  Looseness
> = z.looseObject({
  dateId: uuidOut().optional(),
  title: z.string().optional(),
  startsAt: InstantOut.optional(),
  fillRateBps: int().optional(),
  seatsSold: intNullable().optional(),
  capacityTotal: intNullable().optional(),
  onSale: z.boolean().optional(),
});

const AudienceByDateRowSchema: z.ZodObject<
  {
    dateId: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    startsAt: z.ZodOptional<z.ZodString>;
    displayState: z.ZodOptional<z.ZodString>;
    seatsSold: z.ZodOptional<z.ZodNumber>;
    liveViewersPeak: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    replayViews: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    fillRateBps: z.ZodOptional<z.ZodNumber>;
  },
  Looseness
> = z.looseObject({
  dateId: uuidOut().optional(),
  title: z.string().optional(),
  startsAt: InstantOut.optional(),
  displayState: displayState().optional(),
  seatsSold: int().optional(),
  liveViewersPeak: intNullable().optional(),
  replayViews: intNullable().optional(),
  fillRateBps: int().optional(),
});

export const StatsAudienceSchema: z.ZodObject<
  {
    period: typeof PeriodBoundsSchema;
    headline: typeof StatsAudienceHeadlineSchema;
    fillByDate: z.ZodArray<typeof FillByDateRowSchema>;
    audienceByDate: z.ZodArray<typeof AudienceByDateRowSchema>;
  },
  Looseness
> = z
  .looseObject({
    period: PeriodBoundsSchema,
    headline: StatsAudienceHeadlineSchema,
    fillByDate: z.array(FillByDateRowSchema),
    audienceByDate: z
      .array(AudienceByDateRowSchema)
      .describe(
        '**`seatsSold` and `liveViewers` are two distinct fields.** The design displays "N viewers"\nand feeds it with seats sold: label and datum diverge there. The contract serves both\nseparately and lets the surface choose what it names — instead of carving the confusion in\nstone.\n',
      ),
  })
  .describe(
    "**The provenance ring is not served, and that is not an oversight.** The design brings five\nlabels — home, internal search, share, direct link, featured — and **nothing else**: the\nvalues there are hardcoded and **no attribution source exists** in the reference data.\nCarrying it would have been writing an intention and passing it off as a measurement — that\nis, letting a design's layout dictate an API's structure.\n\n**What it would take for it to exist**: provenance capture at the entry of the journey\n(campaign parameter, referrer, internal origin), carried through to the order and projected\nper date. That is a mechanism, not a field — and until it exists, the contract promises\nnothing.\n",
  );

const StatsSeriesHeadlineSchema: z.ZodObject<
  {
    seriesCount: z.ZodOptional<z.ZodNumber>;
    bestFillRateBps: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    bestFillShowId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    averageGapPoints: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    pendingDecisionCount: z.ZodOptional<z.ZodNumber>;
  },
  Looseness
> = z.looseObject({
  seriesCount: int().optional(),
  bestFillRateBps: intNullable().optional(),
  bestFillShowId: uuidNullable().optional(),
  averageGapPoints: z
    .number()
    .nullable()
    .optional()
    .describe(
      'In **points**, between the reference and the ones that follow, across all series.\n**Null when no following date has sold** — "not yet measurable" is a state,\nnot a zero.\n',
    ),
  pendingDecisionCount: int()
    .optional()
    .describe(
      'The dates **held in reserve**. Already obtainable through `listChannelEvents?state=reserve`; served here to save the banner a second call.',
    ),
});

const SeriesDateSchema: z.ZodObject<
  {
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
  },
  Looseness
> = z.looseObject({
  dateId: uuidOut(),
  startsAt: InstantOut,
  displayState: displayState().optional(),
  fillRateBps: int(),
  seatsSold: int().optional(),
  revenue: MoneyOut.meta(INCLUSIVE).optional().describe('**Absent** without `canRevenue`.'),
  isReference: z.boolean(),
  fillGapPoints: z
    .number()
    .nullable()
    .optional()
    .describe(
      'Fill-rate gap **in points** against the reference.\n**Null — hence nothing to display — when the date has no sales at all**: "there\nis no gap to measure, it is a decision to be made, not a decline".\n',
    ),
  revenueGapPct: z
    .number()
    .nullable()
    .optional()
    .describe(
      'Revenue gap as a **percentage**. **Absent** without `canRevenue`, null without sales.',
    ),
  canOpenSale: z
    .boolean()
    .optional()
    .describe(
      'True if the date is held in reserve **and** the person can open the sale. Served, because it is a right.',
    ),
});

const SeriesGroupSchema: z.ZodObject<
  {
    showId: z.ZodString;
    title: z.ZodString;
    referenceDateId: z.ZodString;
    dates: z.ZodArray<typeof SeriesDateSchema>;
  },
  Looseness
> = z.looseObject({
  showId: uuidOut(),
  title: z.string(),
  referenceDateId: uuidOut().describe(
    '**The first date that sold at least one seat**, failing that the first in the\ngroup. It is not the first in chronological order, and that is the whole\ndifference: comparing against a date that sold nothing would make every following\nseries look like a success.\n',
  ),
  dates: z.array(SeriesDateSchema),
});

export const StatsSeriesSchema: z.ZodObject<
  {
    period: typeof PeriodBoundsSchema;
    headline: typeof StatsSeriesHeadlineSchema;
    series: z.ZodArray<typeof SeriesGroupSchema>;
  },
  Looseness
> = z
  .looseObject({
    period: PeriodBoundsSchema,
    headline: StatsSeriesHeadlineSchema,
    series: z
      .array(SeriesGroupSchema)
      .describe(
        '**Grouped by `showId`**, never by title — the design groups by title, but the domain has a\nshow and that is the right key. The `draft` and `technical` states are **excluded** from the\ngrouping, and only groups of **more than one date** are series. An empty table is a **served\ncase**: "no series" invites you to duplicate a date.\n',
      ),
  })
  .describe(
    '**The contract carries the grouping, the reference and both gaps — computed.** Not the\ningredients: the choice of reference is a **domain rule**, and two surfaces would reimplement\nit differently.\n',
  );

const CapacityTierSchema: z.ZodObject<
  {
    id: z.ZodOptional<z.ZodString>;
    capacity: z.ZodOptional<z.ZodNumber>;
    openedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  Looseness
> = z.looseObject({
  id: z.string().optional(),
  capacity: int().optional(),
  openedAt: instantNullable().optional(),
});

const PriceTierSchema: z.ZodObject<
  { tier: z.ZodString; amount: Money; active: z.ZodBoolean },
  Looseness
> = z.looseObject({
  tier: vocabularyOut(PRICE_TIERS),
  amount: MoneyOut.meta(INHERITED),
  active: z.boolean(),
});

const PromotionSchema: z.ZodObject<
  {
    reason: z.ZodOptional<z.ZodString>;
    struckPrice: z.ZodOptional<Money>;
    currentPrice: z.ZodOptional<Money>;
    validFrom: z.ZodOptional<z.ZodString>;
    validUntil: z.ZodOptional<z.ZodString>;
  },
  Looseness
> = z.looseObject({
  reason: vocabularyOut(PROMOTION_REASONS).optional(),
  struckPrice: MoneyOut.meta(INCLUSIVE).optional(),
  currentPrice: MoneyOut.meta(INCLUSIVE).optional(),
  validFrom: InstantOut.optional(),
  validUntil: InstantOut.optional(),
});

const ComplimentarySchema: z.ZodObject<
  {
    categoryId: z.ZodOptional<z.ZodString>;
    issued: z.ZodOptional<z.ZodNumber>;
    allocated: z.ZodOptional<z.ZodNumber>;
  },
  Looseness
> = z.looseObject({
  categoryId: z.string().optional(),
  issued: int().optional(),
  allocated: int().optional(),
});

const TechnicalProvisionSchema: z.ZodOptional<
  z.ZodObject<
    {
      required: z.ZodOptional<z.ZodBoolean>;
      threshold: z.ZodOptional<z.ZodNumber>;
      revisableUntil: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      malusExposure: z.ZodOptional<Money>;
    },
    Looseness
  >
> = z
  .looseObject({
    required: z.boolean().optional(),
    threshold: int().optional(),
    revisableUntil: instantNullable().optional(),
    malusExposure: MoneyOut.meta(INHERITED).optional(),
  })
  .optional()
  .describe(
    'Beyond **10,000 seats**, the infrastructure is provisioned in advance; a forecast far above\nthe real figure exposes you to a **penalty**; revisable up to **72 h** beforehand.\n**Threshold, provision, deadline and exposure are contract data**, not constants copied out\nacross five surfaces.\n',
  );

/** The `tickets` pane of a date. */
export const DateSalesPaneSchema: z.ZodObject<
  {
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
  },
  Looseness
> = z
  .looseObject({
    dateId: uuidOut(),
    capacityTotal: int(),
    capacityTiers: z.array(CapacityTierSchema).optional(),
    seatsAvailable: int(),
    seatsSold: int().optional(),
    waitlistCount: int().optional(),
    fillRateBps: int().optional(),
    priceTiers: z.array(PriceTierSchema),
    promotions: z.array(PromotionSchema).optional(),
    serviceFeePerSeat: MoneyOut.meta(INCLUSIVE)
      .optional()
      .describe('**Per seat**, and the scale is served, never a screen constant.'),
    pricesLocked: z.boolean(),
    replayUnitPrice: MoneyOut.meta(INCLUSIVE).optional(),
    complimentaries: z.array(ComplimentarySchema).optional(),
    technicalProvision: TechnicalProvisionSchema,
    grossRevenue: MoneyOut.meta(INCLUSIVE)
      .optional()
      .describe('**Absent** when the role lacks `canRevenue`.'),
    version: int().optional(),
  })
  .describe(
    'The `tickets` pane. Capacity **widens in tiers and never shrinks** once the sale has opened;\nprices **lock when the sale opens**, the schedule **when it goes on air**. "Apply to the\nseries" **excludes prices and capacity**: each date commits its own buyers.\n',
  );

const PayoutVatLineSchema: z.ZodObject<
  {
    rateBps: z.ZodNumber;
    base: Money;
    amount: Money;
    jurisdictionCode: z.ZodString;
    jurisdictionLevel: z.ZodString;
    supplyKind: z.ZodString;
  },
  Looseness
> = z.looseObject({
  rateBps: int().describe(
    'Rate in basis points — 550 = 5.5%. **An integer, never a float**: in floating point it ends\nup producing a one-cent discrepancy. And it is the rate **applied at the moment of the sale,\nkept on the line** — not the current rate: an invoice is kept for ten years, rates change.\n',
  ),
  base: MoneyOut.meta(EXCLUSIVE),
  amount: MoneyOut.meta(INHERITED),
  jurisdictionCode: z
    .string()
    .meta({ examples: ['FR'] })
    .describe('"FR" · "US-CA-94103" · "CH-ZH". **Precise enough to replay the calculation.**'),
  jurisdictionLevel: vocabularyOut(TAX_JURISDICTION_LEVELS),
  supplyKind: vocabularyOut(TAX_SUPPLY_KINDS).describe(
    '**The rate depends on the jurisdiction × nature-of-supply pair**, never on a constant per\nmarket: the exemption a theatre seat enjoys does not extend to watching it live — a seat and a\nbroadcast live show are not the same supply.\n',
  ),
});

/**
 * One payout, with the whole derivation served.
 *
 * `grossTtc` is TAX-INCLUSIVE and the emitted annotation says so; `vat` is one line per
 * jurisdiction (D-059), so a payout is never a bare number that moved for no stated reason.
 */
export const PayoutLineSchema: z.ZodObject<
  {
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
  },
  Looseness
> = z
  .looseObject({
    payoutId: uuidOut(),
    dateId: uuidOut(),
    channelId: uuidOut().optional(),
    state: vocabularyOut(PAYOUT_STATES).describe(
      "**Driven by the date's outcome**: `held` while an outcome is open, `refunded` if cancelled,\n`suspended` while a change of bank details awaits its counter-signature.\n",
    ),
    grossTtc: MoneyOut.meta({
      ...INCLUSIVE,
      description:
        "**Tax-inclusive: what the viewer paid, and what the artist's price said.** Fixed across\njurisdictions — it is `vat` and therefore `net` that move beneath it.\n",
    }),
    vat: z
      .array(PayoutVatLineSchema)
      .describe(
        '**One line per jurisdiction, and not per billing market.** `marketId` is withdrawn: a market\nis a notion of **price** — which currency you sell in — never a notion of **tax**. The key\ncarried three values where the rule asks for thousands: a French viewer and a Belgian viewer\nboth pay in the `eur` market, at two different rates, and a breakdown keyed by market cannot\ncarry two `eur` lines without the key ceasing to be a key.\n\n**This is the only irreversible part of the tax chapter.** The model — who is liable, on what\nbase — is a **calculation**: it can be redone. The rate applied to the sale and the\njurisdiction that commands it are **dated facts**: not captured at the instant of the sale,\nthey are not expensive to reconstruct, they are **impossible** to reconstruct.\n',
      ),
    grossHt: MoneyOut.meta(EXCLUSIVE),
    commissionRateBps: int()
      .meta({ examples: [1200] })
      .describe(
        "**Served, never re-derived from `commission / gross`** — the design re-derives it and falls\nback to 12% by default when the gross is null. **The commission is on the pre-tax amount**: on\nthe tax-inclusive amount, the 12% announced to artists would vary with the buyer's country.\n",
      ),
    commission: MoneyOut.meta(EXCLUSIVE),
    net: MoneyOut.meta(EXCLUSIVE),
    refunded: MoneyOut.meta(INHERITED).optional(),
    credited: MoneyOut.meta(INHERITED).optional(),
    dueAt: InstantOut.describe(
      '**End of the live show + 14 days.** The deadline runs from the end, not from the payment.',
    ),
    stripeTransferRef: z.string().nullable().optional(),
    reconciledAt: instantNullable().optional(),
    discrepancy: MoneyOut.meta(INHERITED)
      .optional()
      .describe('**A period does not close with an unexplained discrepancy.**'),
    taxEvidenceConflicts: int()
      .optional()
      .describe(
        'The number of orders on this line whose buyer location evidence **contradicted itself**. The\nsale goes through, the line is flagged for review: **hiding the conflict would produce a false\nand silent declaration**, and it is the studio that must be able to see it before the period\ncloses.\n',
      ),
  })
  .describe(
    "**The breakdown by market is the shape, and it is safe under both tax models**: a\nsingle-rate model produces a one-line breakdown. A single scalar `vatAmount` would have been\nthe only genuinely irreversible choice.\n\nThe model adopted (D-015) is the **commissionaire**: base = the whole ticket, rate = that of\nthe viewer's country, liable party = Arthome. **⚠ This is not tax advice** — to be validated\nby an adviser before any real money is taken.\n\n**Under tax-inclusive pricing (D-056) this breakdown stops being detail and becomes the\nexplanation.** The artist's price is what the viewer pays, so `grossTtc` is fixed while the\nVAT inside it varies with the buyer's country — which means **`net` moves for two sales at the\nsame advertised price.** A payout response without the per-jurisdiction lines is therefore\n**incomplete rather than merely terse**: the artist sees a number that changed and no reason\nfor it, which is `planOf()` falling everyone back to `free` with money attached.\n\n`grossTtc → vat[] → grossHt → commission → net` is the whole derivation, and every step of it\nis served rather than recomputed.\n",
  );

// `studio-access` imports `StudioCountersSchema` from here, so reading `ActorSchema`
//   back at module scope is a cycle. Deferring the read to first use breaks it.
/** A change of bank details, countersigned by a second role. */
export const BankChangeRequestSchema: z.ZodObject<
  {
    requestId: z.ZodString;
    state: z.ZodString;
    maskedAccountTail: z.ZodString;
    requestedBy: z.ZodOptional<typeof ActorSchema>;
    requestedAt: z.ZodString;
    expiresAt: z.ZodString;
    countersignedBy: z.ZodOptional<typeof ActorSchema>;
    suspendsPayoutIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
  },
  Looseness
> = z
  .looseObject({
    requestId: uuidOut(),
    state: localVocabulary(
      ['pending_countersignature', 'countersigned', 'rejected', 'expired'],
      STATE_MACHINE_REASON,
    ),
    maskedAccountTail: z
      .string()
      .meta({ examples: ['4417'] })
      .describe(
        '**The last four characters only.** A full IBAN has no business in a log that gets replayed.',
      ),
    requestedBy: ActorSchema.optional(),
    requestedAt: InstantOut,
    expiresAt: InstantOut,
    countersignedBy: ActorSchema.optional(),
    suspendsPayoutIds: z.array(uuidOut()).optional(),
  })
  .describe(
    '**An aggregate in its own right, not a field**: two actors, two distinct roles (owner **and**\ntreasury), a delay, a trace — **and it suspends the payout in flight** for the duration of the\nsigning. A write cannot carry that.\n',
  );

/**
 * The export formats, DECLARED rather than written inline: a file may use the members
 * of a vocabulary it declares, and `journal` is this vocabulary's member here — not
 * `NavigationEntry.JOURNAL`, which shares five letters and nothing else.
 */
const EXPORT_FORMATS = [
  'sales_csv',
  'fec',
  'sage',
  'cegid',
  'grouped_invoices',
  'journal',
  'schedule_ics',
  'stats_csv',
] as const;

/** An asynchronous export. */
export const ExportJobSchema: z.ZodObject<
  {
    exportId: z.ZodString;
    kind: z.ZodString;
    state: z.ZodString;
    requestedAt: z.ZodString;
    downloadUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    downloadExpiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  Looseness
> = z
  .looseObject({
    exportId: uuidOut(),
    kind: localVocabulary(
      EXPORT_FORMATS,
      "A document or export format. It names an accounting tool or a file type, which is the outside world's vocabulary rather than ours.",
    ),
    state: localVocabulary(
      ['queued', 'running', 'ready', 'failed', 'expired'],
      STATE_MACHINE_REASON,
    ),
    requestedAt: InstantOut,
    downloadUrl: z.string().nullable().meta({ format: 'uri' }).optional(),
    downloadExpiresAt: instantNullable().optional(),
  })
  .describe(
    'Over 24 months, an export is an **asynchronous job** (BullMQ **internal to its service**).\nThe URL returned is **signed, short-lived, and usable without a session cookie** — an export\nprotected by a cookie is undownloadable from the native shell. Proposed lifetime:\n**60 minutes**.\n',
  );
