/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { ApiErrorCode, IdentityErrorCode } from '@arthome/core';
import type { Acknowledged, ItemResponse, JsonRequestBody, PublicAccess, Route } from '../../http/index.js';
import type { StudioSessionEstablishedSchema } from '../../studio-access/index.js';
import type { IdempotencyKeyParameter, SurfaceParameter, TraceparentParameter, studioConventions } from '../components.js';
import type { RequestPasswordResetStudioBodySchema, SignInStudioBodySchema, VerifyTwoFactorStudioBodySchema } from './schemas.js';
export type SignInStudioRoute = Route<{
    method: 'post';
    version: 1;
    path: '/auth/sign-in';
    parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
    requestBody: JsonRequestBody<typeof SignInStudioBodySchema, true>;
    access: PublicAccess;
    responses: {
        200: ItemResponse<typeof studioConventions, typeof StudioSessionEstablishedSchema, unknown>;
    };
    errorCodes: {
        401: readonly (typeof IdentityErrorCode.INVALID_CREDENTIALS | typeof IdentityErrorCode.TWO_FACTOR_REQUIRED)[];
    };
}>;
export type VerifyTwoFactorStudioRoute = Route<{
    method: 'post';
    version: 1;
    path: '/auth/two-factor/verify';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<typeof VerifyTwoFactorStudioBodySchema, true>;
    access: PublicAccess;
    responses: {
        200: ItemResponse<typeof studioConventions, typeof StudioSessionEstablishedSchema, unknown>;
    };
    errorCodes: {
        401: readonly (typeof IdentityErrorCode.INVALID_CREDENTIALS)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
        410: readonly (typeof IdentityErrorCode.TWO_FACTOR_CHALLENGE_EXPIRED)[];
    };
}>;
export type RequestPasswordResetStudioRoute = Route<{
    method: 'post';
    version: 1;
    path: '/auth/forget-password';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<typeof RequestPasswordResetStudioBodySchema, true>;
    access: PublicAccess;
    responses: {
        202: ItemResponse<typeof studioConventions, typeof Acknowledged, unknown>;
    };
    errorCodes: {
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
//# sourceMappingURL=types.d.ts.map