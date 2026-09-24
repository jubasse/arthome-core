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
import { type VocabularyOut } from '@arthome/core/schema';
import { DomainConstantsSchema, ImageRenditionSchema, LabelArtifactRefSchema } from '../catalog/index.js';
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
//# sourceMappingURL=index.d.ts.map