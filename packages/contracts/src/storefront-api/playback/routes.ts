import { ApiErrorCode, IdentityErrorCode, WATCH_DENIAL_REASONS } from '@arthome/core';

import { OpenPlaybackBodySchema, PlaybackSessionIdParameter } from './schemas.js';
import type { OpenPlaybackRoute, ReleasePlaybackRoute, RenewPlaybackTicketRoute } from './types.js';
import { PlaybackRenewalSchema, PlaybackTicketSchema } from '../../streaming/index.js';
import {
  DateIdParameter,
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  storefrontV1,
  viewer,
} from '../components.js';

const playback = storefrontV1
  .identity(viewer)
  .headers(SurfaceParameter, TraceparentParameter)
  .tags(StorefrontTag.PLAYBACK);
const sessions = playback.path('playback').resource('sessions', { id: PlaybackSessionIdParameter });

export const openPlayback: OpenPlaybackRoute = playback
  .resource('playback', { id: DateIdParameter })
  .action('open', {
    operationId: 'openPlayback',
    summary: 'The binding verdict, the token, the lease, and the whole player screen.',
    body: OpenPlaybackBodySchema,
    response: PlaybackTicketSchema,
    idempotent: false,
    answer: 'Right granted. The token, the lease and the complete screen.',
    errors: [ApiErrorCode.NOT_FOUND, ...WATCH_DENIAL_REASONS],
  });

export const renewPlaybackTicket: RenewPlaybackTicketRoute = sessions.action('renew', {
  operationId: 'renewPlaybackTicket',
  summary: 'Renews the token and extends the lease, without restarting playback.',
  response: PlaybackRenewalSchema,
  idempotent: false,
  answer: 'Token renewed.',
  errors: [ApiErrorCode.NOT_FOUND, IdentityErrorCode.SIGNED_OUT_ELSEWHERE, ...WATCH_DENIAL_REASONS],
});

export const releasePlayback: ReleasePlaybackRoute = sessions.action('release', {
  operationId: 'releasePlayback',
  summary: 'Releases a playback session — speeds things up, guarantees nothing.',
  idempotent: false,
  answer: 'Released, or already released — both succeed.',
  errors: [ApiErrorCode.NOT_FOUND],
});
