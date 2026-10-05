import { describe, expect, it } from 'vitest';

import type { Api } from './http/index.js';
import { storefrontApi } from './storefront-api/index.js';
import { studioApi } from './studio-api/index.js';

const routesDeclaring = (option: 'csrfExempt' | 'refusedCredentialIsAnonymous'): string[] =>
  [storefrontApi, studioApi].flatMap((api: Api) =>
    Object.values(api.routes)
      .filter((route) => route.access?.kind === 'identified' && route.access[option] !== undefined)
      .map((route) => route.operationId),
  );

describe('the exceptions to an identity, named where the documentation names them', () => {
  it('exempts only signOut from the CSRF token', () => {
    expect(routesDeclaring('csrfExempt')).toEqual(['signOut']);
  });

  it('treats a refused credential as none only on signOut', () => {
    expect(routesDeclaring('refusedCredentialIsAnonymous')).toEqual(['signOut']);
  });
});
