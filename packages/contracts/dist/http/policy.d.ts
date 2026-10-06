import type { Header } from './index.js';
/**
 * What a route promises about time and size: the freshness of its answer, the latency budget the
 * typed client times out under, and the body ceiling the server enforces. Each is a plain value on
 * the route, so the BFF writes `Cache-Control` and the server sets its limits from the declaration.
 */
export declare const Freshness: {
    readonly IMMUTABLE: "immutable";
    readonly FIVE_MINUTES: "five_minutes";
    readonly MINUTE: "minute";
    readonly FIFTEEN_SECONDS: "fifteen_seconds";
    readonly NEVER: "never";
};
export type Freshness = (typeof Freshness)[keyof typeof Freshness];
/** Who an answer goes to, as a cache sees it: nobody in particular, or a principal. */
export declare const CallerKind: {
    readonly ANONYMOUS: "anonymous";
    readonly IDENTIFIED: "identified";
};
export type CallerKind = (typeof CallerKind)[keyof typeof CallerKind];
export interface CachePolicy {
    readonly freshness: Freshness;
    readonly maxAgeSeconds: number;
    /**
     * The scope of an anonymous caller's answer: `public` only on a body identical for every
     * anonymous caller. An identified caller's answer is always `private`.
     */
    readonly scope: 'public' | 'private';
    readonly vary: readonly string[];
    /** The 200 carries an `ETag`, and a read may send `If-None-Match` and get a `304`. */
    readonly etag: boolean;
}
export interface CacheOptions {
    readonly scope?: 'public' | 'private';
    readonly vary?: readonly string[];
    readonly etag?: boolean;
}
/** `cache(Freshness.FIVE_MINUTES)`: the family of `transport.md` §5.9, with its directive. */
export declare function cache(freshness: Freshness, options?: CacheOptions): CachePolicy;
/**
 * The `Cache-Control` value of a policy for one caller, as the BFF writes it. An identified caller's
 * body may carry what is theirs, so it is never shareable, whatever the policy's scope.
 */
export declare function cacheControlOf(policy: CachePolicy, caller: CallerKind): string;
/** The `Cache-Control` a 200 declares: the one value of `cacheControlOf`, or one per kind of caller where they differ. */
export declare function cacheControlHeaderOf(policy: CachePolicy, callers: readonly [CallerKind, ...CallerKind[]]): Header;
/** 1 MiB: the ceiling of a request body unless a route says otherwise (`transport.md` §5.7). */
export declare const DEFAULT_BODY_LIMIT = 1048576;
/** 2 MiB: the ceiling of a batched read. */
export declare const BATCH_BODY_LIMIT = 2097152;
/** The ids a batched read takes at most (`transport.md` §5.6). */
export declare const BATCH_MAX_IDS = 200;
/** The latency budget of a batched read, in milliseconds (`transport.md` §5.9). */
export declare const BATCH_BUDGET_MS = 150;
/** On an answer carrying a `sensitive` field: kept out of every cache, and out of the app snapshot. */
export declare const NO_STORE_HEADER: Header;
export declare const VARY_HEADER: Header;
/** On a write carrying `Idempotency-Key`: `true` when the answer is the stored one of an earlier attempt. */
export declare const IDEMPOTENCY_REPLAYED_HEADER: Header;
/** Beside `Idempotency-Replayed`: when the replay was served, the body's `servedAt` being the first attempt's. */
export declare const SERVED_AT_HEADER: Header;
//# sourceMappingURL=policy.d.ts.map