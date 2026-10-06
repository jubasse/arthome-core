import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ApiErrorCode, InternalTokenIssuer } from '@arthome/core';

import { routeBuilder } from './builder.js';
import { DERIVED_ERROR_CODES } from './errors.js';
import { defineApi, errorCodesOf } from './index.js';
import {
  ServicePrincipalSchema,
  callerService,
  service,
  serviceConventions,
  serviceErrors,
} from './service.js';
import { openApiDocumentOf } from '../openapi/index.js';

const ACCOUNT = '019928a0-7d31-7a10-b8c4-2f9e11a4c0a1';

const runDesk = routeBuilder(serviceErrors)
  .version(1)
  .conventions(serviceConventions)
  .identity(service)
  .requires(callerService(InternalTokenIssuer.STUDIO_BFF));
const openConsole = runDesk.defineRoute({
  method: 'post',
  path: '/consoles',
  operationId: 'openConsole',
  requestBody: {
    required: true,
    content: { 'application/json': { schema: z.object({ name: z.string() }) } },
  },
  responses: { 204: { description: 'Opened.' } },
});

describe('the service principal', () => {
  it('carries the profile and the device, both optional', () => {
    const anonymous = { callingService: InternalTokenIssuer.STOREFRONT_BFF, userId: null };
    const viewer = { ...anonymous, userId: ACCOUNT, profileId: ACCOUNT, deviceId: ACCOUNT };

    expect(ServicePrincipalSchema.parse(anonymous)).toEqual(anonymous);
    expect(ServicePrincipalSchema.parse(viewer)).toEqual(viewer);
  });
});

describe('the service error model', () => {
  it('derives no BFF code', () => {
    const codes = Object.keys(openConsole.responses).flatMap(
      (status) => errorCodesOf(openConsole, status) ?? [],
    );
    const bffOwn = [
      ...DERIVED_ERROR_CODES[502],
      ...DERIVED_ERROR_CODES[503],
      ApiErrorCode.UPSTREAM_TIMEOUT,
    ];

    expect(codes.filter((code) => (bffOwn as readonly string[]).includes(code))).toEqual([]);
    expect(errorCodesOf(openConsole, 504)).toEqual([ApiErrorCode.DEADLINE_EXCEEDED]);
    expect(errorCodesOf(openConsole, 401)).toEqual([
      ApiErrorCode.UNAUTHENTICATED,
      ApiErrorCode.TOKEN_EXPIRED,
    ]);
  });

  it('marks the route internal, with the deadline and the trace context it relays', () => {
    expect(openConsole.internal).toBe(true);
    expect(openConsole.parameters?.map((parameter) => parameter.name)).toEqual([
      'x-arthome-deadline',
      'traceparent',
    ]);
  });
});

describe('callerService', () => {
  it('documents its issuers and its 403', () => {
    const api = defineApi({
      openapi: '3.1.1',
      info: { title: 'run desk', version: '1' },
      routes: { openConsole },
      components: {},
    });
    const document = openApiDocumentOf(api) as {
      readonly paths: Readonly<Record<string, Readonly<Record<string, Record<string, unknown>>>>>;
    };

    expect(document.paths['/v1/consoles']?.post?.['x-arthome-requires']).toEqual([
      { name: 'callerService', issuers: [InternalTokenIssuer.STUDIO_BFF] },
    ]);
    expect(errorCodesOf(openConsole, 403)).toEqual([ApiErrorCode.FORBIDDEN]);
  });
});
