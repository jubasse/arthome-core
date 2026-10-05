import { z } from 'zod';
import { MEMBER_ROLES } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { ChannelIdParameter, ConflictResponse, ForbiddenResponse, IdempotencyKeyParameter, IfRightsVersionParameter, PageParameter, PageSizeParameter, SurfaceParameter, TraceparentParameter } from './components.js';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, QueryParameter, Route } from '../http/index.js';
import { OffsetPageInfoSchema } from '../pagination/index.js';
import { ChannelMemberSchema } from '../studio-access/index.js';
export declare const listChannelMembers: Route<{
    method: 'get';
    version: 1;
    path: '/channels/{channelId}/members';
    parameters: readonly [
        typeof ChannelIdParameter,
        typeof PageParameter,
        typeof PageSizeParameter,
        QueryParameter<'q', z.ZodString>,
        QueryParameter<'role', VocabularyIn<typeof MEMBER_ROLES>>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<typeof ChannelMemberSchema>;
            roleCounts: z.ZodObject<Record<never, never>, z.core.$catchall<z.ZodInt>>;
            page: typeof OffsetPageInfoSchema;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
    };
}>;
export declare const inviteMember: Route<{
    method: 'post';
    version: 1;
    path: '/channels/{channelId}/invitations';
    parameters: readonly [
        typeof ChannelIdParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        email: z.ZodString;
        roles: z.ZodArray<VocabularyIn<typeof MEMBER_ROLES>>;
        note: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    responses: {
        201: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof ChannelMemberSchema;
        }, z.core.$loose>>>;
        403: JsonResponse<typeof StudioErrorEnvelopeSchema>;
    };
}>;
export declare const changeMemberRoles: Route<{
    method: 'post';
    version: 1;
    path: '/channels/{channelId}/members/{personId}/change-roles';
    parameters: readonly [
        typeof ChannelIdParameter,
        PathParameter<'personId', z.ZodString>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        roles: z.ZodArray<VocabularyIn<typeof MEMBER_ROLES>>;
        expectedVersion: z.ZodInt;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof ChannelMemberSchema;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
        409: typeof ConflictResponse;
    };
}>;
export declare const removeMember: Route<{
    method: 'delete';
    version: 1;
    path: '/channels/{channelId}/members/{personId}';
    parameters: readonly [
        typeof ChannelIdParameter,
        PathParameter<'personId', z.ZodString>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                removed: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
        409: typeof ConflictResponse;
    };
}>;
export declare const transferChannelOwnership: Route<{
    method: 'post';
    version: 1;
    path: '/channels/{channelId}/ownership-transfer';
    parameters: readonly [
        typeof ChannelIdParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        toPersonId: z.ZodString;
        reauthToken: z.ZodString;
    }, z.core.$strip>>;
    responses: {
        202: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                state: z.ZodOptional<z.ZodString>;
                expiresAt: z.ZodOptional<z.ZodString>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
    };
}>;
//# sourceMappingURL=crew.d.ts.map