import { z } from 'zod';
import { SurfaceParameter, TraceparentParameter, UnauthorizedResponse } from './components.js';
import { StorefrontEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonResponse, Route } from '../http/index.js';
import { AccountDeepLinkSchema } from '../identity/index.js';
export declare const getAccountDeepLink: Route<{
    method: 'get';
    version: 1;
    path: '/account-deep-link';
    parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof AccountDeepLinkSchema;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
    };
}>;
//# sourceMappingURL=pairing.d.ts.map