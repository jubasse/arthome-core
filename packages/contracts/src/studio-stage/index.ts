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

import {
  DatePane,
  INCIDENT_CAUSES,
  IncidentCause,
  INCIDENT_KINDS,
  MEMBER_ROLES,
  PUBLICATION_CHECKLIST_ITEMS,
  PUBLICATION_STATES,
} from '@arthome/core';
import {
  int64,
  vocabularyOut,
  vocabularyOutLocal,
  vocabularyOutLocalNullable,
} from '@arthome/core/schema';

import { ActorSchema } from '../studio-access/index.js';
import { StudioLocalizedTextSchema } from '../text/index.js';

/** The document's marker for a vocabulary local to the contract. */
const LOCAL_REASON =
  'A vocabulary local to this contract. The domain neither produces nor consumes these values — they describe what this endpoint offers, and a new member is an endpoint change.';

/** A vocabulary local to this contract: `none` as its source, and the reason the document gives. */
const localVocabulary = (
  values: readonly [string, ...string[]],
  reason: string = LOCAL_REASON,
): z.ZodString => vocabularyOutLocal(values, reason);

/**
 * An instant with `format: date-time` and NO `pattern`: these documents carry the format
 * alone here, where `InstantSchema` would add its regex.
 */
const instant = (): z.ZodString => z.string().meta({ format: 'date-time' });
const instantNullable = (): z.ZodNullable<z.ZodString> =>
  z.string().nullable().meta({ format: 'date-time' });

/** An integer with no format, as the document writes `type: integer`. */
const int = (): z.ZodNumber => int64().meta({ format: undefined });

const uuid = (): z.ZodString => z.string().meta({ format: 'uuid' });

/** One line of the pre-publication checklist. Blocking is a property of the item. */
export const PublicationChecklistItemSchema: z.ZodObject<
  {
    id: z.ZodString;
    satisfied: z.ZodBoolean;
    source: z.ZodString;
    blocking: z.ZodBoolean;
  },
  z.core.$loose
> = z
  .looseObject({
    id: vocabularyOut(PUBLICATION_CHECKLIST_ITEMS),
    satisfied: z.boolean(),
    source: localVocabulary(['catalog', 'ticketing', 'streaming', DatePane.CHAT]).describe(
      '**Which context owns the fact**, served because three of the nine items are **projected**\nrather than held: `catalog` keeps them up to date by event and asks nobody for them. It is\nfour of the seven services and not a vocabulary of services — a context that never feeds\nthe checklist has no member here, and gaining one would be a new projection rather than a\nnew name.\n',
    ),
    blocking: z
      .boolean()
      .describe(
        '"Chapters planned" and "moderator assigned" are **non-blocking warnings**: one must be\nable to publish a date without chapters, and the studio must be able to do it.\n',
      ),
  })
  .describe(
    '**Nine items, the ones on the record** — not the four in the fixtures, which are an\narbitrary subset. Served as a **list of identifiers**, never a percentage, which the client\nwould compute.\n\n**Seven block publication and two do not.** `chapters_planned` and `moderator_assigned` are\n**non-blocking warnings**: a date must be publishable without chapters. They are in the same\nvocabulary because they are the same kind of thing on the same screen — the blocking part is\na property of the item, not of the list, and splitting the list would make "publish —\n3 missing" count two things.\n\n**This description said "seven" while the vocabulary below listed nine**, and the count was\nthe stale half: `moderator_assigned` is quoted elsewhere in this document as a checklist item\nthat `datesToCover` counts against. A number in prose beside the list it counts is rule 15 in\nminiature, and it is corrected here rather than by making the list shorter.\n\n**Three of the nine are facts projected** from other contexts: `catalog` keeps them up to\ndate by event, it asks nobody for them.\n',
  );

/** A transition offered to this operator, with the promise it commits to. */
export const PublicationTransitionSchema: z.ZodObject<
  {
    from: z.ZodString;
    to: z.ZodString;
    irreversible: z.ZodBoolean;
    promiseCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$loose
> = z
  .looseObject({
    from: z.string(),
    to: z.string(),
    irreversible: z.boolean(),
    promiseCode: z
      .string()
      .nullable()
      .meta(
        z.globalRegistry.get(
          vocabularyOutLocalNullable(['prices_engaged', 'replay_sold'], LOCAL_REASON),
        ) ?? {},
      )
      .optional()
      .describe(
        'The **promise committed**, which travels with the refusal and with the confirmation:\n`prices_engaged` for `draft|reserve → scheduled`, `replay_sold` for\n`ended → replay_online`. A code, never the sentence.\n',
      ),
  })
  .describe(
    '**The lock bears on the `from > to` pair, not on the state.** The fixtures encode a list of\n**states** and test whether the current state belongs to it; the design encodes **pairs**.\nThose are two semantics, and it is the second one that is right (E5).\n',
  );

/** A date's publication, with its checklist and the transitions this operator may make. */
export const PublicationSchema: z.ZodObject<
  {
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
  },
  z.core.$loose
> = z.looseObject({
  dateId: uuid(),
  state: vocabularyOut(PUBLICATION_STATES).describe(
    'The vocabulary of `catalogue.json`, which is authoritative. `replay_online` says what\n`replay` does not: **the replay is on sale**. The parallel tables in the two studio designs\nare never adopted.\n',
  ),
  orderRank: int().describe(
    "**The rank travels with the state.** The event board sorts by state, and the order is the\nmachine's, not the alphabet's. Without a served rank, every surface reinvents its own ordering\ntable.\n",
  ),
  version: int().describe(
    'The studio is **multi-operator without a lock**: the arbitration is on the server. Every\ntransition carries `expectedVersion`, and a command sent from `technical` while the current\nstate is `live` is refused with `STATE_CONFLICT` **with the current state and version**.\n',
  ),
  publishedAt: instantNullable().optional(),
  pricesLockedAt: instantNullable().optional(),
  replayOnlineAt: instantNullable().optional(),
  checklist: z.array(PublicationChecklistItemSchema),
  offeredTransitions: z
    .array(PublicationTransitionSchema)
    .describe(
      '**Computed for this operator**, served with the state. Only the owner and production move a\ndate; a control room sees the record and does not move it. Without this list, every surface\nrecomputes the table — hence a second implementation of the rule, hence a guaranteed\ndivergence.\n',
    ),
  lastActor: ActorSchema.optional(),
});

/** One measurement of the feed. Every metric is nullable, and the absence means something. */
export const HealthSampleSchema: z.ZodObject<
  {
    measuredAt: z.ZodString;
    source: z.ZodString;
    ingestUpKbps: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    deviceUpKbps: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    latencyMs: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    droppedPct: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    jitterMs: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    lostPackets: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    viewers: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
  },
  z.core.$loose
> = z
  .looseObject({
    measuredAt: instant(),
    source: localVocabulary(['ingest_server', 'client_submitted']).describe(
      '`client_submitted` for the end-to-end latency, measured in the control room by\n`RTCPeerConnection.getStats()` on the WHEP return path and **submitted** — never a native\nfigure presented as end-to-end. If it is not measured, it is **absent**.\n',
    ),
    ingestUpKbps: int()
      .nullable()
      .optional()
      .describe(
        "A **server-side** observation. Never to be confused with `deviceUpKbps`, which measures the\nphone's uplink and not the encoder: **two different bitrates never carry the same name**. Only\nthe first feeds the pre-flight checklist.\n",
      ),
    deviceUpKbps: int().nullable().optional(),
    latencyMs: int().nullable().optional(),
    droppedPct: z.number().nullable().optional(),
    jitterMs: int()
      .nullable()
      .optional()
      .describe('**Omitted** over RTMP — there is no sense in serving it.'),
    lostPackets: int().nullable().optional().describe('**Omitted** over RTMP.'),
    viewers: int()
      .nullable()
      .optional()
      .describe('**Absent — never zero — when the date is not on air.**'),
  })
  .describe(
    '**Every metric is nullable, and the absence means something.** Jitter and lost packets\n**exist only on a WebRTC ingest**; over RTMP, carried on TCP, they have no meaning, and the\ncontract **omits** them rather than serving zero. A zero reads as "perfect", not as "not\nmeasured".\n\n`measuredAt` is the instant of measurement **at the ingest**, not on reception: it is what\nlets you display "bitrate 8.9 Mb/s, measured 3 s ago" or "last measurement 2 min ago" instead\nof "0 Mb/s", which is a lie.\n',
  );

/** A crew member online on the channel. */
export const CrewPresenceSchema: z.ZodObject<
  {
    personId: z.ZodString;
    displayName: z.ZodString;
    roles: z.ZodArray<z.ZodString>;
    lastActivityAt: z.ZodString;
    isSelf: z.ZodBoolean;
  },
  z.core.$loose
> = z
  .looseObject({
    personId: uuid(),
    displayName: z.string(),
    roles: z
      .array(vocabularyOut(MEMBER_ROLES))
      .describe(
        '**A set**, as everywhere else in this document: the eight canonical values, never the\nfallback to six. Presence is read next to a cut button, and `director` there is not\n`video`.\n',
      ),
    lastActivityAt: instant().describe(
      '**An instant, never "active 2 min ago".** The sentence belongs to the surface and is\ncomputed against `servedAt`; the contract carries the instant, like every other\ncountdown here.\n',
    ),
    isSelf: z
      .boolean()
      .describe(
        '**Served, because the sentence the screen shows says "M OTHER people online".** The\nsurface holds its own `personId` from the bootstrap and could subtract itself — and two\nsurfaces subtracting differently is exactly how a guard rail ends up off by one on the\none screen where it guards a cut.\n',
      ),
  })
  .describe(
    'A crew member online **on the channel**. The scope is the channel, not the date: presence\nfollows the person, and the run desk is simply where it is read.\n',
  );

/** An incident: the outcome the viewer sees, the cause, and who or what triggered it. */
export const StudioIncidentSchema: z.ZodNullable<
  z.ZodObject<
    {
      id: z.ZodString;
      kind: z.ZodString;
      cause: z.ZodString;
      trigger: z.ZodString;
      message: z.ZodOptional<typeof StudioLocalizedTextSchema>;
      raisedAt: z.ZodString;
      raisedBy: z.ZodOptional<typeof ActorSchema>;
    },
    z.core.$loose
  >
> = z
  .looseObject({
    id: uuid(),
    kind: vocabularyOut(INCIDENT_KINDS).describe('The **outcome** the viewer sees.'),
    cause: vocabularyOut(INCIDENT_CAUSES).describe(
      'The **cause**, a distinct vocabulary. `compatibility_worker_failed` exists because a\ntranscoding *worker* must never die silently — otherwise the control room sees a player that\nnever starts, with no cause.\n',
    ),
    trigger: localVocabulary([IncidentCause.MANUAL, 'auto']).describe(
      'The **automatic** holding screen produces an incident **of the same kind** as a manual\ntrigger — that is the right answer to the "the stage manager is unreachable" case. The log\nmust nonetheless tell the two apart.\n',
    ),
    message: StudioLocalizedTextSchema.optional().describe(
      'Written by the control room: **content**, with its authoring language. The catalogue supplies\n**templates** per kind of incident, which the control room reuses or replaces.\n',
    ),
    raisedAt: instant(),
    raisedBy: ActorSchema.optional(),
  })
  .nullable()
  .describe(
    '**Cause and outcome are two vocabularies**, and conflating them was the original fault:\n`catalogue.incidentMessages` carries only four entries, **which are outcomes**.\n',
  );
