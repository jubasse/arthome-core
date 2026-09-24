/**
 * `@arthome/contracts/studio-stage` — the publication of a date and the live room around it:
 * its state machine as served, the checklist, the transitions offered to this operator, the
 * health of the feed, who is online, and the incident.
 *
 * ⚠ THE STATE MACHINE IS NOT RESTATED HERE. `Publication.state` is `PUBLICATION_STATES`, the
 *   checklist ids are `PUBLICATION_CHECKLIST_ITEMS` and the incident vocabularies are
 *   `INCIDENT_KINDS` / `INCIDENT_CAUSES` — all from `@arthome/core`. What is declared here is
 *   only the shape a server sends and the vocabularies the document calls local.
 *   `PublicationTransition.from/to` are bare strings in the document, deliberately: the offered
 *   pairs are served data, and the table that produces them lives in core.
 */
import { z } from 'zod';
import { ActorSchema } from '../studio-access/index.js';
import { StudioLocalizedTextSchema } from '../text/index.js';
/** One line of the pre-publication checklist. Blocking is a property of the item. */
export declare const PublicationChecklistItemSchema: z.ZodObject<{
    id: z.ZodString;
    satisfied: z.ZodBoolean;
    source: z.ZodString;
    blocking: z.ZodBoolean;
}, z.core.$loose>;
/** A transition offered to this operator, with the promise it commits to. */
export declare const PublicationTransitionSchema: z.ZodObject<{
    from: z.ZodString;
    to: z.ZodString;
    irreversible: z.ZodBoolean;
    promiseCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$loose>;
/** A date's publication, with its checklist and the transitions this operator may make. */
export declare const PublicationSchema: z.ZodObject<{
    dateId: z.ZodString;
    state: z.ZodString;
    orderRank: z.ZodNumber;
    version: z.ZodNumber;
    publishedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    pricesLockedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    replayOnlineAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    checklist: z.ZodArray<typeof PublicationChecklistItemSchema>;
    offeredTransitions: z.ZodArray<typeof PublicationTransitionSchema>;
    lastActor: z.ZodOptional<typeof ActorSchema>;
}, z.core.$loose>;
/** One measurement of the feed. Every metric is nullable, and the absence means something. */
export declare const HealthSampleSchema: z.ZodObject<{
    measuredAt: z.ZodString;
    source: z.ZodString;
    ingestUpKbps: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    deviceUpKbps: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    latencyMs: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    droppedPct: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    jitterMs: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    lostPackets: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    viewers: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, z.core.$loose>;
/** A crew member online on the channel. */
export declare const CrewPresenceSchema: z.ZodObject<{
    personId: z.ZodString;
    displayName: z.ZodString;
    roles: z.ZodArray<z.ZodString>;
    lastActivityAt: z.ZodString;
    isSelf: z.ZodBoolean;
}, z.core.$loose>;
/** An incident: the outcome the viewer sees, the cause, and who or what triggered it. */
export declare const StudioIncidentSchema: z.ZodNullable<z.ZodObject<{
    id: z.ZodString;
    kind: z.ZodString;
    cause: z.ZodString;
    trigger: z.ZodString;
    message: z.ZodOptional<typeof StudioLocalizedTextSchema>;
    raisedAt: z.ZodString;
    raisedBy: z.ZodOptional<typeof ActorSchema>;
}, z.core.$loose>>;
/** The record of a date, served pane by pane. */
export declare const DateSheetSchema: z.ZodObject<z.ZodRawShape, z.core.$loose>;
/** A row of the event board. */
export declare const EventsRowSchema: z.ZodObject<z.ZodRawShape, z.core.$loose>;
/** The state of the run, served in one call. */
export declare const RunConsoleSchema: z.ZodObject<z.ZodRawShape, z.core.$loose>;
/** The curve behind the differential. */
export declare const HealthSeriesSchema: z.ZodObject<z.ZodRawShape, z.core.$loose>;
/** A secret, shown once and never cached. */
export declare const StreamKeyRevealSchema: z.ZodObject<z.ZodRawShape, z.core.$loose>;
/** A signed upload URL, obtained by a JSON command. */
export declare const UploadTicketSchema: z.ZodObject<z.ZodRawShape, z.core.$loose>;
/** An item of a channel's merchandise, as the admin sees it. */
export declare const MerchItemAdminSchema: z.ZodObject<z.ZodRawShape, z.core.$loose>;
//# sourceMappingURL=index.d.ts.map