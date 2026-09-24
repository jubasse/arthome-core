/**
 * Territorial rights — and the reason is a CODE, never a sentence.
 *
 * `geography.rightsPolicy.note` states it and the rule ports as it stands: "a
 * broadcast is WORLDWIDE BY DEFAULT, a territorial restriction is the
 * exception, and it is declared". That is the opposite of VOD, and it is right
 * for live performance.
 *
 * E8 — what does not port: `blackoutReasons[]` carries `label` and `labelEn`,
 * PROSE WRITTEN INTO THE DATA, while all the rest of the vocabulary goes
 * through `enums.*`. That is an i18n leak into the model, and it is exactly the
 * kind the "i18n by codes" decision exists to forbid.
 */
import type { BlackoutReason } from '../vocabulary/catalog.js';
import { RightsScope } from '../vocabulary/catalog.js';
export interface TerritoryRights {
    readonly scope: RightsScope;
    /** ISO 3166-1 alpha-2. Empty when the scope is worldwide. */
    readonly blackoutCountries: readonly string[];
    /** A CODE. Null when the scope is worldwide. */
    readonly reason: BlackoutReason | null;
}
export declare function worldwideRights(): TerritoryRights;
export declare function restrictedRights(blackoutCountries: readonly string[], reason: BlackoutReason): TerritoryRights;
/**
 * Can the viewer watch from this country?
 *
 * ⚠ The country is an ARGUMENT, never a global. `helpers.js` reads
 * `viewerCountry` at module level, with a `setViewerCountry()` — two concurrent
 * requests of one service would share the same country.
 *
 * ⚠ And the country is RESOLVED AT EVERY OPENING, never from a projection: it
 * changes between two reads — travel, roaming, corporate network — and on
 * mobile that gap is measured in hours.
 */
export declare function isAvailableIn(rights: TerritoryRights, viewerCountry: string): boolean;
/**
 * The reason for the refusal, as a CODE — to be served with the error.
 *
 * `storefront-mobile` asks for it explicitly: the copy promises that "the other
 * dates of this show remain available", so the error must carry the reason AND
 * enough to keep the promise. An error that promises a way out without carrying
 * it forces the client into a second request at the worst moment.
 */
export declare function blackoutReasonOf(rights: TerritoryRights, viewerCountry: string): BlackoutReason | null;
//# sourceMappingURL=rights.d.ts.map