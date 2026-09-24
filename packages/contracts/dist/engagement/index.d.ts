/**
 * `@arthome/contracts/engagement` — What reaches a viewer between visits: notification preferences, the change feed, chat and the reaction quota.
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
import { type VocabularyOut } from '@arthome/core/schema';
import { StorefrontLocalizedTextSchema } from '../text/index.js';
export declare const NotificationPreferencesSchema: z.ZodObject<{
    triggers: z.ZodOptional<z.ZodObject<Record<string, never>, z.core.$catchall<z.ZodArray<VocabularyOut>>>>;
    quietHours: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodOptional<z.ZodBoolean>;
        fromHour: z.ZodOptional<z.ZodNumber>;
        toHour: z.ZodOptional<z.ZodNumber>;
        bypassWhenTicketHeld: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$loose>>;
}, z.core.$loose>;
export declare const ChangeFeedSchema: z.ZodObject<{
    invalidated: z.ZodArray<VocabularyOut>;
    complete: z.ZodBoolean;
}, z.core.$loose>;
export declare const ChatMessageSchema: z.ZodObject<{
    id: z.ZodString;
    dateId: z.ZodString;
    seq: z.ZodNumber;
    authorHandle: z.ZodString;
    authorRoleCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    atMediaSec: z.ZodNumber;
    sentAt: z.ZodString;
    badge: VocabularyOut;
    body: typeof StorefrontLocalizedTextSchema;
}, z.core.$loose>;
export declare const ReactionQuotaSchema: z.ZodObject<{
    remaining: z.ZodNumber;
    rechargesAt: z.ZodString;
}, z.core.$loose>;
export declare const NotificationEntrySchema: z.ZodObject<{
    id: z.ZodString;
    triggerCode: z.ZodString;
    params: z.ZodObject<Record<string, never>, z.core.$catchall<z.ZodUnknown>>;
    deepLink: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodString;
    read: z.ZodBoolean;
}, z.core.$loose>;
//# sourceMappingURL=index.d.ts.map