/**
 * The media server's identity (`adr-contract-model.md` §9.1): MediaMTX's external HTTP
 * authentication calls the streaming service before it accepts a feed, with its own JSON and an
 * HTTP Basic credential taken from the URL's userinfo, and nothing else. It is internal and never
 * public, but it carries no internal token and no deadline, so its routes derive no `504`.
 */
import { z } from 'zod';
import { ApiErrorCode } from '@arthome/core';
import type { Identity } from './access.js';
import type { CodedResponse } from './errors.js';
import type { HeaderParameter, JsonResponse } from './index.js';
import { ServiceErrorEnvelopeSchema } from './service.js';
/** The identity names no one beyond the media server itself: the shared secret proves only that. */
export declare const MediaServerPrincipalSchema: z.ZodObject<Record<never, never>, z.core.$strip>;
export declare const MediaServerTraceparentParameter: HeaderParameter<'traceparent', z.ZodString>;
export declare const MediaServerUnauthorizedResponse: JsonResponse<typeof ServiceErrorEnvelopeSchema> & CodedResponse<typeof ApiErrorCode.UNAUTHENTICATED>;
export declare const mediaServer: Identity<'mediaServer', typeof MediaServerPrincipalSchema, never, readonly [typeof MediaServerTraceparentParameter], readonly []>;
//# sourceMappingURL=media-server.d.ts.map