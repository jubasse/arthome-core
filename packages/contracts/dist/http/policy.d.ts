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
export interface CachePolicy {
    readonly freshness: Freshness;
    readonly maxAgeSeconds: number;
    /** `public` is shareable between callers: only a body identical for every anonymous caller may say it. */
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
/** The `Cache-Control` value of a policy, as the BFF writes it. */
export declare function cacheControlOf(policy: CachePolicy): string;
/** 1 MiB: the ceiling of a request body unless a route says otherwise (`transport.md` §5.7). */
export declare const DEFAULT_BODY_LIMIT = 1048576;
/** 2 MiB: the ceiling of a batched read. */
export declare const BATCH_BODY_LIMIT = 2097152;
export declare const CACHE_CONTROL_HEADER: Header;
/** On an answer carrying a `sensitive` field: kept out of every cache, and out of the app snapshot. */
export declare const NO_STORE_HEADER: Header;
export declare const VARY_HEADER: Header;
/** On a write carrying `Idempotency-Key`: `true` when the answer is the stored one of an earlier attempt. */
export declare const IDEMPOTENCY_REPLAYED_HEADER: Header;
//# sourceMappingURL=policy.d.ts.map