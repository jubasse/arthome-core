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
 *     `uuid()` and `instant()` become those core schemas, one edit per file.
 */

import { z } from 'zod';

import { DEVICE_KINDS, Locale, PLAN_TIERS, SUBSCRIPTION_STATES } from '@arthome/core';
import {
  VOCABULARY_SOURCE_LOCAL,
  int64,
  type VocabularyOut,
  vocabularyOut,
  vocabularyOutLocal,
} from '@arthome/core/schema';

import {
  DomainConstantsSchema,
  ImageRenditionSchema,
  LabelArtifactRefSchema,
} from '../catalog/index.js';

// The document's name for a vocabulary local to the contract. The preferred
// form is `vocabularyOutLocal`, which makes the reason mandatory; these three
// call sites chain their own `.meta()` with an `examples` key beside it.
const LOCAL_VOCABULARY = VOCABULARY_SOURCE_LOCAL;

const PROFILE_KINDS = ['adult', 'child'] as const;
const LIVE_OPEN_BEHAVIOURS = ['peek', 'muted', 'off'] as const;
const PLAYBACK_QUALITIES = ['auto', 'low', 'medium', 'high'] as const;
const BEARER_SESSION_MODES = ['bearer', 'device'] as const;

const uuid = (): z.ZodString => z.string().meta({ format: 'uuid' });

const instant = (): z.ZodString => z.string().meta({ format: 'date-time' });

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
    id: uuid(),
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
    deviceId: uuid(),
    signedIn: z.boolean().optional(),
    currentProfileId: uuid().nullable().optional(),
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
    expiresAt: instant(),
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
    recordedAt: instant().optional(),
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
    id: uuid(),
    kind: vocabularyOut(DEVICE_KINDS),
    label: z.string(),
    city: z.string().nullable().optional(),
    lastSeenAt: instant(),
    isCurrent: z.boolean(),
    sessions: z
      .array(
        z.looseObject({
          sessionId: uuid(),
          profileId: uuid(),
          profileName: z.string().optional(),
        }),
      )
      .optional(),
  })
  .describe(
    'The **registered** device, durable, revocable, identified **before any session**. Distinct\nfrom `DeviceSession`, which is the (device, profile) pair: a living-room television carries\nup to five sessions on a single device.\n',
  );
