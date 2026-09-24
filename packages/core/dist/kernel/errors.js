/**
 * A domain error carries a CODE, never a sentence.
 *
 * The "i18n by codes" decision: the API returns codes and their parameters,
 * error envelope included. An English message reaching a screen leaks i18n from
 * the first form error onwards — and it is the payment form that leaks first.
 */
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
export const FAILURE_NATURES = ['refused', 'unavailable', 'offline_forbidden'];
export const FailureNature = {
    REFUSED: 'refused',
    UNAVAILABLE: 'unavailable',
    OFFLINE_FORBIDDEN: 'offline_forbidden',
};
/** An invariant violation. It carries no text: it carries a code. */
export class DomainError extends Error {
    code;
    params;
    nature;
    constructor(init) {
        super(init.code);
        this.name = 'DomainError';
        this.code = init.code;
        this.params = init.params ?? {};
        this.nature = init.nature ?? FailureNature.REFUSED;
    }
}
export function isDomainError(value) {
    return value instanceof DomainError;
}
//# sourceMappingURL=errors.js.map