import { z } from 'zod';

import { InstantOut } from '@arthome/core/schema';

import type { Header } from './index.js';

/**
 * What a route promises about time and size: the freshness of its answer, the latency budget the
 * typed client times out under, and the body ceiling the server enforces. Each is a plain value on
 * the route, so the BFF writes `Cache-Control` and the server sets its limits from the declaration.
 */

export const Freshness = {
  IMMUTABLE: 'immutable',
  FIVE_MINUTES: 'five_minutes',
  MINUTE: 'minute',
  FIFTEEN_SECONDS: 'fifteen_seconds',
  NEVER: 'never',
} as const;
export type Freshness = (typeof Freshness)[keyof typeof Freshness];

const MAX_AGE_SECONDS: Readonly<Record<Freshness, number>> = {
  immutable: 86_400,
  five_minutes: 300,
  minute: 60,
  fifteen_seconds: 15,
  never: 0,
};

/** Who an answer goes to, as a cache sees it: nobody in particular, or a principal. */
export const CallerKind = {
  ANONYMOUS: 'anonymous',
  IDENTIFIED: 'identified',
} as const;
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
export function cache(freshness: Freshness, options: CacheOptions = {}): CachePolicy {
  return {
    freshness,
    maxAgeSeconds: MAX_AGE_SECONDS[freshness],
    scope: options.scope ?? 'private',
    vary: options.vary ?? [],
    etag: options.etag ?? false,
  };
}

/**
 * The `Cache-Control` value of a policy for one caller, as the BFF writes it. An identified caller's
 * body may carry what is theirs, so it is never shareable, whatever the policy's scope.
 */
export function cacheControlOf(policy: CachePolicy, caller: CallerKind): string {
  if (policy.freshness === Freshness.NEVER) return 'no-store';
  const scope = caller === CallerKind.IDENTIFIED ? 'private' : policy.scope;
  const immutable = policy.freshness === Freshness.IMMUTABLE ? ', immutable' : '';
  return `${scope}, max-age=${String(policy.maxAgeSeconds)}${immutable}`;
}

const CACHE_CONTROL_DESCRIPTION =
  "How long, and for whom, the answer may be kept: the route's freshness family.";

const SENT_TO: Readonly<Record<CallerKind, string>> = {
  anonymous: 'Sent to an anonymous caller.',
  identified: 'Sent as soon as a credential identifies the caller.',
};

/** The `Cache-Control` a 200 declares: the one value of `cacheControlOf`, or one per kind of caller where they differ. */
export function cacheControlHeaderOf(
  policy: CachePolicy,
  callers: readonly [CallerKind, ...CallerKind[]],
): Header {
  const [first, ...others] = callers;
  const value = cacheControlOf(policy, first);
  const differing = others.filter((caller) => cacheControlOf(policy, caller) !== value);
  if (differing.length === 0) {
    return { description: CACHE_CONTROL_DESCRIPTION, schema: z.literal(value) };
  }
  const sentTo = (caller: CallerKind): z.ZodLiteral<string> =>
    z.literal(cacheControlOf(policy, caller)).meta({ description: SENT_TO[caller] });
  return {
    description: CACHE_CONTROL_DESCRIPTION,
    schema: z.union([first, ...differing].map(sentTo)),
  };
}

/** 1 MiB: the ceiling of a request body unless a route says otherwise (`transport.md` §5.7). */
export const DEFAULT_BODY_LIMIT = 1_048_576;

/** 2 MiB: the ceiling of a batched read. */
export const BATCH_BODY_LIMIT = 2_097_152;

/** The ids a batched read takes at most (`transport.md` §5.6). */
export const BATCH_MAX_IDS = 200;

/** The latency budget of a batched read, in milliseconds (`transport.md` §5.9). */
export const BATCH_BUDGET_MS = 150;

/** On an answer carrying a `sensitive` field: kept out of every cache, and out of the app snapshot. */
export const NO_STORE_HEADER: Header = {
  description:
    'Non-negotiable. It is what keeps the secret out of the cache and out of the app snapshot.',
  schema: z.literal('no-store'),
};

export const VARY_HEADER: Header = {
  description: 'The request headers the answer depends on.',
  schema: z.string(),
};

/** On a write carrying `Idempotency-Key`: `true` when the answer is the stored one of an earlier attempt. */
export const IDEMPOTENCY_REPLAYED_HEADER: Header = {
  description:
    'Present and `true` when this answer replays the one stored for the same `Idempotency-Key`.',
  schema: z.string(),
};

/** Beside `Idempotency-Replayed`: when the replay was served, the body's `servedAt` being the first attempt's. */
export const SERVED_AT_HEADER: Header = {
  description:
    "Server instant **of this response**, sent with `Idempotency-Replayed`. On a replay it differs\nfrom the body's `servedAt`, which is the first attempt's: a replay proves an effect took\nplace, it does not promise fresh data.\n",
  schema: InstantOut,
};
