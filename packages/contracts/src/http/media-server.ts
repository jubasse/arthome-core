/**
 * The media server's identity (`adr-contract-model.md` §9.1): MediaMTX's external HTTP
 * authentication calls the streaming service before it accepts a feed, with its own JSON and an
 * HTTP Basic credential taken from the URL's userinfo, and nothing else. It is internal and never
 * public, but it carries no internal token and no deadline, so its routes derive no `504`.
 */

import { z } from 'zod';

import { ApiErrorCode } from '@arthome/core';

import { identity } from './access.js';
import type { Identity } from './access.js';
import { errorResponse } from './errors.js';
import type { CodedResponse } from './errors.js';
import type { HeaderParameter, JsonResponse } from './index.js';
import { ServiceErrorEnvelopeSchema } from './service.js';

/** The identity names no one beyond the media server itself: the shared secret proves only that. */
export const MediaServerPrincipalSchema: z.ZodObject<
  Record<never, never>,
  z.core.$strip
> = z.object({});

export const MediaServerTraceparentParameter: HeaderParameter<'traceparent', z.ZodString> = {
  name: 'traceparent',
  in: 'header',
  required: false,
  description:
    'W3C trace context. MediaMTX sends none, so the service starts the trace; one sent is continued,\nand a malformed one is never refused.\n',
  schema: z.string(),
};

export const MediaServerUnauthorizedResponse: JsonResponse<typeof ServiceErrorEnvelopeSchema> &
  CodedResponse<typeof ApiErrorCode.UNAUTHENTICATED> = errorResponse(ServiceErrorEnvelopeSchema, {
  description:
    "The media server's shared secret, missing or refused: a misconfiguration to alarm on, never a refused feed.",
  code: ApiErrorCode.UNAUTHENTICATED,
});

export const mediaServer: Identity<
  'mediaServer',
  typeof MediaServerPrincipalSchema,
  never,
  readonly [typeof MediaServerTraceparentParameter],
  readonly []
> = identity('mediaServer', {
  schemes: { read: [{ mediaServerSecret: [] }], write: [{ mediaServerSecret: [] }] },
  principal: MediaServerPrincipalSchema,
  parameters: [MediaServerTraceparentParameter],
  writeResponses: { 401: MediaServerUnauthorizedResponse },
  internal: true,
});
