import { z } from 'zod';

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
export function cache(freshness: Freshness, options: CacheOptions = {}): CachePolicy {
  return {
    freshness,
    maxAgeSeconds: MAX_AGE_SECONDS[freshness],
    scope: options.scope ?? 'private',
    vary: options.vary ?? [],
    etag: options.etag ?? false,
  };
}

/** The `Cache-Control` value of a policy, as the BFF writes it. */
export function cacheControlOf(policy: CachePolicy): string {
  if (policy.freshness === Freshness.NEVER) return 'no-store';
  const immutable = policy.freshness === Freshness.IMMUTABLE ? ', immutable' : '';
  return `${policy.scope}, max-age=${String(policy.maxAgeSeconds)}${immutable}`;
}

/** 1 MiB: the ceiling of a request body unless a route says otherwise (`transport.md` §5.7). */
export const DEFAULT_BODY_LIMIT = 1_048_576;

/** 2 MiB: the ceiling of a batched read. */
export const BATCH_BODY_LIMIT = 2_097_152;

export const CACHE_CONTROL_HEADER: Header = {
  description: "How long, and for whom, the answer may be kept: the route's freshness family.",
  schema: z.string(),
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
