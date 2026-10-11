import { ApiErrorCode } from '@arthome/core';

import { MediaServerAuthorizationSchema } from './schemas.js';
import type { AuthorizeMediaServerAccessRoute } from './types.js';
import { mediaServer } from '../../http/index.js';
import { StreamingServiceTag, streamingServiceV1 } from '../components.js';

export const authorizeMediaServerAccess: AuthorizeMediaServerAccessRoute = streamingServiceV1
  .identity(mediaServer)
  .tags(StreamingServiceTag.MEDIA)
  .single('media-server')
  .action('authorize', {
    operationId: 'authorizeMediaServerAccess',
    summary: 'Accepts or refuses an attempt MediaMTX is about to let in.',
    body: MediaServerAuthorizationSchema,
    idempotent: false,
    responses: { 204: { description: 'Accepted: MediaMTX lets the attempt in.' } },
    errors: [ApiErrorCode.FORBIDDEN],
  });
