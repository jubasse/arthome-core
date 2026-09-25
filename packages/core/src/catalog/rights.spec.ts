import { describe, expect, it } from 'vitest';

import { blackoutReasonOf, isAvailableIn, restrictedRights, worldwideRights } from './rights.js';
import { BlackoutReason, RightsScope } from '../vocabulary/catalog.js';

/**
 * A broadcast is WORLDWIDE BY DEFAULT, the opposite of VOD: a surface that inverted the default
 * would block the whole catalogue with nobody understanding why.
 */
describe('territorial rights', () => {
  it('opens everywhere by default', () => {
    const rights = worldwideRights();
    expect(rights.scope).toBe(RightsScope.WORLDWIDE);
    for (const country of ['FR', 'BE', 'CH', 'CA', 'JP']) {
      expect(isAvailableIn(rights, country)).toBe(true);
    }
  });

  it('blocks only the declared territories', () => {
    const rights = restrictedRights(['BE', 'CH'], BlackoutReason.CO_PRODUCTION);
    expect(isAvailableIn(rights, 'BE')).toBe(false);
    expect(isAvailableIn(rights, 'CH')).toBe(false);
    expect(isAvailableIn(rights, 'FR')).toBe(true);
    expect(isAvailableIn(rights, 'CA')).toBe(true);
  });

  it('compares regardless of the case of the country served', () => {
    const rights = restrictedRights(['BE'], BlackoutReason.BROADCASTER);
    expect(isAvailableIn(rights, 'be')).toBe(false);
  });

  it('returns a CODE, never a sentence', () => {
    const rights = restrictedRights(['BE'], BlackoutReason.FESTIVAL);
    expect(blackoutReasonOf(rights, 'BE')).toBe('festival');
    // The spelling is `shared/`'s, to the letter (K6).
    expect(BlackoutReason.CO_PRODUCTION).toBe('co_production');
  });

  it('gives no reason to anyone who is not blocked', () => {
    const rights = restrictedRights(['BE'], BlackoutReason.FESTIVAL);
    expect(blackoutReasonOf(rights, 'FR')).toBeNull();
    expect(blackoutReasonOf(worldwideRights(), 'BE')).toBeNull();
  });
});
