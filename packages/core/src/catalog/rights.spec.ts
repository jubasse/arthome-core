import { describe, expect, it } from 'vitest';

import { BlackoutReason, RightsScope } from '../vocabulary/catalog.js';
import { blackoutReasonOf, isAvailableIn, restrictedRights, worldwideRights } from './rights.js';

/**
 * PROTECTED INVARIANT
 *   A broadcast is WORLDWIDE BY DEFAULT; a territorial restriction is the
 *   exception, and it is justified by a CODED reason.
 *
 * WHY THIS TEST EXISTS
 *   `geography.rightsPolicy.note` states it, and it is the opposite of VOD:
 *   live performance is broadcast everywhere unless a clause says otherwise. A
 *   surface that inverted the default would block the whole catalogue with
 *   nobody understanding why.
 *
 *   And E8: `blackoutReasons[]` carries `label` and `labelEn` — PROSE WRITTEN
 *   INTO THE DATA — while everything else goes through `enums.*`. That is an
 *   i18n leak into the model, exactly the kind "i18n by codes" exists to
 *   forbid.
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
    // And the spelling is `shared/`'s, to the letter: kebab-case (K6).
    expect(BlackoutReason.CO_PRODUCTION).toBe('co-production');
  });

  it('gives no reason to anyone who is not blocked', () => {
    // The absence of a reason IS availability: no second call to find out why
    // it works.
    const rights = restrictedRights(['BE'], BlackoutReason.FESTIVAL);
    expect(blackoutReasonOf(rights, 'FR')).toBeNull();
    expect(blackoutReasonOf(worldwideRights(), 'BE')).toBeNull();
  });
});
