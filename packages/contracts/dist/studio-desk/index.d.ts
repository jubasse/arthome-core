/**
 * `@arthome/contracts/studio-desk` — Moderation, the audience, the inbox and the journal — the duty desk.
 *
 * Every schema here is verified against the contract it must emit by
 * `pnpm run check:emit-diff`, so one that does not reproduce its document cannot be committed.
 */
import { z } from 'zod';
import { vocabularyOut, vocabularyOutNullable } from '@arthome/core/schema';
import { ActorSchema } from '../studio-access/index.js';
import { StudioLocalizedTextSchema } from '../text/index.js';
/** A moderation queue row. */
export declare const ModerationItemSchema: z.ZodObject<{
    id: z.ZodString;
    messageId: z.ZodString;
    dateId: z.ZodString;
    channelId: z.ZodOptional<z.ZodString>;
    state: ReturnType<typeof vocabularyOut>;
    reason: z.ZodOptional<ReturnType<typeof vocabularyOut>>;
    reportsCount: z.ZodNumber;
    atMediaSec: z.ZodNumber;
    sentAt: z.ZodOptional<z.ZodString>;
    authorHandle: z.ZodOptional<z.ZodString>;
    authorSanction: z.ZodOptional<ReturnType<typeof vocabularyOut>>;
    body: z.ZodOptional<typeof StudioLocalizedTextSchema>;
    claimedBy: z.ZodOptional<typeof ActorSchema>;
    claimExpiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    verdict: z.ZodOptional<ReturnType<typeof vocabularyOutNullable>>;
    settledBy: z.ZodOptional<typeof ActorSchema>;
    settledAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    origin: z.ZodOptional<ReturnType<typeof vocabularyOut>>;
    version: z.ZodNumber;
    decisionVersion: z.ZodOptional<z.ZodNumber>;
}, z.core.$loose>;
/** A member of a channel's audience. */
export declare const AudienceMemberSchema: z.ZodObject<{
    id: z.ZodString;
    handle: z.ZodString;
    sanction: ReturnType<typeof vocabularyOut>;
    sanctionExpiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    messagesCount: z.ZodNumber;
    firstSeenAt: z.ZodOptional<z.ZodString>;
    subscriberTier: z.ZodOptional<ReturnType<typeof vocabularyOutNullable>>;
    holdsSeat: z.ZodOptional<z.ZodBoolean>;
    present: z.ZodBoolean;
}, z.core.$loose>;
/** The chat policy of one date. */
export declare const ChatPolicySchema: z.ZodObject<{
    dateId: z.ZodString;
    mode: ReturnType<typeof vocabularyOut>;
    filterSeverity: ReturnType<typeof vocabularyOut>;
    slowModeSec: z.ZodNumber;
    holdersOnly: z.ZodBoolean;
    retroactiveFilter: z.ZodOptional<z.ZodBoolean>;
    locked: z.ZodBoolean;
    version: z.ZodOptional<z.ZodNumber>;
}, z.core.$loose>;
/** One line of the studio log. */
export declare const JournalEntrySchema: z.ZodObject<{
    id: z.ZodString;
    nature: z.ZodString;
    occurredAt: z.ZodString;
    actor: typeof ActorSchema;
    code: z.ZodString;
    params: z.ZodObject<Record<string, never>, z.core.$loose>;
    dateId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$loose>;
/** One notification of the studio inbox. */
export declare const InboxEntrySchema: z.ZodObject<{
    id: z.ZodString;
    kind: z.ZodString;
    channelId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dateId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    body: z.ZodOptional<typeof StudioLocalizedTextSchema>;
    deepLinkCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodString;
    read: z.ZodBoolean;
}, z.core.$loose>;
//# sourceMappingURL=index.d.ts.map