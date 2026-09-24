/**
 * `@arthome/contracts/studio-access` — who may operate, and with what: the actor, their
 * effective rights, and the bootstrap a studio surface is handed on sign-in. Separate from
 * `identity` because the two products' session shapes genuinely differ — a viewer receives a
 * `ViewerContext`, a control room receives a `StudioBootstrap`.
 *
 * ⚠ `StudioSessionEstablished{Bearer,Cookie}Schema` CARRY THE PRODUCT PREFIX. The storefront
 *   exports two schemas of the same names with a different payload, and the emit gate tries
 *   `<Product><Name>Schema` before `<Name>Schema`: the prefix is what selects these two for
 *   `studio.yaml`.
 *
 * ⚠ `looseObject` because a server sends these shapes; `int64` and never `z.int()`;
 *   `vocabularyOut` for every enumerated value a server sends. A vocabulary the document
 *   declares as local (`x-arthome-vocabulary-source: none`) goes through `localVocabulary`,
 *   which emits the reason the document gives instead of inventing a source name.
 */

import { z } from 'zod';

import {
  CREW_ROLES,
  DISPLAY_STATES,
  RUN_STATES,
  DATE_PANES,
  LOCALES,
  MEMBER_ROLES,
  MESSAGE_DOMAINS,
  MemberRole,
  MessageDomain,
  NAVIGATION_ENTRIES,
  NavigationEntry,
  SURFACES,
} from '@arthome/core';
import {
  InstantOut,
  int64,
  uuidOut,
  vocabularyOut,
  vocabularyOutLocal,
  vocabularyOutLocalNullable,
  vocabularyOutNullable,
} from '@arthome/core/schema';

import { SessionMode } from '../identity/index.js';

const LOCAL_REASON =
  'A vocabulary local to this contract. The domain neither produces nor consumes these values — they describe what this endpoint offers, and a new member is an endpoint change.';

/** A vocabulary local to this contract: `none` as its source, and the reason the document gives. */
const localVocabulary = (
  values: readonly [string, ...string[]],
  reason: string = LOCAL_REASON,
): z.ZodString => vocabularyOutLocal(values, reason);

const localVocabularyNullable = (
  values: readonly [string, ...string[]],
  reason: string,
): z.ZodNullable<z.ZodString> => vocabularyOutLocalNullable(values, reason);

/**
 * An instant with `format: date-time` and NO `pattern`: these documents carry the format
 * alone here, where `InstantSchema` would add its regex.
 */

/** An integer with no format, as the document writes `type: integer`. */
const int = (): z.ZodNumber => int64().meta({ format: undefined });

const instantNullable = (): z.ZodNullable<z.ZodString> =>
  z.string().nullable().meta({ format: 'date-time' });

const uuidNullable = (): z.ZodNullable<z.ZodString> =>
  z.string().nullable().meta({ format: 'uuid' });

/**
 * ⚠ `StudioCounters` LIVES HERE AND NOT IN `studio-money`, WHICH IS WHERE IT
 *   READS AS BELONGING.
 *
 *   `StudioBootstrap` carries it — a control room is handed its counters on
 *   sign-in — and `DashboardScreen` in `studio-money` carries it too. With it in
 *   `studio-money`, those two modules imported each other: a load-order cycle
 *   that held only by declaration order, and that a worker had already papered
 *   with `z.lazy` on `Actor`.
 *
 *   It references NOTHING, measured rather than assumed, so it can sit at the
 *   base. That makes `studio-access` what the other three studio modules already
 *   treat it as: the one they all import and that imports none of them.
 */
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

/** Who caused the fact. */
export const ActorSchema: z.ZodObject<
  {
    accountId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    personId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    displayName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    surface: z.ZodString;
  },
  z.core.$loose
> = z
  .looseObject({
    accountId: uuidNullable().optional(),
    personId: uuidNullable().optional(),
    displayName: z.string().nullable().optional(),
    surface: vocabularyOut(SURFACES).describe(
      '**One vocabulary, six members** — `SURFACES` — with the narrowing said here rather than\nwritten as a second, shorter list. A studio payload carries `studio_web`, `studio_mobile`\nor `system` and never the three storefront surfaces, **by construction**: the actor is\nwhoever called this BFF. Declaring only three would be a second authored list for a field\nthe domain already defines, which is how E4 started.\n',
    ),
  })
  .describe(
    'Who caused the fact. **Empty for `system`** — a server rule (an automatic holding screen, a\nlease expiring) is an actor all the same, and the log must be able to tell it apart from a\nhuman decision.\n',
  );

/** The rights of one person on one channel, computed once in `@arthome/core`. */
export const EffectiveRightsSchema: z.ZodObject<
  {
    channelId: z.ZodString;
    channelName: z.ZodOptional<z.ZodString>;
    roles: z.ZodArray<z.ZodString>;
    isOwner: z.ZodOptional<z.ZodBoolean>;
    navigation: z.ZodArray<z.ZodString>;
    contextualPages: z.ZodOptional<z.ZodArray<z.ZodString>>;
    tabBar: z.ZodOptional<z.ZodArray<z.ZodString>>;
    datePanes: z.ZodArray<z.ZodString>;
    canRevenue: z.ZodBoolean;
    canOps: z.ZodBoolean;
    canTech: z.ZodBoolean;
    canDecideOutcome: z.ZodBoolean;
    assignableRoles: z.ZodArray<z.ZodString>;
    dateGrants: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            grantId: z.ZodString;
            dateId: z.ZodString;
            crewRole: z.ZodString;
            expiresAt: z.ZodString;
          },
          z.core.$loose
        >
      >
    >;
  },
  z.core.$loose
> = z
  .looseObject({
    channelId: uuidOut(),
    channelName: z.string().optional(),
    roles: z
      .array(vocabularyOut(MEMBER_ROLES))
      .meta({ examples: [[MemberRole.PRODUCTION, MemberRole.COORDINATION]] })
      .describe('**A set**, never a single role — one person holds several on the same channel.'),
    isOwner: z
      .boolean()
      .optional()
      .describe(
        'Exactly one row per channel. **Never removable, and their roles never editable.**',
      ),
    navigation: z
      .array(vocabularyOut(NAVIGATION_ENTRIES))
      .describe(
        "The **open** entries, in the served canonical order. The surface neither orders nor\nfilters.\n\n**The list is `NAVIGATION_ENTRIES` in `@arthome/core`, and the direction is not a\npreference**: critical rule 2 says a value displayed twice comes from core, so the\ncontract follows core and never the reverse. It had drifted on two members, in the two\nways a copied list always drifts — one missing, one renamed:\n\n- `team` was in core and absent here, while this document serves the team page\n  (`listChannelMembers`). A screen with no way into it;\n- core says `moderation-page` where this document said `moderation`. That is the worse\n  of the two, because both sides believed they shared the value. And the disambiguation\n  is core's to keep: in **this** document `moderation` is already a **role** — one of\n  the eight canonical values, in six places — so a navigation entry spelled the same\n  way collides with a role inside one payload.\n",
      ),
    contextualPages: z
      .array(localVocabulary(['regie', 'wizard', 'event', 'inbox']))
      .optional()
      .meta({ examples: [['regie', 'wizard', 'event', 'inbox']] })
      .describe(
        "**The pages reached from another page, never listed in a menu** — and they need a rights\ncarrier like the rest. `regie` is a stage manager's duty page, the one they open when the\nfeed drops; `wizard` creates a date; `event` is the record; `inbox` is open to everyone,\nwith no role condition.\n\n**They are not in `navigation`, and that is deliberate**: `navigation` populates the bar and\nthe sheet, these four do not. Filing them together had produced the opposite mistake —\n`regie` had been removed from the vocabulary to make an inconsistency between two tables go\naway, that is, **the duty's main destination was deleted in order to silence the symptom\nthat pointed at it**. The two tables are reconciled here, and the page is given back.\n",
      ),
    tabBar: z
      .array(z.string())
      .optional()
      .meta({
        examples: [
          [
            NavigationEntry.DASHBOARD,
            NavigationEntry.EVENTS,
            NavigationEntry.CREW,
            NavigationEntry.TICKETS,
          ],
        ],
      })
      .describe(
        "**The four tabs of the bottom bar, in their order, served.** This is **not** `navigation`\ntruncated to four: the bar's order depends on the role, and the demonstration is arithmetic —\nfor an artist, the first four entries of `navigation` give\n`dashboard · crew · events · stream`, where the bar must carry\n`dashboard · events · crew · tickets`. Two differences out of four: taking the head of\n`navigation` would put the control room in an artist's bar and push ticketing out of it —\nthat is, what an artist looks at most.\n\nThe table lives in `@arthome/core` and is **served** here, because the studio web orders the\nsame menu: copied out, it would be implemented twice — which critical rule 2 forbids.\n",
      ),
    datePanes: z
      .array(vocabularyOut(DATE_PANES))
      .describe(
        'The date-record panes open **to this person**. A detail screen whose very layout depends on\nrights: it is not only the root navigation that must know the rights before painting, it is\nevery record too.\n',
      ),
    canRevenue: z.boolean().describe('**Decides the content of the response**, not its display.'),
    canOps: z.boolean(),
    canTech: z.boolean(),
    canDecideOutcome: z
      .boolean()
      .describe(
        'Postpone, cancel, carry on with compensation — **reserved to the owner and to production**.\nThe other roles can only **report**. An outcome decision is worth several thousand euros.\n',
      ),
    assignableRoles: z
      .array(z.string())
      .describe(
        'The projection of `grants` onto the roles held, **materialised** — never the `grants` table\nto be recomposed. `director` can invite `video` and `sound`; `video`, `sound`, `moderation`\nand `treasury` invite nobody.\n',
      ),
    dateGrants: z
      .array(
        z.looseObject({
          grantId: uuidOut(),
          dateId: uuidOut(),
          crewRole: vocabularyOut(CREW_ROLES),
          expiresAt: InstantOut,
        }),
      )
      .optional()
      .describe(
        'The **one-off** accesses in force, scoped to a date, with their **instant** of expiry.\n"Expires at curtain call + 1 h" is a screen sentence; the contract carries the instant.\n',
      ),
  })
  .describe(
    "**Computed once in `@arthome/core`, served by the BFF.** Never recomposed by a surface: the\nnavigation is the **union** of the accesses of every role held, and a six-persona projection\nwould erase `director`'s right to invite.\n",
  );

/** The first paint waits for this and for nothing else. */
export const StudioBootstrapSchema: z.ZodObject<
  {
    person: z.ZodObject<
      {
        personId: z.ZodString;
        displayName: z.ZodString;
        isFreelance: z.ZodOptional<z.ZodBoolean>;
        runsCalled: z.ZodOptional<z.ZodNumber>;
        readingTimezone: z.ZodOptional<z.ZodString>;
      },
      z.core.$loose
    >;
    channels: z.ZodArray<typeof EffectiveRightsSchema>;
    personNavigation: z.ZodOptional<z.ZodArray<z.ZodString>>;
    rightsVersion: z.ZodNumber;
    constants: z.ZodObject<
      {
        technicalProvisionThreshold: z.ZodOptional<z.ZodNumber>;
        provisionRevisionHours: z.ZodOptional<z.ZodNumber>;
        waitlistPriorityWindowHours: z.ZodOptional<z.ZodNumber>;
        cancelDeadlineMinutesBefore: z.ZodOptional<z.ZodNumber>;
        payoutDelayDays: z.ZodOptional<z.ZodNumber>;
        commissionRateBps: z.ZodOptional<z.ZodNumber>;
        chatBurstThresholdPerMinute: z.ZodOptional<z.ZodNumber>;
        moderationQueueAlertThreshold: z.ZodOptional<z.ZodNumber>;
        crewUnassignedAlertHoursBefore: z.ZodOptional<z.ZodNumber>;
        holdScreenAutoAfterSec: z.ZodOptional<z.ZodNumber>;
        seasonBounds: z.ZodOptional<
          z.ZodObject<
            { startsOn: z.ZodOptional<z.ZodString>; endsOn: z.ZodOptional<z.ZodString> },
            z.core.$loose
          >
        >;
      },
      z.core.$loose
    >;
    labelCatalog: z.ZodObject<
      {
        domain: z.ZodOptional<z.ZodString>;
        locale: z.ZodOptional<z.ZodString>;
        version: z.ZodOptional<z.ZodNumber>;
        url: z.ZodOptional<z.ZodString>;
      },
      z.core.$loose
    >;
    counters: typeof StudioCountersSchema;
    realtime: z.ZodOptional<
      z.ZodObject<
        { namespace: z.ZodOptional<z.ZodString>; pulseIntervalSec: z.ZodOptional<z.ZodNumber> },
        z.core.$loose
      >
    >;
  },
  z.core.$loose
> = z
  .looseObject({
    person: z.looseObject({
      personId: uuidOut(),
      displayName: z.string(),
      isFreelance: z.boolean().optional(),
      runsCalled: int()
        .optional()
        .describe('**A read model**, not a hand-written field: it increments on `run_ended`.'),
      readingTimezone: z
        .string()
        .optional()
        .meta({ examples: ['Europe/Paris'] })
        .describe(
          '**The same field** as the storefronts reading timezone — same account, one carrier only.',
        ),
    }),
    channels: z.array(EffectiveRightsSchema),
    personNavigation: z
      .array(localVocabulary([NavigationEntry.AGENDA, 'inbox', NavigationEntry.HELP]))
      .optional()
      .meta({ examples: [[NavigationEntry.AGENDA, 'inbox', NavigationEntry.HELP]] })
      .describe(
        '**The entries that belong to the person, not to a channel.** `agenda` is served by\n`GET /v1/me/duties`, explicitly "across all channels"; `inbox` likewise, and it is open to\neveryone. Filing them under the **per-channel** `navigation` meant a person on three channels\nreceived the same entry three times — or zero times, which is what happened in the example\nthis document served: a `video` role received `[events, stream, replays, help]`, with no\n`agenda`, although a stage manager\'s duty page is precisely that one. The `dutiesTonight`\ncounter was served all the same, which presupposes that duties count.\n\n**Two vocabularies in one field, like `DashboardReminder.targetPage`, and here it is\ncorrect.** `agenda` and `help` are `NAVIGATION_ENTRIES`; `inbox` is a contextual page.\nThey sit together because what they have in common is the **scope** — the person rather\nthan the channel — not which menu they came from. Saying so is the difference between\nthis and the `targetPage` defect, where the same merge had gone unremarked and one member\nwas spelled wrong.\n',
      ),
    rightsVersion: int64(),
    constants: z
      .looseObject({
        technicalProvisionThreshold: int()
          .optional()
          .meta({ examples: [10000] }),
        provisionRevisionHours: int()
          .optional()
          .meta({ examples: [72] }),
        waitlistPriorityWindowHours: int()
          .optional()
          .meta({ examples: [2] }),
        cancelDeadlineMinutesBefore: int()
          .optional()
          .meta({ examples: [60] }),
        payoutDelayDays: int()
          .optional()
          .meta({ examples: [14] }),
        commissionRateBps: int()
          .optional()
          .meta({ examples: [1200] }),
        chatBurstThresholdPerMinute: int()
          .optional()
          .meta({ examples: [60] }),
        moderationQueueAlertThreshold: int()
          .optional()
          .meta({ examples: [10] })
          .describe(
            '**The "queue beyond ten messages" threshold**, one of the five notification thresholds that had no carrier. Rule 15.',
          ),
        crewUnassignedAlertHoursBefore: int()
          .optional()
          .meta({ examples: [24] })
          .describe(
            '**The "post unassigned at D-1" delay**, the second of the two thresholds without a carrier.',
          ),
        holdScreenAutoAfterSec: int()
          .optional()
          .meta({ examples: [15] })
          .describe(
            '"Automatic holding screen if the feed is lost for more than 15 s" is a **server rule**,\ncarried as a channel default. It does not depend on a control-room workstation that might be\nthe one that lost the network.\n',
          ),
        seasonBounds: z
          .looseObject({
            startsOn: z
              .string()
              .optional()
              .meta({ examples: ['09-01'] }),
            endsOn: z
              .string()
              .optional()
              .meta({ examples: ['08-31'] }),
          })
          .optional()
          .describe(
            '**1 September → 31 August**, the live-performance convention. Served, never guessed by five surfaces.',
          ),
      })
      .describe(
        'The domain constants, **served**. Technical-provision threshold, revision deadline,\nwaiting-list priority window, season boundaries, chat rate ceiling, cancellation deadline.\nCopied out, these constants would diverge across five surfaces (E11).\n',
      ),
    labelCatalog: z
      .looseObject({
        domain: vocabularyOut(MESSAGE_DOMAINS)
          .optional()
          .meta({ examples: [MessageDomain.STOREFRONT] })
          .describe(
            '**Which catalogue this reference is for**, served rather than recoverable by taking the\nURL apart. The theme lived only inside the path (`/i18n/studio/fr/v41.json`), so a client\ncaching catalogues by theme had to parse a string to learn what it was holding — which is\n`imageUrl(kind, key, width)` in another costume, and the same rule answers it: **a value\nrecoverable only by parsing a string is a value the contract did not serve.**\n',
          ),
        locale: vocabularyOut(LOCALES)
          .optional()
          .meta({ examples: [LOCALES[0]] })
          .describe(
            '**The domain declares exactly two**, and the contract says so rather than serving an\nopen string: a surface choosing a fallback needs to know the set it is choosing from.\nTolerant on output like every other served vocabulary — a third locale is kept raw and\ntreated as neutral, never rejected.\n',
          ),
        version: int().optional(),
        url: z.string().meta({ format: 'uri' }).optional(),
      })
      .describe(
        'An immutable versioned artifact, **served per surface**. The studio loads four themes —\n`studio`, `taxonomy`, `system`, `storefront` — and its number of enumeration keys is high: the\nsplit by surface exists precisely for that. **No service** serves it: it is a CDN artifact.\n',
      ),
    counters: StudioCountersSchema,
    realtime: z
      .looseObject({
        namespace: z
          .string()
          .optional()
          .meta({ examples: ['/studio'] }),
        pulseIntervalSec: int()
          .optional()
          .meta({ examples: [5] })
          .describe(
            '**`ws:pulse` every 5 s**, and that is what makes silence diagnosable: no more pulse for\n15 s = **I am deaf**; a pulse with no health sample for 30 s = **the room has stopped\nsending**. Two states, two screens, no inference.\n',
          ),
      })
      .optional()
      .describe(
        "**The subscription is per person, not per page.** A channel opened only on the channel\ncurrently displayed would miss the other one's incident — and on an already fragile mobile\nnetwork, one subscription per channel would multiply the connections.\n",
      ),
  })
  .describe(
    '**The first paint waits for one thing only: this.** The tables are never read empty, and that\nis the right behaviour — but it imposes its own constraint: the bootstrap must be **small and\nfast**, because nothing is painted until it is there. Everything else — measurements, queue,\nstatistics — arrives afterwards, screen by screen.\n\n**The root is not a channel, it is a person.** A freelance stage manager or moderator works\nacross several channels the same evening; `channels[]` carries them all, with their effective\nrights.\n',
  );

/** A cookie session: nothing in the body but the bootstrap. */
export const StudioSessionEstablishedCookieSchema: z.ZodObject<
  { mode: z.ZodLiteral<typeof SessionMode.COOKIE>; bootstrap: typeof StudioBootstrapSchema },
  z.core.$loose
> = z
  .looseObject({
    mode: z.literal(SessionMode.COOKIE),
    bootstrap: StudioBootstrapSchema,
  })
  .describe(
    "`HttpOnly` `Secure` `SameSite=Lax` cookie on the **BFF's domain**. **Nothing in the body.**",
  );

/** A bearer session: an opaque token in the body, no cookie. */
export const StudioSessionEstablishedBearerSchema: z.ZodObject<
  {
    mode: z.ZodLiteral<typeof SessionMode.BEARER>;
    accessToken: z.ZodString;
    refreshToken: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    expiresAt: z.ZodString;
    bootstrap: typeof StudioBootstrapSchema;
  },
  z.core.$loose
> = z
  .looseObject({
    mode: z.literal(SessionMode.BEARER),
    accessToken: z.string(),
    refreshToken: z.string().nullable().optional(),
    expiresAt: InstantOut,
    bootstrap: StudioBootstrapSchema,
  })
  .describe(
    'Opaque token in the body, **no cookie**, stored in the native store —\n`@capacitor/preferences`, **never `localStorage`**.\n',
  );
('A narrowing of a vocabulary named elsewhere in this document, with the reason in the description above: the members left out are the rule, not an omission.');

/** The session mode, chosen by the caller and never inferred. */
export const StudioSessionModeSchema: z.ZodEnum<{ cookie: 'cookie'; bearer: 'bearer' }> = z
  // The studio narrows the three transport modes to two: it has no device
  // sessions, because only a television carries a device token. Taken from
  // `SESSION_MODES` rather than spelled again — the members were literals
  // here, copied from a const the other module did not export.
  .enum([SessionMode.COOKIE, SessionMode.BEARER])
  .meta({
    'x-arthome-vocabulary-source': 'SESSION_MODES',
    'x-arthome-vocabulary-narrowing':
      'Two of the three. The studio has no device sessions: only a television opens a sign-in pairing with neither cookie nor token, and a control room is not one.',
  })
  .describe(
    '**An explicit parameter, validated, never inferred from the `User-Agent`** — that one is\nforgeable. `cookie` for the studio web; `bearer` for the native shell, where\n`capacitor://localhost` is a third-party context on iOS and where no cookie would survive.\n',
  );

/** Exactly one of a cookie or a bearer session, discriminated by the mode. */
export const StudioSessionEstablishedSchema: z.ZodDiscriminatedUnion<
  [typeof StudioSessionEstablishedCookieSchema, typeof StudioSessionEstablishedBearerSchema]
> = z
  .discriminatedUnion('mode', [
    StudioSessionEstablishedCookieSchema,
    StudioSessionEstablishedBearerSchema,
  ])
  .meta({
    discriminator: {
      propertyName: 'mode',
      mapping: {
        cookie: '#/components/schemas/SessionEstablishedCookie',
        bearer: '#/components/schemas/SessionEstablishedBearer',
      },
    },
  })
  .describe(
    '**Invariant: a response never carries a cookie and a token at once.** Two bearers for one\nsession means two revocations to keep up and one that will be forgotten. So these are **two\nschemas**, discriminated by the mode, and not one schema with an optional field.\n',
  );

/** A member of a channel's team. */
export const ChannelMemberSchema: z.ZodObject<z.ZodRawShape, z.core.$loose> = z.looseObject({
  personId: uuidOut(),
  displayName: z.string(),
  email: z.email().meta({ pattern: undefined }).nullable().optional(),
  roles: z
    .array(vocabularyOut(MEMBER_ROLES))
    .describe('**A set.** The eight canonical values, never the fallback to six.'),
  isOwner: z
    .boolean()
    .describe(
      '**Never removable, and their roles never editable.** `transferOwnership` moves the flag.',
    ),
  joinedAt: InstantOut,
  note: z.string().nullable().optional(),
  invitationState: localVocabularyNullable(
    ['pending', 'accepted', 'declined', 'expired'],
    "A state machine local to this resource. It is the contract's own, not the domain's: the domain owns the facts, this owns how far a request has got.",
  ).optional(),
  version: int().optional(),
});

/** The one-off stand-in, scoped to a date. */
export const DateAccessGrantSchema: z.ZodObject<z.ZodRawShape, z.core.$loose> = z
  .looseObject({
    grantId: uuidOut(),
    dateId: uuidOut(),
    personId: uuidOut(),
    displayName: z.string().optional(),
    crewRole: vocabularyOut(CREW_ROLES),
    expiresAt: InstantOut,
    grantedBy: ActorSchema.optional(),
  })
  .describe(
    'The **one-off stand-in** — scoped to a date, expiry **served as an instant**, revocable\n**without touching channel membership**. Conflating it with a membership would turn revoking a\nstand-in into expulsion from the channel.\n',
  );

/** A duty, across all channels. */
export const DutySchema: z.ZodObject<z.ZodRawShape, z.core.$loose> = z
  .looseObject({
    dateId: uuidOut(),
    channelId: uuidOut(),
    channelName: z.string().optional(),
    title: z.string().optional(),
    crewRole: vocabularyOut(CREW_ROLES),
    startsAt: InstantOut,
    venueClock: z
      .looseObject({
        venueTimezone: z
          .string()
          .optional()
          .meta({ examples: ['Europe/Paris'] }),
        venueUtcOffsetMin: int()
          .optional()
          .meta({ examples: [120] }),
      })
      .optional()
      .describe(
        "**The room's timezone, on the duty itself.** The duties screen is this surface's home\nscreen, and for each row it displays the person's time **and** the room's time — \"the\nviewer's time first, the room's time second when it differs\". Without this block, rendering\nit took one call per duty: exactly the N+1 the bootstrap exists to kill, on the one screen a\nstage manager opens on arriving at a venue.\n",
      ),
    runtimeMin: int()
      .nullable()
      .optional()
      .describe('The announced duration, the one the row displays.'),
    displayState: vocabularyOut(DISPLAY_STATES).optional(),
    runState: vocabularyOutNullable(RUN_STATES).optional(),
    overlapsWith: z
      .array(uuidOut())
      .optional()
      .describe(
        '**Served**, never computed by the surface: `overlapsWith` lives in `@arthome/core`.',
      ),
    accessExpiresAt: instantNullable().optional(),
  })
  .describe(
    'A duty. `person_duties` is held by `identity` and carries **all channels together**: a stage\nmanager can be on duty for two live shows the same evening, and the banner flags the\n**overlap**.\n',
  );
