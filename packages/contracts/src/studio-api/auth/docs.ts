import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const authDocs: ModuleDocs = {
  signInStudio: {
    description:
      "**Documented relay to `identity`**, and mandatory for the same three reasons as on the\nstorefront side: zod is the source and the OpenAPI is generated from it — a transparent relay\nwould not appear here; i18n by codes forbids the library's English sentences; and per-device\nrate limiting does not exist in it.\n\nThe response carries **the full bootstrap**, not a raw session shape: the surface paints\nnothing before it, and a second call would be one more blank screen.\n\n`identity.two_factor_required` carries a `challengeId`. Two-factor authentication is a **precondition**\nof transferring ownership of a channel.\n",
    upstream: [Service.IDENTITY],
    idempotencyExemption:
      'A session opening must **always** re-authenticate: returning a memorised response would\namount to issuing a token without checking the credentials. The protection against a double\nsubmit is rate limiting, not the idempotency store.\n',
  },
  verifyTwoFactorStudio: {
    description: 'Short-lived, single-use `challengeId`; a spent backup code cannot be replayed.',
    upstream: [Service.IDENTITY],
  },
  requestPasswordResetStudio: {
    description:
      "**Always answers `202`**, whether the account exists or not. The email's link points at\n**`studio.arthome.fr/reset`** — the surface, per product and per language — never at the API:\nthe library's default would build it from its base address and would land the person on an\nAPI entry point.\n",
    upstream: [Service.IDENTITY],
  },
};
