/**
 * The two clocks at the boundary.
 *
 * `VenueClock` carries the IANA identifier AND the offset the server computed
 * for the instant being qualified, because "the viewer's time first, the
 * venue's second when it differs" is inapplicable if either is missing.
 *
 * ⚠ The offset is SERVED, never stored — that is not a return to D3's frozen
 * `utcOffsetMin`. A stored offset does not survive a daylight-saving change and
 * a date scheduled six months out displays at the wrong hour. A served one is
 * recomputed per instant, so the computation happens once, on the server,
 * rather than in five applications each bundling a time zone database.
 */
import { z } from 'zod';
import { IanaTimeZoneSchema } from './primitives.js';
export const VenueClockSchema = z.object({
    venueTimezone: IanaTimeZoneSchema,
    // Real offsets run from −12:00 to +14:00. A wider bound would accept a value
    // no clock on earth produces, which is how a frozen offset got in once.
    venueUtcOffsetMin: z.int().min(-720).max(840),
});
//# sourceMappingURL=time.js.map