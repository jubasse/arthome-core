/**
 * The two clocks at the boundary. `VenueClock` carries the IANA identifier and the offset the
 * server computed for the instant being qualified, because "the viewer's time first, the
 * venue's second when it differs" is inapplicable if either is missing.
 *
 * ⚠ The offset is served, never stored — not a return to D3's frozen `utcOffsetMin`. A stored
 * offset does not survive a daylight-saving change, and a date six months out displays at the
 * wrong hour.
 */
import { z } from 'zod';
export declare const VenueClockSchema: z.ZodObject<{
    venueTimezone: z.ZodString;
    venueUtcOffsetMin: z.ZodInt;
}, z.core.$loose>;
//# sourceMappingURL=time.d.ts.map