import { z } from 'zod';
import { DateIdParameter, NotFoundResponse, SurfaceParameter, TraceparentParameter } from './components.js';
import { DateDetailSchema } from '../catalog/index.js';
import { StorefrontEnvelopeMetaSchema } from '../envelope/index.js';
import type { HeaderParameter, JsonResponse, Response, Route } from '../http/index.js';
export declare const getDateDetail: Route<{
    method: 'get';
    version: 1;
    path: '/dates/{dateId}';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        HeaderParameter<'If-None-Match', z.ZodString>
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof DateDetailSchema;
        }, z.core.$loose>>>;
        304: Response;
        404: typeof NotFoundResponse;
    };
}>;
//# sourceMappingURL=date.d.ts.map