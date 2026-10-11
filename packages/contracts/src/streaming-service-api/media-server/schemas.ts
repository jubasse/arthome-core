import { z } from 'zod';

import { sensitive } from '../../http/index.js';

/**
 * What MediaMTX's external HTTP authentication posts, as it posts it: MediaMTX's words, not core's,
 * so `action` and `protocol` stay plain strings and an unknown value is kept raw. Loose, because a
 * later MediaMTX may add fields.
 */
export const MediaServerAuthorizationSchema: z.ZodObject<
  {
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
  },
  z.core.$loose
> = z
  .looseObject({
    action: z.string().meta({
      description:
        "MediaMTX's action: `publish`, `read`, `playback`, `api`, `metrics` or `pprof`. Only `publish` is\naccepted; any other is refused `403`.\n",
    }),
    path: z
      .string()
      .meta({ description: 'The MediaMTX path of the attempt: `live/...` for a feed.' }),
    protocol: z.string().meta({
      description:
        'The protocol of the attempt: `rtsp`, `rtmp`, `hls`, `webrtc`, `srt`, or a later one.',
    }),
    ip: z.string().optional(),
    user: z.string().optional(),
    password: sensitive(z.string()).optional(),
    token: sensitive(z.string()).optional(),
    query: sensitive(z.string())
      .optional()
      .describe(
        'The query string of the attempt. It can carry the stream key, `?pass=` or `?token=`.',
      ),
    userAgent: z.string().optional(),
    id: z.string().nullable().optional(),
  })
  .meta({
    description:
      'The body is loose and only three fields are marked sensitive: a service logs an allow-list (`action`, `path`, `protocol`, `id`, `ip`), never the parsed body.',
  });

export type MediaServerAuthorization = z.output<typeof MediaServerAuthorizationSchema>;
