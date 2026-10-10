/**
 * Territorial rights — and the reason is a CODE, never a sentence.
 *
 * A broadcast is WORLDWIDE BY DEFAULT and a restriction is declared: the opposite of VOD, and right
 * for live performance. E8: `blackoutReasons[]` carried `label` and `labelEn`, prose written into
 * the data, which is the i18n leak "i18n by codes" forbids.
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
/** The country a viewer is served under when the edge resolves none: ISO 3166-1's user-assigned `ZZ`. */
export declare const UNRESOLVED_COUNTRY = "ZZ";
/**
 * Can the viewer watch from this country?
 *
 * The country is an ARGUMENT resolved at every opening, never a global nor a projection: it
 * changes between two reads — travel, roaming, corporate network. An unresolved country watches a
 * worldwide date and no restricted one: a restriction fails closed for the rights holder.
 */
export declare function isAvailableIn(rights: TerritoryRights, viewerCountry: string): boolean;
/** The reason for the refusal, as a CODE — served with the error, so no second request. */
export declare function blackoutReasonOf(rights: TerritoryRights, viewerCountry: string): BlackoutReason | null;
//# sourceMappingURL=rights.d.ts.map