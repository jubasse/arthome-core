import { describe, expect, it } from 'vitest';

import { DomainError, FailureNature } from './errors.js';
import {
  ApiErrorCode,
  CatalogErrorCode,
  DomainErrorCode,
  OrderErrorCode,
} from '../vocabulary/error-codes.js';

describe('a domain error is typed by its code', () => {
  it('takes the params its code declares, and carries them', () => {
    const refusal = new DomainError({
      code: OrderErrorCode.SALES_CLOSED,
      params: { salesEndAt: '2026-09-21T19:30:00.000Z' },
    });
    expect(refusal.params.salesEndAt).toBe('2026-09-21T19:30:00.000Z');
  });

  it('leaves params out for a code that carries none, and then carries an empty object', () => {
    expect(new DomainError({ code: DomainErrorCode.MEDIA_URL_EMPTY }).params).toEqual({});
  });

  it('refuses, at compile time, missing params, a wrong one, and params on a code without any', () => {
    // @ts-expect-error `order.sales_closed` requires `salesEndAt`.
    expect(new DomainError({ code: OrderErrorCode.SALES_CLOSED }).code).toBe(
      OrderErrorCode.SALES_CLOSED,
    );
    expect(
      // @ts-expect-error `api.rate_limited` counts `retryAfterMs` in milliseconds, a number.
      new DomainError({ code: ApiErrorCode.RATE_LIMITED, params: { retryAfterMs: '5' } }).code,
    ).toBe(ApiErrorCode.RATE_LIMITED);
    expect(
      // @ts-expect-error `api.not_found` carries no params.
      new DomainError({ code: ApiErrorCode.NOT_FOUND, params: { dateId: 'x' } }).code,
    ).toBe(ApiErrorCode.NOT_FOUND);
  });

  it("carries its code's nature, which no raiser chooses", () => {
    const natures = [
      new DomainError({ code: CatalogErrorCode.SHOW_SLUG_TAKEN }),
      new DomainError({ code: ApiErrorCode.IDEMPOTENCY_IN_FLIGHT, params: { retryAfterMs: 1000 } }),
      new DomainError({ code: DomainErrorCode.CONTENT_EMPTY_IN_BOTH_LANGUAGES }),
      new DomainError({ code: OrderErrorCode.SOLD_OUT }),
    ].map((error) => error.nature);
    expect(natures).toEqual([
      FailureNature.UNAVAILABLE,
      FailureNature.UNAVAILABLE,
      FailureNature.UNAVAILABLE,
      FailureNature.REFUSED,
    ]);
    expect(
      // @ts-expect-error the nature is the code's, never the raiser's.
      new DomainError({ code: OrderErrorCode.SOLD_OUT, nature: FailureNature.UNAVAILABLE }).nature,
    ).toBe(FailureNature.REFUSED);
  });
});
