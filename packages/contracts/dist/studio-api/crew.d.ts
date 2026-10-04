import { z } from 'zod';
import { CREW_ROLES, MEMBER_ROLES } from '@arthome/core';
import type { VocabularyIn, VocabularyOut } from '@arthome/core/schema';
import { ChannelIdParameter, ConflictResponse, DateIdParameter, ForbiddenResponse, IdempotencyKeyParameter, IfRightsVersionParameter, NotFoundResponse, PageParameter, PageSizeParameter, SurfaceParameter, TraceparentParameter, operator } from './components.js';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, PathParameter, QueryParameter, Route, IdentifiedAccess } from '../http/index.js';
import { OffsetPageInfoSchema } from '../pagination/index.js';
import { ChannelMemberSchema, DateAccessGrantSchema, EffectiveRightsSchema } from '../studio-access/index.js';
declare const RESPOND_TO_INVITATION_DECISION: readonly ["accept", "decline"];
export declare const getDateCrewPane: Route<{
    method: 'get';
    version: 1;
    path: '/dates/{dateId}/panes/crew';
    parameters: readonly [
        typeof DateIdParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof operator, false>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodObject<{
                slots: z.ZodArray<z.ZodObject<{
                    crewRole: VocabularyOut;
                    covered: z.ZodBoolean;
                    personId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    displayName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    membershipKind: z.ZodOptional<VocabularyOut>;
                }, z.core.$loose>>;
                grants: z.ZodArray<typeof DateAccessGrantSchema>;
                missingRoles: z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$loose>;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
        404: typeof NotFoundResponse;
    };
}>;
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
export declare const grantDateAccess: Route<{
    method: 'post';
    version: 1;
    path: '/dates/{dateId}/crew';
    parameters: readonly [
        typeof DateIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof IfRightsVersionParameter
    ];
    access: IdentifiedAccess<typeof operator, false>;
    requestBody: JsonRequestBody<z.ZodObject<{
        personId: z.ZodString;
        crewRole: VocabularyIn<typeof CREW_ROLES>;
        expiresAt: z.ZodString;
    }, z.core.$strip>>;
    responses: {
        201: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof DateAccessGrantSchema;
        }, z.core.$loose>>>;
        403: JsonResponse<typeof StudioErrorEnvelopeSchema>;
        404: typeof ConflictResponse;
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
export {};
//# sourceMappingURL=crew.d.ts.map