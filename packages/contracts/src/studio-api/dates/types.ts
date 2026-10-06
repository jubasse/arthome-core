/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */

import type { z } from 'zod';

import type {
  ApiErrorCode,
  CHAT_MODES,
  CatalogErrorCode,
  ChannelErrorCode,
  DomainErrorCode,
  FILTER_SEVERITIES,
  PRICE_TIERS,
  REPLAY_POLICIES,
} from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';

import type {
  Acknowledged,
  Deleted,
  ExpectedVersionQuery,
  IdentifiedAccess,
  ItemResponse,
  JsonRequestBody,
  PageResponse,
  QueryParameter,
  ReauthProof,
  Route,
} from '../../http/index.js';
import type { DateAccessGrantSchema } from '../../studio-access/index.js';
import type { ChatPolicySchema } from '../../studio-desk/index.js';
import type { DateSalesPaneSchema } from '../../studio-money/index.js';
import type { PublicationSchema, StudioIncidentSchema } from '../../studio-stage/index.js';
import type {
  CursorParameter,
  DateIdParameter,
  IdempotencyKeyParameter,
  IfRightsVersionParameter,
  SurfaceParameter,
  TraceparentParameter,
  operator,
  studioConventions,
} from '../components.js';
import type {
  CapacityTierOpeningSchema,
  ChapterIdParameter,
  ChapterSchema,
  ComplimentaryIssueSchema,
  DateChatPaneSchema,
  DateCrewPaneSchema,
  DateOutcomeDecisionSchema,
  DatePublicPaneSchema,
  DateReplayPaneSchema,
  DateTechPaneSchema,
  DecideDateOutcomeBodySchema,
  DuplicateDateBodySchema,
  GrantDateAccessBodySchema,
  HealthWindowParameter,
  IssueComplimentaryBodySchema,
  MerchPinSchema,
  MoveDatePublicationStateBodySchema,
  OpenCapacityTierBodySchema,
  PinMerchDuringLiveBodySchema,
  PostChapterBodySchema,
  RaiseIncidentBodySchema,
  ReopenReplayWindowBodySchema,
  ReplayWindowSchema,
  RotateStreamKeyBodySchema,
  RunTransitionBodySchema,
  SinceSeqParameter,
  StudioChatMessageSchema,
  SubmitHealthSampleBodySchema,
  TechnicalCheckSchema,
} from './schemas.js';

export type GetDateSheetRoute = Route<{
  method: 'get';
  version: 1;
  path: '/dates/{dateId}/sheet';
  parameters: readonly [
    typeof DateIdParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof DateAccessGrantSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
  };
}>;

export type GetDatePublicPaneRoute = Route<{
  method: 'get';
  version: 1;
  path: '/dates/{dateId}/panes/public';
  parameters: readonly [
    typeof DateIdParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof DatePublicPaneSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
  };
}>;

export type GetDateReplayPaneRoute = Route<{
  method: 'get';
  version: 1;
  path: '/dates/{dateId}/panes/replay';
  parameters: readonly [
    typeof DateIdParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof DateReplayPaneSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
  };
}>;

export type MoveDatePublicationStateRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/publication/transitions';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof MoveDatePublicationStateBodySchema, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof PublicationSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
      | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
      | typeof DomainErrorCode.PUBLICATION_CHECKLIST_INCOMPLETE
      | typeof DomainErrorCode.PUBLICATION_PROMISE_UNACKNOWLEDGED
      | typeof DomainErrorCode.PUBLICATION_TRANSITION_IRREVERSIBLE
      | typeof DomainErrorCode.STATE_CONFLICT
    )[];
  };
}>;

export type SetDateReplayPolicyRoute = Route<{
  method: 'put';
  version: 1;
  path: '/dates/{dateId}/replay-policy';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        policy: VocabularyIn<typeof REPLAY_POLICIES>;
        windowHours: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
      } & { readonly expectedVersion: z.ZodNumber },
      z.core.$strip
    >,
    true
  >;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof PublicationSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
      | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
      | typeof CatalogErrorCode.REPLAY_POLICY_FINAL
      | typeof DomainErrorCode.STATE_CONFLICT
    )[];
  };
}>;

export type DeleteDateRoute = Route<{
  method: 'delete';
  version: 1;
  path: '/dates/{dateId}';
  parameters: readonly [
    typeof DateIdParameter,
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
      | typeof CatalogErrorCode.DATE_HAS_SOLD_SEATS
      | typeof DomainErrorCode.STATE_CONFLICT
    )[];
  };
}>;

export type DuplicateDateRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/duplicate';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof DuplicateDateBodySchema, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    201: ItemResponse<typeof studioConventions, typeof DateAccessGrantSchema, unknown>;
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

export type DecideDateOutcomeRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/outcome';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof DecideDateOutcomeBodySchema, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof DateOutcomeDecisionSchema, unknown>;
  };
  errorCodes: {
    400: readonly (typeof CatalogErrorCode.RESCHEDULE_IN_PAST)[];
    403: readonly (
      typeof ApiErrorCode.FORBIDDEN | typeof CatalogErrorCode.OUTCOME_DECISION_FORBIDDEN
    )[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
      | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
      | typeof CatalogErrorCode.DATE_ALREADY_ENDED
      | typeof CatalogErrorCode.DATE_ALREADY_STARTED
      | typeof CatalogErrorCode.DATE_NOT_PUBLIC
      | typeof CatalogErrorCode.DATE_NOT_STARTED
      | typeof CatalogErrorCode.OUTCOME_FINAL
      | typeof DomainErrorCode.STATE_CONFLICT
    )[];
  };
}>;

export type GetDateTicketsPaneRoute = Route<{
  method: 'get';
  version: 1;
  path: '/dates/{dateId}/panes/tickets';
  parameters: readonly [
    typeof DateIdParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof DateSalesPaneSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
  };
}>;

export type SetDatePricesRoute = Route<{
  method: 'put';
  version: 1;
  path: '/dates/{dateId}/prices';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        tiers: z.ZodArray<
          z.ZodObject<
            {
              tier: VocabularyIn<typeof PRICE_TIERS>;
              amountMinor: z.ZodInt;
              currencyCode: z.ZodString;
              active: z.ZodBoolean;
            },
            z.core.$strip
          >
        >;
      } & { readonly expectedVersion: z.ZodNumber },
      z.core.$strip
    >,
    true
  >;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof DateSalesPaneSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
      | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
      | typeof CatalogErrorCode.PRICES_CURRENCY_MISMATCH
      | typeof CatalogErrorCode.PRICES_LOCKED
      | typeof DomainErrorCode.STATE_CONFLICT
    )[];
  };
}>;

export type OpenCapacityTierRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/capacity-tiers';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof OpenCapacityTierBodySchema, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof CapacityTierOpeningSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
      | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
      | typeof DomainErrorCode.CAPACITY_TIER_MUST_WIDEN
      | typeof CatalogErrorCode.OUTCOME_FINAL
      | typeof CatalogErrorCode.TECHNICAL_PROVISION_REQUIRED
      | typeof DomainErrorCode.STATE_CONFLICT
    )[];
  };
}>;

export type SetTechnicalProvisionRoute = Route<{
  method: 'put';
  version: 1;
  path: '/dates/{dateId}/technical-provision';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      { provisionedCapacity: z.ZodInt } & { readonly expectedVersion: z.ZodNumber },
      z.core.$strip
    >,
    true
  >;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof DateSalesPaneSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
      | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
      | typeof CatalogErrorCode.PROVISION_BELOW_CAPACITY
      | typeof CatalogErrorCode.PROVISION_DEADLINE_PASSED
      | typeof DomainErrorCode.STATE_CONFLICT
    )[];
  };
}>;

export type IssueComplimentaryRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/complimentaries';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof IssueComplimentaryBodySchema, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    201: ItemResponse<typeof studioConventions, typeof ComplimentaryIssueSchema, unknown>;
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

export type GetDateChatPaneRoute = Route<{
  method: 'get';
  version: 1;
  path: '/dates/{dateId}/panes/chat';
  parameters: readonly [
    typeof DateIdParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof DateChatPaneSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
  };
}>;

export type SetDateChatPolicyRoute = Route<{
  method: 'put';
  version: 1;
  path: '/dates/{dateId}/chat-policy';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        mode: z.ZodOptional<VocabularyIn<typeof CHAT_MODES>>;
        filterSeverity: z.ZodOptional<VocabularyIn<typeof FILTER_SEVERITIES>>;
        slowModeSec: z.ZodOptional<z.ZodInt>;
        holdersOnly: z.ZodOptional<z.ZodBoolean>;
        retroactiveFilter: z.ZodOptional<z.ZodBoolean>;
      } & { readonly expectedVersion: z.ZodNumber },
      z.core.$strip
    >,
    true
  >;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof ChatPolicySchema, unknown>;
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

export type ListStudioChatMessagesRoute = Route<{
  method: 'get';
  version: 1;
  path: '/dates/{dateId}/chat/messages';
  parameters: readonly [
    typeof DateIdParameter,
    typeof CursorParameter,
    QueryParameter<'limit', z.ZodDefault<z.ZodInt>>,
    typeof SinceSeqParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: PageResponse<typeof studioConventions, typeof StudioChatMessageSchema>;
  };
  errorCodes: {
    400: readonly (typeof ApiErrorCode.SCHEMA_INVALID)[];
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
  };
}>;

export type GetDateTechPaneRoute = Route<{
  method: 'get';
  version: 1;
  path: '/dates/{dateId}/panes/tech';
  parameters: readonly [
    typeof DateIdParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof DateTechPaneSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
  };
}>;

export type GetRunConsoleRoute = Route<{
  method: 'get';
  version: 1;
  path: '/dates/{dateId}/run';
  parameters: readonly [
    typeof DateIdParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof DateAccessGrantSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
  };
}>;

export type RunTechnicalCheckRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/run/technical-check';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof TechnicalCheckSchema, unknown>;
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

export type RehearseRunRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/run/rehearse';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof RunTransitionBodySchema, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof DateAccessGrantSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
      | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
      | typeof DomainErrorCode.RUN_TRANSITION_FORBIDDEN
      | typeof DomainErrorCode.STATE_CONFLICT
    )[];
  };
}>;

export type GoOnAirRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/run/go-on-air';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof RunTransitionBodySchema, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof DateAccessGrantSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
      | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
      | typeof CatalogErrorCode.TECHNICAL_CHECK_REQUIRED
      | typeof DomainErrorCode.PUBLICATION_TRANSITION_FORBIDDEN
      | typeof DomainErrorCode.RUN_TRANSITION_FORBIDDEN
      | typeof DomainErrorCode.STATE_CONFLICT
    )[];
  };
}>;

export type EndRunRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/run/end';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof RunTransitionBodySchema, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof DateAccessGrantSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
      | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
      | typeof DomainErrorCode.RUN_TRANSITION_FORBIDDEN
      | typeof DomainErrorCode.STATE_CONFLICT
    )[];
  };
}>;

export type ResetRunRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/run/reset';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof RunTransitionBodySchema, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof DateAccessGrantSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
      | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
      | typeof DomainErrorCode.RUN_TRANSITION_FORBIDDEN
      | typeof DomainErrorCode.STATE_CONFLICT
    )[];
  };
}>;

export type SetQualityProfileRoute = Route<{
  method: 'put';
  version: 1;
  path: '/dates/{dateId}/run/quality-profile';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<
    z.ZodObject<
      {
        renditions: z.ZodArray<
          z.ZodObject<{ renditionId: z.ZodString; enabled: z.ZodBoolean }, z.core.$strip>
        >;
      } & { readonly expectedVersion: z.ZodNumber },
      z.core.$strip
    >,
    true
  >;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof DateAccessGrantSchema, unknown>;
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

export type GetHealthSeriesRoute = Route<{
  method: 'get';
  version: 1;
  path: '/dates/{dateId}/run/health-samples';
  parameters: readonly [
    typeof DateIdParameter,
    typeof HealthWindowParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof DateAccessGrantSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
  };
}>;

export type SubmitHealthSampleRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/run/health-samples';
  parameters: readonly [
    typeof DateIdParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof SubmitHealthSampleBodySchema, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    202: ItemResponse<typeof studioConventions, typeof Acknowledged, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
  };
}>;

export type PostChapterRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/run/chapters';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof PostChapterBodySchema, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    201: ItemResponse<typeof studioConventions, typeof ChapterSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;

export type RemoveChapterRoute = Route<{
  method: 'delete';
  version: 1;
  path: '/dates/{dateId}/run/chapters/{chapterId}';
  parameters: readonly [
    typeof DateIdParameter,
    typeof ChapterIdParameter,
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

export type RaiseIncidentRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/incidents';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof RaiseIncidentBodySchema, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    201: ItemResponse<typeof studioConventions, typeof StudioIncidentSchema, unknown>;
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

export type RevealStreamKeyRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/stream-key/reveal';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof ReauthProof, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof DateAccessGrantSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;

export type RotateStreamKeyRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/stream-key/rotate';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof RotateStreamKeyBodySchema, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof DateAccessGrantSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
      | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
      | typeof CatalogErrorCode.STREAM_KEY_ROTATION_DURING_RUN
    )[];
  };
}>;

export type GetDateCrewPaneRoute = Route<{
  method: 'get';
  version: 1;
  path: '/dates/{dateId}/panes/crew';
  parameters: readonly [
    typeof DateIdParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof DateCrewPaneSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
  };
}>;

export type GrantDateAccessRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/crew';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof GrantDateAccessBodySchema, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    201: ItemResponse<typeof studioConventions, typeof DateAccessGrantSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN | typeof ChannelErrorCode.CREW_ROLE_RESERVED)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;

export type PinMerchDuringLiveRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/merch-pin';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof PinMerchDuringLiveBodySchema, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof MerchPinSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;

export type ReopenReplayWindowRoute = Route<{
  method: 'post';
  version: 1;
  path: '/dates/{dateId}/replay-window';
  parameters: readonly [
    typeof DateIdParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
    typeof IfRightsVersionParameter,
  ];
  requestBody: JsonRequestBody<typeof ReopenReplayWindowBodySchema, true>;
  access: IdentifiedAccess<typeof operator, false>;
  responses: {
    200: ItemResponse<typeof studioConventions, typeof ReplayWindowSchema, unknown>;
  };
  errorCodes: {
    403: readonly (typeof ApiErrorCode.FORBIDDEN)[];
    404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
    409: readonly (
      | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
      | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
      | typeof CatalogErrorCode.REPLAY_POLICY_FINAL
    )[];
  };
}>;
