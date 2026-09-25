import { describe, expect, it } from 'vitest';

import { assignableRolesOf } from './grants.js';
import { canDecide, canRevenue, effectiveRightsOf } from './rights.js';
import { MemberRole, NavigationEntry } from '../vocabulary/people.js';

/**
 * ⚠ E6: authorising on the six-persona label grants a sound engineer an
 * invitation right they do not have. The case that hurts is two roles held,
 * where the temptation of a "rank" comes back.
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
    // Reduced to "run desk" and "mod", these two would look as if they granted something.
    expect(assignableRolesOf([MemberRole.VIDEO, MemberRole.MODERATION])).toEqual([]);
  });

  it('takes the UNION of the roles held, never a maximum', () => {
    const union = assignableRolesOf([MemberRole.DIRECTOR, MemberRole.COORDINATION]);
    // `coordination` brings `director` and `moderation`, `director` brings the rest.
    expect([...union].sort()).toEqual(['director', 'moderation', 'sound', 'video']);
  });
});

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
 * ⚠ `canRevenue` decides what the response CONTAINS: a payload sent and not
 * displayed is a leak — in the clear in a WebView, and in the phone's HTTP cache.
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
    // Postpone, cancel, compensate: the others can only report.
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
