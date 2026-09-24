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
  DATE_OUTCOMES,
  DATE_PANES,
  DISPLAY_STATES,
  DisplayState,
  INCIDENT_CAUSES,
  INCIDENT_KINDS,
  IncidentCause,
  MEMBER_ROLES,
  PUBLICATION_CHECKLIST_ITEMS,
  PUBLICATION_STATES,
  RUN_STATES,
  Service,
} from '@arthome/core';
import {
  InstantOut,
  MoneyOut,
  int64,
  uuidOut,
  vocabularyOut,
  vocabularyOutLocal,
  vocabularyOutLocalNullable,
  vocabularyOutNullable,
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
const instantNullable = (): z.ZodNullable<z.ZodString> =>
  z.string().nullable().meta({ format: 'date-time' });

/** An integer with no format, as the document writes `type: integer`. */
const int = (): z.ZodNumber => int64().meta({ format: undefined });

const uuidNullable = (): z.ZodNullable<z.ZodString> =>
  z.string().nullable().meta({ format: 'uuid' });

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
    source: localVocabulary([
      // The named members of SERVICES, which did not exist when this was
      // written. `DatePane.CHAT` stood in for the service `chat` — the right
      // string from the wrong vocabulary, the same fault as an export format
      // borrowing a navigation entry. The emitted values are unchanged.
      Service.CATALOG,
      Service.TICKETING,
      Service.STREAMING,
      Service.CHAT,
    ]).describe(
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
  dateId: uuidOut(),
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
    measuredAt: InstantOut,
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
    personId: uuidOut(),
    displayName: z.string(),
    roles: z
      .array(vocabularyOut(MEMBER_ROLES))
      .describe(
        '**A set**, as everywhere else in this document: the eight canonical values, never the\nfallback to six. Presence is read next to a cut button, and `director` there is not\n`video`.\n',
      ),
    lastActivityAt: InstantOut.describe(
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
    id: uuidOut(),
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
    raisedAt: InstantOut,
    raisedBy: ActorSchema.optional(),
  })
  .nullable()
  .describe(
    '**Cause and outcome are two vocabularies**, and conflating them was the original fault:\n`catalogue.incidentMessages` carries only four entries, **which are outcomes**.\n',
  );

/** The record of a date, served pane by pane. */
export const DateSheetSchema: z.ZodObject<z.ZodRawShape, z.core.$loose> = z
  .looseObject({
    dateId: uuidOut(),
    channelId: uuidOut().optional(),
    title: z.string().optional(),
    startsAt: InstantOut.optional(),
    venueClock: z
      .looseObject({
        venueTimezone: z.string().optional(),
        venueUtcOffsetMin: int().optional(),
      })
      .optional(),
    runtimeMin: int().optional(),
    outcome: vocabularyOutNullable(DATE_OUTCOMES).optional(),
    displayState: vocabularyOut(DISPLAY_STATES)
      .optional()
      .describe('The composed value, served. Never recomposed by the surface.'),
    displayStateValidUntil: InstantOut.optional(),
    publication: PublicationSchema,
    openPanes: z
      .array(vocabularyOut(DATE_PANES))
      .describe('The panes open **to this person**. The overview appears only beyond three panes.'),
  })
  .describe(
    '**Served pane by pane, not served whole and cut up at render time.** A moderator must be able\nto load the `chat` pane **without** loading the whole record, otherwise ticketing travels for\nnothing. One call for the record, then one call per open pane, at its owner.\n',
  );

/** A row of the event board. */
export const EventsRowSchema: z.ZodObject<z.ZodRawShape, z.core.$loose> = z
  .looseObject({
    dateId: uuidOut(),
    title: z.string(),
    startsAt: InstantOut,
    state: vocabularyOut(PUBLICATION_STATES),
    orderRank: int(),
    outcome: z.string().nullable().optional(),
    displayState: vocabularyOut(DISPLAY_STATES)
      .optional()
      .meta({ examples: [DisplayState.LIVE] })
      .describe(
        '**The composed value, served to the studio as to the storefront.** It is here that it counts\nmost: the storefront has one axis to display, the studio has **three to reconcile** —\n`publication.state`, `run.state` and `outcome` — and the outcome labels **replace** the state\n(`CANCELLED AND REFUNDED`, `POSTPONED · SEATS STILL VALID`, `INTERRUPTED · CREDITS ISSUED`).\nServing `state + orderRank + outcome` and letting the client compose was the second\nimplementation that critical rule 2 forbids — on the surface where a mistake is not a\nmislabelled card but a control room on the wrong screen.\n',
      ),
    displayStateValidUntil: InstantOut.optional(),
    lowestPrice: MoneyOut.meta({ 'x-arthome-tax-basis': 'inclusive' }).optional(),
    fillRateBps: int().nullable().optional(),
    seatsSold: int().nullable().optional(),
    capacityTotal: int()
      .nullable()
      .optional()
      .describe(
        '**The "next date" card displays "N / M seats"**, and `seatsSold` + `fillRateBps` did not\ngive the M. A client deriving it (`seatsSold / fillRateBps`) would recompute a value the\nserver already holds, with a division and a rounding thrown in. A field, not a route.\n',
      ),
    grossRevenue: MoneyOut.meta({ 'x-arthome-tax-basis': 'inclusive' })
      .optional()
      .describe(
        '**Absent** from the response when the role lacks `canRevenue`. Never present and null.',
      ),
  })
  .describe(
    'A row of the event board. **Role projection decides what it contains**: `grossRevenue` is\n**absent** — not null — for a role without `canRevenue`, and a sort on that key is then\n**refused**.\n',
  );

/** The state of the run, served in one call. */
export const RunConsoleSchema: z.ZodObject<z.ZodRawShape, z.core.$loose> = z
  .looseObject({
    dateId: uuidOut(),
    state: vocabularyOut(RUN_STATES).describe(
      // Plain prose. These words are ENGLISH here, not vocabulary members: the
      // sentence is about two states being absent from this axis. They were
      // interpolated from `DateOutcome` to satisfy check-enums, which made a
      // description depend on a constant it is not describing — and the emitted
      // string was identical either way, so the interpolation bought nothing and
      // cost a reader the ability to read it.
      'The **technical** axis, and nothing else. `postponed` and `cancelled` are **withdrawn** from\nit: they were echoes of the outcome lodged in the technical state. A control room has no\n"cancelled" state — it has a stage sending nothing.\n',
    ),
    afterGracePeriod: z.boolean(),
    ingestProtocol: localVocabulary(
      ['rtmps', 'srt', 'whip'],
      'A transport or media capability, not a domain notion: the domain never chooses an ingest protocol, a container or a DRM system, and a new one appears because a device appeared.',
    ).describe('**Decides which metrics are actually available.**'),
    monitorPath: localVocabulary(
      ['whep', 'll_hls'],
      'A transport or media capability, not a domain notion: the domain never chooses an ingest protocol, a container or a DRM system, and a new one appears because a device appeared.',
    ).describe(
      'The return path **actually open**. WHEP under a second on a WHIP ingest, LL-HLS at a few\nseconds on an RTMP ingest. **The studio must know it so as not to promise the operator a\nlatency it does not have** — the contract carries the truth, not uniformity. On the native\nshell, `whep` is not promised at tier 5 (D-019).\n',
    ),
    monitorUrl: z.string().nullable().optional().meta({ format: 'uri' }),
    qualityLadder: z
      .array(
        z.looseObject({
          renditionId: z.string().optional(),
          heightPx: int().optional(),
          enabled: z.boolean().optional(),
        }),
      )
      .optional(),
    cameras: z.array(z.string()).optional(),
    startedAt: instantNullable().optional(),
    lastSample: HealthSampleSchema.optional(),
    incident: StudioIncidentSchema.optional(),
    chapters: z
      .array(
        z.looseObject({
          id: uuidOut().optional(),
          vocabId: z.string().optional(),
          atMediaSec: int().optional(),
        }),
      )
      .optional(),
    presence: z
      .array(CrewPresenceSchema)
      .optional()
      .describe(
        '**Who is online on this channel, with their roles and their last activity.** It is the\n**snapshot** of what the `channel:{id}` room pushes every ~10 s, and a room that\nbroadcasts a differential without exposing a snapshot is not a contract: a console\nopened at 21:40 had nothing to paint and stayed that way until the next change.\n\nIt is **not cosmetic**. The cut confirmation reads "cutting ends the broadcast for N\nviewers · **M other people online**", and that sentence is the guard rail on the most\ndestructive act in the run desk, **in a studio deliberately without a lock**. Unserved,\nthe guard rail reads "0 other people online" — the same screen as "you are alone", and\nfalse.\n\nComposed by the BFF from `identity.GetChannelPresence`, which `context-map.md` §10.1\nalready counts among the run desk\'s three internal calls. Fan-out 2 for this operation,\nunder the threshold of 4.\n',
      ),
    chatThroughputPerMinute: int()
      .nullable()
      .optional()
      .describe(
        '**Measured by the server, in a declared unit**: a 60 s sliding window, unit\nmessages/minute, refreshed every 5 s. The console\'s switching threshold (60 msg/min) reads\nagainst **that measurement** — not against "number of messages ÷ hours elapsed", which is not\nthe same thing.\n',
      ),
    grossRevenue: MoneyOut.meta({ 'x-arthome-tax-basis': 'inclusive' })
      .optional()
      .describe(
        '**Absent** without `canRevenue`. The `:revenue` real-time room is separate for the same reason.',
      ),
    version: int().optional(),
  })
  .describe(
    'The state of the run, served in **one** call. The studio distinguishes **"hiccup absorbed"**\nfrom **"publisher gone"** — two fields, not one: a two-second network break in a room must\nproduce neither an incident in the control room nor an HLS manifest restarted from zero.\n',
  );

/** The curve behind the differential. */
export const HealthSeriesSchema: z.ZodObject<z.ZodRawShape, z.core.$loose> = z
  .looseObject({
    windowSec: int().describe(
      '**The window actually applied**, not the one asked for. A request beyond the cap is not\nrefused, it is answered with the truth about what it got: a cap a caller cannot see is a\ncap a caller will fight.\n',
    ),
    samples: z
      .array(HealthSampleSchema)
      .describe(
        'Oldest first. An empty array is a **served case** — the live show has not started, or no\nsample has arrived yet — and it is not the same thing as a flat curve at zero.\n',
      ),
    peakViewers: int()
      .nullable()
      .optional()
      .describe(
        '**Null when no sample in the window carried a viewer count** — never zero, because a zero\nreads as "nobody watched" and that is a different statement.\n',
      ),
    peakViewersAt: instantNullable().optional(),
  })
  .describe(
    '**The snapshot behind the differential.** `RunConsole.lastSample` is one point; this is the\ncurve, over a window the server declares having applied.\n\n`peakViewers` and `peakViewersAt` are **served**: they are derived from the series and are\ntherefore obtainable only through it, and the cut confirmation quotes the peak. Derived on\ntwo surfaces, they would be the same value computed twice — critical rule 2.\n',
  );

/** A secret, shown once and never cached. */
export const StreamKeyRevealSchema: z.ZodObject<z.ZodRawShape, z.core.$loose> = z
  .looseObject({
    streamKey: z.string(),
    ingestUrl: z.string().meta({ format: 'uri' }),
    revealedAt: InstantOut,
  })
  .describe(
    "**A secret displayed on a phone, in a room, often in front of a contractor.** Four\nguarantees: the key is **never** in a list payload; revealing it is a **separate command,\naudited and by name**; rotating it is immediate and the old one **stops broadcasting at\nonce**; the response carries `Cache-Control: no-store`, so that it ends up neither in the\nphone's HTTP cache nor in the application snapshot the OS takes when it goes to the\nbackground.\n\nAssignment to the `director` slot — **which grants access to the key** — is reserved to\n`artist ∨ production`, and the contract makes that reason explicit rather than leaving it to\nbe guessed.\n",
  );

/** A signed upload URL, obtained by a JSON command. */
export const UploadTicketSchema: z.ZodObject<z.ZodRawShape, z.core.$loose> = z
  .looseObject({
    assetId: uuidOut(),
    uploadUrl: z.string().meta({ format: 'uri' }),
    fields: z.object({}).catchall(z.string()),
    expiresAt: InstantOut,
  })
  .describe(
    "**Upload through a signed upload URL, obtained by a JSON command** — never `multipart` from\na WebView. Proposed lifetime: **15 minutes**, long enough for a room's 4G, short enough not to\nbe an access token in disguise.\n",
  );

/** An item of a channel's merchandise, as the admin sees it. */
export const MerchItemAdminSchema: z.ZodObject<z.ZodRawShape, z.core.$loose> = z.looseObject({
  id: uuidOut(),
  showId: uuidNullable().optional(),
  label: StudioLocalizedTextSchema.describe(
    '**Bilingual.** The absence of an English label in the sources is a **data gap** to be filled during the port, not a translation gap (E10).',
  ),
  variants: z.array(
    z.looseObject({
      id: z.string().optional(),
      label: z.string().optional(),
      stock: int().optional(),
      price: MoneyOut.meta({ 'x-arthome-tax-basis': 'inclusive' }).optional(),
    }),
  ),
  state: localVocabulary(
    ['on_sale', 'out_of_stock'],
    "A state machine local to this resource. It is the contract's own, not the domain's: the domain owns the facts, this owns how far a request has got.",
  ),
  source: localVocabulary(
    ['arthome', 'shopify', 'woocommerce', 'prestashop', 'drupal', 'api'],
    'An external provider or platform identifier. It is their vocabulary, not ours, and it changes when they change.',
  ).describe('**One external integration at a time** per channel.'),
  merchantUrl: z.string().nullable().optional().meta({ format: 'uri' }),
  pinnedDateId: uuidNullable().optional(),
  version: int().optional(),
});
