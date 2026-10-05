/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */

import type { ApiErrorCode, ChatErrorCode } from '@arthome/core';

import type { ChatMessageSchema, ReactionQuotaSchema } from '../../engagement/index.js';
import type {
  IdentifiedAccess,
  ItemResponse,
  JsonRequestBody,
  PageResponse,
  Response,
  Route,
} from '../../http/index.js';
import type {
  CursorParameter,
  DateIdParameter,
  IdempotencyKeyParameter,
  LimitParameter,
  SurfaceParameter,
  TraceparentParameter,
  storefrontConventions,
  viewer,
} from '../components.js';
import type {
  ChatMessageIdParameter,
  ChatSinceSeqParameter,
  ReportChatMessageBodySchema,
  SendChatMessageBodySchema,
  SendReactionBodySchema,
} from './schemas.js';

export type ListChatMessagesRoute = Route<{
  method: 'get';
  version: 1;
  path: '/dates/{dateId}/chat/messages';
  parameters: readonly [
    typeof DateIdParameter,
    typeof CursorParameter,
    typeof LimitParameter,
    typeof ChatSinceSeqParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof viewer, false>;
  responses: {
    200: PageResponse<typeof storefrontConventions, typeof ChatMessageSchema>;
  };
  errorCodes: {
    400: readonly (typeof ApiErrorCode.SCHEMA_INVALID)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
  };
}>;

export type SendChatMessageRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/chat/messages';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<typeof SendChatMessageBodySchema, true>;
  access: IdentifiedAccess<typeof viewer, false>;
  responses: {
    201: ItemResponse<typeof storefrontConventions, typeof ChatMessageSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ChatErrorCode.HOLDERS_ONLY)[];
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;

export type SendReactionRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/chat/reactions';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<typeof SendReactionBodySchema, true>;
  access: IdentifiedAccess<typeof viewer, false>;
  responses: {
    200: ItemResponse<typeof storefrontConventions, typeof ReactionQuotaSchema, unknown>;
  };
  errorCodes: {
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;

export type ReportChatMessageRoute = Route<{
  method: 'post';
  version: 1;
  path: '/chat/messages/{messageId}/report';
  parameters: readonly [
    typeof ChatMessageIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<typeof ReportChatMessageBodySchema, true>;
  access: IdentifiedAccess<typeof viewer, false>;
  responses: {
    202: Response;
  };
  errorCodes: {
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;
