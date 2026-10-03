/**
 * The claims of the internal token (`context-map.md` §7, `adr-auth.md` §8), one shape for the BFFs
 * that mint it and the services that read it. Loose, so a claim a later slice adds (the studio's
 * channels and roles) reaches a service built before it without failing the call.
 */

import { z } from 'zod';

import { AccountIdSchema, DeviceIdSchema, ProfileIdSchema } from './identifiers.js';
import { vocabularyIn, type VocabularyIn } from './vocabulary.js';
import { INTERNAL_TOKEN_ISSUERS } from '../identity/internal-token.js';

export const InternalTokenClaimsSchema: z.ZodObject<
  {
    iss: VocabularyIn<typeof INTERNAL_TOKEN_ISSUERS>;
    aud: z.ZodString;
    sub: z.ZodOptional<z.ZodString>;
    pro: z.ZodOptional<z.ZodString>;
    did: z.ZodOptional<z.ZodString>;
    iat: z.ZodNumber;
    exp: z.ZodNumber;
  },
  z.core.$loose
> = z.looseObject({
  iss: vocabularyIn(INTERNAL_TOKEN_ISSUERS),
  aud: z.string().min(1),
  /** The account. Absent when the BFF calls for an anonymous visitor: a public read, a sign-up. */
  sub: AccountIdSchema.optional(),
  pro: ProfileIdSchema.optional(),
  did: DeviceIdSchema.optional(),
  /** Seconds since the epoch, numeric inside a JWT (critical rule 6): not an ISO string. */
  iat: z.number().int(),
  exp: z.number().int(),
});

export type InternalTokenClaims = z.output<typeof InternalTokenClaimsSchema>;
