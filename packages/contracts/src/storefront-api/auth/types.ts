/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */

import type { ApiErrorCode, IdentityErrorCode } from '@arthome/core';

import type {
  Acknowledged,
  IdentifiedAccess,
  ItemResponse,
  JsonRequestBody,
  PublicAccess,
  Route,
} from '../../http/index.js';
import type { StorefrontSessionEstablishedSchema } from '../../identity/index.js';
import type {
  IdempotencyKeyParameter,
  SurfaceParameter,
  TraceparentParameter,
  storefrontConventions,
  viewer,
} from '../components.js';
import type {
  ChangePasswordBodySchema,
  ConfirmEmailVerificationBodySchema,
  DisableTwoFactorBodySchema,
  EmailVerificationQueueingSchema,
  EmailVerificationSchema,
  ExchangeOneTimeTokenBodySchema,
  PasswordChangeSchema,
  RequestPasswordResetBodySchema,
  ResetPasswordBodySchema,
  SignInBodySchema,
  SignOutAnswerSchema,
  SignUpBodySchema,
  SocialProviderParameter,
  SocialSignInStartSchema,
  StartSocialSignInBodySchema,
  TwoFactorDisablingSchema,
  TwoFactorEnrolmentSchema,
  VerifyTwoFactorBodySchema,
} from './schemas.js';

export type SignUpRoute = Route<{
  method: 'post';
  version: 1;
  path: '/auth/sign-up';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<typeof SignUpBodySchema, true>;
  access: PublicAccess;
  responses: {
    201: ItemResponse<
      typeof storefrontConventions,
      typeof StorefrontSessionEstablishedSchema,
      unknown
    >;
  };
  errorCodes: {
    409: readonly (
      | typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT
      | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
      | typeof IdentityErrorCode.EMAIL_TAKEN
    )[];
  };
}>;

export type SignInRoute = Route<{
  method: 'post';
  version: 1;
  path: '/auth/sign-in';
  parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
  requestBody: JsonRequestBody<typeof SignInBodySchema, true>;
  access: PublicAccess;
  responses: {
    200: ItemResponse<
      typeof storefrontConventions,
      typeof StorefrontSessionEstablishedSchema,
      unknown
    >;
  };
  errorCodes: {
    401: readonly (
      typeof IdentityErrorCode.INVALID_CREDENTIALS | typeof IdentityErrorCode.TWO_FACTOR_REQUIRED
    )[];
  };
}>;

export type SignOutRoute = Route<{
  method: 'post';
  version: 1;
  path: '/auth/sign-out';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof viewer, true>;
  responses: {
    200: ItemResponse<typeof storefrontConventions, typeof SignOutAnswerSchema, unknown>;
  };
  errorCodes: {
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;

export type ConfirmEmailVerificationRoute = Route<{
  method: 'post';
  version: 1;
  path: '/auth/verify-email';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<typeof ConfirmEmailVerificationBodySchema, true>;
  access: PublicAccess;
  responses: {
    200: ItemResponse<typeof storefrontConventions, typeof EmailVerificationSchema, unknown>;
  };
  errorCodes: {
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
    410: readonly (typeof IdentityErrorCode.VERIFICATION_LINK_INVALID)[];
  };
}>;

export type ResendEmailVerificationRoute = Route<{
  method: 'post';
  version: 1;
  path: '/auth/verify-email/resend';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  access: IdentifiedAccess<typeof viewer, false>;
  responses: {
    200: ItemResponse<
      typeof storefrontConventions,
      typeof EmailVerificationQueueingSchema,
      unknown
    >;
  };
  errorCodes: {
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;

export type RequestPasswordResetRoute = Route<{
  method: 'post';
  version: 1;
  path: '/auth/forget-password';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<typeof RequestPasswordResetBodySchema, true>;
  access: PublicAccess;
  responses: {
    202: ItemResponse<typeof storefrontConventions, typeof Acknowledged, unknown>;
  };
  errorCodes: {
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;

export type ResetPasswordRoute = Route<{
  method: 'post';
  version: 1;
  path: '/auth/reset-password';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<typeof ResetPasswordBodySchema, true>;
  access: PublicAccess;
  responses: {
    200: ItemResponse<typeof storefrontConventions, typeof PasswordChangeSchema, unknown>;
  };
  errorCodes: {
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
    410: readonly (typeof IdentityErrorCode.RESET_TOKEN_EXPIRED)[];
  };
}>;

export type StartSocialSignInRoute = Route<{
  method: 'post';
  version: 1;
  path: '/auth/social/{provider}/start';
  parameters: readonly [
    typeof SocialProviderParameter,
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<typeof StartSocialSignInBodySchema, true>;
  access: PublicAccess;
  responses: {
    200: ItemResponse<typeof storefrontConventions, typeof SocialSignInStartSchema, unknown>;
  };
  errorCodes: {
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;

export type ExchangeOneTimeTokenRoute = Route<{
  method: 'post';
  version: 1;
  path: '/auth/exchange';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<typeof ExchangeOneTimeTokenBodySchema, true>;
  access: PublicAccess;
  responses: {
    200: ItemResponse<
      typeof storefrontConventions,
      typeof StorefrontSessionEstablishedSchema,
      unknown
    >;
  };
  errorCodes: {
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
    410: readonly (typeof IdentityErrorCode.ONE_TIME_TOKEN_EXPIRED)[];
  };
}>;

export type ChangePasswordRoute = Route<{
  method: 'post';
  version: 1;
  path: '/auth/change-password';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<typeof ChangePasswordBodySchema, true>;
  access: IdentifiedAccess<typeof viewer, false>;
  responses: {
    200: ItemResponse<typeof storefrontConventions, typeof PasswordChangeSchema, unknown>;
  };
  errorCodes: {
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;

export type EnableTwoFactorRoute = Route<{
  method: 'post';
  version: 1;
  path: '/auth/two-factor';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<typeof DisableTwoFactorBodySchema, true>;
  access: IdentifiedAccess<typeof viewer, false>;
  responses: {
    201: ItemResponse<typeof storefrontConventions, typeof TwoFactorEnrolmentSchema, unknown>;
  };
  errorCodes: {
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;

export type DisableTwoFactorRoute = Route<{
  method: 'delete';
  version: 1;
  path: '/auth/two-factor';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<typeof DisableTwoFactorBodySchema, true>;
  access: IdentifiedAccess<typeof viewer, false>;
  responses: {
    200: ItemResponse<typeof storefrontConventions, typeof TwoFactorDisablingSchema, unknown>;
  };
  errorCodes: {
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
  };
}>;

export type VerifyTwoFactorRoute = Route<{
  method: 'post';
  version: 1;
  path: '/auth/two-factor/verify';
  parameters: readonly [
    typeof IdempotencyKeyParameter,
    typeof SurfaceParameter,
    typeof TraceparentParameter,
  ];
  requestBody: JsonRequestBody<typeof VerifyTwoFactorBodySchema, true>;
  access: PublicAccess;
  responses: {
    200: ItemResponse<
      typeof storefrontConventions,
      typeof StorefrontSessionEstablishedSchema,
      unknown
    >;
  };
  errorCodes: {
    401: readonly (typeof IdentityErrorCode.INVALID_CREDENTIALS)[];
    409: readonly (
      typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED
    )[];
    410: readonly (typeof IdentityErrorCode.TWO_FACTOR_CHALLENGE_EXPIRED)[];
  };
}>;
