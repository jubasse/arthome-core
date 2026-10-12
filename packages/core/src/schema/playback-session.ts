/**
 * One of the viewer's active playback sessions, as `watch.concurrent_limit_reached` carries it in
 * `params.activeSessions`. It lives here because the error params schema reads it, and the
 * streaming contract re-exports it as the `ActivePlaybackSession` component.
 */

import { z } from 'zod';

import { InstantOut, uuidOut } from './primitives.js';

export const ActivePlaybackSessionSchema: z.ZodObject<
  {
    sessionId: z.ZodString;
    deviceId: z.ZodOptional<z.ZodString>;
    isCurrentDevice: z.ZodOptional<z.ZodBoolean>;
    deviceLabel: z.ZodString;
    city: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    openedAt: z.ZodString;
  },
  z.core.$loose
> = z
  .looseObject({
    sessionId: uuidOut(),
    deviceId: uuidOut()
      .optional()
      .describe(
        '**Served, because without it the list is not actionable.** The surface must be able to\nrecognise **its own** session in order to offer "resume here" rather than "release another\nscreen", and a device label is not enough: two phones of the same model carry the same one.\n',
      ),
    isCurrentDevice: z.boolean().optional(),
    deviceLabel: z.string().meta({ examples: ['Téléviseur du salon'] }),
    city: z.string().nullable().optional(),
    openedAt: InstantOut,
  })
  .describe(
    'Served **with** the `watch.concurrent_limit_reached` refusal, so the surface can offer to release\none. A bare refusal would leave the viewer with no way out.\n',
  );
