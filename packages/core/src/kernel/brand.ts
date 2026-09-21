/**
 * Identifiants marques — un `DateId` n'est pas un `ShowId`, et le compilateur
 * le sait.
 *
 * `shared/helpers.js` manipule des identifiants en `string` nus, ce qui laisse
 * passer `datesOfShow(artistId)` sans un mot. Sur sept contextes qui echangent
 * neuf familles d'identifiants, c'est une faute qui arrive.
 */

declare const brand: unique symbol;

/** Un type nominal : structurellement une chaine, distinct a la compilation. */
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
 * Marque une chaine deja validee a la frontiere.
 *
 * Volontairement sans verification : la forme est verifiee UNE FOIS par zod,
 * dans `@arthome/core/schema`. La revalider ici ferait payer la dependance a
 * chaque evaluation d'une regle, sur le chemin le plus chaud du systeme.
 */
export function brandId<T extends Brand<string>>(value: string): T {
  return value as T;
}
