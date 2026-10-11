import { z } from 'zod';
/**
 * What MediaMTX's external HTTP authentication posts, as it posts it: MediaMTX's words, not core's,
 * so `action` and `protocol` stay plain strings and an unknown value is kept raw. Loose, because a
 * later MediaMTX may add fields.
 */
export declare const MediaServerAuthorizationSchema: z.ZodObject<{
    action: z.ZodString;
    path: z.ZodString;
    protocol: z.ZodString;
    ip: z.ZodOptional<z.ZodString>;
    user: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    token: z.ZodOptional<z.ZodString>;
    query: z.ZodOptional<z.ZodString>;
    userAgent: z.ZodOptional<z.ZodString>;
    id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$loose>;
export type MediaServerAuthorization = z.output<typeof MediaServerAuthorizationSchema>;
//# sourceMappingURL=schemas.d.ts.map