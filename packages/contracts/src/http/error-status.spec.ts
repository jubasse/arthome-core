import { describe, expect, it } from 'vitest';

import { ApiErrorCode, ERROR_CODES, OrderErrorCode, type ErrorCode } from '@arthome/core';

import { ERROR_STATUS, statusOf } from './error-status.js';
import { openApiDocumentOf } from '../openapi/index.js';
import { storefrontApi } from '../storefront-api/index.js';
import { studioApi } from '../studio-api/index.js';

function isErrorCode(value: unknown): value is ErrorCode {
  return ERROR_CODES.some((code) => code === value);
}

/** The codes a response shows: its examples' `error.code` and its schemas' `code` constants. */
function codesShownIn(node: unknown, found = new Set<ErrorCode>()): Set<ErrorCode> {
  if (Array.isArray(node)) {
    for (const item of node) codesShownIn(item, found);
  } else if (typeof node === 'object' && node !== null) {
    const { error, code } = node as { error?: { code?: unknown }; code?: { const?: unknown } };
    if (isErrorCode(error?.code)) found.add(error.code);
    if (isErrorCode(code?.const)) found.add(code.const);
    for (const value of Object.values(node)) codesShownIn(value, found);
  }
  return found;
}

/** Every `[status, code]` pair a document shows on its operations, shared responses resolved. */
function statusesShown(document: Record<string, unknown>): [number, ErrorCode, string][] {
  const { paths, components } = document as {
    paths: Record<string, Record<string, { responses?: Record<string, unknown> }>>;
    components: { responses?: Record<string, unknown> };
  };
  const shared = (response: unknown): unknown => {
    const ref = (response as { $ref?: string }).$ref;
    return ref === undefined ? response : components.responses?.[ref.split('/').at(-1) ?? ''];
  };
  return Object.entries(paths).flatMap(([path, operations]) =>
    Object.values(operations).flatMap(({ responses = {} }) =>
      Object.entries(responses).flatMap(([status, response]) =>
        [...codesShownIn(shared(response))].map((code): [number, ErrorCode, string] => [
          Number(status),
          code,
          path,
        ]),
      ),
    ),
  );
}

describe('the status of an error code', () => {
  it('is one per code, the one transport.md §5.5 gives it', () => {
    expect(statusOf(ApiErrorCode.SCHEMA_INVALID)).toBe(400);
    expect(statusOf(ApiErrorCode.UPSTREAM_UNAVAILABLE)).toBe(502);
    expect(statusOf(ApiErrorCode.SERVICE_UNAVAILABLE)).toBe(503);
    expect(statusOf(OrderErrorCode.PAYMENT_DECLINED)).toBe(402);
    expect(Object.keys(ERROR_STATUS).sort()).toEqual([...ERROR_CODES].sort());
  });

  it.each([
    ['storefront', storefrontApi],
    ['studio', studioApi],
  ])('is the status the %s document shows each code under', (_name, api) => {
    const shown = statusesShown(openApiDocumentOf(api));
    expect(shown.length).toBeGreaterThan(0);
    const disagreeing = shown.filter(([status, code]) => ERROR_STATUS[code] !== status);
    expect(disagreeing).toEqual([]);
  });
});
