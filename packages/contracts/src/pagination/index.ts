/**
 * `CursorPageInfo` — the storefront's pagination primitive.
 *
 * D-010: the storefront paginates by opaque cursor over `(created_at, id)`, the
 * studio by page + total. Offset pagination over a feed duplicates and skips
 * MECHANICALLY, not exceptionally — which is why the studio's two feeds, the
 * moderation queue and the live chat, are cursors too.
 *
 * `vocabularyOutNullable`, NOT `vocabularyOut(…).nullable()`, and the difference
 *   cost a round to find: `.nullable()` wraps, so the vocabulary lands inside
 *   `anyOf[0]`, where the contracts do not carry it and `check-vocabulary` does not
 *   read it. The schema still validates — the code works and only the document is
 *   wrong. The `.meta()` lives inside the helper so a call site cannot reorder its
 *   way out.
 */

import { z } from 'zod';

import type { VocabularyOutNullable } from '@arthome/core/schema';
import { PageCursorSchema, int64, vocabularyOutNullable } from '@arthome/core/schema';

/**
 * Why a list came back empty. Local to the contract: the domain neither produces nor
 * consumes these — a fifteenth reason is an endpoint change, not a domain one.
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
 * Page + total everywhere in the studio, with two named exceptions and not one
 *   more (D-010). The audit log stays on page + total behind a mandatory period
 *   filter: a cursor there would cost the page numbers the screen was built around.
 *
 * `emptyReason` is a bare nullable string, not this module's vocabulary: the
 * studio's empty states are not the storefront's fourteen.
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
