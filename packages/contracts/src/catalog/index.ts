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

import {
  BLACKOUT_REASONS,
  CHAT_MODES,
  DATE_OUTCOMES,
  DISPLAY_STATES,
  DisplayState,
  LANGUAGE_DEPENDENCIES,
  LOCALES,
  Locale,
  MESSAGE_DOMAINS,
  MessageDomain,
  NOTIFICATION_CHANNELS,
  PRICE_TIERS,
  PROMOTION_REASONS,
  REPLAY_POLICIES,
  RIGHTS_SCOPES,
} from '@arthome/core';
import {
  CountryCodeSchema,
  InstantOut,
  MoneyOut,
  VOCABULARY_SOURCE_LOCAL,
  VenueClockSchema,
  int64,
  type VocabularyIn,
  type VocabularyOut,
  type VocabularyOutNullable,
  uuidOut,
  vocabularyIn,
  vocabularyOut,
  vocabularyOutLocal,
  vocabularyOutNullable,
} from '@arthome/core/schema';

import { WatchVerdictSchema } from '../entitlement/index.js';
import { StorefrontLocalizedTextSchema } from '../text/index.js';

// The document's name for a vocabulary local to the contract. The preferred
// form is `vocabularyOutLocal`, which makes the reason mandatory; these three
// call sites chain their own `.meta()` with an `examples` key beside it.
const LOCAL_VOCABULARY = VOCABULARY_SOURCE_LOCAL;

const RAIL_KINDS = [
  'resume',
  'live_now',
  'my_seats',
  'upcoming_tonight',
  'followed',
  'editorial',
  'category',
  'replay_expiring',
  'artists_to_follow',
] as const;
const RAIL_ITEM_KINDS = ['date', 'artist'] as const;
const CARD_FORMS = ['wide', 'poster', 'portrait'] as const;

const MERCH_STATES = ['on_sale', 'out_of_stock'] as const;
const MERCH_SOURCES = ['arthome', 'shopify', 'woocommerce', 'prestashop', 'drupal', 'api'] as const;

export const ImageRenditionSchema: z.ZodObject<
  {
    url: z.ZodString;
    widthPx: z.ZodNumber;
    heightPx: z.ZodNumber;
  },
  z.core.$loose
> = z
  .looseObject({
    url: z.string().meta({ format: 'uri' }),
    widthPx: int64().meta({ format: undefined }).min(1),
    heightPx: int64().meta({ format: undefined }).min(1),
  })
  .describe(
    'A visual **already rendered at a size actually displayed**, never a URL recipe with a width\ntemplate: on a television with 1 GB, a 4K backdrop decoded for a thumbnail costs as much as a\nfull screen.\n',
  );

export const MediaSetSchema: z.ZodObject<
  {
    wide: z.ZodOptional<z.ZodArray<typeof ImageRenditionSchema>>;
    poster: z.ZodOptional<z.ZodArray<typeof ImageRenditionSchema>>;
  },
  z.core.$loose
> = z.looseObject({
  wide: z.array(ImageRenditionSchema).optional().describe('16:9, smallest to largest.'),
  poster: z
    .array(ImageRenditionSchema)
    .optional()
    .describe('2:3 or 3:4 depending on the surface, smallest to largest.'),
});

export const DomainConstantsSchema: z.ZodObject<
  {
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
  },
  z.core.$loose
> = z
  .looseObject({
    roomOpensMinutesBefore: int64()
      .meta({ format: undefined })
      .meta({ examples: [30] }),
    cancelDeadlineMinutesBefore: int64()
      .meta({ format: undefined })
      .meta({ examples: [60] }),
    scarcityThresholdBps: int64()
      .meta({ format: undefined })
      .meta({ examples: [8500] })
      .describe('Fill rate above which a date is "nearly sold out", in basis points.'),
    billboardPreviewDelaySec: int64()
      .meta({ format: undefined })
      .meta({ examples: [4] }),
    waitlistPriorityWindowHours: int64()
      .meta({ format: undefined })
      .meta({ examples: [2] }),
    chatRateLimitPerSecond: int64()
      .meta({ format: undefined })
      .meta({ examples: [2] })
      .describe(
        'Ceiling **enforced at the source**, for the calling surface — television 2, mobile 6, web 10.',
      ),
    chatCatchUpMessages: int64()
      .meta({ format: undefined })
      .meta({ examples: [20] })
      .optional()
      .describe(
        'Number of catch-up messages served on entering a room — television 20, elsewhere 50.',
      ),
    reactionQuotaPerDate: int64()
      .meta({ format: undefined })
      .meta({ examples: [20] }),
    reminderLeadMinutes: int64()
      .meta({ format: undefined })
      .meta({ examples: [30] }),
    replayExpiryWarningHours: int64()
      .meta({ format: undefined })
      .meta({ examples: [6] }),
    previewSecondsTotal: int64()
      .meta({ format: undefined })
      .meta({ examples: [300] })
      .optional()
      .describe(
        '**The total of the free preview.** `WatchVerdict.previewSecondsLeft` served the **remainder**\nand nothing served the total: the countdown "4 min 12 left" had a remainder with no\ndenominator, and the copy says "the first 5 minutes". Rule 15 — the constant had no owning\ndocument.\n',
      ),
    searchExactTotalLimit: int64()
      .meta({ format: undefined })
      .meta({ examples: [10000] })
      .optional()
      .describe(
        '**The threshold beyond which `approximateTotal` becomes a lower bound.** It was carved into\nthe prose as "exact up to 10,000": we were serving the default of a search engine parameter,\nin a vendor\'s name. Served as a constant, it survives a change of engine.\n',
      ),
    creditDelayCode: z
      .string()
      .meta({ examples: ['refund_delay_business_days_3_5'] })
      .optional()
      .describe(
        'The refund delay is a **code**, never the sentence "3 to 5 business days" — which is a\npolicy, hence translatable, hence i18n.\n',
      ),
  })
  .describe(
    'The domain constants, **served**. They live in `@arthome/core` and are copied nowhere:\ncopied, "the web will say 30 minutes, the television 15, and mobile will be right by\naccident" (E11, `storefront-mobile` Q10).\n',
  );

export const LabelArtifactRefSchema: z.ZodObject<
  {
    domain: VocabularyOut;
    locale: VocabularyOut;
    version: z.ZodNumber;
    url: z.ZodString;
  },
  z.core.$loose
> = z
  .looseObject({
    domain: vocabularyOut(MESSAGE_DOMAINS)
      .meta({ examples: [MessageDomain.STOREFRONT] })
      .describe(
        '**Which catalogue this reference is for**, served rather than recoverable by taking the\nURL apart. The theme lived only inside the path (`/i18n/studio/fr/v41.json`), so a client\ncaching catalogues by theme had to parse a string to learn what it was holding — which is\n`imageUrl(kind, key, width)` in another costume, and the same rule answers it: **a value\nrecoverable only by parsing a string is a value the contract did not serve.**\n',
      ),
    locale: vocabularyOut(LOCALES)
      .meta({ examples: [Locale.FR] })
      .describe(
        '**The domain declares exactly two**, and the contract says so rather than serving an\nopen string: a surface choosing a fallback needs to know the set it is choosing from.\nTolerant on output like every other served vocabulary — a third locale is kept raw and\ntreated as neutral, never rejected.\n',
      ),
    version: int64()
      .meta({ format: undefined })
      .meta({ examples: [41] }),
    url: z.string().meta({ format: 'uri' }),
  })
  .describe(
    'The label catalogue is **not a service**: it is an immutable versioned artefact published on\nthe CDN. The current version is served here, **never through a per-page call**, and every\napplication embeds a build-time snapshot as a **mandatory fallback** — that is the only thing\nguaranteeing no raw code ever reaches the screen.\n',
  );

export const ChapterSchema: z.ZodObject<
  {
    id: z.ZodString;
    vocabId: z.ZodString;
    atMediaSec: z.ZodNumber;
  },
  z.core.$loose
> = z.looseObject({
  id: uuidOut(),
  vocabId: z.string().describe('Chapter vocabulary identifier, **never an authored label**.'),
  atMediaSec: int64()
    .meta({ format: undefined })
    .describe(
      'Position **in the media**, not the time it was posted. Free now, unrecoverable later.',
    ),
});

export const FacetSchema: z.ZodObject<
  {
    facetId: z.ZodString;
    values: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          count: z.ZodNumber;
        },
        z.core.$loose
      >
    >;
  },
  z.core.$loose
> = z
  .looseObject({
    facetId: z.string().meta({ examples: ['category'] }),
    values: z.array(
      z.looseObject({
        id: z.string(),
        count: int64().meta({ format: undefined }),
      }),
    ),
  })
  .describe(
    '**Generic**, never an enumeration of facets in the contract: adding "wheelchair accessible"\nmust not be a contract change. The counts are computed on the current query and returned **in\nthe same response** as the results — no second call.\n',
  );

export const DateCardSchema: z.ZodObject<
  {
    id: z.ZodString;
    showId: z.ZodString;
    channelId: z.ZodString;
    artist: z.ZodOptional<
      z.ZodObject<
        {
          id: z.ZodString;
          name: z.ZodString;
          verified: z.ZodOptional<z.ZodBoolean>;
          avatar: z.ZodOptional<typeof ImageRenditionSchema>;
        },
        z.core.$loose
      >
    >;
    slug: z.ZodString;
    canonicalUrl: z.ZodString;
    title: z.ZodString;
    categoryId: z.ZodOptional<z.ZodString>;
    genreIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    tagIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
    startsAt: z.ZodString;
    venueClock: typeof VenueClockSchema;
    runtimeMin: z.ZodNumber;
    venue: z.ZodOptional<
      z.ZodObject<
        {
          id: z.ZodOptional<z.ZodString>;
          name: z.ZodOptional<z.ZodString>;
          city: z.ZodOptional<z.ZodString>;
          countryCode: z.ZodOptional<z.ZodString>;
        },
        z.core.$loose
      >
    >;
    roomOpensAt: z.ZodOptional<z.ZodString>;
    displayState: VocabularyOut;
    displayStateValidUntil: z.ZodString;
    outcome: z.ZodOptional<VocabularyOutNullable>;
    rescheduledTo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    viewers: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    availability: z.ZodOptional<
      z.ZodNullable<
        z.ZodObject<
          {
            seatsAvailable: z.ZodOptional<z.ZodNumber>;
            waitlistCount: z.ZodOptional<z.ZodNumber>;
            fillRateBps: z.ZodOptional<z.ZodNumber>;
            soldOut: z.ZodOptional<z.ZodBoolean>;
            lowestPrice: z.ZodOptional<typeof MoneyOut>;
            promotion: z.ZodOptional<
              z.ZodNullable<
                z.ZodObject<
                  {
                    reason: z.ZodOptional<VocabularyOut>;
                    struckPrice: z.ZodOptional<typeof MoneyOut>;
                    currentPrice: z.ZodOptional<typeof MoneyOut>;
                    validUntil: z.ZodOptional<z.ZodString>;
                  },
                  z.core.$loose
                >
              >
            >;
          },
          z.core.$loose
        >
      >
    >;
    replay: z.ZodObject<
      {
        policy: VocabularyOut;
        windowHours: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        availableFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        expiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        unitPrice: z.ZodOptional<typeof MoneyOut>;
      },
      z.core.$loose
    >;
    rights: z.ZodObject<
      {
        scope: VocabularyOut;
        blackoutCountries: z.ZodOptional<z.ZodArray<z.ZodString>>;
        blackoutReasonCode: z.ZodOptional<VocabularyOutNullable>;
      },
      z.core.$loose
    >;
    chatMode: z.ZodOptional<VocabularyOut>;
    media: typeof MediaSetSchema;
    languageDependency: z.ZodOptional<VocabularyOut>;
    watchVerdict: z.ZodOptional<typeof WatchVerdictSchema>;
    viewerRelations: z.ZodOptional<
      z.ZodNullable<
        z.ZodObject<
          {
            inWatchlist: z.ZodOptional<z.ZodBoolean>;
            reminderSet: z.ZodOptional<z.ZodBoolean>;
            followsArtist: z.ZodOptional<z.ZodBoolean>;
          },
          z.core.$loose
        >
      >
    >;
    viewerProgress: z.ZodOptional<
      z.ZodNullable<
        z.ZodObject<
          {
            positionSec: z.ZodOptional<z.ZodNumber>;
            durationSec: z.ZodOptional<z.ZodNumber>;
            completed: z.ZodOptional<z.ZodBoolean>;
          },
          z.core.$loose
        >
      >
    >;
  },
  z.core.$loose
> = z
  .looseObject({
    id: uuidOut(),
    showId: uuidOut(),
    channelId: uuidOut(),
    artist: z
      .looseObject({
        id: uuidOut(),
        name: z.string().meta({ examples: ['Compagnie Verticale'] }),
        verified: z.boolean().optional(),
        avatar: ImageRenditionSchema.optional(),
      })
      .optional(),
    slug: z.string().meta({ examples: ['nuit-blanche-2026-09-21'] }),
    canonicalUrl: z
      .string()
      .meta({ format: 'uri' })
      .describe(
        '**Served, never built by the surface.** It is what gets shared, bookmarked, what a reminder\nand a notification point at, and what gets indexed — and it is what the television encodes in\na QR code for the Share action, since a television has neither a clipboard nor a useful\nmessaging app.\n',
      ),
    title: z.string(),
    categoryId: z
      .string()
      .meta({ examples: ['dance-contemporary'] })
      .optional(),
    genreIds: z
      .array(z.string())
      .optional()
      .describe(
        '**Multiple**: a show is both "contemporary" and "repertoire" at once. The singular forbade it (E9).',
      ),
    tagIds: z.array(z.string()).optional(),
    startsAt: InstantOut,
    venueClock: VenueClockSchema,
    runtimeMin: int64().meta({ format: undefined }),
    venue: z
      .looseObject({
        id: uuidOut().optional(),
        name: z.string().optional(),
        city: z.string().optional(),
        countryCode: CountryCodeSchema.optional(),
      })
      .optional(),
    roomOpensAt: InstantOut.optional().describe(
      'The **instant** the room opens, served. The surface schedules the switch locally, to the\nsecond, **without a single call**: a standby mode running for eight hours therefore makes no\nrequest at all.\n',
    ),
    displayState: vocabularyOut(DISPLAY_STATES)
      .meta({ examples: [DisplayState.LIVE] })
      .describe(
        "The **only** state value the cards display, and nobody recomposes it. Produced by\n`displayStateOf(publication, run, outcome, instants, now)` in `@arthome/core`. The hierarchy,\nwritten once: `outcome` outranks `run.state`, which outranks `publication.state`.\n\n**One vocabulary, eleven members, and the narrowing is said here rather than written as a\nsecond list.** A storefront never receives `draft`, `reserve` or `technical` — not by\nfiltering, but **by construction**: a date reaches a public surface only once it is\npublished. Declaring only the eight would be a second authored list for a field the\ndomain already defines, and two independently authored lists for one field is how E4\nstarted. A surface that wants to know what it can actually receive reads this sentence;\nthe vocabulary stays the domain's.\n",
      ),
    displayStateValidUntil: InstantOut,
    outcome: vocabularyOutNullable(DATE_OUTCOMES)
      .optional()
      .describe(
        'The outcome **replaces the state on every card**, not only on the detail page. It is a fact\nabout the performance: never rewritten, never erased.\n',
      ),
    rescheduledTo: InstantOut.nullable().optional(),
    viewers: int64()
      .meta({ format: undefined })
      .nullable()
      .optional()
      .describe(
        '**Absent — never zero — when the date is not on air.** A zero reads as "nobody", not as "not\nmeasured", and the brief\'s rule forbids "0 WATCHING".\n',
      ),
    availability: z
      .looseObject({
        seatsAvailable: int64().meta({ format: undefined }).optional(),
        waitlistCount: int64().meta({ format: undefined }).optional(),
        fillRateBps: int64()
          .meta({ format: undefined })
          .optional()
          .describe(
            'The **rate**, not the capacity. Serving the capacity and letting the client compute recreates\nthe value composed in two places, and the design proves it by applying a constant of 2,000\nseats regardless of the venue.\n',
          ),
        soldOut: z.boolean().optional(),
        lowestPrice: MoneyOut.meta({ 'x-arthome-tax-basis': 'inclusive' }).optional(),
        promotion: z
          .looseObject({
            reason: vocabularyOut(PROMOTION_REASONS).optional(),
            struckPrice: MoneyOut.meta({ 'x-arthome-tax-basis': 'inclusive' }).optional(),
            currentPrice: MoneyOut.meta({ 'x-arthome-tax-basis': 'inclusive' }).optional(),
            validUntil: InstantOut.optional(),
          })
          .nullable()
          .optional(),
      })
      .nullable()
      .optional()
      .describe('Projected from `ticketing`. Absent while no price is active.'),
    replay: z
      .looseObject({
        policy: vocabularyOut(REPLAY_POLICIES),
        windowHours: int64().meta({ format: undefined }).nullable().optional(),
        availableFrom: InstantOut.nullable().optional(),
        expiresAt: InstantOut.nullable()
          .optional()
          .describe(
            'Derived from the end of the live show and `windowHours`. Served as an instant, never as "41 h left".',
          ),
        unitPrice: MoneyOut.meta({ 'x-arthome-tax-basis': 'inclusive' }).optional(),
      })
      .describe(
        'The **promise** made before purchase — it is what justifies the price difference. `none` is\n**final** for this date.\n',
      ),
    rights: z.looseObject({
      scope: vocabularyOut(RIGHTS_SCOPES),
      blackoutCountries: z.array(CountryCodeSchema).optional(),
      blackoutReasonCode: vocabularyOutNullable(BLACKOUT_REASONS)
        .optional()
        .describe(
          'A **code**, never a sentence. The current data carries `label`/`labelEn` authored inside the data: an i18n leak (E8).',
        ),
    }),
    chatMode: vocabularyOut(CHAT_MODES).optional(),
    media: MediaSetSchema,
    languageDependency: vocabularyOut(LANGUAGE_DEPENDENCIES).optional(),
    watchVerdict: WatchVerdictSchema.optional().describe(
      'Per-viewer overlay. **Absent — not null — on an anonymous read**, which makes the public body\nidentical for every caller and therefore shareable in a common cache.\n',
    ),
    viewerRelations: z
      .looseObject({
        inWatchlist: z.boolean().optional(),
        reminderSet: z.boolean().optional(),
        followsArtist: z.boolean().optional(),
      })
      .nullable()
      .optional()
      .describe(
        'Per-viewer overlay, merged from a **batched** read, never one call per card. **Absent on an\nanonymous read.**\n',
      ),
    viewerProgress: z
      .looseObject({
        positionSec: int64().meta({ format: undefined }).optional(),
        durationSec: int64().meta({ format: undefined }).optional(),
        completed: z.boolean().optional(),
      })
      .nullable()
      .optional()
      .describe('Per-viewer overlay. **Absent on an anonymous read.**'),
  })
  .describe(
    '**The most consumed shape in the product.** It must stand alone: a card never triggers a call\nin order to paint itself.\n\nIt carries the **inputs** of the perishable rules **and** their result at serving time **and**\nthe instant that result stops being true. That is what lets a response cached for eight hours\nstay correct: the surface calls the same `@arthome/core` function again once\n`displayStateValidUntil` has passed, it does not rewrite the rule.\n\n**No ticketing or control-room field appears here** (E8): no `sold`, no `revenue`, no\n`publication`, no `publishedBy`.\n',
  );

export const ArtistSummarySchema: z.ZodObject<
  {
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
  },
  z.core.$loose
> = z.looseObject({
  id: uuidOut(),
  channelId: uuidOut(),
  name: z.string(),
  slug: z.string().optional(),
  categoryId: z.string(),
  countryCode: CountryCodeSchema.optional(),
  verified: z.boolean().optional(),
  media: MediaSetSchema.optional(),
  followers: int64()
    .meta({ format: undefined })
    .optional()
    .describe(
      '**Projected** counter, with its declared freshness. A counter wrong by 3% does not matter; a\ncounter that differs between the detail page and the list does — which is why it comes from a\nsingle projection.\n',
    ),
  avgViewers: int64().meta({ format: undefined }).nullable().optional(),
  isLiveNow: z.boolean().optional(),
  followedByViewer: z.boolean().nullable().optional(),
  alertEnabled: z
    .boolean()
    .nullable()
    .optional()
    .describe(
      '**Following and being alerted are two settings**, and the contract separates them:\n`followedByViewer` is a catalogue relation, `alertEnabled` a flag carried by `notifications`.\nConflating them would make it impossible to follow an artist without being notified — and the\ndesign shows the two separately. **Absent on an anonymous read.**\n',
    ),
  nextDate: DateCardSchema.optional().describe(
    'The next announced date, when there is one. Served so that the "Following" page distinguishes\nartists **who have a date** from those who do not — that is the split the screen displays, and\nit would otherwise be computed by one call per artist.\n',
  ),
});

export const RailSchema: z.ZodObject<
  {
    id: z.ZodString;
    titleCode: z.ZodString;
    kind: VocabularyOut;
    itemKind: VocabularyOut;
    cardForm: VocabularyOut;
    items: z.ZodArray<z.ZodXor<readonly [typeof DateCardSchema, typeof ArtistSummarySchema]>>;
    total: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    totalIsLowerBound: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    nextCursor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$loose
> = z
  .looseObject({
    id: z.string(),
    titleCode: z
      .string()
      .meta({ examples: ['home.rail.resume'] })
      .describe('An i18n **code**, never an authored title.'),
    kind: vocabularyOutLocal(
      RAIL_KINDS,
      'A screen composition the server decides so that five surfaces do not each decide it differently. The domain has no opinion on which rails exist.',
    ).describe(
      '`my_seats` carries "Your seats": it is **not** editorial but personal, and its behaviour is\nits own — the card becomes "Enter the room" when the room opens. Filing it under `editorial`\nwould have erased that difference.\n',
    ),
    itemKind: vocabularyOut(RAIL_ITEM_KINDS, LOCAL_VOCABULARY)
      .meta({
        'x-arthome-vocabulary-reason':
          'A screen composition the server decides so that five surfaces do not each decide it differently. The domain has no opinion on which rails exist.',
        examples: [RAIL_ITEM_KINDS[0]],
      })
      .describe(
        '**What the rail carries.** Without this field, an artist rail is inexpressible:\n`ArtistSummary` exists in the contract but no rail could transport it, and the surface would\nhave had to guess the type from the rail identifier — that is, from a parallel literal.\n',
      ),
    cardForm: vocabularyOut(CARD_FORMS, LOCAL_VOCABULARY)
      .meta({
        'x-arthome-vocabulary-reason':
          'A presentation choice the contract serves so that five surfaces do not each invent one. The domain has no opinion on it.',
        examples: [CARD_FORMS[0]],
      })
      .describe(
        '**The card form is an editorial choice, hence server-side**, exactly like the order of the\nrails. `poster` serves the "Posters" rail in vertical 2:3, `portrait` the artists as circles.\nWithout this field the surface would choose from the rail identifier, and *"variety of format\nis what stops the screen looking like a spreadsheet"* — nine rails of identical 16:9 cards is\na television\'s defect number one.\n',
      ),
    items: z
      .array(z.xor([DateCardSchema, ArtistSummarySchema]))
      .describe(
        '**Union discriminated by `itemKind`**: `DateCard` when `itemKind` is `date`,\n`ArtistSummary` when it is `artist`.\n',
      ),
    total: int64()
      .meta({ format: undefined })
      .nullable()
      .optional()
      .describe(
        "**The rail's count, not the served slice's.** Every rail displays a counter to the right of\nits title; without this field it can only display `items.length`, that is, the page size — a\nfalse number. Same guarantee as `CursorPageInfo.approximateTotal`: exact up to the served\nthreshold, a lower bound beyond it.\n",
      ),
    totalIsLowerBound: z.boolean().default(false).optional(),
    nextCursor: z
      .string()
      .nullable()
      .optional()
      .describe(
        '**Per-rail** cursor, consumed by `extendRail`. A rail is an excerpt; it does not paginate on\nscreen, it extends.\n',
      ),
  })
  .describe(
    'A home rail. **Composition and order are server-side**: the design loads 1,814 dates\n(1.79 MB) and filters client-side, which the contract must make impossible on a device that\nhas 300 to 500 MB for everything, video included.\n',
  );

export const ScheduleSlotSchema: z.ZodObject<
  {
    localHourLabelKey: z.ZodString;
    startsAt: z.ZodOptional<z.ZodString>;
    dates: z.ZodArray<typeof DateCardSchema>;
  },
  z.core.$loose
> = z
  .looseObject({
    localHourLabelKey: z.string().meta({ examples: ['20'] }),
    startsAt: InstantOut.optional(),
    dates: z.array(DateCardSchema),
  })
  .describe(
    "Tonight's grid, **already grouped in the viewer's local time**. The grouping depends on the\ntimezone: the surface sends it in a header, the server groups. A grid grouped client-side\nwould be grouped five different ways.\n",
  );

const SCREEN_COMPOSITION_REASON =
  'A screen composition the server decides so that five surfaces do not each decide it differently.';

const LOCAL_CONTRACT_REASON =
  'A vocabulary local to this contract. The domain neither produces nor consumes these values — they describe what this endpoint offers, and a new member is an endpoint change.';

const CATEGORY_UNIVERSES = ['music', 'stage'] as const;
const CATEGORY_SECTION_IDS = ['overview', 'live', 'upcoming', 'replays', 'artists'] as const;
const FILTER_KINDS = ['money_range', 'date_range', 'boolean'] as const;
const SAVED_SEARCH_SCOPES = ['search', 'category'] as const;
const PUBLIC_SEARCH_STATES: readonly [
  typeof DisplayState.SCHEDULED,
  typeof DisplayState.ROOM_OPEN,
  typeof DisplayState.LIVE,
  typeof DisplayState.REPLAY,
  typeof DisplayState.ENDED,
] = [
  DisplayState.SCHEDULED,
  DisplayState.ROOM_OPEN,
  DisplayState.LIVE,
  DisplayState.REPLAY,
  DisplayState.ENDED,
];

export const HomeScreenSchema: z.ZodObject<
  {
    billboard: z.ZodOptional<
      z.ZodNullable<
        z.ZodObject<
          {
            date: z.ZodOptional<typeof DateCardSchema>;
            previewStartsAfterSec: z.ZodOptional<z.ZodNumber>;
            previewUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          },
          z.core.$loose
        >
      >
    >;
    rails: z.ZodArray<typeof RailSchema>;
  },
  z.core.$loose
> = z.looseObject({
  billboard: z
    .looseObject({
      date: DateCardSchema.optional(),
      previewStartsAfterSec: int64()
        .meta({ format: undefined })
        .meta({ examples: [4] })
        .optional(),
      previewUrl: z.string().meta({ format: 'uri' }).nullable().optional(),
    })
    .nullable()
    .optional()
    .describe(
      'The choice of billboard is **server-side**. `previewStartsAfterSec` is served from the domain\nconstants, never hardcoded in the surface.\n',
    ),
  rails: z.array(RailSchema),
});

export const LiveScreenSchema: z.ZodObject<
  {
    featured: z.ZodOptional<typeof DateCardSchema>;
    slots: z.ZodArray<typeof ScheduleSlotSchema>;
  },
  z.core.$loose
> = z.looseObject({
  featured: DateCardSchema.optional(),
  slots: z.array(ScheduleSlotSchema),
});

export const CategoryTileSchema: z.ZodObject<
  {
    id: z.ZodString;
    universe: VocabularyOut;
    rank: z.ZodNumber;
    datesCount: z.ZodNumber;
    liveCount: z.ZodNumber;
    media: z.ZodOptional<typeof MediaSetSchema>;
    featured: z.ZodOptional<z.ZodBoolean>;
  },
  z.core.$loose
> = z
  .looseObject({
    id: z.string(),
    universe: vocabularyOutLocal(CATEGORY_UNIVERSES, SCREEN_COMPOSITION_REASON),
    rank: int64().meta({ format: undefined }),
    datesCount: int64().meta({ format: undefined }),
    liveCount: int64().meta({ format: undefined }),
    media: MediaSetSchema.optional(),
    featured: z
      .boolean()
      .optional()
      .describe(
        'Editorial selection for the top of the page, **served as a rule**, never hardcoded in a\nsurface (`storefront-tv` Q5).\n',
      ),
  })
  .describe(
    'The 21 disciplines, with **family and rank**. The editorial rank is authoritative: **no\nsurface reorders**. Served in **one** call, never one call per tile.\n',
  );

export const CategoryScreenSchema: z.ZodObject<
  {
    categoryId: z.ZodString;
    hero: z.ZodOptional<typeof DateCardSchema>;
    subGenres: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodOptional<z.ZodString>;
            rank: z.ZodOptional<z.ZodNumber>;
          },
          z.core.$loose
        >
      >
    >;
    sections: z.ZodArray<
      z.ZodObject<
        {
          id: VocabularyOut;
          titleCode: z.ZodOptional<z.ZodString>;
          items: z.ZodArray<typeof DateCardSchema>;
          nextCursor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        },
        z.core.$loose
      >
    >;
    facets: z.ZodOptional<z.ZodArray<typeof FacetSchema>>;
  },
  z.core.$loose
> = z.looseObject({
  categoryId: z.string(),
  hero: DateCardSchema.optional(),
  subGenres: z
    .array(
      z.looseObject({
        id: z.string().optional(),
        rank: int64().meta({ format: undefined }).optional(),
      }),
    )
    .optional(),
  sections: z
    .array(
      z.looseObject({
        id: vocabularyOutLocal(CATEGORY_SECTION_IDS, SCREEN_COMPOSITION_REASON),
        titleCode: z.string().optional(),
        items: z.array(DateCardSchema),
        nextCursor: z.string().nullable().optional(),
      }),
    )
    .describe(
      'Five bounded sections — `overview`, `live`, `upcoming`, `replays`, `artists`. The overview **does not\npaginate**: an overview is bounded (8 per section).\n',
    ),
  facets: z.array(FacetSchema).optional(),
});

export const StructuredFilterSchema: z.ZodObject<
  {
    filterId: z.ZodString;
    kind: VocabularyOut;
    min: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    max: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
  },
  z.core.$loose
> = z
  .looseObject({
    filterId: z.string().meta({ examples: ['price'] }),
    kind: vocabularyOutLocal(FILTER_KINDS, SCREEN_COMPOSITION_REASON),
    min: int64().meta({ format: undefined }).nullable().optional(),
    max: int64().meta({ format: undefined }).nullable().optional(),
  })
  .describe(
    'The filters that are **not** enumerations: price range, date range. They live beside the\nfacets, never inside them.\n',
  );

export const SearchCriteriaSchema: z.ZodObject<
  {
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
  },
  z.core.$strict
> = z
  .strictObject({
    categoryIds: z.array(z.string()).optional(),
    genreIds: z.array(z.string()).optional(),
    tagIds: z.array(z.string()).optional(),
    artistIds: z.array(uuidOut()).optional(),
    cityIds: z.array(z.string()).optional(),
    countryCodes: z.array(CountryCodeSchema).optional(),
    languageDependency: z
      .array(
        vocabularyIn(LANGUAGE_DEPENDENCIES).meta({
          'x-arthome-vocabulary-source': 'LANGUAGE_DEPENDENCIES',
        }),
      )
      .optional(),
    replayPolicy: z
      .array(
        vocabularyIn(REPLAY_POLICIES).meta({ 'x-arthome-vocabulary-source': 'REPLAY_POLICIES' }),
      )
      .optional(),
    displayStates: z
      .array(
        vocabularyIn(PUBLIC_SEARCH_STATES).meta({
          'x-arthome-vocabulary-source': 'DISPLAY_STATES',
          'x-arthome-vocabulary-narrowing':
            'The five a public search can filter on. The other six are non-public states or outcomes that replace the state on the card, so a filter on them returns nothing and says nothing.',
        }),
      )
      .optional()
      .describe(
        '**A strict narrowing of `DISPLAY_STATES`** to the five a public search can filter on. The\nother six are either non-public (`draft`, `reserve`, `technical`) or outcomes that replace\nthe state on the card rather than being searched for (`postponed`, `cancelled`,\n`interrupted`). A filter on a state no public list can contain returns nothing and says\nnothing, which is worse than refusing it.\n',
      ),
    priceMinMinor: int64().meta({ format: undefined }).min(0).nullable().optional(),
    priceMaxMinor: int64().meta({ format: undefined }).min(0).nullable().optional(),
    startsAfter: InstantOut.nullable().optional(),
    startsBefore: InstantOut.nullable().optional(),
    almostSoldOut: z.boolean().nullable().optional(),
    onPromotion: z.boolean().nullable().optional(),
    accessibility: z.array(z.string()).optional(),
  })
  .describe(
    '**The criteria grammar, published.** It is the same shape everywhere: parameter of\n`/v1/search`, parameter of `/v1/categories/{id}`, and body of `SavedSearch.criteria`. One\nshape, therefore one signature — and `criteriaSignature` can only produce it because the\nshape is normalised.\n\n**Every value is a stable identifier**, never an array index: a position survives neither a\nshareable URL, nor a saved search, nor the insertion of a discipline.\n',
  );

export const ShowGroupSchema: z.ZodObject<
  {
    showId: z.ZodString;
    title: z.ZodString;
    representativeDate: typeof DateCardSchema;
    matchingDatesCount: z.ZodNumber;
  },
  z.core.$loose
> = z
  .looseObject({
    showId: uuidOut(),
    title: z.string(),
    representativeDate: DateCardSchema,
    matchingDatesCount: int64()
      .meta({ format: undefined })
      .meta({ examples: [3] }),
  })
  .describe(
    'The paginated unit of search for the `best`, `lives` and `replays` tabs is the **show**, not\nthe date. Each group carries the representative date chosen — the first that satisfies the\nfilters, under the current sort — **and** the total number of dates in the group that satisfy\nthe filters: without that second number, "see 2 more dates" is wrong as soon as a filter is\nactive.\n',
  );

export const SavedSearchSchema: z.ZodObject<
  {
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
  },
  z.core.$loose
> = z.looseObject({
  id: uuidOut(),
  scope: vocabularyOutLocal(SAVED_SEARCH_SCOPES, LOCAL_CONTRACT_REASON),
  categoryId: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  queryText: z.string().nullable().optional(),
  criteria: z
    .object({})
    .catchall(z.unknown())
    .describe(
      '**Filter values are stable identifiers**, never array indices. The design filters on a\nposition (`fCats: [1]`); a position survives neither a shareable URL, nor a saved search, nor\nthe insertion of a discipline.\n',
    ),
  criteriaVersion: int64()
    .meta({ format: undefined })
    .describe(
      "When the filter grammar changes, yesterday's search **still runs** if migration is possible;\notherwise it marks itself `stale` **and says so**. It never disappears silently.\n",
    ),
  criteriaSignature: z
    .string()
    .describe(
      'Produced by `normalizeSearchCriteria()` in `@arthome/core`, once only, **never client-side**. It is what answers "already saved" and what deduplicates on write.',
    ),
  stale: z.boolean().optional(),
  channels: z.array(vocabularyOut(NOTIFICATION_CHANNELS)),
  active: z.boolean(),
  newMatchesSinceLastVisit: int64()
    .meta({ format: undefined })
    .describe(
      '**"New since your last visit"**, incremented by the index\'s *percolator* and reset to zero on\nread. Ten searches then cost **zero** counting queries when the page opens; the other two\noptions cost ten.\n',
    ),
});

/**
 * ⚠ `MerchItem` AND `PriceTier` LIVE IN THE CATALOGUE, WHICH IS NOT WHERE THEY
 *   WERE FIRST PUT.
 *
 *   They began in `ticketing`, and `ArtistDetail` and `DateDetail` could not
 *   then be written at all: an artist's page lists their merchandise, a date's
 *   page lists its prices, and `ticketing` already imports this module. The
 *   import back would have closed a load-order cycle, so two schemas were left
 *   unwritten rather than papered over — which was the right call by the worker
 *   who met it.
 *
 *   The direction that resolves it is the honest one: **the catalogue describes
 *   what exists, and ticketing describes transactions over it.** A cart line
 *   references a merch item; a merch item knows nothing about carts. Moving
 *   these two here makes `ticketing -> catalog` one-way and lets the two detail
 *   pages be written as the documents have them.
 */

export const MerchItemSchema: z.ZodObject<
  {
    id: z.ZodString;
    channelId: z.ZodString;
    showId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    label: typeof StorefrontLocalizedTextSchema;
    variants: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodString;
            label: z.ZodString;
            inStock: z.ZodBoolean;
            price: z.ZodOptional<typeof MoneyOut>;
          },
          z.core.$loose
        >
      >
    >;
    price: z.ZodOptional<typeof MoneyOut>;
    state: VocabularyOut;
    source: VocabularyOut;
    merchantUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    pinnedDuringLive: z.ZodOptional<z.ZodBoolean>;
    media: z.ZodOptional<typeof MediaSetSchema>;
  },
  z.core.$loose
> = z.looseObject({
  id: uuidOut(),
  channelId: uuidOut(),
  showId: uuidOut().nullable().optional(),
  label: StorefrontLocalizedTextSchema,
  variants: z
    .array(
      z.looseObject({
        id: z.string(),
        label: z.string().meta({ examples: ['M'] }),
        inStock: z.boolean(),
        price: MoneyOut.meta({ 'x-arthome-tax-basis': 'inclusive' }).optional(),
      }),
    )
    .optional()
    .describe(
      '**A T-shirt without a size is not sellable.** The contract carries the variants; a cart line\nreferences a variant, never a bare item.\n',
    ),
  price: MoneyOut.meta({ 'x-arthome-tax-basis': 'inclusive' }).optional(),
  state: vocabularyOutLocal(
    MERCH_STATES,
    "A state machine local to this resource. It is the contract's own, not the domain's: the domain owns the facts, this owns how far a request has got.",
  ),
  source: vocabularyOutLocal(
    MERCH_SOURCES,
    'An external provider or platform identifier. It is their vocabulary, not ours, and it changes when they change.',
  ).describe(
    "The item's origin. An external source is not sold by us: it links out to `merchantUrl`, and\nno cart accepts it.\n",
  ),
  merchantUrl: z.string().meta({ format: 'uri' }).nullable().optional(),
  pinnedDuringLive: z.boolean().optional(),
  media: MediaSetSchema.optional(),
});

export const PriceTierSchema: z.ZodObject<
  {
    tier: VocabularyOut;
    amount: typeof MoneyOut;
    active: z.ZodBoolean;
    validUntil: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$loose
> = z
  .looseObject({
    tier: vocabularyOut(PRICE_TIERS),
    amount: MoneyOut.meta({ 'x-arthome-tax-basis': 'inherited' }),
    active: z.boolean(),
    validUntil: InstantOut.nullable()
      .optional()
      .describe(
        'Present when the current price depends on the instant — the "show already started" price is\n**pro rata to the time remaining** and cannot be a frozen string. 60 s.\n',
      ),
  })
  .meta({ 'x-arthome-price-basis': 'tax_inclusive' });

/**
 * `ArtistDetail` and `DateDetail` — the two pages.
 *
 * ⚠ THEY ARE `z.intersection`, WHICH IS `allOf` WITH TWO REAL MEMBERS, not the
 *   `allOf: [{$ref}]` wrapper removed from these documents — an OpenAPI 3.0 habit
 *   for generators that ignored `$ref` siblings, and these declare 3.1.1.
 */
export const ArtistDetailSchema: z.ZodIntersection<
  typeof ArtistSummarySchema,
  z.ZodObject<
    {
      biography: z.ZodOptional<typeof StorefrontLocalizedTextSchema>;
      joinedAt: z.ZodOptional<z.ZodString>;
      upcomingDates: z.ZodOptional<z.ZodArray<typeof DateCardSchema>>;
      pastDates: z.ZodOptional<z.ZodArray<typeof DateCardSchema>>;
      replays: z.ZodOptional<z.ZodArray<typeof DateCardSchema>>;
      merchItems: z.ZodOptional<z.ZodArray<typeof MerchItemSchema>>;
    },
    z.core.$loose
  >
> = z.intersection(
  ArtistSummarySchema,
  z.looseObject({
    biography: StorefrontLocalizedTextSchema.optional(),
    joinedAt: InstantOut.optional(),
    upcomingDates: z.array(DateCardSchema).optional(),
    pastDates: z.array(DateCardSchema).optional(),
    replays: z.array(DateCardSchema).optional(),
    merchItems: z.array(MerchItemSchema).optional(),
  }),
);

export const DateDetailSchema: z.ZodIntersection<
  typeof DateCardSchema,
  z.ZodObject<z.ZodRawShape, z.core.$loose>
> = z.intersection(
  DateCardSchema,
  z
    .looseObject({
      synopsis: StorefrontLocalizedTextSchema.optional(),
      castAndCrew: z
        .array(
          z.looseObject({
            personId: uuidOut().optional(),
            name: z.string().optional(),
            roleCode: z.string().optional(),
          }),
        )
        .optional(),
      spokenLanguages: z.array(z.string()).optional(),
      subtitleLanguages: z.array(z.string()).optional(),
      surtitleLanguages: z.array(z.string()).optional(),
      attributes: z
        .looseObject({})
        .optional()
        .describe(
          'The seven attribute groups. Distinct from **tags** (`tagIds`) — a name collision between two notions, separated by the contract.',
        ),
      priceTiers: z.array(PriceTierSchema).optional(),
      serviceFee: z
        .looseObject({
          perSeat: MoneyOut.meta({ 'x-arthome-tax-basis': 'inclusive' }).optional(),
          capped: MoneyOut.meta({ 'x-arthome-tax-basis': 'inherited' }).optional(),
        })
        .nullable()
        .optional()
        .describe(
          'The service-fee **scale**, **per seat**, served by the contract. Never a screen constant: the\nsummary displays a "service fee" line, and it must be computable once only.\n',
        ),
      chapters: z.array(ChapterSchema).optional(),
      seriesDates: z.array(DateCardSchema).optional().describe('The other dates of the same show.'),
      totalSeriesDates: int64()
        .meta({ format: undefined })
        .optional()
        .describe('"All dates (N)": the N is **served**, not counted from the visible slice.'),
      suggestions: z.array(DateCardSchema).optional(),
      merchItems: z
        .array(MerchItemSchema)
        .optional()
        .describe("The show's shop, served with the detail page."),
    })
    .describe(
      'The detail page. Served in **one** call, with its series, the same artist and the suggestions.',
    ),
);
