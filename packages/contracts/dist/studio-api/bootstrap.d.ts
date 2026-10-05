import { z } from 'zod';
import type { VocabularyOut } from '@arthome/core/schema';
import { BadRequestResponse, IfRightsVersionParameter, SurfaceParameter, TraceparentParameter, UnauthorizedResponse } from './components.js';
import { StudioEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonResponse, QueryParameter, Route } from '../http/index.js';
export declare const listStudioChanges: Route<{
    method: 'get';
    version: 1;
    path: '/changes';
    parameters: readonly [
        QueryParameter<'since', z.ZodString, true>,
        QueryParameter<'channelId', z.ZodString>,
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof IfRightsVersionParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            invalidated: z.ZodArray<VocabularyOut>;
            complete: z.ZodBoolean;
        }, z.core.$loose>>>;
        400: typeof BadRequestResponse;
        401: typeof UnauthorizedResponse;
    };
}>;
//# sourceMappingURL=bootstrap.d.ts.map