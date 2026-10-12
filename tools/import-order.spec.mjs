import { describe, expect, it } from 'vitest';

import { importOrder } from '@arthome/tooling/eslint/base';

describe('importOrder', () => {
  it('without a workspace scope, it is the floor options', () => {
    expect(importOrder({ workspaceScopes: [] })).toStrictEqual({
      groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
      pathGroups: [{ pattern: '@arthome/**', group: 'internal', position: 'before' }],
      pathGroupsExcludedImportTypes: ['builtin'],
      'newlines-between': 'always',
      alphabetize: { order: 'asc', caseInsensitive: true },
    });
  });

  it("with the platform's scope, it is the platform's options", () => {
    expect(importOrder({ workspaceScopes: ['@arthome-platform'] })).toStrictEqual({
      groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
      pathGroups: [
        { pattern: '@arthome/**', group: 'internal', position: 'before' },
        { pattern: '@arthome-platform/**', group: 'external', position: 'before' },
      ],
      pathGroupsExcludedImportTypes: ['builtin'],
      distinctGroup: false,
      'newlines-between': 'always',
      alphabetize: { order: 'asc', caseInsensitive: true },
    });
  });
});
