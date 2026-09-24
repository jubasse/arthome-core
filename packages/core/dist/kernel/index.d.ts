/** The floor: clock, errors, results, branded identifiers. No rules. */
export type { AccountId, ArtistId, Brand, ChannelId, DateId, DeviceId, MessageId, OrderId, PersonId, ProfileId, SeatId, ShowId, VenueId, } from './brand.js';
export { brandId } from './brand.js';
export type { DomainErrorInit, MessageParams } from './errors.js';
export { DomainError, FAILURE_NATURES, FailureNature, isDomainError } from './errors.js';
export type { Err, Ok, Result } from './result.js';
export { err, isOk, ok } from './result.js';
export type { Clock, Instant } from './clock.js';
export { FixedClock, SystemClock } from './clock.js';
//# sourceMappingURL=index.d.ts.map