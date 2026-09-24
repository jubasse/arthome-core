/**
 * Branded identifiers — a `DateId` is not a `ShowId`, and the compiler knows it.
 *
 * `shared/helpers.js` handles identifiers as bare strings, which lets
 * `datesOfShow(artistId)` through without a word. Across seven contexts
 * exchanging nine families of identifier, that is a mistake that happens.
 */
declare const brand: unique symbol;
/** A nominal type: structurally a string, distinct at compile time. */
export type Brand<TBrand extends string> = string & {
    readonly [brand]: TBrand;
};
export type AccountId = Brand<'AccountId'>;
export type ProfileId = Brand<'ProfileId'>;
export type PersonId = Brand<'PersonId'>;
export type DeviceId = Brand<'DeviceId'>;
export type ChannelId = Brand<'ChannelId'>;
export type ArtistId = Brand<'ArtistId'>;
export type ShowId = Brand<'ShowId'>;
export type DateId = Brand<'DateId'>;
export type VenueId = Brand<'VenueId'>;
export type SeatId = Brand<'SeatId'>;
export type OrderId = Brand<'OrderId'>;
export type MessageId = Brand<'MessageId'>;
/**
 * Brands a string that has already been validated at the boundary.
 *
 * Deliberately unchecked: the shape is validated ONCE by zod, in
 * `@arthome/core/schema`. Re-validating here would make every rule evaluation
 * pay for that dependency, on the hottest path in the system.
 */
export declare function brandId<T extends Brand<string>>(value: string): T;
export {};
//# sourceMappingURL=brand.d.ts.map