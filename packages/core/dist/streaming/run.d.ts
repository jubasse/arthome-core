import type { Instant } from '../kernel/clock.js';
import { IncidentCause, RunState } from '../vocabulary/catalog.js';
import { IncidentTrigger, TechnicalCheckFailure } from '../vocabulary/streaming.js';
/**
 * The moves a run may make. `ended` is final (D-115). `interrupted` is reached through an
 * incident only, so no studio route asks for it.
 */
export declare const RUN_TRANSITIONS: Readonly<Record<RunState, readonly RunState[]>>;
export declare function assertRunTransition(from: RunState, to: RunState, technicalCheckPassed: boolean): void;
/** The floor until a channel serves its `recommendedBitrateKbps`: the lead's technical default, which the product owner may adjust. */
export declare const TECHNICAL_CHECK_BITRATE_FLOOR_KBPS_DEFAULT = 1500;
/** What the check observed on the date's key (D-114). */
export interface TechnicalCheckProbe {
    readonly feedReceived: boolean;
    readonly codecCarried: boolean;
    readonly bitrateKbps: number;
}
/** The check's failures in vocabulary order, empty for a pass. Without a feed nothing else was measured, so `no_feed` comes alone. */
export declare function technicalCheckFailuresOf(probe: TechnicalCheckProbe, floorKbps?: number): readonly TechnicalCheckFailure[];
/** The channel's default delay before a lost feed raises the hold screen by itself (`realtime.md` §4, `data-model.md` §5.6). */
export declare const HOLD_SCREEN_AUTO_AFTER_SECONDS_DEFAULT = 15;
/**
 * How long a publisher may drop before the run desk is told it is gone: the venue cut
 * `streaming.md` §6 describes, plus the encoder's reconnect. It equals the floor of the channel's
 * hold-screen delay, so a glitch it absorbs never raises the automatic veil.
 */
export declare const PUBLISHER_GRACE_SECONDS = 5;
/** D-123, completing D-115. */
export declare const RUN_AUTO_END_MINUTES = 15;
/** When a run left on air ends by itself; `null` while a publisher is connected. */
export declare function runAutoEndsAt(scheduledEndsAt: Instant, publisherLastSeenAt: Instant | null, publisherConnected: boolean): Instant | null;
/** D-124: only the automatic hold screen of a lost feed lifts itself; one raised by hand waits for `resolveIncident`. */
export declare function holdScreenLiftsOnFeedReturn(incident: {
    readonly cause: IncidentCause;
    readonly trigger: IncidentTrigger;
}): boolean;
//# sourceMappingURL=run.d.ts.map