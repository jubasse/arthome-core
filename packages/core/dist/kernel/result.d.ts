/**
 * An explicit result, for rules that refuse without that being a bug.
 *
 * `decideWatch` is the archetype: an entitlement refusal is an ANSWER, not an
 * exception — and it carries a code that five surfaces display differently.
 */
import type { MessageParams } from './errors.js';
export interface Ok<T> {
    readonly ok: true;
    readonly value: T;
}
export interface Err {
    readonly ok: false;
    readonly code: string;
    readonly params: MessageParams;
}
export type Result<T> = Ok<T> | Err;
export declare function ok<T>(value: T): Ok<T>;
export declare function err(code: string, params?: MessageParams): Err;
export declare function isOk<T>(result: Result<T>): result is Ok<T>;
//# sourceMappingURL=result.d.ts.map