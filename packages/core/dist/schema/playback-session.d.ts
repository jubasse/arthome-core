/**
 * One of the viewer's active playback sessions, as `watch.concurrent_limit_reached` carries it in
 * `params.activeSessions`. It lives here because the error params schema reads it, and the
 * streaming contract re-exports it as the `ActivePlaybackSession` component.
 */
import { z } from 'zod';
export declare const ActivePlaybackSessionSchema: z.ZodObject<{
    sessionId: z.ZodString;
    deviceId: z.ZodOptional<z.ZodString>;
    isCurrentDevice: z.ZodOptional<z.ZodBoolean>;
    deviceLabel: z.ZodString;
    city: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    openedAt: z.ZodString;
}, z.core.$loose>;
//# sourceMappingURL=playback-session.d.ts.map