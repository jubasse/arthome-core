import { ApiErrorCode, InternalTokenIssuer } from '@arthome/core';

import type { RecordPlaybackPositionRoute } from './types.js';
import { Freshness, cache, callerService, service } from '../../http/index.js';
import {
  PlaybackPositionSchema,
  RecordPlaybackPositionBodySchema,
} from '../../storefront-api/me/schemas.js';
import { DateIdParameter, StreamingServiceTag, streamingServiceV1 } from '../components.js';

const progress = streamingServiceV1
  .identity(service)
  .requires(callerService(InternalTokenIssuer.STOREFRONT_BFF))
  .tags(StreamingServiceTag.PLAYBACK)
  .path('me')
  .resource('progress', { id: DateIdParameter, owner: 'caller' });

export const recordPlaybackPosition: RecordPlaybackPositionRoute = progress.upsert({
  operationId: 'recordPlaybackPosition',
  summary: 'Records the playback position.',
  idempotent: false,
  body: RecordPlaybackPositionBodySchema,
  item: PlaybackPositionSchema,
  cache: cache(Freshness.NEVER),
  answer: 'Position recorded, with the server ordering applied.',
  errors: [ApiErrorCode.NOT_FOUND],
});
