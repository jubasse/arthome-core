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

import {
  INCIDENT_KINDS,
  WATCH_DENIAL_REASONS,
  WATCH_FALLBACK_ACTIONS,
  WATCH_SCOPES,
  WatchDenialReason,
  WatchScope,
} from '@arthome/core';
import {
  type VocabularyOut,
  type VocabularyOutNullable,
  int64,
  vocabularyOut,
  vocabularyOutNullable,
} from '@arthome/core/schema';

import { StorefrontLocalizedTextSchema } from '../text/index.js';

const uuid = (): z.ZodString => z.string().meta({ format: 'uuid' });

const instant = (): z.ZodString => z.string().meta({ format: 'date-time' });

export const WatchVerdictSchema: z.ZodObject<
  {
    allowed: z.ZodBoolean;
    scope: z.ZodOptional<VocabularyOut>;
    advisory: z.ZodBoolean;
    denialReasonCode: z.ZodOptional<VocabularyOutNullable>;
    reasonParams: z.ZodOptional<z.ZodObject<Record<string, never>, z.core.$catchall<z.ZodUnknown>>>;
    fallbackAction: z.ZodOptional<VocabularyOut>;
    previewSecondsLeft: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    validUntil: z.ZodString;
  },
  z.core.$loose
> = z
  .looseObject({
    allowed: z.boolean(),
    scope: vocabularyOut(WATCH_SCOPES)
      .meta({ examples: [WatchScope.PREVIEW] })
      .optional()
      .describe(
        '**`allowed` alone cannot say what kind of access was allowed**, and that was a real gap\nrather than a nicety. `PlaybackTicket` — the binding verdict — has carried `full` versus\n`preview` since it was written; this one, the advisory verdict a card is painted from,\ncarried only a boolean. So a card for a subscription-required date with budget remaining\nhad to infer preview-ness from `previewSecondsLeft > 0`, which is a rule evaluated on\nthree storefronts instead of served once (rule 2), and the card must say "Watch 5 min\nfree" rather than "Watch" **without a second call**.\n\nIt is the same vocabulary as `PlaybackTicket.scope`, deliberately: two evaluation sites,\none implementation, and now one shape.\n',
      ),
    advisory: z
      .boolean()
      .describe(
        '`true` everywhere in this document. The binding verdict is the one from `POST /v1/playback/{dateId}/open`.\n',
      ),
    denialReasonCode: vocabularyOutNullable(WATCH_DENIAL_REASONS)
      .meta({ examples: [WatchDenialReason.SUBSCRIPTION_REQUIRED] })
      .optional()
      .describe(
        'The **same refusal vocabulary** as the player: a card announcing "subscription required" and\na player refusing for the same reason say the same code. Each produces a different screen on\nthe three storefronts; a generic code would produce a false one.\n\n**`SCREAMING_SNAKE`, and that is a family rather than a preference.** This rides on\n`reasonParams`, which is the error envelope\'s `code` + `params` shape, and it stands beside\n`order.price_stale`, `STATE_CONFLICT` and `CURSOR_TOO_OLD`. It is a refusal-code family, not a\ndomain vocabulary — which is why `@arthome/core` now exports it in this case too. It spent\nthis whole contract\'s life lowercase there, so `denialReasonCode === WatchDenialReason.watch.no_seat`\nwas **false for all ten values**, silently, on the entire refusal experience of the\nstorefront. A separator-insensitive comparison cannot see a case difference, which is why\nthis one outlived two passes that were looking for exactly this defect.\n\n**`watch.not_published` is the eleventh**, and it was missing here for the same reason\n`displayState` was missing three members: `decideWatch` returns it for a `draft`, `reserve`\nor `technical` date, and the non-public states keep falling out of contracts because no\npublic screen shows them.\n',
      ),
    reasonParams: z
      .object({})
      .catchall(z.unknown())
      .optional()
      .describe(
        'What the screen must display — the territory, the plan required, the expiry instant.',
      ),
    fallbackAction: vocabularyOut(WATCH_FALLBACK_ACTIONS)
      .optional()
      .describe(
        'The action that leads out of the dead end. A code, never a sentence, and never a dead screen.\n\n**Not nullable, and that is the point of `none` being a member.** `decideWatch` returns\n`none` when there is nothing to offer, so the absence is **spelled** rather than left to a\nnull. Nullable would make `null` and `none` two spellings of one state, and a third\nmeaning — "not denied" — would attach itself to whichever the writer had in mind.\n\n**And an ALLOWED verdict carries a real action.** A viewer watching on `scope: preview`\ngets `buy_seat` beside it. A surface reading `null` as "no action" would be right for\n`denialReasonCode`, where null genuinely means *not denied*, and would silently drop the\npreview-to-purchase step — the one path that turns a free viewer into a paying one. The\ntwo fields look alike and must not be read alike.\n\n**The two vocabularies are coupled, and the coupling is data rather than prose.**\nA fallback action exists to answer a denial reason, so the invariant is: every reason maps\nto an action that leads out of it, and every action answers at least one reason.\n**`WATCH_FALLBACK_FOR` in `@arthome/core` holds the mapping**, with a spec asserting both\ndirections and asserting that `decideWatch` never returns a pairing the table forbids.\n\n**This description used to restate that table row by row, and that was a parallel literal\ntable** — eleven rows of it, written to prevent drift, in a document that cannot be\nexecuted, next to a table that can. So it is gone: the rule is here, the rows are in core,\nand a surface that needs to know which action answers which reason reads the constant.\n\n**One row deserves its argument in the contract rather than in the domain**, because it is\na contract obligation and not a domain preference: `adr-stream-entitlement.md` §3.3\nrequires a `watch.concurrent_limit_reached` refusal to be served with the list of active\nsessions *"so the surface can offer to release one. A bare refusal would leave the viewer\nwith no way out"*. This contract stated that refusal for its whole life and had no action\nexpressing the remedy, which is the dead end principle 8 forbids. `release_a_screen` is\nwhat closes it.\n\n**`watch_preview` is not here, and the round trip that removed it is worth recording.** It\ncrossed this boundary three times in a day because two people were each answering the\nother\'s last message instead of the code. The test that ends that, and the one this\ncontract now defers to: **does a function return it?** `decideWatch` does not — the free\npreview is expressed by an **allowed** verdict carrying `scope: preview` on both the live\nand the replay path, with `buy_seat` beside it. A preview a viewer can still watch is not\na way out of a refusal, because there is no refusal.\n\nWhat the member was compensating for is the finding worth keeping: `WatchVerdict` had no\nway to say "allowed, but only as a preview", so preview-ness was inferred from\n`previewSecondsLeft > 0` on three storefronts instead of being served once. The fix was the\n`scope` field, not a fallback action. **When a vocabulary member answers nothing, look for\nthe field that is missing.**\n',
      ),
    previewSecondsLeft: int64()
      .meta({ format: undefined })
      .nullable()
      .optional()
      .describe(
        'Remaining preview budget, **counted server-side, per account** — not per device, otherwise a\nhousehold with four devices gets four previews; not per date alone, it is `(account, date)`.\nReloading the page extends nothing.\n',
      ),
    validUntil: instant(),
  })
  .describe(
    'The right to watch, a **first-class shape**, served per date. It exists at **two evaluation\nsites for one implementation** (`decideWatch` in `@arthome/core`):\n\n- **here**, composed by the BFF from its batched reads — **advisory and not binding**, and\n  the contract declares it so with `advisory: true`. It serves to paint the card without a\n  second round trip, which the television requires;\n- **when the player opens**, by `streaming`, from its own projected copies. **This is the\n  only evaluation that is authoritative**, because it is the only one that produces a token.\n\n**It is never cached to disk.** It expires, it depends on territory, it depends on the screen\nlimit: a right read back from disk is a false right. `validUntil` never exceeds 60 seconds.\n',
  );

export const IncidentSchema: z.ZodNullable<
  z.ZodObject<
    {
      id: z.ZodOptional<z.ZodString>;
      kind: z.ZodOptional<VocabularyOut>;
      message: z.ZodOptional<typeof StorefrontLocalizedTextSchema>;
      raisedAt: z.ZodOptional<z.ZodString>;
    },
    z.core.$loose
  >
> = z
  .looseObject({
    id: uuid().optional(),
    kind: vocabularyOut(INCIDENT_KINDS).optional(),
    message: StorefrontLocalizedTextSchema.optional().describe(
      'Written by the control room: it is **content**, not an i18n key, and it travels with its\nauthoring language like a synopsis. One of the only two acknowledged exceptions to "i18n by\ncodes".\n',
    ),
    raisedAt: instant().optional(),
  })
  .nullable()
  .describe(
    '**A client-side veil, never a stream switch**: the control room publishes the state, the\nplayer displays it over an untouched video. Instant, identical on all three storefronts, and\nthe media stays intact for the resume. Latency **≤ 2 s, non-negotiable**.\n',
  );
