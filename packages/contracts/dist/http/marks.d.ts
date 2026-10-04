/**
 * Marks a schema carries for the server to read: a field that must never be logged or cached
 * (`sensitive`), and a field only some callers may see (`restricted`). The mark is metadata, so the
 * schema parses as before; `sensitivePathsOf` and `restrictedFieldsOf` walk a schema and say where
 * each mark is, so the server redacts and projects from the declaration and no field list is
 * written twice.
 */
import { z } from 'zod';
export declare const SENSITIVE_KEY = "x-arthome-sensitive";
export declare const RESTRICTED_KEY = "x-arthome-restricted";
/** A password, a token, a stream key: `format: password` in the document, redacted from logs, never cached. */
export declare function sensitive<S extends z.ZodType>(schema: S): S;
/**
 * A field present only for a caller who holds `right`: optional in the type and in the document,
 * absent from the answer otherwise, never present and null.
 */
export declare function restricted<S extends z.ZodType, const Right extends string>(schema: S, right: Right): z.ZodOptional<S>;
/** The dotted paths of the sensitive fields: `reauthToken`, `data.streamKey`, `items[].secret`. */
export declare function sensitivePathsOf(schema: z.ZodType): readonly string[];
export interface RestrictedField {
    readonly path: string;
    readonly right: string;
}
/** Each restricted field with the right that unlocks it. */
export declare function restrictedFieldsOf(schema: z.ZodType): readonly RestrictedField[];
//# sourceMappingURL=marks.d.ts.map