/**
 * A union discriminated on one field, in the three forms it is read in. The server is strict: only
 * a declared variant is emitted. The document is a `oneOf` with its `discriminator`, which zod does
 * not write. The client is tolerant (`transport.md` §5.11): a variant it does not know is kept raw
 * and treated as neutral, never a failure, so a variant added later is additive.
 */
import { z } from 'zod';
type Variants = Readonly<Record<string, z.ZodObject>>;
/** Type-only: marks a union as tagged on `Tag`, so the client's view of it can add the unknown variant. */
export interface TaggedBrand<Tag extends string> {
    readonly '~tagged'?: Tag;
}
type Union<Tag extends string, V extends Variants> = {
    [K in keyof V & string]: z.output<V[K]> & Readonly<Record<Tag, K>> & TaggedBrand<Tag>;
}[keyof V & string];
/** A variant the client does not know yet: kept raw, and treated as neutral (`transport.md` §5.11). */
export type UnknownVariant<Tag extends string> = Readonly<Record<Tag, string & {}>> & Readonly<Record<string, unknown>>;
/**
 * What a client may receive: each tagged union of a body gains the unknown variant, so an exhaustive
 * `switch` on the tag must handle it. The server's types do not: it never emits one.
 */
export type ClientView<T> = T extends readonly (infer Item)[] ? ClientView<Item>[] : T extends TaggedBrand<infer Tag> ? string extends Tag ? {
    [K in keyof T]: ClientView<T[K]>;
} : T | UnknownVariant<Tag> : T extends object ? {
    [K in keyof T]: ClientView<T[K]>;
} : T;
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