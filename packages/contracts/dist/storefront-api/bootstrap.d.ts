import { z } from 'zod';
import type { VocabularyIn } from '@arthome/core/schema';
import { BadRequestResponse, SurfaceParameter, TraceparentParameter, UnauthorizedResponse, UnavailableResponse, ViewerTimezoneParameter } from './components.js';
import { ChangeFeedSchema } from '../engagement/index.js';
import { StorefrontEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonResponse, QueryParameter, Route } from '../http/index.js';
import { ViewerContextSchema } from '../identity/index.js';
declare const LIST_CHANGES_SCOPE: readonly ["profile", "device"];
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
export declare const listChanges: Route<{
    method: 'get';
    version: 1;
    path: '/changes';
    parameters: readonly [
        QueryParameter<'since', z.ZodString, true>,
        QueryParameter<'scope', z.ZodDefault<VocabularyIn<typeof LIST_CHANGES_SCOPE>>>,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
            data: typeof ChangeFeedSchema;
        }, z.core.$loose>>>;
        400: typeof BadRequestResponse;
        401: typeof UnauthorizedResponse;
    };
}>;
export {};
//# sourceMappingURL=bootstrap.d.ts.map