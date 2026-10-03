import { z } from 'zod';
import { Surface } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { StorefrontErrorEnvelopeSchema } from '../envelope/index.js';
import type { AccessorOf, Header, HeaderParameter, JsonResponse, QueryParameter } from '../http/index.js';
declare const SURFACE: readonly [
    typeof Surface.STOREFRONT_WEB,
    typeof Surface.STOREFRONT_MOBILE,
    typeof Surface.STOREFRONT_TV
];
declare const STOREFRONT_TAGS: readonly ["bootstrap", "discovery", "date", "commerce", "playback", "chat", "pairing", "account"];
/** The tags this document groups its operations by. */
export declare const StorefrontTag: AccessorOf<typeof STOREFRONT_TAGS>;
export declare const TraceparentParameter: HeaderParameter<'traceparent', z.ZodString>;
export declare const SurfaceParameter: HeaderParameter<'X-Arthome-Surface', VocabularyIn<typeof SURFACE>, true>;
export declare const CursorParameter: QueryParameter<'cursor', z.ZodString>;
export declare const LimitParameter: QueryParameter<'limit', z.ZodDefault<z.ZodInt>>;
export declare const CacheControlPublicHeader: Header;
export declare const VaryAuthHeader: Header;
export declare const BadRequestResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
export declare const GoneResponse: JsonResponse<typeof StorefrontErrorEnvelopeSchema>;
export {};
//# sourceMappingURL=components.d.ts.map