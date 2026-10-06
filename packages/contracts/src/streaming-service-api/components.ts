import type { AccessorOf, RouteBuilder, ServiceErrorCode } from '../http/index.js';
import { accessorOf, routeBuilder, serviceConventions, serviceErrors } from '../http/index.js';

const STREAMING_SERVICE_TAGS = ['run', 'playback'] as const;

/** The tags streaming's document groups its operations by. */
export const StreamingServiceTag: AccessorOf<typeof STREAMING_SERVICE_TAGS> =
  accessorOf(STREAMING_SERVICE_TAGS);

export const streamingServiceV1: RouteBuilder<
  1,
  readonly [],
  Record<never, never>,
  ServiceErrorCode,
  typeof serviceConventions
> = routeBuilder(serviceErrors).version(1).conventions(serviceConventions);
