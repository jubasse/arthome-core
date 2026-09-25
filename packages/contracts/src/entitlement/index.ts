/**
 * `@arthome/contracts/entitlement` — the right to watch, and nothing else.
 *
 * ⚠ IT EXISTS TO BREAK A CYCLE, AND THE CYCLE WAS SEMANTIC RATHER THAN
 *   ACCIDENTAL. `catalog` needs a watch verdict, because a date's card shows
 *   whether you may watch it. `streaming` needs a date and its chapters, because
 *   a playback ticket is issued for one. Neither reference is wrong, so neither
 *   could simply be deleted — the two modules genuinely point at each other.
 *
 *   `z.lazy()` papered over it and the emitted schema was identical, which is
 *   what made it tempting. But a zod schema is built at MODULE LOAD, so a cycle
 *   is a load-order hazard: it holds until a declaration moves, then fails with
 *   an error naming a symbol unrelated to whatever was just edited. A worker
 *   lost time to exactly that message, reading `Cannot access 'ChapterSchema'
 *   before initialization` while adding something else entirely.
 *
 *   `WatchVerdict` references NOTHING — measured, not assumed — so it can sit
 *   below both. `catalog` imports it, `streaming` imports it, and the edge
 *   between those two is one-way again.
 *
 * *This mirrors `@arthome/core`, where entitlement is already its own bounded
 * context with `decideWatch` in it. The contract had flattened a distinction the
 * domain makes.*
 */

import { z } from 'zod';

import {
  WATCH_DENIAL_REASONS,
  WATCH_FALLBACK_ACTIONS,
  WATCH_SCOPES,
  WatchDenialReason,
  WatchScope,
} from '@arthome/core';
import {
  InstantOut,
  int64,
  type VocabularyOut,
  type VocabularyOutNullable,
  vocabularyOut,
  vocabularyOutNullable,
} from '@arthome/core/schema';

// The documents carry `format: date-time` on these and no pattern, so this is
// the local shape rather than core's InstantSchema — see D-065 family D.

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
        "The **same refusal vocabulary** as the player: a card announcing \"subscription required\" and\na player refusing for the same reason say the same code. Each produces a different screen on\nthe three storefronts; a generic code would produce a false one.\n\n**One dotted-lowercase form, like every other code.** This rides on `reasonParams`, which is\nthe error envelope's `code` + `params` shape, and it stands beside `order.price_stale` and\n`api.cursor_too_old`. The declaration and the wire once disagreed on spelling, so\n`denialReasonCode === WatchDenialReason.NO_SEAT` compared `'NO_SEAT'` to `'no_seat'` and was\n**false for every value**, silently, across the storefront's entire refusal experience. A\nseparator-insensitive comparison cannot see a case difference, which is why it outlived two\npasses looking for exactly this defect. D-067 settled it: the wire form is dotted lowercase\nand the accessor is SCREAMING_SNAKE, so nothing compares a literal.\n\n**`watch.not_published` is the eleventh**, and it was missing here for the same reason\n`displayState` was missing three members: `decideWatch` returns it for a `draft`, `reserve`\nor `technical` date, and the non-public states keep falling out of contracts because no\npublic screen shows them.\n",
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
    validUntil: InstantOut,
  })
  .describe(
    'The right to watch, a **first-class shape**, served per date. It exists at **two evaluation\nsites for one implementation** (`decideWatch` in `@arthome/core`):\n\n- **here**, composed by the BFF from its batched reads — **advisory and not binding**, and\n  the contract declares it so with `advisory: true`. It serves to paint the card without a\n  second round trip, which the television requires;\n- **when the player opens**, by `streaming`, from its own projected copies. **This is the\n  only evaluation that is authoritative**, because it is the only one that produces a token.\n\n**It is never cached to disk.** It expires, it depends on territory, it depends on the screen\nlimit: a right read back from disk is a false right. `validUntil` never exceeds 60 seconds.\n',
  );
