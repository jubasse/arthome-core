/** Le socle : horloge, erreurs, resultats, identifiants marques. Aucune regle. */

export type {
  AccountId,
  ArtistId,
  Brand,
  ChannelId,
  DateId,
  DeviceId,
  MessageId,
  OrderId,
  PersonId,
  ProfileId,
  SeatId,
  ShowId,
  VenueId,
} from './brand.js';
export { brandId } from './brand.js';

export type { DomainErrorInit, MessageParams } from './errors.js';
// `FailureNature` est a la fois un type et un objet de membres nommes : la
// re-exportation porte les deux sens du nom.
export { DomainError, FAILURE_NATURES, FailureNature, isDomainError } from './errors.js';

export type { Err, Ok, Result } from './result.js';
export { err, isOk, ok } from './result.js';

export type { Clock, Instant } from './clock.js';
export { FixedClock, SystemClock } from './clock.js';
