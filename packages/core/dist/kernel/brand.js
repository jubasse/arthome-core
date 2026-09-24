/**
 * Branded identifiers — a `DateId` is not a `ShowId`, and the compiler knows it.
 *
 * `shared/helpers.js` handles identifiers as bare strings, which lets
 * `datesOfShow(artistId)` through without a word. Across seven contexts
 * exchanging nine families of identifier, that is a mistake that happens.
 */
/**
 * Brands a string that has already been validated at the boundary.
 *
 * Deliberately unchecked: the shape is validated ONCE by zod, in
 * `@arthome/core/schema`. Re-validating here would make every rule evaluation
 * pay for that dependency, on the hottest path in the system.
 */
export function brandId(value) {
    return value;
}
//# sourceMappingURL=brand.js.map