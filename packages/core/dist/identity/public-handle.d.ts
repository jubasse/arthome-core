/**
 * The handle a new viewer is given at sign-up (auth Q3, 2026-10-03): generated and neutral, so
 * nothing personal becomes public by default, and changeable later through `updateProfile`. Never
 * derived from the email, which would publish its local part, nor from the display name, which
 * would publish a name nobody chose to make public.
 */
/** 32 symbols, so a byte masked to five bits picks one without bias. No `l`, `o`, `0`, `1`. */
export declare const GENERATED_HANDLE_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
/** 32^8 = 2^40 handles: a collision is rare, and the caller retries it with fresh bytes. */
export declare const GENERATED_HANDLE_RANDOM_LENGTH = 8;
/**
 * A handle `PublicHandleSchema` accepts, from the first `GENERATED_HANDLE_RANDOM_LENGTH` bytes.
 * The bytes come from the caller because this entry point imports no Node API.
 */
export declare function generatedPublicHandle(randomBytes: Uint8Array): string;
//# sourceMappingURL=public-handle.d.ts.map