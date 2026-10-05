/** Written by tools/contract-types.mjs from ./routes.ts. Never edited. */
import type { z } from 'zod';
import type { ApiErrorCode, DomainErrorCode } from '@arthome/core';
import type { IdentifiedAccess, ItemResponse, JsonRequestBody, Route } from '../../http/index.js';
import type { CartQuoteSchema, CartSchema } from '../../ticketing/index.js';
import type { IdempotencyKeyParameter, SurfaceParameter, TraceparentParameter, storefrontConventions, viewer } from '../components.js';
import type { AddCartLineBodySchema, CartAnswerSchema, CartLineIdParameter, QuoteCartBodySchema } from './schemas.js';
export type GetCartRoute = Route<{
    method: 'get';
    version: 1;
    path: '/cart';
    parameters: readonly [typeof SurfaceParameter, typeof TraceparentParameter];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof CartSchema, unknown>;
    };
}>;
export type QuoteCartRoute = Route<{
    method: 'post';
    version: 1;
    path: '/cart/quote';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<typeof QuoteCartBodySchema, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof CartQuoteSchema, unknown>;
    };
    errorCodes: {
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type AddCartLineRoute = Route<{
    method: 'post';
    version: 1;
    path: '/cart/lines';
    parameters: readonly [
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<typeof AddCartLineBodySchema, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof CartSchema, unknown>;
    };
    errorCodes: {
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
export type UpdateCartLineRoute = Route<{
    method: 'patch';
    version: 1;
    path: '/cart/lines/{lineId}';
    parameters: readonly [
        typeof CartLineIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        readonly quantity: z.ZodOptional<z.ZodInt>;
    } & {
        readonly expectedVersion: z.ZodNumber;
    }, z.core.$strip>, true>;
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: {
            readonly description: 'The updated cart.';
            readonly content: {
                readonly 'application/json': {
                    readonly schema: typeof CartAnswerSchema;
                };
            };
        };
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED | typeof DomainErrorCode.STATE_CONFLICT)[];
    };
}>;
export type RemoveCartLineRoute = Route<{
    method: 'delete';
    version: 1;
    path: '/cart/lines/{lineId}';
    parameters: readonly [
        typeof CartLineIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter
    ];
    access: IdentifiedAccess<typeof viewer, false>;
    responses: {
        200: ItemResponse<typeof storefrontConventions, typeof CartSchema, unknown>;
    };
    errorCodes: {
        404: readonly (typeof ApiErrorCode.NOT_FOUND)[];
        409: readonly (typeof ApiErrorCode.IDEMPOTENCY_IN_FLIGHT | typeof ApiErrorCode.IDEMPOTENCY_KEY_REUSED)[];
    };
}>;
//# sourceMappingURL=types.d.ts.map