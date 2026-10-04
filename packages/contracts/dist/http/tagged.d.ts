/**
 * A union discriminated on one field, in the three forms it is read in. The server is strict: only
 * a declared variant is emitted. The document is a `oneOf` with its `discriminator`, which zod does
 * not write. The client is tolerant (`transport.md` §5.11): a variant it does not know is kept raw
 * and treated as neutral, never a failure, so a variant added later is additive.
 */
import { z } from 'zod';
type Variants = Readonly<Record<string, z.ZodObject>>;
type Union<Tag extends string, V extends Variants> = {
    [K in keyof V & string]: z.output<V[K]> & Readonly<Record<Tag, K>>;
}[keyof V & string];
/**
 * `tagged('outcome', { succeeded: Succeeded, declined: Declined })`: each variant is an object
 * schema without the tag, and the helper adds it. Two keys may name one schema (a variant that
 * serves two tag values), and its tag then takes both.
 */
export declare function tagged<const Tag extends string, const V extends Variants>(tag: Tag, variants: V): z.ZodType<Union<Tag, V>>;
export type TolerantParse = {
    readonly ok: true;
    readonly value: unknown;
    readonly unknownVariants: readonly string[];
} | {
    readonly ok: false;
    readonly error: z.ZodError;
};
/**
 * Parses with the schema, and accepts a value whose only faults are variants of a tagged union it
 * does not know: the value comes back raw, with the unknown tags named.
 */
export declare function parseTolerant(schema: z.ZodType, value: unknown): TolerantParse;
export {};
//# sourceMappingURL=tagged.d.ts.map