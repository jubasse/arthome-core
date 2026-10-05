import { z } from 'zod';
import type { VocabularyIn } from '@arthome/core/schema';
import type { PathParameter } from '../../http/index.js';
declare const PAIRING_INTENTS: readonly ["signin", "seat", "plan", "payment_method", "merch"];
declare const PAIRING_DECISIONS: readonly ["approve", "deny"];
export declare const PairingIdParameter: PathParameter<'pairingId', z.ZodString>;
export declare const CreatePairingBodySchema: z.ZodObject<{
    intent: VocabularyIn<typeof PAIRING_INTENTS>;
    deviceId: z.ZodString;
    payload: z.ZodOptional<z.ZodObject<Record<never, never>, z.core.$loose>>;
}, z.core.$strip>;
export declare const EngagePairingBodySchema: z.ZodObject<{
    note: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const DecidePairingBodySchema: z.ZodObject<{
    decision: VocabularyIn<typeof PAIRING_DECISIONS>;
    outcomeRef: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type CreatePairingBody = z.output<typeof CreatePairingBodySchema>;
export type EngagePairingBody = z.output<typeof EngagePairingBodySchema>;
export type DecidePairingBody = z.output<typeof DecidePairingBodySchema>;
export {};
//# sourceMappingURL=schemas.d.ts.map