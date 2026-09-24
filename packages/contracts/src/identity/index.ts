/**
 * `@arthome/contracts/identity` — Who is asking: the established session, profiles, preferences, consents, devices and the bootstrap ViewerContext.
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
  DEVICE_KINDS,
  Locale,
  OrderErrorCode,
  PLAN_TIERS,
  SUBSCRIPTION_STATES,
} from '@arthome/core';
import {
  InstantOut,
  MoneyOut,
  VOCABULARY_SOURCE_LOCAL,
  int64,
  type VocabularyOut,
  type VocabularyOutNullable,
  uuidOut,
  vocabularyOut,
  vocabularyOutLocal,
  vocabularyOutNullable,
} from '@arthome/core/schema';

import {
  DomainConstantsSchema,
  ImageRenditionSchema,
  LabelArtifactRefSchema,
} from '../catalog/index.js';
import { NotificationPreferencesSchema } from '../engagement/index.js';
import { OrderSchema, SubscriptionSchema, TicketCardSchema } from '../ticketing/index.js';

// The document's name for a vocabulary local to the contract. The preferred
// form is `vocabularyOutLocal`, which makes the reason mandatory; these three
// call sites chain their own `.meta()` with an `examples` key beside it.
const LOCAL_VOCABULARY = VOCABULARY_SOURCE_LOCAL;

const PROFILE_KINDS = ['adult', 'child'] as const;
const LIVE_OPEN_BEHAVIOURS = ['peek', 'muted', 'off'] as const;
const PLAYBACK_QUALITIES = ['auto', 'low', 'medium', 'high'] as const;
const BEARER_SESSION_MODES = ['bearer', 'device'] as const;

export const ProfileSummarySchema: z.ZodObject<
  {
    id: z.ZodString;
    name: z.ZodString;
    kind: VocabularyOut;
    avatar: z.ZodOptional<typeof ImageRenditionSchema>;
    allowedCategoryIds: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
  },
  z.core.$loose
> = z
  .looseObject({
    id: uuidOut(),
    name: z.string().meta({ examples: ['Marie'] }),
    kind: vocabularyOut(PROFILE_KINDS, LOCAL_VOCABULARY).meta({
      'x-arthome-vocabulary-reason':
        'An account-management shape, local to this endpoint: what the person asked for, not a fact the domain reasons about.',
      examples: [PROFILE_KINDS[0]],
    }),
    avatar: ImageRenditionSchema.optional(),
    allowedCategoryIds: z
      .array(z.string())
      .nullable()
      .optional()
      .describe(
        "Present for a child profile. Filtering the child catalogue happens **server-side**:\notherwise a child's television downloads the adult catalogue in order to hide it.\n",
      ),
  })
  .describe('Up to five per account — a shared-television constraint, carried by the account.');

export const ViewerPreferencesSchema: z.ZodObject<
  {
    account: z.ZodOptional<
      z.ZodObject<
        {
          interfaceLocale: z.ZodOptional<z.ZodString>;
          subtitlesDefault: z.ZodOptional<z.ZodBoolean>;
          subtitleLanguage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          audioDescription: z.ZodOptional<z.ZodBoolean>;
          liveOpenBehaviour: z.ZodOptional<VocabularyOut>;
          chatOpenByDefault: z.ZodOptional<z.ZodBoolean>;
          readingTimezone: z.ZodOptional<z.ZodString>;
        },
        z.core.$loose
      >
    >;
    device: z.ZodOptional<
      z.ZodObject<
        {
          defaultQuality: z.ZodOptional<VocabularyOut>;
          subtitleSizeStep: z.ZodOptional<z.ZodNumber>;
          reduceMotion: z.ZodOptional<z.ZodBoolean>;
          autoplayPreview: z.ZodOptional<z.ZodBoolean>;
          dataSaver: z.ZodOptional<z.ZodBoolean>;
        },
        z.core.$loose
      >
    >;
  },
  z.core.$loose
> = z
  .looseObject({
    account: z
      .looseObject({
        interfaceLocale: z
          .string()
          .meta({ examples: [Locale.FR] })
          .optional(),
        subtitlesDefault: z.boolean().optional(),
        subtitleLanguage: z
          .string()
          .nullable()
          .meta({ examples: [Locale.FR] })
          .optional()
          .describe(
            '**Turning subtitles on and choosing their language are two settings.** The contract carried\nonly the boolean; the design carries a language. A viewer who wants English subtitles on a\nFrench show was inexpressible.\n',
          ),
        audioDescription: z.boolean().optional(),
        liveOpenBehaviour: vocabularyOutLocal(
          LIVE_OPEN_BEHAVIOURS,
          'A presentation choice the contract serves so that five surfaces do not each invent one. The domain has no opinion on it.',
        ).optional(),
        chatOpenByDefault: z.boolean().optional(),
        readingTimezone: z
          .string()
          .meta({ examples: ['Europe/Paris'] })
          .optional()
          .describe(
            "The **same field** as the studio's reading timezone — one account, one carrier.",
          ),
      })
      .optional(),
    device: z
      .looseObject({
        defaultQuality: vocabularyOutLocal(
          PLAYBACK_QUALITIES,
          'A presentation choice the contract serves so that five surfaces do not each invent one. The domain has no opinion on it.',
        ).optional(),
        subtitleSizeStep: int64().meta({ format: undefined }).optional(),
        reduceMotion: z.boolean().optional(),
        autoplayPreview: z.boolean().optional(),
        dataSaver: z.boolean().optional(),
      })
      .optional(),
  })
  .describe(
    '**Two scopes, settled field by field** (`storefront-tv` Q8). Language, default subtitles,\naudio description, behaviour when a live show opens and the reading timezone depend on the\n**person**; default quality, subtitle size, reduced motion and automatic preview depend on\nthe **device** and the room. A single scope would be wrong half the time.\n\nThe resource is **additive and tolerant**: a key unknown to one version of the application is\nneither rejected nor erased on the next write — otherwise the mobile version stuck in store\nreview overwrites settings made from the web.\n',
  );

export const ViewerContextSchema: z.ZodObject<
  {
    deviceId: z.ZodString;
    signedIn: z.ZodOptional<z.ZodBoolean>;
    currentProfileId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    profiles: z.ZodArray<typeof ProfileSummarySchema>;
    account: z.ZodOptional<
      z.ZodNullable<
        z.ZodObject<
          {
            publicHandle: z.ZodOptional<z.ZodString>;
            memberNumber: z.ZodOptional<z.ZodString>;
            emailVerified: z.ZodOptional<z.ZodBoolean>;
          },
          z.core.$loose
        >
      >
    >;
    plan: z.ZodOptional<
      z.ZodNullable<
        z.ZodObject<
          {
            tier: z.ZodOptional<VocabularyOut>;
            state: z.ZodOptional<VocabularyOut>;
            seatDiscountBps: z.ZodOptional<z.ZodNumber>;
            concurrentStreamsAllowed: z.ZodOptional<z.ZodNumber>;
          },
          z.core.$loose
        >
      >
    >;
    preferences: z.ZodOptional<typeof ViewerPreferencesSchema>;
    constants: typeof DomainConstantsSchema;
    labelCatalog: typeof LabelArtifactRefSchema;
    taxonomyArtifact: typeof LabelArtifactRefSchema;
    realtime: z.ZodOptional<
      z.ZodObject<
        {
          namespace: z.ZodOptional<z.ZodString>;
          pulseIntervalSec: z.ZodOptional<z.ZodNumber>;
        },
        z.core.$loose
      >
    >;
  },
  z.core.$loose
> = z
  .looseObject({
    deviceId: uuidOut(),
    signedIn: z.boolean().optional(),
    currentProfileId: uuidOut().nullable().optional(),
    profiles: z.array(ProfileSummarySchema),
    account: z
      .looseObject({
        publicHandle: z
          .string()
          .meta({ examples: ['@marie.j'] })
          .optional(),
        memberNumber: z.string().optional(),
        emailVerified: z.boolean().optional(),
      })
      .nullable()
      .optional(),
    plan: z
      .looseObject({
        tier: vocabularyOut(PLAN_TIERS).optional(),
        state: vocabularyOut(SUBSCRIPTION_STATES).optional(),
        seatDiscountBps: int64()
          .meta({ format: undefined })
          .meta({ examples: [1000] })
          .optional(),
        concurrentStreamsAllowed: int64()
          .meta({ format: undefined })
          .meta({ examples: [2] })
          .optional(),
      })
      .nullable()
      .optional()
      .describe(
        'The **displayed** plan, served to paint prices and badges. It **never** decides a right to\nwatch: that right is returned by `streaming` when the player opens, on fresh data\n(`adr-auth.md` §7.1).\n',
      ),
    preferences: ViewerPreferencesSchema.optional(),
    constants: DomainConstantsSchema,
    labelCatalog: LabelArtifactRefSchema,
    taxonomyArtifact: LabelArtifactRefSchema.describe(
      'Same regime as the i18n catalogue, **served per slice and per surface**: mobile loads\nneither the studio vocabulary nor the television key table. 59.5 KB raw / 8.4 KB gzipped for\nthe full slice — this is not an API call.\n',
    ),
    realtime: z
      .looseObject({
        namespace: z
          .string()
          .meta({ examples: ['/storefront'] })
          .optional(),
        pulseIntervalSec: int64()
          .meta({ format: undefined })
          .meta({ examples: [5] })
          .optional(),
      })
      .optional()
      .describe(
        'Where to open **the single** real-time connection. Multiplexing is per room, never per connection.',
      ),
  })
  .describe(
    "The bootstrap payload. **A single call**, and it is the entire budget of the `boot` screen:\nthe device's profiles, rights, preferences, domain constants, label catalogue version. The\nlabels themselves come from the embedded snapshot — the version check **never** blocks the\nfirst render.\n",
  );

export const SessionEstablishedCookieSchema: z.ZodObject<
  {
    mode: z.ZodLiteral<'cookie'>;
    viewerContext: typeof ViewerContextSchema;
  },
  z.core.$loose
> = z
  .looseObject({
    mode: z.literal('cookie'),
    viewerContext: ViewerContextSchema.describe(
      "**Projected, never the authentication library's raw shape.** The surface receives the context\nit uses everywhere else, and does not have two session shapes to know about.\n",
    ),
  })
  .describe(
    "The cookie is set in a `Set-Cookie` header — `HttpOnly`, `Secure`, `SameSite=Lax`, on the\n**BFF's domain**. **Nothing in the body**: no token, no session identifier.\n",
  );

export const SessionEstablishedBearerSchema: z.ZodObject<
  {
    mode: VocabularyOut;
    accessToken: z.ZodString;
    refreshToken: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    expiresAt: z.ZodString;
    viewerContext: typeof ViewerContextSchema;
  },
  z.core.$loose
> = z
  .looseObject({
    mode: vocabularyOutLocal(
      BEARER_SESSION_MODES,
      'A narrowing of a vocabulary named elsewhere in this document, with the reason in the description above: the members left out are the rule, not an omission.',
    ).describe(
      '**A narrowing of `SessionMode` to the two token-bearing modes.** `cookie` is absent\nbecause a cookie response carries **nothing in the body** — that is the whole point of the\nsplit — so this branch cannot describe it. `device` shares this schema rather than having\nits own: a device session is token-shaped, and the discriminator maps both values here.\n\nThe studio has no such branch because it has no device sessions; only a television carries\na device token.\n',
    ),
    accessToken: z.string(),
    refreshToken: z.string().nullable().optional(),
    expiresAt: InstantOut,
    viewerContext: ViewerContextSchema,
  })
  .describe(
    'Opaque token in the body, **no cookie**. The client stores it in the native store —\nKeychain, Keystore, `@capacitor/preferences` — **never in `localStorage`**, which is tied to\nthe origin, can be cleared by the system, and travels in no way at all.\n',
  );

export const ConsentsSchema: z.ZodObject<
  {
    purposes: z.ZodOptional<
      z.ZodObject<
        {
          audience: z.ZodOptional<z.ZodBoolean>;
          perso: z.ZodOptional<z.ZodBoolean>;
          partners: z.ZodOptional<z.ZodBoolean>;
          ads: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        },
        z.core.$loose
      >
    >;
    cookieCategories: z.ZodOptional<
      z.ZodObject<Record<string, never>, z.core.$catchall<z.ZodBoolean>>
    >;
    textVersion: z.ZodOptional<z.ZodNumber>;
    recordedAt: z.ZodOptional<z.ZodString>;
  },
  z.core.$loose
> = z
  .looseObject({
    purposes: z
      .looseObject({
        audience: z.boolean().optional(),
        perso: z.boolean().optional(),
        partners: z.boolean().optional(),
        ads: z.boolean().default(false).optional(),
      })
      .optional(),
    cookieCategories: z.object({}).catchall(z.boolean()).optional(),
    textVersion: int64().meta({ format: undefined }).optional(),
    recordedAt: InstantOut.optional(),
  })
  .describe(
    'Four purposes and two tracker categories. **Timestamped by the server and versioned with the\nversion of the text accepted**: a consent without a version or a date is worth nothing. `ads`\nis `false` by default, and **that default is a contract decision**, not a setting.\n',
  );

export const DeviceSchema: z.ZodObject<
  {
    id: z.ZodString;
    kind: VocabularyOut;
    label: z.ZodString;
    city: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    lastSeenAt: z.ZodString;
    isCurrent: z.ZodBoolean;
    sessions: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            sessionId: z.ZodString;
            profileId: z.ZodString;
            profileName: z.ZodOptional<z.ZodString>;
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
    kind: vocabularyOut(DEVICE_KINDS),
    label: z.string(),
    city: z.string().nullable().optional(),
    lastSeenAt: InstantOut,
    isCurrent: z.boolean(),
    sessions: z
      .array(
        z.looseObject({
          sessionId: uuidOut(),
          profileId: uuidOut(),
          profileName: z.string().optional(),
        }),
      )
      .optional(),
  })
  .describe(
    'The **registered** device, durable, revocable, identified **before any session**. Distinct\nfrom `DeviceSession`, which is the (device, profile) pair: a living-room television carries\nup to five sessions on a single device.\n',
  );

const SESSION_MODES = ['cookie', 'bearer', 'device'] as const;
const PAIRING_INTENTS = ['signin', 'seat', 'plan', 'payment_method', 'merch'] as const;
const PAIRING_STATES = [
  'pending',
  'engaged',
  'approved',
  'denied',
  'expired',
  'cancelled',
  'approved_with_failure',
] as const;
const CREDIT_ORIGINS = ['interrupted_date', 'goodwill'] as const;
const DELETION_STATES = ['requested', 'anonymised'] as const;
const PURCHASE_FAILURE_CODES: readonly [string, ...string[]] = [
  OrderErrorCode.SOLD_OUT,
  OrderErrorCode.PAYMENT_DECLINED,
  OrderErrorCode.PRICE_STALE,
  OrderErrorCode.PLAN_UNAVAILABLE,
];

const LOCAL_ENDPOINT_REASON =
  'A vocabulary local to this contract. The domain neither produces nor consumes these values — they describe what this endpoint offers, and a new member is an endpoint change.';
const LOCAL_STATE_REASON =
  "A state machine local to this resource. It is the contract's own, not the domain's: the domain owns the facts, this owns how far a request has got.";

export const StorefrontSessionModeSchema: z.ZodEnum<{
  cookie: 'cookie';
  bearer: 'bearer';
  device: 'device';
}> = z
  .enum(SESSION_MODES)
  .meta({
    'x-arthome-vocabulary-source': LOCAL_VOCABULARY,
    'x-arthome-vocabulary-reason': LOCAL_ENDPOINT_REASON,
  })
  .describe(
    '**An explicit, validated parameter, never inferred from the `User-Agent`** — that is\nforgeable, and a bypassable heuristic does not count as an answer.\n\n`cookie` for the web surfaces; `bearer` for the native shells, where\n`capacitor://localhost` is a third-party context on iOS and no cookie would survive;\n`device` for the television, which has **neither cookie nor token** at the moment it opens a\nsign-in pairing — which is what device identity solves.\n',
  );

export const StorefrontSessionEstablishedSchema: z.ZodXor<
  readonly [typeof SessionEstablishedCookieSchema, typeof SessionEstablishedBearerSchema]
> = z
  .xor([SessionEstablishedCookieSchema, SessionEstablishedBearerSchema])
  .meta({
    discriminator: {
      propertyName: 'mode',
      mapping: {
        cookie: '#/components/schemas/SessionEstablishedCookie',
        bearer: '#/components/schemas/SessionEstablishedBearer',
        device: '#/components/schemas/SessionEstablishedBearer',
      },
    },
  })
  .describe(
    '**Invariant: a response never carries both a cookie and a token.** Two bearers for one\nsession means **two revocations to maintain and one that will be forgotten** — that is what\nstops a session surviving its own sign-out. So this is not a schema with an optional field:\nit is **two schemas**, discriminated by mode.\n',
  );

export const AccountDeepLinkSchema: z.ZodObject<{ url: z.ZodString }, z.core.$loose> = z
  .looseObject({
    url: z.string().meta({ format: 'uri' }),
  })
  .describe(
    '**What is not a pairing.** The QR code on the account page points at account management on a\nphone: nothing waits, the screen does not switch, no pairing row is opened. Two distinct\nshapes in the contract, otherwise someone will implement a wait where there is none.\n',
  );

export const AccountScreenSchema: z.ZodObject<
  {
    profile: z.ZodOptional<
      z.ZodObject<
        {
          publicHandle: z.ZodOptional<z.ZodString>;
          displayName: z.ZodOptional<z.ZodString>;
          email: z.ZodOptional<z.ZodEmail>;
          emailVerified: z.ZodOptional<z.ZodBoolean>;
          phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          phoneVerified: z.ZodOptional<z.ZodBoolean>;
          memberNumber: z.ZodOptional<z.ZodString>;
          city: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        },
        z.core.$loose
      >
    >;
    subscription: z.ZodOptional<typeof SubscriptionSchema>;
    credits: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodOptional<z.ZodString>;
            channelId: z.ZodOptional<z.ZodString>;
            amount: z.ZodOptional<typeof MoneyOut>;
            originCode: z.ZodOptional<VocabularyOut>;
            expiresAt: z.ZodOptional<z.ZodString>;
          },
          z.core.$loose
        >
      >
    >;
    paymentMethods: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodOptional<z.ZodString>;
            brandCode: z.ZodOptional<z.ZodString>;
            last4: z.ZodOptional<z.ZodString>;
            expiryMonth: z.ZodOptional<z.ZodNumber>;
            expiryYear: z.ZodOptional<z.ZodNumber>;
          },
          z.core.$loose
        >
      >
    >;
    security: z.ZodOptional<
      z.ZodObject<
        {
          twoFactorEnabled: z.ZodOptional<z.ZodBoolean>;
          passkeyCount: z.ZodOptional<z.ZodNumber>;
          hasPassword: z.ZodOptional<z.ZodBoolean>;
        },
        z.core.$loose
      >
    >;
    devices: z.ZodOptional<z.ZodArray<typeof DeviceSchema>>;
    preferences: z.ZodOptional<typeof ViewerPreferencesSchema>;
    notificationPreferences: z.ZodOptional<typeof NotificationPreferencesSchema>;
    consents: z.ZodOptional<typeof ConsentsSchema>;
    deletion: z.ZodOptional<
      z.ZodNullable<
        z.ZodObject<
          {
            state: z.ZodOptional<VocabularyOut>;
            requestedAt: z.ZodOptional<z.ZodString>;
            graceUntil: z.ZodOptional<z.ZodString>;
          },
          z.core.$loose
        >
      >
    >;
  },
  z.core.$loose
> = z
  .looseObject({
    profile: z
      .looseObject({
        publicHandle: z.string().optional(),
        displayName: z.string().optional(),
        // `z.email()` would add a `pattern` the document does not carry; unsetting it leaves `format: email`.
        email: z.email().meta({ pattern: undefined }).optional(),
        emailVerified: z.boolean().optional(),
        phone: z.string().nullable().optional(),
        phoneVerified: z.boolean().optional(),
        memberNumber: z.string().optional(),
        city: z.string().nullable().optional(),
      })
      .optional(),
    subscription: SubscriptionSchema.optional(),
    credits: z
      .array(
        z.looseObject({
          id: uuidOut().optional(),
          channelId: uuidOut().optional(),
          amount: MoneyOut.meta({ 'x-arthome-tax-basis': 'inherited' }).optional(),
          originCode: vocabularyOutLocal(
            CREDIT_ORIGINS,
            'A vocabulary local to this contract. The domain neither produces nor consumes these values — they describe what this endpoint offers, and a new member is an endpoint change.',
          ).optional(),
          expiresAt: InstantOut.optional(),
        }),
      )
      .optional()
      .describe(
        'Account credit — an **internal currency**, hence a liability. Issued for an `interrupted`\noutcome, **redeployable on the issuing chain only** (D-017), 12 months.\n',
      ),
    paymentMethods: z
      .array(
        z.looseObject({
          id: z.string().optional(),
          brandCode: z.string().optional(),
          last4: z.string().optional(),
          expiryMonth: int64().meta({ format: undefined }).optional(),
          expiryYear: int64().meta({ format: undefined }).optional(),
        }),
      )
      .optional(),
    security: z
      .looseObject({
        twoFactorEnabled: z.boolean().optional(),
        passkeyCount: int64().meta({ format: undefined }).optional(),
        hasPassword: z.boolean().optional(),
      })
      .optional(),
    devices: z.array(DeviceSchema).optional(),
    preferences: ViewerPreferencesSchema.optional(),
    notificationPreferences: NotificationPreferencesSchema.optional(),
    consents: ConsentsSchema.optional(),
    deletion: z
      .looseObject({
        state: vocabularyOutLocal(
          DELETION_STATES,
          "A state machine local to this resource. It is the contract's own, not the domain's: the domain owns the facts, this owns how far a request has got.",
        ).optional(),
        requestedAt: InstantOut.optional(),
        graceUntil: InstantOut.optional(),
      })
      .nullable()
      .optional()
      .describe(
        'Account deletion is a **financial** command as much as a personal one: it cancels unused\nseats, therefore it refunds, therefore it touches payouts that may already have been\ncomputed, and it collides with ten-year accounting retention. It is **asynchronous**, with\n**30 days of grace** — reactivable on a simple sign-in until then — and it **anonymises**\ninstead of deleting.\n',
      ),
  })
  .describe(
    "**One** aggregate for the account's eleven sections. They justify neither eleven calls nor\neleven schemas: eight are projections of this one, and only `alerts`, `orders` and `privacy`\nintroduce shapes nothing else carries — they are paginated separately.\n",
  );

export const DevicePairingSchema: z.ZodObject<
  {
    pairingId: z.ZodString;
    intent: VocabularyOut;
    userCode: z.ZodString;
    verificationUri: z.ZodString;
    verificationUriComplete: z.ZodString;
    expiresAt: z.ZodString;
    pollIntervalSec: z.ZodNumber;
    state: VocabularyOut;
  },
  z.core.$loose
> = z
  .looseObject({
    pairingId: uuidOut().describe(
      '**Persisted by the surface**, so it can reattach after a restart rather than opening a second\npairing. Without it, a television restarted during payment shows the home screen while the\npayment completes into the void.\n',
    ),
    intent: vocabularyOutLocal(PAIRING_INTENTS, LOCAL_ENDPOINT_REASON),
    userCode: z
      .string()
      .meta({ examples: ['K7M2PQ'] })
      .describe(
        'Six characters over the alphabet `ACDEFHJKLMNPQRTUVWXY23456789` (28 symbols, **28.8 bits**)\ndeclared by `adr-auth.md` §5.1 — `B`, `S`, `Z` and `G` are removed from it because a\ntelevision code is often read aloud to someone else in the room. Case-insensitive, spaces and\nreadability punctuation ignored.\n',
      ),
    verificationUri: z.string().meta({ format: 'uri' }),
    verificationUriComplete: z
      .string()
      .meta({ format: 'uri' })
      .describe(
        '**Served**, never built by the surface. It is what the TV encodes in the QR code.',
      ),
    expiresAt: InstantOut.describe(
      '**Per intent, and served**: `signin` 15 min (fetch your phone, do a 2FA); `seat` and `merch`\n**5 min** — beyond that the displayed gauge is no longer true; `plan` and `payment_method`\n10 min. Never hardcoded in the surface. **The waiting screen shows no countdown**: the TV\nuses it to give up, not to worry the viewer.\n',
    ),
    pollIntervalSec: int64()
      .meta({ format: undefined })
      .meta({ examples: [2] })
      .describe(
        '**Backoff served by the server**, hence tunable: **2 s for the first 60 seconds**, then 5 s.\nThirty requests at most per pairing, and the "switch in two seconds at most" requirement is\nmet **without** bringing a device identity into the WebSocket namespace.\n',
      ),
    state: vocabularyOutLocal(PAIRING_STATES, LOCAL_STATE_REASON).describe(
      '**`engaged` is the state that protects the money.** It is set as soon as the phone enters the\npayment flow, and **before** `ticketing` executes. From then on the pairing is no longer\ncancellable: without that state, a press on Back — the most used key on a remote — cancels a\npairing whose payment is already in flight, and the seat is charged without either screen\nsaying so.\n',
    ),
  })
  .describe(
    '**One primitive, five intents.** Four of the five are not OAuth authorisation flows: buying a\nseat from an already-signed-in television is not a token request, it is a **transaction\nrendezvous**. What is single is the state machine; what differs is the effect of approval.\n',
  );

export const PairingOutcomeSchema: z.ZodObject<
  {
    pairingId: z.ZodString;
    intent: VocabularyOut;
    state: VocabularyOut;
    pollIntervalSec: z.ZodNumber;
    failureCode: z.ZodOptional<VocabularyOutNullable>;
    ticket: z.ZodOptional<typeof TicketCardSchema>;
    order: z.ZodOptional<typeof OrderSchema>;
    subscription: z.ZodOptional<typeof SubscriptionSchema>;
    viewerContext: z.ZodOptional<typeof ViewerContextSchema>;
  },
  z.core.$loose
> = z
  .looseObject({
    pairingId: uuidOut(),
    intent: vocabularyOutLocal(PAIRING_INTENTS, LOCAL_ENDPOINT_REASON),
    state: vocabularyOutLocal(PAIRING_STATES, LOCAL_STATE_REASON).describe(
      '**`engaged` is the state that protects the money.** It is set as soon as the phone enters the\npayment flow, and **before** `ticketing` executes. From then on the pairing is no longer\ncancellable: without that state, a press on Back — the most used key on a remote — cancels a\npairing whose payment is already in flight, and the seat is charged without either screen\nsaying so.\n',
    ),
    pollIntervalSec: int64().meta({ format: undefined }),
    failureCode: vocabularyOutNullable(PURCHASE_FAILURE_CODES, 'ORDER_ERROR_CODES')
      .meta({
        'x-arthome-vocabulary-narrowing':
          'The four a purchase command can refuse with. `order.quote_address_mismatch` is not among them: it is raised by the quote, before a command exists to refuse.',
      })
      .optional(),
    ticket: TicketCardSchema.optional(),
    order: OrderSchema.optional(),
    subscription: SubscriptionSchema.optional(),
    viewerContext: ViewerContextSchema.optional().describe(
      'Present for an approved `signin` — the TV does not have to re-bootstrap.',
    ),
  })
  .describe(
    '**The `confirm` screen costs zero calls.** Everything comes from here, composed by the BFF\nfrom the opaque pointer `identity` set: a confirmation that loads is a confirmation nobody\nbelieves.\n\n**Five outcomes, five codes.** `approved_with_failure` says "the phone finished, the purchase\nfailed" — sold out in the meantime, payment declined. A single code would produce a false\nmessage four times out of five, and the TV must **never** display "reserved" in that case.\n',
  );
