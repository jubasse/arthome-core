/** The floor: clock, errors, results, branded identifiers. No rules. */
export { brandId } from './brand.js';
// `FailureNature` is both a type and an object of named members: the re-export
// carries both meanings of the name.
export { DomainError, FAILURE_NATURES, FailureNature, isDomainError } from './errors.js';
export { err, isOk, ok } from './result.js';
export { FixedClock, SystemClock } from './clock.js';
//# sourceMappingURL=index.js.map