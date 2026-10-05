import { z } from 'zod';
import type { VocabularyIn } from '@arthome/core/schema';
import { ConflictResponse, IdempotencyKeyParameter, IfRightsVersionParameter, NotFoundResponse, SurfaceParameter, TraceparentParameter } from './components.js';
import { StudioEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, Route } from '../http/index.js';
import { EffectiveRightsSchema } from '../studio-access/index.js';
declare const RESPOND_TO_INVITATION_DECISION: readonly ["accept", "decline"];
export declare const respondToInvitation: Route<{
    method: 'post';
    version: 1;
    path: '/invitations/{invitationId}/response';
    parameters: readonly [
        PathParameter<'invitationId', z.ZodString>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        decision: VocabularyIn<typeof RESPOND_TO_INVITATION_DECISION>;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof EffectiveRightsSchema;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
        409: typeof ConflictResponse;
    };
}>;
export declare const revokeDateAccess: Route<{
    method: 'delete';
    version: 1;
    path: '/date-access-grants/{grantId}';
    parameters: readonly [
        PathParameter<'grantId', z.ZodString>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                revoked: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
    };
}>;
export {};
//# sourceMappingURL=crew.d.ts.map