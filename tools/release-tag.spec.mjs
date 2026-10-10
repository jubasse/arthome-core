import { describe, expect, it } from 'vitest';

import { parseReleaseTag, releaseOf } from './release-tag.mjs';

describe('releaseOf', () => {
  it('accepts a plain version tag at the packages version', () => {
    expect(releaseOf('v0.2.0', '0.2.0')).toEqual({
      base: '0.2.0',
      version: '0.2.0',
      isCandidate: false,
    });
  });

  it('accepts a release candidate and stamps it', () => {
    expect(releaseOf('v0.2.0-rc.1', '0.2.0')).toEqual({
      base: '0.2.0',
      version: '0.2.0-rc.1',
      isCandidate: true,
    });
  });

  it('refuses a candidate whose base differs from the packages version', () => {
    expect(() => releaseOf('v0.2.1-rc.1', '0.2.0')).toThrow('the packages are at 0.2.0');
  });

  it('refuses any other pre-release form', () => {
    expect(() => parseReleaseTag('v0.2.0-beta.1')).toThrow('neither');
    expect(() => parseReleaseTag('v0.2.0-rc')).toThrow('neither');
  });

  it('refuses a tag without the v prefix', () => {
    expect(() => parseReleaseTag('0.2.0')).toThrow('neither');
  });
});
