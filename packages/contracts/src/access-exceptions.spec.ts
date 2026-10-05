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

const PUBLIC_WRITES: Readonly<Record<string, string>> = {
  confirmEmailVerification: 'a one-time link opens no session',
  exchangeOneTimeToken:
    'opens a cookie session; held by JSON-only bodies, the preflight and SameSite=Lax',
  registerDevice: 'a device registers before any session',
  requestPasswordReset: 'sends a mail and opens no session',
  resetPassword: 'proved by the reset token, opens no session',
  signIn: 'opens a cookie session; held by JSON-only bodies, the preflight and SameSite=Lax',
  signUp: 'opens a cookie session; held by JSON-only bodies, the preflight and SameSite=Lax',
  startSocialSignIn: 'starts a redirect and opens no session',
  verifyTwoFactor:
    'opens a cookie session; held by JSON-only bodies, the preflight and SameSite=Lax',
  requestPasswordResetStudio: 'sends a mail and opens no session',
  signInStudio: 'opens a cookie session; held by JSON-only bodies, the preflight and SameSite=Lax',
  verifyTwoFactorStudio:
    'opens a cookie session; held by JSON-only bodies, the preflight and SameSite=Lax',
};

const publicWrites = (): string[] =>
  [storefrontApi, studioApi].flatMap((api: Api) =>
    Object.values(api.routes)
      .filter((route) => route.access?.kind === 'anyone' && route.method !== 'get')
      .map((route) => route.operationId),
  );

describe('the exceptions to an identity, named where the documentation names them', () => {
  it('exempts only signOut from the CSRF token', () => {
    expect(routesDeclaring('csrfExempt')).toEqual(['signOut']);
  });

  it('treats a refused credential as none only on signOut', () => {
    expect(routesDeclaring('refusedCredentialIsAnonymous')).toEqual(['signOut']);
  });

  it('lists every public write with the reason it needs no CSRF token', () => {
    expect(publicWrites().sort()).toEqual(Object.keys(PUBLIC_WRITES).sort());
  });
});
