import { z } from 'zod';

import type { VocabularyIn } from '@arthome/core/schema';
import { uuidIn, uuidOut } from '@arthome/core/schema';

import type { PathParameter } from '../../http/index.js';
import { localVocabulary } from '../../http/index.js';

const PAIRING_INTENTS = ['signin', 'seat', 'plan', 'payment_method', 'merch'] as const;
const PAIRING_DECISIONS = ['approve', 'deny'] as const;
const LOCAL_CONTRACT_REASON =
  'A vocabulary local to this contract. The domain neither produces nor consumes these values — they describe what this endpoint offers, and a new member is an endpoint change.';
const DECISION_REASON =
  "The two answers this one command accepts. It is the command's shape, not a vocabulary: a third answer would be a third command.";

export const PairingIdParameter: PathParameter<'pairingId', z.ZodString> = {
  name: 'pairingId',
  in: 'path',
  required: true,
  schema: uuidIn(),
};

export const CreatePairingBodySchema: z.ZodObject<
  {
    intent: VocabularyIn<typeof PAIRING_INTENTS>;
    deviceId: z.ZodString;
    payload: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>;
  },
  z.core.$strip
> = z.object({
  intent: localVocabulary(PAIRING_INTENTS, LOCAL_CONTRACT_REASON),
  deviceId: uuidOut(),
  payload: z
    .looseObject({})
    .meta({
      description:
        'Depends on the intent and stays **opaque to `identity`**, which relays it to the target\nservice. `identity` knows nothing of seats, plans or payments: it carries an appointment and\na pointer.\n',
    })
    .optional(),
});

export const EngagePairingBodySchema: z.ZodObject<
  { note: z.ZodOptional<z.ZodNullable<z.ZodString>> },
  z.core.$strip
> = z.object({
  note: z
    .string()
    .nullable()
    .meta({ description: 'Optional trace of the engaged journey, for the audit log.' })
    .optional(),
});

export const DecidePairingBodySchema: z.ZodObject<
  {
    decision: VocabularyIn<typeof PAIRING_DECISIONS>;
    outcomeRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  z.core.$strip
> = z.object({
  decision: localVocabulary(PAIRING_DECISIONS, DECISION_REASON),
  outcomeRef: z
    .string()
    .nullable()
    .meta({
      description:
        "The **opaque** pointer to what the phone's normal journey produced — set by the BFF after\n`ticketing` has executed, with **its own** `Idempotency-Key`. No duplication of ticketing:\n`ticketing` implements **no** short code.\n",
    })
    .optional(),
});

export type CreatePairingBody = z.output<typeof CreatePairingBodySchema>;
export type EngagePairingBody = z.output<typeof EngagePairingBodySchema>;
export type DecidePairingBody = z.output<typeof DecidePairingBodySchema>;
