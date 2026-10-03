import { z } from 'zod';

import {
  ChannelErrorCode,
  CREW_ROLES,
  CrewRole,
  DatePane,
  FailureNature,
  MEMBER_ROLES,
  MemberRole,
  NavigationEntry,
  OrderState,
  Service,
  Surface,
} from '@arthome/core';
import type { VocabularyIn, VocabularyOut } from '@arthome/core/schema';
import {
  InstantOut,
  uuidOut,
  VOCABULARY_SOURCE_LOCAL,
  vocabularyIn,
  vocabularyOut,
  vocabularyOutLocal,
} from '@arthome/core/schema';

import {
  ChannelIdParameter,
  ConflictResponse,
  DateIdParameter,
  ForbiddenResponse,
  IdempotencyKeyParameter,
  IfRightsVersionParameter,
  NotFoundResponse,
  PageParameter,
  PageSizeParameter,
  RightsVersionHeader,
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
} from './components.js';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import type {
  JsonRequestBody,
  JsonResponse,
  PathParameter,
  QueryParameter,
  Route,
} from '../http/index.js';
import { defineRoute } from '../http/index.js';
import { OffsetPageInfoSchema } from '../pagination/index.js';
import {
  ChannelMemberSchema,
  DateAccessGrantSchema,
  EffectiveRightsSchema,
} from '../studio-access/index.js';

const GET_DATE_CREW_PANE_MEMBERSHIP_KIND = ['member', 'grant'] as const;
const RESPOND_TO_INVITATION_DECISION = ['accept', 'decline'] as const;

export const getDateCrewPane: Route<{
  method: 'get';
  path: '/v1/dates/{dateId}/panes/crew';
  parameters: readonly [
    typeof DateIdParameter,
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
            data: z.ZodObject<
              {
                slots: z.ZodArray<
                  z.ZodObject<
                    {
                      crewRole: VocabularyOut;
                      covered: z.ZodBoolean;
                      personId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                      displayName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                      membershipKind: z.ZodOptional<VocabularyOut>;
                    },
                    z.core.$loose
                  >
                >;
                grants: z.ZodArray<typeof DateAccessGrantSchema>;
                missingRoles: z.ZodOptional<z.ZodArray<z.ZodString>>;
              },
              z.core.$loose
            >;
          },
          z.core.$loose
        >
      >
    >;
    403: typeof ForbiddenResponse;
    404: typeof NotFoundResponse;
  };
}> = defineRoute({
  method: 'get',
  path: '/v1/dates/{dateId}/panes/crew',
  operationId: 'getDateCrewPane',
  tags: [StudioTag.CREW],
  summary: "A date's crew pane — assignments and one-off accesses, with their identifiers.",
  description:
    'Three gaps compounded on the same page, the one belonging to the `coordination` persona,\nwhose entire navigation is `crew · log · help`:\n\n- `/v1/dates/{dateId}/crew` was **POST only**: the dates × posts matrix and the "tonight"\n  list had no read path at all. `listDuties` gives **my** duties,\n  `EffectiveRights.dateGrants` gives **my** accesses — neither gives the coverage;\n- **`revokeDateAccess` revokes by `grantId`, an identifier no read handed out**;\n- `moderator_assigned` is one of the checklist items and `datesToCover` a served counter:\n  **both were computed against a coverage the studio could not read.**\n\nOpen to `artist`, `production` and `coordination`.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  parameters: [DateIdParameter, SurfaceParameter, IfRightsVersionParameter, TraceparentParameter],
  responses: {
    200: {
      description: 'Posts covered, posts missing, one-off accesses with their `grantId`.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z.looseObject({
                slots: z
                  .array(
                    z.looseObject({
                      crewRole: vocabularyOut(CREW_ROLES),
                      covered: z.boolean(),
                      personId: uuidOut().nullable().optional(),
                      displayName: z.string().nullable().optional(),
                      membershipKind: vocabularyOutLocal(
                        GET_DATE_CREW_PANE_MEMBERSHIP_KIND,
                        'A vocabulary local to this contract. The domain neither produces nor consumes these values — they describe what this endpoint offers, and a new member is an endpoint change.',
                      )
                        .meta({
                          description:
                            '**The two scales, distinguished on read**: `member` is a permanent\nmembership assigned to a post, `grant` is a one-off stand-in\nthat expires.\n',
                        })
                        .optional(),
                    }),
                  )
                  .meta({
                    description:
                      'One post per slot, covered or not. **`missing` is served, never inferred.**',
                  }),
                grants: z.array(DateAccessGrantSchema),
                missingRoles: z.array(z.string()).optional(),
              }),
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:20:20.000Z',
            rightsVersion: 412,
            data: {
              slots: [
                {
                  crewRole: CrewRole.DIRECTOR,
                  covered: true,
                  personId: '019928b2-0000-7000-8000-000000000001',
                  displayName: 'Yann P.',
                  membershipKind: 'grant',
                },
                {
                  crewRole: CrewRole.MODERATION,
                  covered: false,
                  personId: null,
                  displayName: null,
                  membershipKind: 'member',
                },
              ],
              grants: [
                {
                  grantId: '019928b3-0000-7000-8000-000000000001',
                  dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
                  personId: '019928b2-0000-7000-8000-000000000001',
                  displayName: 'Yann P.',
                  crewRole: CrewRole.DIRECTOR,
                  expiresAt: '2026-09-21T21:45:00Z',
                },
              ],
              missingRoles: [CrewRole.MODERATION],
            },
          },
        },
      },
    },
    403: ForbiddenResponse,
    404: NotFoundResponse,
  },
});

export const listChannelMembers: Route<{
  method: 'get';
  path: '/v1/channels/{channelId}/members';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
    typeof PageParameter,
    typeof PageSizeParameter,
    QueryParameter<'q', z.ZodString>,
    QueryParameter<'role', VocabularyIn<typeof MEMBER_ROLES>>,
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
}> = defineRoute({
  method: 'get',
  path: '/v1/channels/{channelId}/members',
  operationId: 'listChannelMembers',
  tags: [StudioTag.CREW],
  summary: 'The team — page + total, with a served counter per role.',
  description:
    'The **per-role counter** is a **served aggregation**, not a count over the current page: the\nrole filter displays "production (4)", and that number bears on the whole team.\n\nThe search covers the name, the email, the note and the role, **server-side**: the directory\nof contributors runs into the thousands, freelancers included.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  parameters: [
    ChannelIdParameter,
    SurfaceParameter,
    IfRightsVersionParameter,
    TraceparentParameter,
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
    403: ForbiddenResponse,
  },
});

export const inviteMember: Route<{
  method: 'post';
  path: '/v1/channels/{channelId}/invitations';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
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
}> = defineRoute({
  method: 'post',
  path: '/v1/channels/{channelId}/invitations',
  operationId: 'inviteMember',
  tags: [StudioTag.CREW],
  summary: 'Invites a person, into a role the inviter has the right to assign.',
  description:
    '**`role ∈ assignableRoles` of the inviter**, a projection of `grants` onto the roles they\nhold. The refusal carries **the list of roles assignable from this level and whom to ask** — a\nbare refusal would force the person to guess.\n\n`director` can invite `video` and `sound`; `video`, `sound`, `moderation` and `treasury`\ninvite nobody. **The fallback to six personas erases that right**, and that is why it appears\nin no response.\n\n**A two-stage command**: the invitation stays pending until the invitee answers, and it is\n**visible as such** in the member list.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  parameters: [
    ChannelIdParameter,
    IdempotencyKeyParameter,
    SurfaceParameter,
    IfRightsVersionParameter,
    TraceparentParameter,
  ],
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

export const respondToInvitation: Route<{
  method: 'post';
  path: '/v1/invitations/{invitationId}/response';
  parameters: readonly [
    PathParameter<'invitationId', z.ZodString>,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<{ decision: VocabularyIn<typeof RESPOND_TO_INVITATION_DECISION> }, z.core.$strip>
  >;
  responses: {
    200: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof EffectiveRightsSchema }, z.core.$loose>
      >
    >;
    404: typeof NotFoundResponse;
    409: typeof ConflictResponse;
  };
}> = defineRoute({
  method: 'post',
  path: '/v1/invitations/{invitationId}/response',
  operationId: 'respondToInvitation',
  tags: [StudioTag.CREW],
  summary: 'Accepts or declines an invitation.',
  description:
    "Acceptance publishes the membership **then** an increment of `rightsVersion` — that is what\nbrings the channel into the switcher **without a reload**, and what makes a lost channel's\nreal-time rooms be left without waiting for a reconnection.\n",
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  parameters: [
    {
      name: 'invitationId',
      in: 'path',
      required: true,
      schema: uuidOut(),
    },
    IdempotencyKeyParameter,
    SurfaceParameter,
    IfRightsVersionParameter,
    TraceparentParameter,
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          decision: vocabularyIn(RESPOND_TO_INVITATION_DECISION).meta({
            'x-arthome-vocabulary-source': VOCABULARY_SOURCE_LOCAL,
            'x-arthome-vocabulary-reason':
              "The two answers this one command accepts. It is the command's shape, not a vocabulary: a third answer would be a third command.",
          }),
        }),
        example: {
          decision: 'accept',
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Answer recorded, with the new rights version.',
      headers: {
        'X-Arthome-Rights-Version': RightsVersionHeader,
      },
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: EffectiveRightsSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:17:00.000Z',
            rightsVersion: 413,
            data: {
              channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
              channelName: 'Compagnie Verticale',
              roles: [CrewRole.VIDEO],
              isOwner: false,
              navigation: [
                NavigationEntry.EVENTS,
                NavigationEntry.STREAM,
                NavigationEntry.REPLAYS,
                NavigationEntry.HELP,
              ],
              datePanes: [DatePane.TECH],
              canRevenue: false,
              canOps: false,
              canTech: true,
              canDecideOutcome: false,
              assignableRoles: [],
            },
          },
        },
      },
    },
    404: NotFoundResponse,
    409: ConflictResponse,
  },
});

export const changeMemberRoles: Route<{
  method: 'patch';
  path: '/v1/channels/{channelId}/members/{personId}';
  parameters: readonly [
    typeof ChannelIdParameter,
    PathParameter<'personId', z.ZodString>,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
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
}> = defineRoute({
  method: 'patch',
  path: '/v1/channels/{channelId}/members/{personId}',
  operationId: 'changeMemberRoles',
  tags: [StudioTag.CREW],
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
      schema: uuidOut(),
    },
    IdempotencyKeyParameter,
    SurfaceParameter,
    IfRightsVersionParameter,
    TraceparentParameter,
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
  path: '/v1/channels/{channelId}/members/{personId}';
  parameters: readonly [
    typeof ChannelIdParameter,
    PathParameter<'personId', z.ZodString>,
    typeof IdempotencyKeyParameter,
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
}> = defineRoute({
  method: 'delete',
  path: '/v1/channels/{channelId}/members/{personId}',
  operationId: 'removeMember',
  tags: [StudioTag.CREW],
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
      schema: uuidOut(),
    },
    IdempotencyKeyParameter,
    SurfaceParameter,
    IfRightsVersionParameter,
    TraceparentParameter,
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

export const grantDateAccess: Route<{
  method: 'post';
  path: '/v1/dates/{dateId}/crew';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      { personId: z.ZodString; crewRole: VocabularyIn<typeof CREW_ROLES>; expiresAt: z.ZodString },
      z.core.$strip
    >
  >;
  responses: {
    201: JsonResponse<
      z.ZodIntersection<
        typeof StudioEnvelopeMetaSchema,
        z.ZodObject<{ data: typeof DateAccessGrantSchema }, z.core.$loose>
      >
    >;
    403: JsonResponse<typeof StudioErrorEnvelopeSchema>;
  };
}> = defineRoute({
  method: 'post',
  path: '/v1/dates/{dateId}/crew',
  operationId: 'grantDateAccess',
  tags: [StudioTag.CREW],
  summary: 'Assigns a stand-in to a date, with an instant of expiry.',
  description:
    '**Scoped to one date, expiry served as an instant.** "Expires at curtain call + 1 h" is a\nscreen sentence; the contract carries the instant. Revocable **without touching channel\nmembership** — conflating the two would turn revoking a stand-in into expulsion.\n\n**Assignment to the `director` slot grants access to the stream key.** It is therefore\nreserved to `artist ∨ production`, and the contract makes **that reason** explicit rather than\nleaving it to be guessed.\n\n**Sixty seconds is not good enough for an access that expires**: the internal token carries the\nroles, but the service checks the time-boxed access **on the loaded resource**.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  parameters: [
    DateIdParameter,
    IdempotencyKeyParameter,
    SurfaceParameter,
    IfRightsVersionParameter,
    TraceparentParameter,
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: z.object({
          personId: uuidOut(),
          crewRole: vocabularyIn(CREW_ROLES).meta({
            'x-arthome-vocabulary-source': 'CREW_ROLES',
          }),
          expiresAt: z
            .string()
            .regex(new RegExp('^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$'))
            .meta({
              format: 'date-time',
            }),
        }),
        example: {
          personId: '019928b2-0000-7000-8000-000000000001',
          crewRole: CrewRole.DIRECTOR,
          expiresAt: '2026-09-21T21:45:00Z',
        },
      },
    },
  },
  responses: {
    201: {
      description: 'One-off access granted.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: DateAccessGrantSchema,
            }),
          ),
          example: {
            servedAt: '2026-09-21T18:20:00.000Z',
            rightsVersion: 412,
            data: {
              grantId: '019928b3-0000-7000-8000-000000000001',
              dateId: '019928a0-7d31-7a10-b8c4-2f9e11a4c001',
              personId: '019928b2-0000-7000-8000-000000000001',
              displayName: 'Yann P.',
              crewRole: CrewRole.DIRECTOR,
              expiresAt: '2026-09-21T21:45:00Z',
              grantedBy: {
                personId: '019928b0-0000-7000-8000-000000000001',
                displayName: 'Claire D.',
                surface: Surface.STUDIO_WEB,
              },
            },
          },
        },
      },
    },
    403: {
      description:
        '`channel.crew_role_reserved` — the `director` assignment grants access to the stream key.',
      content: {
        'application/json': {
          schema: StudioErrorEnvelopeSchema,
          example: {
            error: {
              code: ChannelErrorCode.CREW_ROLE_RESERVED,
              nature: FailureNature.REFUSED,
              params: {
                crewRole: CrewRole.DIRECTOR,
                reservedTo: [MemberRole.ARTIST, MemberRole.PRODUCTION],
                reasonCode: 'grants_stream_key_access',
              },
              traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
            },
            servedAt: '2026-09-21T18:20:00.000Z',
          },
        },
      },
    },
  },
});

export const revokeDateAccess: Route<{
  method: 'delete';
  path: '/v1/date-access-grants/{grantId}';
  parameters: readonly [
    PathParameter<'grantId', z.ZodString>,
    typeof IdempotencyKeyParameter,
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
            data: z.ZodOptional<
              z.ZodObject<{ revoked: z.ZodOptional<z.ZodBoolean> }, z.core.$loose>
            >;
          },
          z.core.$loose
        >
      >
    >;
    404: typeof NotFoundResponse;
  };
}> = defineRoute({
  method: 'delete',
  path: '/v1/date-access-grants/{grantId}',
  operationId: 'revokeDateAccess',
  tags: [StudioTag.CREW],
  summary: 'Revokes a one-off access, without touching membership.',
  description:
    "The server makes the client **leave this date's real-time rooms** without waiting for a\nreconnection: that is what stops someone whose access expired at curtain-down from carrying on\nwatching a queue.\n",
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  parameters: [
    {
      name: 'grantId',
      in: 'path',
      required: true,
      schema: uuidOut(),
    },
    IdempotencyKeyParameter,
    SurfaceParameter,
    IfRightsVersionParameter,
    TraceparentParameter,
  ],
  responses: {
    200: {
      description: 'Access revoked.',
      content: {
        'application/json': {
          schema: z.intersection(
            StudioEnvelopeMetaSchema,
            z.looseObject({
              data: z
                .looseObject({
                  revoked: z.boolean().optional(),
                })
                .optional(),
            }),
          ),
          example: {
            servedAt: '2026-09-21T21:46:00.000Z',
            rightsVersion: 413,
            data: {
              revoked: true,
            },
          },
        },
      },
    },
    404: NotFoundResponse,
  },
});

export const transferChannelOwnership: Route<{
  method: 'post';
  path: '/v1/channels/{channelId}/ownership-transfer';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof IfRightsVersionParameter,
    typeof TraceparentParameter,
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
}> = defineRoute({
  method: 'post',
  path: '/v1/channels/{channelId}/ownership-transfer',
  operationId: 'transferChannelOwnership',
  tags: [StudioTag.CREW],
  summary: 'Transfers ownership of the channel — two-stage.',
  description:
    '**The recipient must already be a member and have two-factor authentication.** These are\ndomain rules, not interface guards, and the refusal is **served with its reason**. The bank\naccount (`payouts`) and the public page (`catalog`) **follow** the transfer, by event.\n',
  'x-arthome-maturity': 'stable',
  'x-arthome-upstream': [Service.IDENTITY],
  parameters: [
    ChannelIdParameter,
    IdempotencyKeyParameter,
    SurfaceParameter,
    IfRightsVersionParameter,
    TraceparentParameter,
  ],
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
