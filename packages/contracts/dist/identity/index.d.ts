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
import { MoneyOut, type VocabularyOut, type VocabularyOutNullable } from '@arthome/core/schema';
import { DomainConstantsSchema, ImageRenditionSchema, LabelArtifactRefSchema } from '../catalog/index.js';
import { NotificationPreferencesSchema } from '../engagement/index.js';
import { OrderSchema, SubscriptionSchema, TicketCardSchema } from '../ticketing/index.js';
export declare const ProfileSummarySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    kind: VocabularyOut;
    avatar: z.ZodOptional<typeof ImageRenditionSchema>;
    allowedCategoryIds: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
}, z.core.$loose>;
export declare const ViewerPreferencesSchema: z.ZodObject<{
    account: z.ZodOptional<z.ZodObject<{
        interfaceLocale: z.ZodOptional<z.ZodString>;
        subtitlesDefault: z.ZodOptional<z.ZodBoolean>;
        subtitleLanguage: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        audioDescription: z.ZodOptional<z.ZodBoolean>;
        liveOpenBehaviour: z.ZodOptional<VocabularyOut>;
        chatOpenByDefault: z.ZodOptional<z.ZodBoolean>;
        readingTimezone: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>>;
    device: z.ZodOptional<z.ZodObject<{
        defaultQuality: z.ZodOptional<VocabularyOut>;
        subtitleSizeStep: z.ZodOptional<z.ZodNumber>;
        reduceMotion: z.ZodOptional<z.ZodBoolean>;
        autoplayPreview: z.ZodOptional<z.ZodBoolean>;
        dataSaver: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$loose>>;
}, z.core.$loose>;
export declare const ViewerContextSchema: z.ZodObject<{
    deviceId: z.ZodString;
    signedIn: z.ZodOptional<z.ZodBoolean>;
    currentProfileId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    profiles: z.ZodArray<typeof ProfileSummarySchema>;
    account: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        publicHandle: z.ZodOptional<z.ZodString>;
        memberNumber: z.ZodOptional<z.ZodString>;
        emailVerified: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$loose>>>;
    plan: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        tier: z.ZodOptional<VocabularyOut>;
        state: z.ZodOptional<VocabularyOut>;
        seatDiscountBps: z.ZodOptional<z.ZodNumber>;
        concurrentStreamsAllowed: z.ZodOptional<z.ZodNumber>;
    }, z.core.$loose>>>;
    preferences: z.ZodOptional<typeof ViewerPreferencesSchema>;
    constants: typeof DomainConstantsSchema;
    labelCatalog: typeof LabelArtifactRefSchema;
    taxonomyArtifact: typeof LabelArtifactRefSchema;
    realtime: z.ZodOptional<z.ZodObject<{
        namespace: z.ZodOptional<z.ZodString>;
        pulseIntervalSec: z.ZodOptional<z.ZodNumber>;
    }, z.core.$loose>>;
}, z.core.$loose>;
export declare const SessionEstablishedCookieSchema: z.ZodObject<{
    mode: z.ZodLiteral<'cookie'>;
    viewerContext: typeof ViewerContextSchema;
}, z.core.$loose>;
export declare const SessionEstablishedBearerSchema: z.ZodObject<{
    mode: VocabularyOut;
    accessToken: z.ZodString;
    refreshToken: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    expiresAt: z.ZodString;
    viewerContext: typeof ViewerContextSchema;
}, z.core.$loose>;
export declare const ConsentsSchema: z.ZodObject<{
    purposes: z.ZodOptional<z.ZodObject<{
        audience: z.ZodOptional<z.ZodBoolean>;
        perso: z.ZodOptional<z.ZodBoolean>;
        partners: z.ZodOptional<z.ZodBoolean>;
        ads: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, z.core.$loose>>;
    cookieCategories: z.ZodOptional<z.ZodObject<Record<string, never>, z.core.$catchall<z.ZodBoolean>>>;
    textVersion: z.ZodOptional<z.ZodNumber>;
    recordedAt: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
export declare const DeviceSchema: z.ZodObject<{
    id: z.ZodString;
    kind: VocabularyOut;
    label: z.ZodString;
    city: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    lastSeenAt: z.ZodString;
    isCurrent: z.ZodBoolean;
    sessions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        sessionId: z.ZodString;
        profileId: z.ZodString;
        profileName: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>>>;
}, z.core.$loose>;
/**
 * The three transport modes a session can be established in.
 *
 * ⚠ EXPORTED, because the studio narrows it to two and was copying them. It was
 *   a file-local `const`, so `studio-access` could not import it and wrote
 *   `['cookie', 'bearer']` as literals — and `arthome-check-enums` did not
 *   report that, because its declaring-file exemption is scoped to THE FILE and
 *   the declaration was in another one. *The gate is blind to a copy made across
 *   two modules of the same package, which is exactly where one is most likely.*
 *
 *   Contract-local on purpose: both documents annotate it `source: none`, and
 *   they are right — the domain neither produces nor consumes a cookie.
 */
export declare const SESSION_MODES: readonly ["cookie", "bearer", "device"];
/**
 * The NAMED members, so nothing writes one of these as a string — and so nothing
 * reaches for `SESSION_MODES[0]` either.
 *
 * ⚠ POSITION IS WORSE THAN A LITERAL, which is why this object exists rather
 *   than an index. The first attempt at sharing these wrote
 *   `z.literal(SESSION_MODES[0])` in the studio's cookie branch: reordering the
 *   list would then have silently changed which mode that branch discriminates
 *   on, and nothing would have failed. A literal `'cookie'` is at least stable
 *   when the list moves. A NAME is both stable and checked.
 */
export declare const SessionMode: {
    readonly COOKIE: "cookie";
    readonly BEARER: "bearer";
    readonly DEVICE: "device";
};
export declare const StorefrontSessionModeSchema: z.ZodEnum<{
    cookie: 'cookie';
    bearer: 'bearer';
    device: 'device';
}>;
export declare const StorefrontSessionEstablishedSchema: z.ZodXor<readonly [typeof SessionEstablishedCookieSchema, typeof SessionEstablishedBearerSchema]>;
export declare const AccountDeepLinkSchema: z.ZodObject<{
    url: z.ZodString;
}, z.core.$loose>;
export declare const AccountScreenSchema: z.ZodObject<{
    profile: z.ZodOptional<z.ZodObject<{
        publicHandle: z.ZodOptional<z.ZodString>;
        displayName: z.ZodOptional<z.ZodString>;
        email: z.ZodOptional<z.ZodEmail>;
        emailVerified: z.ZodOptional<z.ZodBoolean>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phoneVerified: z.ZodOptional<z.ZodBoolean>;
        memberNumber: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$loose>>;
    subscription: z.ZodOptional<typeof SubscriptionSchema>;
    credits: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        channelId: z.ZodOptional<z.ZodString>;
        amount: z.ZodOptional<typeof MoneyOut>;
        originCode: z.ZodOptional<VocabularyOut>;
        expiresAt: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>>>;
    paymentMethods: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        brandCode: z.ZodOptional<z.ZodString>;
        last4: z.ZodOptional<z.ZodString>;
        expiryMonth: z.ZodOptional<z.ZodNumber>;
        expiryYear: z.ZodOptional<z.ZodNumber>;
    }, z.core.$loose>>>;
    security: z.ZodOptional<z.ZodObject<{
        twoFactorEnabled: z.ZodOptional<z.ZodBoolean>;
        passkeyCount: z.ZodOptional<z.ZodNumber>;
        hasPassword: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$loose>>;
    devices: z.ZodOptional<z.ZodArray<typeof DeviceSchema>>;
    preferences: z.ZodOptional<typeof ViewerPreferencesSchema>;
    notificationPreferences: z.ZodOptional<typeof NotificationPreferencesSchema>;
    consents: z.ZodOptional<typeof ConsentsSchema>;
    deletion: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        state: z.ZodOptional<VocabularyOut>;
        requestedAt: z.ZodOptional<z.ZodString>;
        graceUntil: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>>>;
}, z.core.$loose>;
export declare const DevicePairingSchema: z.ZodObject<{
    pairingId: z.ZodString;
    intent: VocabularyOut;
    userCode: z.ZodString;
    verificationUri: z.ZodString;
    verificationUriComplete: z.ZodString;
    expiresAt: z.ZodString;
    pollIntervalSec: z.ZodNumber;
    state: VocabularyOut;
}, z.core.$loose>;
export declare const PairingOutcomeSchema: z.ZodObject<{
    pairingId: z.ZodString;
    intent: VocabularyOut;
    state: VocabularyOut;
    pollIntervalSec: z.ZodNumber;
    failureCode: z.ZodOptional<VocabularyOutNullable>;
    ticket: z.ZodOptional<typeof TicketCardSchema>;
    order: z.ZodOptional<typeof OrderSchema>;
    subscription: z.ZodOptional<typeof SubscriptionSchema>;
    viewerContext: z.ZodOptional<typeof ViewerContextSchema>;
}, z.core.$loose>;
//# sourceMappingURL=index.d.ts.map