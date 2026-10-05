/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */

import type { z } from 'zod';

import type {
  ApiErrorCode,
  CHAT_MODES,
  ChannelErrorCode,
  DomainErrorCode,
  FILTER_SEVERITIES,
} from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';

import type {
  Deleted,
  ExpectedVersionQuery,
  IdentifiedAccess,
  ItemResponse,
  JsonRequestBody,
  PageResponse,
  QueryParameter,
  Route,
} from '../../http/index.js';
import type { ChannelMemberSchema } from '../../studio-access/index.js';
import type { JournalEntrySchema } from '../../studio-desk/index.js';
import type {
  ChannelIdParameter,
  IdempotencyKeyParameter,
  IfRightsVersionParameter,
  PageParameter,
  PageSizeParameter,
  SortByParameter,
  SortDirParameter,
  SurfaceParameter,
  TraceparentParameter,
  operator,
  studioConventions,
} from '../components.js';
import type {
  ChangeMemberRolesBodySchema,
  ChannelDefaultsSchema,
  ChannelIdentitySchema,
  ChannelMemberPageSchema,
  ChannelReplaySchema,
  ChannelReplayStateParameter,
  ChannelSettingsSchema,
  InviteMemberBodySchema,
  JournalDateParameter,
  JournalNatureParameter,
  MemberRoleParameter,
  MemberSearch,
  MerchItemIdParameter,
  MerchItemListSchema,
  OwnershipTransferSchema,
  PersonIdParameter,
  TransferChannelOwnershipBodySchema,
  UpsertMerchItemBodySchema,
} from './schemas.js';

export type ListChannelReplaysRoute = Route<{
  method: 'get';
  version: 1;
  path: '/channels/{channelId}/replays';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof PageParameter,
    typeof PageSizeParameter,
    typeof SortByParameter,
    typeof SortDirParameter,
    typeof ChannelReplayStateParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: PageResponse<typeof studioConventions, typeof ChannelReplaySchema>;
  };
  errorCodes: {
    400: readonly (typeof ApiErrorCode.SCHEMA_INVALID)[];
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
  };
}>;

export type GetChannelSettingsRoute = Route<{
  method: 'get';
  version: 1;
  path: '/channels/{channelId}/settings';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof ChannelSettingsSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
  };
}>;

export type UpdateChannelSettingsRoute = Route<{
  method: 'patch';
  version: 1;
  path: '/channels/{channelId}/settings';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        readonly moderationDefaults: z.ZodOptional<
          z.ZodOptional<
            z.ZodObject<
              {
                filterSeverity: z.ZodOptional<VocabularyIn<typeof FILTER_SEVERITIES>>;
                slowModeSec: z.ZodOptional<z.ZodInt>;
                holdersOnly: z.ZodOptional<z.ZodBoolean>;
                retroactiveFilter: z.ZodOptional<z.ZodBoolean>;
                chatMode: z.ZodOptional<VocabularyIn<typeof CHAT_MODES>>;
              },
              z.core.$strip
            >
          >
        >;
        readonly broadcastDefaults: z.ZodOptional<
          z.ZodOptional<
            z.ZodObject<
              {
                ingestProtocol: z.ZodOptional<VocabularyIn<readonly ['rtmps', 'srt', 'whip']>>;
                holdScreenAutoAfterSec: z.ZodOptional<z.ZodInt>;
              },
              z.core.$strip
            >
          >
        >;
      } & { readonly expectedVersion: z.ZodNumber },
      z.core.$strip
    >,
    true
  >;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof ChannelDefaultsSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
      | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
      | typeof DomainErrorCode.STATE_CONFLICT
    )[];
  };
}>;

export type ListChannelJournalRoute = Route<{
  method: 'get';
  version: 1;
  path: '/channels/{channelId}/journal';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof PageParameter,
    typeof PageSizeParameter,
    QueryParameter<'from', z.ZodString, true>,
    QueryParameter<'to', z.ZodString, true>,
    typeof JournalNatureParameter,
    typeof JournalDateParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: PageResponse<typeof studioConventions, typeof JournalEntrySchema>;
  };
  errorCodes: {
    400: readonly (
      typeof ApiErrorCode.PERIOD_FILTER_REQUIRED | typeof ApiErrorCode.SCHEMA_INVALID
    )[];
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
  };
}>;

export type ListChannelMerchItemsRoute = Route<{
  method: 'get';
  version: 1;
  path: '/channels/{channelId}/merch-items';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: {
      readonly description: 'The items.';
      readonly content: {
        readonly 'application/json': { readonly schema: typeof MerchItemListSchema };
      };
    };
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
  };
}>;

export type UpsertMerchItemRoute = Route<{
  method: 'put';
  version: 1;
  path: '/channels/{channelId}/merch-items/{itemId}';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof MerchItemIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof UpsertMerchItemBodySchema, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof ChannelMemberSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
      | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
      | typeof DomainErrorCode.STATE_CONFLICT
    )[];
  };
}>;

export type UpdateChannelIdentityRoute = Route<{
  method: 'patch';
  version: 1;
  path: '/channels/{channelId}/identity';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        readonly publicName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        readonly slug: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        readonly biography: z.ZodOptional<
          z.ZodOptional<
            z.ZodArray<
              z.ZodObject<{ contentLanguage: z.ZodString; text: z.ZodString }, z.core.$strip>
            >
          >
        >;
        readonly categoryId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        readonly avatarAssetId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
      } & { readonly expectedVersion: z.ZodNumber },
      z.core.$strip
    >,
    true
  >;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof ChannelIdentitySchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
      | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
      | typeof DomainErrorCode.STATE_CONFLICT
    )[];
  };
}>;

export type ListChannelMembersRoute = Route<{
  method: 'get';
  version: 1;
  path: '/channels/{channelId}/members';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof PageParameter,
    typeof PageSizeParameter,
    typeof MemberSearch,
    typeof MemberRoleParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: {
      readonly description: 'A page of members, plus the head count per role.';
      readonly content: {
        readonly 'application/json': { readonly schema: typeof ChannelMemberPageSchema };
      };
    };
  };
  errorCodes: {
    400: readonly (typeof ApiErrorCode.SCHEMA_INVALID)[];
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
  };
}>;

export type InviteMemberRoute = Route<{
  method: 'post';
  version: 1;
  path: '/channels/{channelId}/invitations';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof InviteMemberBodySchema, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    201: ItemResponse<typeof studioConventions, typeof ChannelMemberSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN | typeof ChannelErrorCode.ROLE_NOT_ASSIGNABLE)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;

export type ChangeMemberRolesRoute = Route<{
  method: 'post';
  version: 1;
  path: '/channels/{channelId}/members/{personId}/change-roles';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof PersonIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof ChangeMemberRolesBodySchema, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof ChannelMemberSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;

export type RemoveMemberRoute = Route<{
  method: 'delete';
  version: 1;
  path: '/channels/{channelId}/members/{personId}';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof PersonIdParameter,
    typeof IdempotencyKeyParameter,
    ExpectedVersionQuery,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof Deleted, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
      | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
      | typeof DomainErrorCode.STATE_CONFLICT
    )[];
  };
}>;

export type TransferChannelOwnershipRoute = Route<{
  method: 'post';
  version: 1;
  path: '/channels/{channelId}/ownership-transfer';
  parameters: readonly [
    typeof ChannelIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof TransferChannelOwnershipBodySchema, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    202: ItemResponse<typeof studioConventions, typeof OwnershipTransferSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
      | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
      | typeof ChannelErrorCode.TRANSFER_TARGET_INELIGIBLE
    )[];
  };
}>;
