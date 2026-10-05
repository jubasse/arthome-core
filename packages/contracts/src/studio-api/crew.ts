import { z } from 'zod';

import {
  ChannelErrorCode,
  CrewRole,
  FailureNature,
  MEMBER_ROLES,
  MemberRole,
  OrderState,
  Service,
} from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { InstantOut, uuidOut, vocabularyIn, uuidIn } from '@arthome/core/schema';

import {
  ChannelIdParameter,
  ConflictResponse,
  ForbiddenResponse,
  IdempotencyKeyParameter,
  IfRightsVersionParameter,
  PageParameter,
  PageSizeParameter,
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  studioV1,
} from './components.js';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import type {
  JsonRequestBody,
  JsonResponse,
  PathParameter,
  QueryParameter,
  Route,
} from '../http/index.js';
import { OffsetPageInfoSchema } from '../pagination/index.js';
import { ChannelMemberSchema } from '../studio-access/index.js';

const crewRoutes = studioV1
  .tags(StudioTag.CREW)
  .headers(SurfaceParameter, IfRightsVersionParameter, TraceparentParameter);
const crewReads = crewRoutes.errors({ 403: ForbiddenResponse });
const crewWrites = crewRoutes.headers(IdempotencyKeyParameter);

export const listChannelMembers: Route<{
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
    typeof TraceparentParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          {
            items: z.ZodArray<typeof ChannelMemberSchema>;
            roleCounts: z.ZodObject<Record<never, never>, z.core.$catchall<z.ZodInt>>;
            page: typeof OffsetPageInfoSchema;
          },
          z.core.$loose
        >
      >
    >;
    403: typeof ForbiddenResponse;
  };
}> = crewReads.defineRoute({
  method: 'get',
  path: '/channels/{channelId}/members',
  operationId: 'listChannelMembers',
  summary: 'The team — page + total, with a served counter per role.',
  description:
    'The **per-role counter** is a **served aggregation**, not a count over the current page: the\nrole filter displays "production (4)", and that number bears on the whole team.\n\nThe search covers the name, the email, the note and the role, **server-side**: the directory\nof contributors runs into the thousands, freelancers included.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  parameters: [
    ChannelIdParameter,
    PageParameter,
    PageSizeParameter,
    {
      name: 'q',
      in: 'query',
      schema: z.string(),
    },
    {
      name: 'role',
      in: 'query',
      schema: vocabularyIn(MEMBER_ROLES).meta({
        'x-arthome-vocabulary-source': 'MEMBER_ROLES',
      }),
    },
  ],
  responses: {
    200: {
      description: 'A page of members, plus the head count per role.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              items: z.array(ChannelMemberSchema),
              roleCounts: z
                .object({})
                .catchall(z.int().meta({ minimum: undefined, maximum: undefined })),
              page: OffsetPageInfoSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:15:00.000Z',
            rightsVersion: 412,
            items: [
              {
                personId: '019928b0-0000-7000-8000-000000000001',
                displayName: 'Claire D.',
                email: 'claire@example.org',
                roles: [MemberRole.PRODUCTION, MemberRole.COORDINATION],
                isOwner: false,
                joinedAt: '2025-11-02T09:00:00Z',
                version: 2,
              },
            ],
            roleCounts: {
              production: 4,
              coordination: 2,
              director: 3,
            },
            page: {
              page: 1,
              pageSize: 20,
              totalItems: 11,
              totalPages: 1,
            },
          },
        },
      },
    },
  },
});

export const inviteMember: Route<{
  method: 'post';
  version: 1;
  path: '/channels/{channelId}/invitations';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        email: z.ZodString;
        roles: z.ZodArray<VocabularyIn<typeof MEMBER_ROLES>>;
        note: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      },
      z.core.$strip
    >
  >;
  responses: {
    201: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof ChannelMemberSchema }, z.core.$loose>
      >
    >;
    403: JsonResponse<typeof StudioErrorEnvelopeSchema>;
  };
}> = crewWrites.defineRoute({
  method: 'post',
  path: '/channels/{channelId}/invitations',
  operationId: 'inviteMember',
  summary: 'Invites a person, into a role the inviter has the right to assign.',
  description:
    '**`role ∈ assignableRoles` of the inviter**, a projection of `grants` onto the roles they\nhold. The refusal carries **the list of roles assignable from this level and whom to ask** — a\nbare refusal would force the person to guess.\n\n`director` can invite `video` and `sound`; `video`, `sound`, `moderation` and `treasury`\ninvite nobody. **The fallback to six personas erases that right**, and that is why it appears\nin no response.\n\n**A two-stage command**: the invitation stays pending until the invitee answers, and it is\n**visible as such** in the member list.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  parameters: [ChannelIdParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          email: z.string().meta({
            format: 'email',
          }),
          roles: z
            .array(
              vocabularyIn(MEMBER_ROLES).meta({
                'x-arthome-vocabulary-source': 'MEMBER_ROLES',
              }),
            )
            .min(1),
          note: z.string().max(200).nullable().optional(),
        }),
        example: {
          email: 'yann@example.org',
          roles: [CrewRole.VIDEO],
          note: 'Renfort captation novembre',
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Invitation sent, pending.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: ChannelMemberSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:16:00.000Z',
            rightsVersion: 412,
            data: {
              personId: '019928b2-0000-7000-8000-000000000001',
              displayName: 'yann@example.org',
              roles: [CrewRole.VIDEO],
              isOwner: false,
              joinedAt: '2026-09-21T18:16:00Z',
              invitationState: OrderState.PENDING,
              version: 1,
            },
          },
        },
      },
    },
    403: {
      description: '`channel.role_not_assignable`, with the assignable roles and whom to ask.',
      content: {
        'application/json': {
          schema: StudioErrorEnvelopeSchema,
          example: {
            error: {
              code: ChannelErrorCode.ROLE_NOT_ASSIGNABLE,
              nature: FailureNature.REFUSED,
              params: {
                assignableRoles: [CrewRole.VIDEO, CrewRole.SOUND],
                contactRoles: [MemberRole.ARTIST, MemberRole.PRODUCTION],
              },
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T18:16:00.000Z',
          },
        },
      },
    },
  },
});

export const changeMemberRoles: Route<{
  method: 'post';
  version: 1;
  path: '/channels/{channelId}/members/{personId}/change-roles';
  parameters: readonly [
    typeof ChannelIdParameter,
    PathParameter<'personId', z.ZodString>,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      { roles: z.ZodArray<VocabularyIn<typeof MEMBER_ROLES>>; expectedVersion: z.ZodInt },
      z.core.$strip
    >
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof ChannelMemberSchema }, z.core.$loose>
      >
    >;
    403: typeof ForbiddenResponse;
    409: typeof ConflictResponse;
  };
}> = crewWrites.defineRoute({
  method: 'post',
  path: '/channels/{channelId}/members/{personId}/change-roles',
  operationId: 'changeMemberRoles',
  summary: "Changes a member's set of roles.",
  description:
    '**A set, never a single role.** The owner can be **neither removed nor have their roles\nchanged**: `transferOwnership` moves the flag, and it requires the recipient to be **already a\nmember** and to have two-factor authentication.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  parameters: [
    ChannelIdParameter,
    {
      name: 'personId',
      in: 'path',
      required: true,
      schema: uuidIn(),
    },
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          roles: z
            .array(
              vocabularyIn(MEMBER_ROLES).meta({
                'x-arthome-vocabulary-source': 'MEMBER_ROLES',
              }),
            )
            .min(1),
          expectedVersion: z.int().meta({ minimum: undefined, maximum: undefined }),
        }),
        example: {
          roles: [CrewRole.VIDEO, CrewRole.SOUND],
          expectedVersion: 2,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Member up to date.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: ChannelMemberSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:18:00.000Z',
            rightsVersion: 412,
            data: {
              personId: '019928b2-0000-7000-8000-000000000001',
              displayName: 'Yann P.',
              roles: [CrewRole.VIDEO, CrewRole.SOUND],
              isOwner: false,
              joinedAt: '2026-09-21T18:16:00Z',
              version: 3,
            },
          },
        },
      },
    },
    403: ForbiddenResponse,
    409: ConflictResponse,
  },
});

export const removeMember: Route<{
  method: 'delete';
  version: 1;
  path: '/channels/{channelId}/members/{personId}';
  parameters: readonly [
    typeof ChannelIdParameter,
    PathParameter<'personId', z.ZodString>,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<{ removed: z.ZodOptional<z.ZodBoolean> }, z.core.$loose>
            >;
          },
          z.core.$loose
        >
      >
    >;
    403: typeof ForbiddenResponse;
    409: typeof ConflictResponse;
  };
}> = crewWrites.defineRoute({
  method: 'delete',
  path: '/channels/{channelId}/members/{personId}',
  operationId: 'removeMember',
  summary: 'Removes a member from the channel.',
  description: '**The owner is never removable**: the refusal carries `OWNER_NOT_REMOVABLE`.',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  parameters: [
    ChannelIdParameter,
    {
      name: 'personId',
      in: 'path',
      required: true,
      schema: uuidIn(),
    },
  ],
  responses: {
    200: {
      description: 'Member removed.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  removed: z.boolean().optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:19:00.000Z',
            rightsVersion: 412,
            data: {
              removed: true,
            },
          },
        },
      },
    },
    403: ForbiddenResponse,
    409: ConflictResponse,
  },
});

export const transferChannelOwnership: Route<{
  method: 'post';
  version: 1;
  path: '/channels/{channelId}/ownership-transfer';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof IdempotencyKeyParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<{ toPersonId: z.ZodString; reauthToken: z.ZodString }, z.core.$strip>
  >;
  responses: {
    202: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<
          {
            data: z.ZodOptional<
              z.ZodObject<
                { state: z.ZodOptional<z.ZodString>; expiresAt: z.ZodOptional<z.ZodString> },
                z.core.$loose
              >
            >;
          },
          z.core.$loose
        >
      >
    >;
    409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
  };
}> = crewWrites.defineRoute({
  method: 'post',
  path: '/channels/{channelId}/ownership-transfer',
  operationId: 'transferChannelOwnership',
  summary: 'Transfers ownership of the channel — two-stage.',
  description:
    '**The recipient must already be a member and have two-factor authentication.** These are\ndomain rules, not interface guards, and the refusal is **served with its reason**. The bank\naccount (`payouts`) and the public page (`catalog`) **follow** the transfer, by event.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  parameters: [ChannelIdParameter],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          toPersonId: uuidOut(),
          reauthToken: z.string(),
        }),
        example: {
          toPersonId: '019928b2-0000-7000-8000-000000000001',
          reauthToken: 'ott_9f2ac1',
        },
      },
    },
  },
  responses: {
    202: {
      description: "Transfert en attente d'acceptation.",
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  state: z.string().optional(),
                  expiresAt: InstantOut.optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:21:00.000Z',
            rightsVersion: 412,
            data: {
              state: 'pending_acceptance',
              expiresAt: '2026-09-28T18:21:00Z',
            },
          },
        },
      },
    },
    409: {
      description:
        '`channel.transfer_target_ineligible` — not a member, or without two-factor authentication.',
      content: {
        'application/json': {
          schema: StudioErrorEnvelopeSchema,
          example: {
            error: {
              code: ChannelErrorCode.TRANSFER_TARGET_INELIGIBLE,
              nature: FailureNature.REFUSED,
              params: {
                reasonCode: 'two_factor_missing',
              },
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T18:21:00.000Z',
          },
        },
      },
    },
  },
});
