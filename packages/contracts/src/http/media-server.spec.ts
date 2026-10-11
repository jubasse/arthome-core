import { describe, expect, it } from 'vitest';

import { ApiErrorCode } from '@arthome/core';

import type { Response } from './index.js';
import { errorCodesOf } from './index.js';
import { sensitivePathsOf } from './marks.js';
import { MediaServerUnauthorizedResponse, mediaServer } from './media-server.js';
import { openApiDocumentOf } from '../openapi/index.js';
import { streamingServiceDocs } from '../streaming-service-api/docs.js';
import { streamingServiceApi } from '../streaming-service-api/index.js';

const authorize = streamingServiceApi.routes.authorizeMediaServerAccess;
const responses: Readonly<Record<string, Response>> = authorize.responses;

describe('the media server identity', () => {
  it('is internal, on its shared secret, and names no one', () => {
    expect(mediaServer.internal).toBe(true);
    expect(mediaServer.principal.parse({})).toEqual({});
    expect(authorize.security).toEqual([{ mediaServerSecret: [] }]);
    expect(authorize.access.identity).toBe(mediaServer);
  });

  it('answers its own 401, never the internal token’s', () => {
    expect(responses[401]).toBe(MediaServerUnauthorizedResponse);
    expect(errorCodesOf(authorize, 401)).toEqual([ApiErrorCode.UNAUTHENTICATED]);
  });
});

describe('authorizeMediaServerAccess', () => {
  it('is marked internal in the document', () => {
    const document = openApiDocumentOf(streamingServiceApi, streamingServiceDocs) as {
      readonly paths: Readonly<Record<string, Readonly<Record<string, Record<string, unknown>>>>>;
    };
    const operation = document.paths['/v1/media-server/authorize']?.post;

    expect(operation?.['x-arthome-internal']).toBe(true);
    expect(operation?.security).toEqual([{ mediaServerSecret: [] }]);
  });

  it('keeps the password, the token and the query out of every log', () => {
    const body = authorize.requestBody.content['application/json'].schema;

    expect(sensitivePathsOf(body)).toEqual(['password', 'token', 'query']);
  });

  it('accepts with a 204 and no content', () => {
    expect(Object.keys(responses).filter((status) => status.startsWith('2'))).toEqual(['204']);
    expect(responses[204]?.content).toBeUndefined();
  });

  it('keeps an unknown action or protocol raw, and the fields MediaMTX adds', () => {
    const body = authorize.requestBody.content['application/json'].schema;
    const attempt = { action: 'whep', path: 'live/studio-a', protocol: 'moq', later: 1 };

    expect(body.parse(attempt)).toEqual(attempt);
  });
});
