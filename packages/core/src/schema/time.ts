/**
 * The two clocks at the boundary. `VenueClock` carries the IANA identifier and the offset the
 * server computed for the instant being qualified, because "the viewer's time first, the
 * venue's second when it differs" is inapplicable if either is missing.
 *
 * The offset is served, never stored — not a return to D3's frozen `utcOffsetMin`. A stored
 * offset does not survive a daylight-saving change, and a date six months out displays at the
 * wrong hour.
 */

import { z } from 'zod';

import { IanaTimeZoneSchema } from './primitives.js';

export const VenueClockSchema: z.ZodObject<
  {
    venueTimezone: z.ZodString;
    venueUtcOffsetMin: z.ZodInt;
  },
  z.core.$loose
> = z
  .looseObject({
    venueTimezone: IanaTimeZoneSchema.meta({ examples: ['Europe/Paris'] }),
    // Real offsets run from −12:00 to +14:00; a wider bound accepts a value no clock
    // produces, which is how a frozen offset got in once.
    venueUtcOffsetMin: z
      .int()
      .min(-720)
      .max(840)
      .meta({ examples: [120] }),
  })
  .describe(
    "The venue's timezone, served alongside the UTC instant it qualifies. The offset is\n**computed by the server for that instant**, never stored: this is not a return to a frozen\noffset, it is a served value, and it avoids embedding a timezone database in five\napplications.",
  );
