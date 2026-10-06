import {
  ApiErrorCode,
  IdentityErrorCode,
  InternalTokenIssuer,
  WATCH_DENIAL_REASONS,
  WatchDenialReason,
} from '@arthome/core';

import type { OpenPlaybackRoute, ReleasePlaybackRoute, RenewPlaybackTicketRoute } from './types.js';
import {
  Freshness,
  ViewerCountryParameter,
  cache,
  callerService,
  service,
} from '../../http/index.js';
import { SurfaceParameter } from '../../storefront-api/components.js';
import {
  OpenPlaybackBodySchema,
  PlaybackSessionIdParameter,
} from '../../storefront-api/playback/schemas.js';
import { PlaybackRenewalSchema, PlaybackTicketSchema } from '../../streaming/index.js';
import { DateIdParameter, StreamingServiceTag, streamingServiceV1 } from '../components.js';

const playback = streamingServiceV1
  .identity(service)
  .requires(callerService(InternalTokenIssuer.STOREFRONT_BFF))
  .tags(StreamingServiceTag.PLAYBACK);
const sessions = playback.path('playback').resource('sessions', { id: PlaybackSessionIdParameter });

export const openPlayback: OpenPlaybackRoute = playback
  .resource('playback', { id: DateIdParameter })
  .action('open', {
    operationId: 'openPlayback',
    summary: 'The binding verdict, the token, the lease, and the whole player screen.',
    body: OpenPlaybackBodySchema,
    response: PlaybackTicketSchema,
    parameters: [SurfaceParameter, ViewerCountryParameter],
    idempotent: false,
    cache: cache(Freshness.NEVER),
    answer: 'Right granted. The token, the lease and the complete screen.',
    errors: [ApiErrorCode.NOT_FOUND, ...WATCH_DENIAL_REASONS],
  });

export const renewPlaybackTicket: RenewPlaybackTicketRoute = sessions.action('renew', {
  operationId: 'renewPlaybackTicket',
  summary: 'Renews the token and extends the lease, without restarting playback.',
  response: PlaybackRenewalSchema,
  parameters: [ViewerCountryParameter],
  idempotent: false,
  cache: cache(Freshness.NEVER),
  answer: 'Token renewed.',
  errors: [
    ApiErrorCode.NOT_FOUND,
    IdentityErrorCode.SIGNED_OUT_ELSEWHERE,
    WatchDenialReason.CONCURRENT_LIMIT_REACHED,
    WatchDenialReason.PREVIEW_EXHAUSTED,
  ],
});

export const releasePlayback: ReleasePlaybackRoute = sessions.action('release', {
  operationId: 'releasePlayback',
  summary: 'Releases a playback session; the lease is what ends it.',
  idempotent: false,
  answer: 'Released, or already released: both succeed.',
  errors: [ApiErrorCode.NOT_FOUND],
});
