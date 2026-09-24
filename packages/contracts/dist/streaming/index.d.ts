/**
 * `@arthome/contracts/streaming` — Watching: the advisory entitlement verdict and the incident veil a player displays.
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
import { type VocabularyOut, type VocabularyOutNullable } from '@arthome/core/schema';
import { ChapterSchema, DateCardSchema } from '../catalog/index.js';
import { StorefrontLocalizedTextSchema } from '../text/index.js';
export declare const IncidentSchema: z.ZodNullable<z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    kind: z.ZodOptional<VocabularyOut>;
    message: z.ZodOptional<typeof StorefrontLocalizedTextSchema>;
    raisedAt: z.ZodOptional<z.ZodString>;
}, z.core.$loose>>;
declare const playbackSignature: () => z.ZodObject<{
    queryToken: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    cookieSet: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
}, z.core.$loose>;
export declare const ActivePlaybackSessionSchema: z.ZodObject<{
    sessionId: z.ZodString;
    deviceId: z.ZodOptional<z.ZodString>;
    isCurrentDevice: z.ZodOptional<z.ZodBoolean>;
    deviceLabel: z.ZodString;
    city: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    openedAt: z.ZodString;
}, z.core.$loose>;
export declare const PlaybackRenewalSchema: z.ZodObject<{
    expiresAt: z.ZodString;
    renewAfterSec: z.ZodNumber;
    leaseExpiresAt: z.ZodString;
    signature: z.ZodOptional<ReturnType<typeof playbackSignature>>;
    qualityCap: z.ZodOptional<VocabularyOut>;
}, z.core.$loose>;
export declare const PlaybackTicketSchema: z.ZodObject<{
    sessionId: z.ZodString;
    resumedExistingSession: z.ZodOptional<z.ZodBoolean>;
    dateId: z.ZodString;
    scope: VocabularyOut;
    previewSecondsLeft: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    protocol: VocabularyOut;
    drmSystem: z.ZodOptional<VocabularyOutNullable>;
    qualityCap: VocabularyOut;
    manifestUrl: z.ZodString;
    signature: ReturnType<typeof playbackSignature>;
    edgeRenewalMode: VocabularyOut;
    expiresAt: z.ZodString;
    renewAfterSec: z.ZodNumber;
    leaseExpiresAt: z.ZodString;
    resumePoint: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        positionSec: z.ZodOptional<z.ZodNumber>;
        writtenAt: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>>>;
    liveEdgeSec: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    chapters: z.ZodOptional<z.ZodArray<typeof ChapterSchema>>;
    audioTracks: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        language: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<VocabularyOut>;
    }, z.core.$loose>>>;
    subtitleTracks: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        language: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<VocabularyOut>;
    }, z.core.$loose>>>;
    chatMode: VocabularyOut;
    chatRateLimitPerSecond: z.ZodOptional<z.ZodNumber>;
    incident: z.ZodOptional<typeof IncidentSchema>;
    date: z.ZodOptional<typeof DateCardSchema>;
}, z.core.$loose>;
export {};
//# sourceMappingURL=index.d.ts.map