import { describe, expect, it } from 'vitest';

import { assignableRolesOf } from './grants.js';
import { canDecide, canRevenue, effectiveRightsOf } from './rights.js';
import { MemberRole, NavigationEntry } from '../vocabulary/people.js';

/**
 * PROTECTED INVARIANT
 *   Folding the eight roles onto six personas NEVER creates a right.
 *
 * WHY THIS TEST EXISTS
 *   E6: `studio-data.js` crushes `director`, `video` and `sound` into a single
 *   "run desk". But `grants` tells them apart — `director` may invite `video`
 *   and `sound`, the other two may invite nobody. Authorising on the short role
 *   grants a sound engineer an invitation right they do not have.
 *
 *   The case that hurts is someone holding TWO roles, because that is where the
 *   temptation of a "rank" comes back.
 */
describe('the assignable roles', () => {
  it('grants nothing to `video` or to `sound`', () => {
    expect(assignableRolesOf([MemberRole.VIDEO])).toEqual([]);
    expect(assignableRolesOf([MemberRole.SOUND])).toEqual([]);
    expect(assignableRolesOf([MemberRole.MODERATION])).toEqual([]);
  });

  it('grants `director` exactly `video` and `sound`', () => {
    expect([...assignableRolesOf([MemberRole.DIRECTOR])].sort()).toEqual(['sound', 'video']);
  });

  it('returns EMPTY for someone holding `video` AND `moderation`', () => {
    // The folding case: reduced to "run desk" and "mod", these two roles would
    // look as if they gave something. They give nothing.
    expect(assignableRolesOf([MemberRole.VIDEO, MemberRole.MODERATION])).toEqual([]);
  });

  it('takes the UNION of the roles held, never a maximum', () => {
    const union = assignableRolesOf([MemberRole.DIRECTOR, MemberRole.COORDINATION]);
    // `coordination` brings `director` and `moderation`; `director` brings
    // `video` and `sound`. The union of the two, without duplicates.
    expect([...union].sort()).toEqual(['director', 'moderation', 'sound', 'video']);
  });
});

/**
 * PROTECTED INVARIANT
 *   Access is the UNION of the roles held, never a rank.
 *
 * WHY
 *   It is the rule the studio mobile tab bar applies, and it is arithmetic:
 *   there is no "superior" role. Someone holding `moderation` and `treasury`
 *   opens the union of the two menus, which is neither of them.
 */
describe('the effective rights', () => {
  it('opens the union of the two menus, which is neither of them', () => {
    const rights = effectiveRightsOf([MemberRole.MODERATION, MemberRole.TREASURY]);
    expect(rights.navigation).toContain(NavigationEntry.MODERATION); // from the moderator
    expect(rights.navigation).toContain(NavigationEntry.PAYOUTS); // from the treasurer
    expect(rights.navigation).toContain(NavigationEntry.AGENDA); // from the moderator
  });

  it('does not duplicate an entry shared by two roles', () => {
    const rights = effectiveRightsOf([MemberRole.VIDEO, MemberRole.SOUND]);
    const streams = rights.navigation.filter((entry) => entry === NavigationEntry.STREAM);
    expect(streams).toHaveLength(1);
  });
});

/**
 * PROTECTED INVARIANT
 *   `canRevenue` decides WHAT THE RESPONSE CONTAINS, not how it is displayed.
 *
 * WHY
 *   A run desk that received the ticketing gross and did not show it is a LEAK:
 *   the payload is in the clear in a WebView, inspectable, and it survives in
 *   the phone's HTTP cache.
 */
describe('the three cross-cutting capabilities', () => {
  it('gives revenue to artist, production and treasury — to them alone', () => {
    expect(canRevenue([MemberRole.ARTIST])).toBe(true);
    expect(canRevenue([MemberRole.PRODUCTION])).toBe(true);
    expect(canRevenue([MemberRole.TREASURY])).toBe(true);
    expect(canRevenue([MemberRole.DIRECTOR])).toBe(false);
    expect(canRevenue([MemberRole.COORDINATION])).toBe(false);
    expect(canRevenue([MemberRole.MODERATION])).toBe(false);
  });

  it('reserves the outcome decision to the owner and to production', () => {
    // Postpone, cancel, compensate: the others can only REPORT.
    expect(canDecide([MemberRole.ARTIST])).toBe(true);
    expect(canDecide([MemberRole.PRODUCTION])).toBe(true);
    expect(canDecide([MemberRole.TREASURY])).toBe(false);
    expect(canDecide([MemberRole.DIRECTOR, MemberRole.COORDINATION])).toBe(false);
  });

  it('gives nothing to someone with no role', () => {
    const rights = effectiveRightsOf([]);
    expect(rights.navigation).toEqual([]);
    expect(rights.openPanes).toEqual([]);
    expect(rights.canRevenue).toBe(false);
    expect(rights.canDecide).toBe(false);
  });
});
