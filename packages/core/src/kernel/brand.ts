/** Branded identifiers: bare strings let `datesOfShow(artistId)` through without a word. */

declare const brand: unique symbol;

/** A nominal type: structurally a string, distinct at compile time. */
export type Brand<TBrand extends string> = string & { readonly [brand]: TBrand };

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
 * Brands a string already validated at the boundary.
 * ⚠ Deliberately unchecked: the shape is validated once by zod in
 * `@arthome/core/schema`, which this entry point may not import.
 */
export function brandId<T extends Brand<string>>(value: string): T {
  return value as T;
}
