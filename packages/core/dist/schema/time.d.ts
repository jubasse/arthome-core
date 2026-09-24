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
export declare const VenueClockSchema: z.ZodObject<{
    venueTimezone: z.ZodString;
    venueUtcOffsetMin: z.ZodInt;
}, z.core.$loose>;
//# sourceMappingURL=time.d.ts.map