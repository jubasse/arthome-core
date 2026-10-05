/** A domain error carries a code and its parameters, never a sentence: i18n by codes. */
import type { ErrorParamsOf, NoErrorParams, RaisableErrorCode } from './error-params.js';
/** Message parameters, resolved by the surface against its catalogue. */
export type MessageParams = Readonly<Record<string, string | number | boolean>>;
/**
 * The nature of a failure: retry, understand, or escalate.
 *
 * `offline_forbidden` is never emitted by a server — it is a local refusal,
 * in the vocabulary so the surface has a single error shape to render.
 */
export declare const FAILURE_NATURES: readonly ["refused", "unavailable", "offline_forbidden"];
export type FailureNature = (typeof FAILURE_NATURES)[number];
export declare const FailureNature: {
    readonly REFUSED: "refused";
    readonly UNAVAILABLE: "unavailable";
    readonly OFFLINE_FORBIDDEN: "offline_forbidden";
};
/** A code's nature, for the error a domain raises and for the error a route documents. */
export declare function natureOf(code: RaisableErrorCode): FailureNature;
/** `params` may be left out only where the code's params accept none. */
type ParamsField<P> = NoErrorParams extends P ? {
    readonly params?: P;
} : {
    readonly params: P;
};
export type DomainErrorInit<C extends RaisableErrorCode> = {
    readonly code: C;
} & ParamsField<ErrorParamsOf<C>>;
/** An invariant violation. It carries no text: it carries a code, and the params that code takes. */
export declare class DomainError<C extends RaisableErrorCode = RaisableErrorCode> extends Error {
    readonly code: C;
    readonly params: ErrorParamsOf<C>;
    readonly nature: FailureNature;
    constructor(init: DomainErrorInit<C>);
}
export declare function isDomainError(value: unknown): value is DomainError;
export {};
//# sourceMappingURL=errors.d.ts.map