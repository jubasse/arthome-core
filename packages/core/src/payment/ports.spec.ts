import { describe, expect, it } from 'vitest';

import { PaymentProviderUnavailable } from './ports.js';

describe('PaymentProviderUnavailable', () => {
  it('names itself, so a caller can tell it apart from a decline', () => {
    const error = new PaymentProviderUnavailable('the adapter timed out');
    expect(error.name).toBe('PaymentProviderUnavailable');
    expect(error).toBeInstanceOf(Error);
  });
});
