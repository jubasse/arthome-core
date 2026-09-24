/**
 * `@arthome/contracts/studio-desk` — Moderation, the audience, the inbox and the journal — the duty desk.
 *
 * Every schema here is verified against the contract it must emit by
 * `pnpm run check:emit-diff`, so one that does not reproduce its document cannot be committed.
 */

import { z } from 'zod';

import {
  AUDIENCE_SANCTIONS,
  CHAT_MODES,
  FILTER_SEVERITIES,
  MODERATION_ITEM_STATES,
  MODERATION_REASONS,
  ModerationItemState,
  MODERATION_VERDICTS,
  PLAN_TIERS,
  STATE_CHANGE_ORIGINS,
  StateChangeOrigin,
} from '@arthome/core';
import {
  int64,
  vocabularyOut,
  vocabularyOutLocal,
  sourceNameOf,
  vocabularyOutNullable,
} from '@arthome/core/schema';

import { ActorSchema } from '../studio-access/index.js';
import { StudioLocalizedTextSchema } from '../text/index.js';

const LOCAL_REASON =
  'A vocabulary local to this contract. The domain neither produces nor consumes these values — they describe what this endpoint offers, and a new member is an endpoint change.';

/** A vocabulary local to this contract: `none` as its source, and the reason the document gives. */
const localVocabulary = (
  values: readonly [string, ...string[]],
  reason: string = LOCAL_REASON,
): z.ZodString => vocabularyOutLocal(values, reason);

/** `format: date-time` alone, with no `pattern`. */
const instant = (): z.ZodString => z.string().meta({ format: 'date-time' });
const instantNullable = (): z.ZodNullable<z.ZodString> =>
  z.string().nullable().meta({ format: 'date-time' });

/** An integer with no format, as the document writes `type: integer`. */
const int = (): z.ZodNumber => int64().meta({ format: undefined });

const uuid = (): z.ZodString => z.string().meta({ format: 'uuid' });
const uuidNullable = (): z.ZodNullable<z.ZodString> =>
  z.string().nullable().meta({ format: 'uuid' });

/**
 * The document lists `automatic_filter` before `retroactive_filter`; core's `STATE_CHANGE_ORIGINS`
 * lists them the other way round. The document is authoritative (D-058), so the emitted order
 * follows it while the source name is still derived from the core export, never transcribed.
 */
const DOCUMENT_ORIGIN_ORDER = [
  StateChangeOrigin.HUMAN_VERDICT,
  StateChangeOrigin.AUTOMATIC_FILTER,
  StateChangeOrigin.RETROACTIVE_FILTER,
  StateChangeOrigin.AUTHOR_SANCTIONED,
] as const;

/** A moderation queue row. */
export const ModerationItemSchema: z.ZodObject<
  {
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
  },
  z.core.$loose
> = z
  .looseObject({
    id: uuid(),
    messageId: uuid(),
    dateId: uuid(),
    channelId: uuid().optional(),
    state: vocabularyOut(MODERATION_ITEM_STATES),
    reason: vocabularyOut(MODERATION_REASONS).optional(),
    reportsCount: int(),
    atMediaSec: int(),
    sentAt: instant().optional(),
    authorHandle: z.string().optional(),
    authorSanction: vocabularyOut(AUDIENCE_SANCTIONS).optional(),
    body: StudioLocalizedTextSchema.optional(),
    claimedBy: ActorSchema.optional(),
    claimExpiresAt: instantNullable()
      .optional()
      .describe(
        '**A short lease**, renewed while the person is present, **released by the server** on\nexpiry. Without it, a moderator who closes their browser freezes a row for the whole live\nshow.\n',
      ),
    verdict: vocabularyOutNullable(MODERATION_VERDICTS).optional(),
    settledBy: ActorSchema.optional(),
    settledAt: instantNullable().optional(),
    origin: vocabularyOut(DOCUMENT_ORIGIN_ORDER, sourceNameOf(STATE_CHANGE_ORIGINS))
      .optional()
      .describe(
        'The log must tell an **automatic reclassification** from a **human decision**.\n`retroactive_filter` marks the items produced by adding a word to the dictionary.\n\n**`automatic_filter` and `retroactive_filter` are two moments, not two names.**\n`automatic_filter` decides **at ingestion**, before anything is published;\n`retroactive_filter` **reclassifies what already exists**, when a word enters the\ndictionary. Collapsing them would lose the only distinction that makes the filter\nmeasurable.\n\n**Nothing produces `automatic_filter` today, and writing it now is the point.** It\ncarries three constraints that are cheap today and unrecoverable later: an automatic\nmoderator **takes no lease**, because there is nobody to hold one; precedence is\n**one-way**, a human overturns a machine and never the reverse; and the origin\n**survives the settlement**, so "removed by the filter, confirmed by X" does not collapse\ninto "removed by X" — which is what it takes to measure how often the filter is right.\n',
      ),
    version: int().describe(
      '**Carries the lease, and nothing else.** A claim followed by a release increments it twice\n**without anything having been settled**.\n',
    ),
    decisionVersion: int()
      .optional()
      .describe(
        '**Incremented only by a verdict.** It is on that axis that `settleModerationItem` sets its\ncondition, and the reason is a design rule, not a convenience: "taking charge is not deciding\n— **as long as your colleague has rendered no verdict, your sanction applies**". A verdict\nmust therefore be **accepted** while someone else holds the lease.\n\nWith a single counter that was impossible: taking then releasing a lease moved the version\nfrom 1 to 3, and a verdict queued offline at `expectedVersion: 1` was refused **although\nnobody had settled anything** — in a live show at sixty messages a minute, rows change hands\nconstantly, and the offline queue is the one concession granted to mobile. One counter cannot\nexpress "refuse if settled, accept if merely claimed".\n\nIt is the doctrine of the three axes that the contract already applies to moderation, applied\nto the lock itself.\n',
      ),
  })
  .describe(
    `**Three axes, never stacked.** \`state\` is the nature of the **queue row** — which is why the\nqueue was built by filtering \`state === '${ModerationItemState.REPORTED}'\`, which is not a state filter but a nature\nfilter. The **message's** state and the sanction on the **person** are two other axes, carried\nelsewhere.\n`,
  );

/** A member of a channel's audience. */
export const AudienceMemberSchema: z.ZodObject<
  {
    id: z.ZodString;
    handle: z.ZodString;
    sanction: ReturnType<typeof vocabularyOut>;
    sanctionExpiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    messagesCount: z.ZodNumber;
    firstSeenAt: z.ZodOptional<z.ZodString>;
    subscriberTier: z.ZodOptional<ReturnType<typeof vocabularyOutNullable>>;
    holdsSeat: z.ZodOptional<z.ZodBoolean>;
    present: z.ZodBoolean;
  },
  z.core.$loose
> = z
  .looseObject({
    id: uuid(),
    handle: z.string().meta({ examples: ['@marie.j'] }),
    sanction: vocabularyOut(AUDIENCE_SANCTIONS),
    sanctionExpiresAt: instantNullable()
      .optional()
      .describe(
        '**An instant, never a label.** "No limit", 1 min, 10 min, 1 h and a free-form duration are a\nsingle field, computed once. Absent = no limit.\n',
      ),
    messagesCount: int(),
    firstSeenAt: instant().optional(),
    subscriberTier: vocabularyOutNullable(PLAN_TIERS).optional(),
    holdsSeat: z.boolean().optional(),
    present: z.boolean().describe('Presence **on the live show in progress**.'),
  })
  .describe(
    '**A channel\'s audience is a collection queryable in its own right**, not a projection of the\nchat: the console looks for "a viewer present, **who has not written**".\n',
  );

/** The chat policy of one date. */
export const ChatPolicySchema: z.ZodObject<
  {
    dateId: z.ZodString;
    mode: ReturnType<typeof vocabularyOut>;
    filterSeverity: ReturnType<typeof vocabularyOut>;
    slowModeSec: z.ZodNumber;
    holdersOnly: z.ZodBoolean;
    retroactiveFilter: z.ZodOptional<z.ZodBoolean>;
    locked: z.ZodBoolean;
    version: z.ZodOptional<z.ZodNumber>;
  },
  z.core.$loose
> = z.looseObject({
  dateId: uuid(),
  mode: vocabularyOut(CHAT_MODES),
  filterSeverity: vocabularyOut(FILTER_SEVERITIES).describe(
    '**A single vocabulary.** Two coexisted in the same design file — "lenient/normal/high" in\nchannel settings, "low/medium/high" on the moderation page — and neither was in the shared\nsources.\n',
  ),
  slowModeSec: int(),
  holdersOnly: z.boolean(),
  retroactiveFilter: z.boolean().optional(),
  locked: z
    .boolean()
    .describe(
      'True as soon as publication is committed. **`chat` applies its own lock**, it asks `catalog`\nfor nothing: once committed, a live chat can still be **closed**, never opened wider.\n',
    ),
  version: int().optional(),
});

/** One line of the studio log. */
export const JournalEntrySchema: z.ZodObject<
  {
    id: z.ZodString;
    nature: z.ZodString;
    occurredAt: z.ZodString;
    actor: typeof ActorSchema;
    code: z.ZodString;
    params: z.ZodObject<Record<string, never>, z.core.$loose>;
    dateId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$loose
> = z
  .looseObject({
    id: uuid(),
    nature: localVocabulary(['air', 'mod', 'event', 'access', 'money']).describe(
      '**The five axes a studio log is filtered by**, and they are deliberately not the services\nthat produced the entries: someone reading a log at midnight asks "what touched the\nmoney", not "what did `payouts` emit".\n\n**The abbreviations are a wart and they are named as one.** `mod` and `air` are the only\nshortened members in either contract — everything else spells `moderation` out, including\nthe role, the tag and the page. A reader who writes `moderation` here gets nothing back,\nsilently, which is the shape this whole document spent a week removing. They are kept for\nnow because the filter is a query parameter on a path that already ships in fixtures; they\nshould become `moderation` and `on_air` the first time that path changes — or sooner, on\na second trigger that is likelier to arrive: **`on_air` has to be spelled out the day\nanything compares this field against `RUN_STATES.on_air`**, which is the most probable\nreason anyone touches it at all.\n\n**And `mod` is worse than inconsistent, it is a collision.** `moderation` survives as a\nbare value in `MEMBER_ROLES` because the field name disambiguates it. Here the field is\n`nature` and the value abbreviates a different concept, so the disambiguation that saved\nthe role does not apply to the abbreviation of it.\n\n**`money` is not ours alone**: `@arthome/core` does not produce it, but the redaction rule\nis keyed to it — `data-model.md:624` and `context-map.md:402` both say the `money` kind is\nabsent from the response without `canRevenue`. Renaming that one member would leave two\ndomain documents describing a rule keyed to a string that no longer exists, with every\ngate green.\n',
    ),
    occurredAt: instant(),
    actor: ActorSchema,
    code: z.string().describe('A **code**, never an authored sentence.'),
    params: z.looseObject({}),
    dateId: uuidNullable().optional(),
  })
  .describe(
    '**Names names and places them**, kept for 24 months. An **attempt** to walk back a committed\nprice appears in it too: that is in itself a piece of operational information.\n',
  );

/** One notification of the studio inbox. */
export const InboxEntrySchema: z.ZodObject<
  {
    id: z.ZodString;
    kind: z.ZodString;
    channelId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dateId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    body: z.ZodOptional<typeof StudioLocalizedTextSchema>;
    deepLinkCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodString;
    read: z.ZodBoolean;
  },
  z.core.$loose
> = z
  .looseObject({
    id: uuid(),
    kind: localVocabulary([
      'invitation',
      'alert',
      'duty',
      'incident',
      'payout',
      'bank_change',
      'reconciliation',
    ]),
    channelId: uuidNullable().optional(),
    dateId: uuidNullable().optional(),
    body: StudioLocalizedTextSchema.optional().describe(
      'The inbox texts are one of the **only two** acknowledged exceptions to "i18n by codes".',
    ),
    deepLinkCode: z.string().nullable().optional(),
    createdAt: instant(),
    read: z.boolean(),
  })
  .describe(
    '**Routed by role and by channel, server-side**: the application does not filter a common\nqueue. And **never an amount if the recipient role lacks `canRevenue`**.\n',
  );
