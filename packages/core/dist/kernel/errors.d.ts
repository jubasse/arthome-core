/**
 * A domain error carries a CODE, never a sentence.
 *
 * The "i18n by codes" decision: the API returns codes and their parameters,
 * error envelope included. An English message reaching a screen leaks i18n from
 * the first form error onwards — and it is the payment form that leaks first.
 */
/** Message parameters, resolved by the surface against its catalogue. */
export type MessageParams = Readonly<Record<string, string | number | boolean>>;
/**
 * The NATURE of a failure, which `studio-mobile` asked for and which was
 * missing.
 *
 * This is the decision an on-call person has to make in ten seconds: retry,
 * understand, or pick up the escalation phone.
 *
 * `offline_forbidden` is NEVER emitted by a server: it is the nature of a local
 * refusal, before anything is sent. It is in the vocabulary so the surface has
 * a single error shape to render.
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