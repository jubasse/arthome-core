import { ApiErrorCode, InternalTokenIssuer } from '@arthome/core';

import { ViewerProgressBatchBodySchema, ViewerProgressSchema } from './schemas.js';
import type { GetViewerProgressBatchRoute } from './types.js';
import { Freshness, cache, callerService, service } from '../../http/index.js';
import { DateIdParameter } from '../../storefront-api/components.js';
import { StreamingServiceTag, streamingServiceV1 } from '../components.js';

export const getViewerProgressBatch: GetViewerProgressBatchRoute = streamingServiceV1
  .identity(service)
  .requires(callerService(InternalTokenIssuer.STOREFRONT_BFF))
  .tags(StreamingServiceTag.PLAYBACK)
  .resource('viewer-progress', { id: DateIdParameter })
  .batch({
    operationId: 'getViewerProgressBatch',
    summary: "A profile's points on many dates, in one read.",
    item: ViewerProgressSchema,
    body: ViewerProgressBatchBodySchema,
    cache: cache(Freshness.NEVER),
    answer: 'The points found, by date id; a date without one is absent.',
    errors: [ApiErrorCode.FORBIDDEN],
  });
