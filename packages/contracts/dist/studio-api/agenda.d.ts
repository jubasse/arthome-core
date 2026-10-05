import { z } from 'zod';
import { IfRightsVersionParameter, SurfaceParameter, TraceparentParameter, UnauthorizedResponse } from './components.js';
import { StudioEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonResponse, QueryParameter, Route } from '../http/index.js';
import { DutySchema } from '../studio-access/index.js';
export declare const listDuties: Route<{
    method: 'get';
    version: 1;
    path: '/me/duties';
    parameters: readonly [
        QueryParameter<'from', z.ZodString, true>,
        QueryParameter<'to', z.ZodString, true>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<typeof DutySchema>;
        }, z.core.$loose>>>;
        401: typeof UnauthorizedResponse;
    };
}>;
//# sourceMappingURL=agenda.d.ts.map