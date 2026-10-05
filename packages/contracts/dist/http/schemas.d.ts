/** Schemas that several routes repeat, written once. */
import { z } from 'zod';
import type { VocabularyIn } from '@arthome/core/schema';
/** The proof `recentAuth()` reads: the body of a route that requires it extends this. */
export declare const ReauthProof: z.ZodObject<{
    reauthToken: z.ZodString;
}, z.core.$strip>;
/** The data of a removal: replayed on something already removed, it still succeeds. */
export declare const Deleted: z.ZodOptional<z.ZodObject<{
    deleted: z.ZodOptional<z.ZodBoolean>;
}, z.core.$loose>>;
/** The data of an action that answers only that it was done. */
export declare const Acknowledged: z.ZodOptional<z.ZodObject<{
    accepted: z.ZodOptional<z.ZodBoolean>;
}, z.core.$loose>>;
type ValidUntil = z.ZodOptional<z.ZodNullable<z.ZodString>>;
/** `schema` with the `validUntil` the envelope declares, for data that stops being true at an instant. */
export declare function perishable<S extends z.core.$ZodShape, C extends z.core.$ZodObjectConfig>(schema: z.ZodObject<S, C>): z.ZodObject<S & {
    validUntil: ValidUntil;
}, C>;
/** A request vocabulary no domain owns: `source: none`, and why. */
export declare function localVocabulary<const T extends readonly [string, ...string[]]>(values: T, reason: string): VocabularyIn<T>;
export {};
//# sourceMappingURL=schemas.d.ts.map