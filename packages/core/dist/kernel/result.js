/**
 * An explicit result, for rules that refuse without that being a bug.
 *
 * `decideWatch` is the archetype: an entitlement refusal is an ANSWER, not an
 * exception — and it carries a code that five surfaces display differently.
 */
export function ok(value) {
    return { ok: true, value };
}
export function err(code, params = {}) {
    return { ok: false, code, params };
}
export function isOk(result) {
    return result.ok;
}
//# sourceMappingURL=result.js.map