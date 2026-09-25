/**
 * `CursorPageInfo` — the storefront's pagination primitive.
 *
 * D-010: the storefront paginates by opaque cursor over `(created_at, id)`, the
 * studio by page + total. Offset pagination over a feed duplicates and skips
 * MECHANICALLY, not exceptionally — which is why the studio's two feeds, the
 * moderation queue and the live chat, are cursors too.
 *
 * ⚠ `vocabularyOutNullable`, NOT `vocabularyOut(…).nullable()`, and the difference
 *   cost a round to find: `.nullable()` wraps, so the vocabulary lands inside
 *   `anyOf[0]`, where the contracts do not carry it and `check-vocabulary` does not
 *   read it. The schema still validates — the code works and only the document is
 *   wrong. The `.meta()` lives inside the helper so a call site cannot reorder its
 *   way out.
 */
import { z } from 'zod';
import type { VocabularyOutNullable } from '@arthome/core/schema';
/**
 * Why a list came back empty. Local to the contract: the domain neither produces nor
 * consumes these — a fifteenth reason is an endpoint change, not a domain one.
 */
export declare const EMPTY_REASONS: readonly ["no_match_for_query", "no_match_with_filters", "nothing_in_category_yet", "no_live_in_category", "no_upcoming_in_category", "no_replay_in_category", "no_followed_artist", "no_followed_artist_live", "no_order_yet", "no_ticket_yet", "no_replay_available", "empty_cart", "no_saved_search", "no_watchlist_entry"];
/** The storefront's cursor page. Its studio counterpart carries `pendingCount` instead — D-065 family G. */
export declare const StorefrontCursorPageInfoSchema: z.ZodObject<{
    nextCursor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    prevCursor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    hasMore: z.ZodBoolean;
    approximateTotal: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    totalIsLowerBound: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    emptyReason: z.ZodOptional<VocabularyOutNullable>;
    emptyActionCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$loose>;
/** The studio's cursor page: the moderation queue and the live chat, with a separate badge total. */
export declare const StudioCursorPageInfoSchema: z.ZodObject<{
    nextCursor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    prevCursor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    hasMore: z.ZodBoolean;
    pendingCount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, z.core.$loose>;
/**
 * `OffsetPageInfo` — the studio's pagination primitive, and the deliberate
 * opposite of the one above.
 *
 * ⚠ Page + total everywhere in the studio, with two named exceptions and not one
 *   more (D-010). The audit log stays on page + total behind a mandatory period
 *   filter: a cursor there would cost the page numbers the screen was built around.
 *
 * `emptyReason` is a bare nullable string, not this module's vocabulary: the
 * studio's empty states are not the storefront's fourteen.
 */
export declare const OffsetPageInfoSchema: z.ZodObject<{
    page: z.ZodNumber;
    pageSize: z.ZodNumber;
    totalItems: z.ZodNumber;
    totalPages: z.ZodNumber;
    emptyReason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$loose>;
//# sourceMappingURL=index.d.ts.map