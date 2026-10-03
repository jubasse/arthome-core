import { z } from 'zod';

import { ApiErrorCode, FailureNature, Surface } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { vocabularyIn } from '@arthome/core/schema';

import { StorefrontErrorEnvelopeSchema } from '../envelope/index.js';
import type {
  AccessorOf,
  Header,
  HeaderParameter,
  JsonResponse,
  QueryParameter,
} from '../http/index.js';
import { accessorOf } from '../http/index.js';

const SURFACE: readonly [
  typeof Surface.STOREFRONT_WEB,
  typeof Surface.STOREFRONT_MOBILE,
  typeof Surface.STOREFRONT_TV,
] = [Surface.STOREFRONT_WEB, Surface.STOREFRONT_MOBILE, Surface.STOREFRONT_TV];

const STOREFRONT_TAGS = [
  'bootstrap',
  'discovery',
  'date',
  'commerce',
  'playback',
  'chat',
  'pairing',
  'account',
] as const;

/** The tags this document groups its operations by. */
export const StorefrontTag: AccessorOf<typeof STOREFRONT_TAGS> = accessorOf(STOREFRONT_TAGS);

export const TraceparentParameter: HeaderParameter<'traceparent', z.ZodString> = {
  name: 'traceparent',
  in: 'header',
  required: false,
  description:
    'W3C trace context. Created by the surface when it can, otherwise by the BFF. It is\npropagated to the service and injected into `outbox_event.tracecontext` **at write time**:\ninjected later, the link is definitively lost.\n',
  schema: z
    .string()
    .regex(new RegExp('^[0-9a-f]{2}-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$'))
    .meta({
      examples: ['00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'],
    }),
};

export const SurfaceParameter: HeaderParameter<
  'X-Arthome-Surface',
  VocabularyIn<typeof SURFACE>,
  true
> = {
  name: 'X-Arthome-Surface',
  in: 'header',
  required: true,
  description:
    'The calling surface. It determines three **served** things, never guessed: the chat rate\nceiling (television 2 msg/s, mobile 6, web 10), the size of the catch-up on entering a room\n(television 20 messages, 50 elsewhere) and which slice of the label and taxonomy catalogue to\nload.\n**A strict narrowing of `SURFACES`, and the strictness is the point.** The domain\nvocabulary has six members; this header accepts the three that can legitimately call the\nstorefront BFF and **refuses the rest**, because an input is refused where an output is kept\nraw and treated as neutral. A studio surface reaching this header is not a value to tolerate,\nit is a caller in the wrong place.\n',
  schema: vocabularyIn(SURFACE).meta({
    'x-arthome-vocabulary-source': 'SURFACES',
    'x-arthome-vocabulary-narrowing':
      'The three that may call the storefront BFF. A studio surface reaching this header is not a value to tolerate, it is a caller in the wrong place.',
    examples: [Surface.STOREFRONT_TV],
  }),
};

export const CursorParameter: QueryParameter<'cursor', z.ZodString> = {
  name: 'cursor',
  in: 'query',
  required: false,
  description:
    '**Opaque** cursor, Base64-encoded over `(created_at, id)`. Bidirectional and **independent of\npage size**: changing `limit` between two calls does not invalidate it, which is exactly what\na screen rotation produces. Valid 24 h.\n',
  schema: z.string().meta({
    examples: ['eyJjIjoiMjAyNi0wOS0yMVQyMDowMDowMFoiLCJpIjoiMDE5OTI4ZjQifQ'],
  }),
};

export const LimitParameter: QueryParameter<'limit', z.ZodDefault<z.ZodInt>> = {
  name: 'limit',
  in: 'query',
  required: false,
  description:
    'Requested page size. Display density (`tiles` / `list` on mobile) varies it; the cursor\nsurvives that.\n',
  schema: z.int().min(1).max(50).default(20),
};

export const CacheControlPublicHeader: Header = {
  description:
    "Set by the BFF. **`public` only on an anonymous read** — the body is then identical for every\ncaller, hence shareable in a common cache and in Next's render cache. As soon as a session or\na bearer token accompanies the request, the body carries the per-viewer overlays and the\nheader becomes `private`: **serving a personalised body as `public` would be a leak, not an\noptimisation.**\n",
  schema: z.string().meta({
    examples: ['public, max-age=60'],
  }),
};

export const VaryAuthHeader: Header = {
  description:
    "**`Cookie, Authorization, X-Arthome-Device-Token, X-Arthome-Surface`.** Without this `Vary`,\nan intermediate cache would serve an anonymous visitor someone else's personalised body. The\nfirst three separate public from identified; `X-Arthome-Surface` separates the chat ceilings\nand the label catalogue slices, which differ per surface.\n",
  schema: z.string(),
};

export const BadRequestResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema> = {
  description: 'Malformed request, or refused by shape validation.',
  content: {
    'application/json': {
      schema: StorefrontErrorEnvelopeSchema,
      example: {
        error: {
          code: ApiErrorCode.SCHEMA_INVALID,
          nature: FailureNature.REFUSED,
          params: {
            fields: ['tier'],
          },
          traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        },
        servedAt: '2026-09-21T20:31:04.118Z',
      },
    },
  },
};

export const GoneResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema> = {
  description: 'The targeted cursor, pairing or replay has expired.',
  content: {
    'application/json': {
      schema: StorefrontErrorEnvelopeSchema,
      example: {
        error: {
          code: ApiErrorCode.CURSOR_TOO_OLD,
          nature: FailureNature.REFUSED,
          params: {
            maxAgeHours: 24,
          },
          traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        },
        servedAt: '2026-09-21T20:31:04.118Z',
      },
    },
  },
};
