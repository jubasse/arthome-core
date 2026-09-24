/**
 * `CursorPageInfo` — the storefront's pagination primitive, and the first shape
 * in this package that carries a vocabulary.
 *
 * WHY CURSOR AND NOT PAGE. D-010: the storefront paginates by an opaque Base64
 * cursor over `(created_at, id)` and the studio by page + total. A cursor is
 * bidirectional, independent of page size, and survives a row inserted between
 * two reads; offset pagination over a feed duplicates and skips MECHANICALLY,
 * not exceptionally. The studio's two named exceptions — the moderation queue
 * and the live chat — are cursors for exactly that reason.
 *
 * ⚠ `emptyReason` IS THE FIELD THIS SHAPE EXISTS FOR.
 *
 *   An empty list with no reason forces every surface to write one generic
 *   empty state, which the brief forbids. Fourteen reasons produce fourteen
 *   screens, each with `emptyActionCode` — an action that leads out of the dead
 *   end. It is the same rule as `WatchVerdict.fallbackAction`: a refusal that
 *   offers nothing is a dead end, and a dead end is a defect rather than a
 *   state.
 *
 * ⚠ `vocabularyOutNullable`, NOT `z.enum()` AND NOT `vocabularyOut(…).nullable()`.
 *
 *   The first half is the TV fleet: a fifteenth reason added after a build
 *   shipped must render as a neutral empty state on that television, not fail
 *   the whole page it sits in.
 *
 *   The second half is subtler and cost a round to find. `.nullable()` wraps,
 *   so `vocabularyOut(V).nullable()` emits the vocabulary INSIDE `anyOf[0]` —
 *   where the contracts do not carry it and `check-vocabulary` does not read it.
 *   The schema still validates correctly, which is what makes it dangerous: the
 *   code works and only the document is wrong. The `.meta()` lives inside the
 *   helper, so a call site cannot reorder its way out; core exports the nullable
 *   form instead, and the ordering is settled in one place rather than depending
 *   on two chained calls that read identically.
 *
 * ⚠ NO `searchExactTotalLimit` IN THIS FILE, AND THAT IS THE POINT OF THE
 *   COMMENT RATHER THAN AN OMISSION. The threshold beyond which
 *   `approximateTotal` becomes a lower bound is SERVED, as a domain constant.
 *   It used to be carved into the contract's prose as "exact up to 10,000
 *   (`track_total_hits`)" — a number with no owning document (rule 15) and a
 *   search engine's parameter showing through the boundary, in a document a
 *   generated client carries.
 */

import { z } from 'zod';

import type { VocabularyOutNullable } from '@arthome/core/schema';
import { PageCursorSchema, int64, vocabularyOutNullable } from '@arthome/core/schema';

/**
 * Why a list came back empty.
 *
 * Local to the contract: the domain neither produces nor consumes these — they
 * describe what an endpoint offers, and a fifteenth is an endpoint change.
 */
export const EMPTY_REASONS = [
  'no_match_for_query',
  'no_match_with_filters',
  'nothing_in_category_yet',
  'no_live_in_category',
  'no_upcoming_in_category',
  'no_replay_in_category',
  'no_followed_artist',
  'no_followed_artist_live',
  'no_order_yet',
  'no_ticket_yet',
  'no_replay_available',
  'empty_cart',
  'no_saved_search',
  'no_watchlist_entry',
] as const;

/** The storefront's cursor page. Its studio counterpart carries `pendingCount` instead — D-065 family G. */
export const StorefrontCursorPageInfoSchema: z.ZodObject<
  {
    nextCursor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    prevCursor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    hasMore: z.ZodBoolean;
    approximateTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    totalIsLowerBound: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    emptyReason: z.ZodOptional<VocabularyOutNullable>;
    emptyActionCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$loose
> = z.looseObject({
  nextCursor: PageCursorSchema.nullable().optional(),
  prevCursor: PageCursorSchema.nullable().optional(),
  hasMore: z.boolean(),
  approximateTotal: int64()
    .meta({ format: undefined })
    .nullable()
    .optional()
    .meta({ examples: [428] })
    .describe(
      '**Approximate and bounded** count. It is exact up to the threshold served as\n`DomainConstants.searchExactTotalLimit`, and beyond it the contract promises only that the\ntrue count is **at least** the value served — `totalIsLowerBound` says so. That is what\nmakes "See more · N remaining" honest without promising an exact count an index does not\ngive.\n\n**The threshold is served, not written here, and no engine is named.** A number carved into\na description is a constant with no owning document (rule 15), and a vendor\'s parameter\nnamed in a contract is the search engine\'s shape showing through the boundary — it would\nhave to be renamed the day the engine changes, in a document a generated client carries.\n',
    ),
  totalIsLowerBound: z
    .boolean()
    .default(false)
    .optional()
    .describe('When true, `approximateTotal` is a **lower bound**, not a total.'),
  emptyReason: vocabularyOutNullable(EMPTY_REASONS, 'EMPTY_REASONS')
    .optional()
    .describe(
      'Why the list is empty. An empty list without a reason forces the surface to guess and to\nwrite a generic empty state, which the brief forbids. Each value produces a different screen,\n**with an action that leads out of the dead end**.\n',
    ),
  emptyActionCode: z
    .string()
    .nullable()
    .optional()
    // `\u0022` and not a bare quote: the document's prose quotes a sample action code,
    // and `arthome-check-enums` reads a quoted value as a copied vocabulary member.
    .describe(
      'The code of the action that leads out of the dead end (\u0022see the categories\u0022, \u0022browse\u0022). It\nis a **served action code**, not a sentence and not a constant copied across five\nsurfaces.\n',
    ),
});

/** The studio's cursor page: the moderation queue and the live chat, with a separate badge total. */
export const StudioCursorPageInfoSchema: z.ZodObject<
  {
    nextCursor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    prevCursor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    hasMore: z.ZodBoolean;
    pendingCount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
  },
  z.core.$loose
> = z
  .looseObject({
    nextCursor: PageCursorSchema.nullable().optional(),
    prevCursor: PageCursorSchema.nullable().optional(),
    hasMore: z.boolean(),
    pendingCount: int64()
      .meta({ format: undefined })
      .nullable()
      .optional()
      .describe(
        'The **separate total**, for the badge. It is not counted over the current page: the bottom\nbar carries "in queue: 14", and **none of these numbers may require fetching a page**.\n',
      ),
  })
  .describe('The two exceptions: the moderation queue and the live chat.');

/**
 * `OffsetPageInfo` — the studio's pagination primitive, and the deliberate
 * opposite of the one above.
 *
 * **The total is EXACT here, and that is the whole difference.** The storefront
 * serves an approximate, bounded count because a search index cannot promise
 * better; the studio's event board displays "1–8 OF N" and lists its page
 * numbers, so it needs the total and the page count. A number that is a lower
 * bound cannot be paginated to.
 *
 * ⚠ THE TWO SHAPES COEXIST ON PURPOSE AND NEITHER IS THE DEFAULT (D-010).
 *
 *   Page + total everywhere in the studio, **with two named exceptions and not
 *   one more**: the moderation queue and the live chat move to cursors, because
 *   those are FEEDS and offset pagination over a feed duplicates rows and skips
 *   others **mechanically, not exceptionally**. The studio's audit log stays on
 *   page + total with a mandatory period filter: nobody pages to the 50,000th
 *   entry, they filter by period first — and a cursor there would trade a
 *   problem we do not have for the loss of the page numbers, which are the
 *   affordance the screen was built around.
 *
 * `emptyReason` is a bare nullable string rather than this module's vocabulary:
 * the studio's empty states are not the storefront's fourteen, and inventing a
 * shared list to make the two shapes rhyme would be a vocabulary nobody serves.
 */
export const OffsetPageInfoSchema: z.ZodObject<
  {
    page: z.ZodNumber;
    pageSize: z.ZodNumber;
    totalItems: z.ZodNumber;
    totalPages: z.ZodNumber;
    emptyReason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$loose
> = z
  .looseObject({
    page: int64().min(1).meta({ format: undefined }),
    pageSize: int64().meta({ format: undefined }),
    totalItems: int64().meta({ format: undefined }),
    totalPages: int64().meta({ format: undefined }),
    emptyReason: z.string().nullable().optional(),
  })
  .describe(
    '**The total is exact**, not approximate: that is the difference from the storefront, and it\nis what "1–8 OF N" requires.\n',
  );
