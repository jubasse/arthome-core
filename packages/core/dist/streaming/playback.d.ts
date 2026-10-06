import type { Instant } from '../kernel/clock.js';
import { type Window } from '../time/instant.js';
import { RunState } from '../vocabulary/catalog.js';
/** A playback token's lifetime: the edge may serve a revoked viewer for up to this long (D-020). */
export declare const PLAYBACK_TOKEN_LIFETIME_SECONDS = 120;
/** How often a player renews its token, so a client learns within it that it lost the right (`adr-stream-entitlement.md` §3.1). */
export declare const PLAYBACK_RENEWAL_INTERVAL_SECONDS = 45;
/** A lease's lifetime, extended by each renewal: a screen that vanished frees its place within it (`adr-stream-entitlement.md` §3.3). */
export declare const PLAYBACK_LEASE_SECONDS = 90;
/** The freshness `streaming`'s entitlement projection tolerates before `read_model_staleness_seconds` fires (`adr-stream-entitlement.md` §5). */
export declare const ENTITLEMENT_PROJECTION_MAX_STALENESS_SECONDS = 5;
export declare function playbackTokenExpiresAt(now: Instant): Instant;
export declare function playbackLeaseExpiresAt(now: Instant): Instant;
export declare function isPreviewBudgetSpending(runState: RunState): boolean;
/** The whole seconds of `watched` that fall inside the run's `on_air` intervals: what the preview budget is charged. */
export declare function previewSecondsSpent(watched: Window, onAirIntervals: readonly Window[]): number;
/** A preview token's expiry: never past the budget left while the budget is being spent. */
export declare function previewTokenExpiresAt(now: Instant, previewSecondsLeft: number, spending: boolean): Instant;
//# sourceMappingURL=playback.d.ts.map