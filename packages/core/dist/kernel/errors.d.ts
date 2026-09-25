/** A domain error carries a code and its parameters, never a sentence: i18n by codes. */
/** Message parameters, resolved by the surface against its catalogue. */
export type MessageParams = Readonly<Record<string, string | number | boolean>>;
/**
 * The nature of a failure: retry, understand, or escalate.
 *
 * ⚠ `offline_forbidden` is never emitted by a server — it is a local refusal,
 * in the vocabulary so the surface has a single error shape to render.
 */
export declare const FAILURE_NATURES: readonly ["refused", "unavailable", "offline_forbidden"];
export type FailureNature = (typeof FAILURE_NATURES)[number];
export declare const FailureNature: {
    readonly REFUSED: "refused";
    readonly UNAVAILABLE: "unavailable";
    readonly OFFLINE_FORBIDDEN: "offline_forbidden";
};
export interface DomainErrorInit {
    readonly code: string;
    readonly params?: MessageParams;
    readonly nature?: FailureNature;
}
/** An invariant violation. It carries no text: it carries a code. */
export declare class DomainError extends Error {
    readonly code: string;
    readonly params: MessageParams;
    readonly nature: FailureNature;
    constructor(init: DomainErrorInit);
}
export declare function isDomainError(value: unknown): value is DomainError;
//# sourceMappingURL=errors.d.ts.map