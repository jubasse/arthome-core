import { z } from 'zod';
import { SurfaceParameter, TraceparentParameter, UnauthorizedResponse, UnavailableResponse, ViewerTimezoneParameter } from './components.js';
import { StorefrontEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonResponse, Route } from '../http/index.js';
import { ViewerContextSchema } from '../identity/index.js';
export declare const getViewerContext: Route<{
    method: 'get';
    version: 1;
    path: '/viewer-context';
    parameters: readonly [
        typeof ViewerTimezoneParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof ViewerContextSchema;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
        503: typeof UnavailableResponse;
    };
}>;
//# sourceMappingURL=bootstrap.d.ts.map