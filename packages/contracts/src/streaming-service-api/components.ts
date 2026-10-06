import type { z } from 'zod';

import type { ErrorCode } from '@arthome/core';
import { uuidIn } from '@arthome/core/schema';

import type { AccessorOf, PathParameter, RouteBuilder } from '../http/index.js';
import { accessorOf, routeBuilder, serviceConventions, serviceErrors } from '../http/index.js';

const STREAMING_SERVICE_TAGS = ['run', 'playback'] as const;

/** The tags streaming's document groups its operations by. */
export const StreamingServiceTag: AccessorOf<typeof STREAMING_SERVICE_TAGS> =
  accessorOf(STREAMING_SERVICE_TAGS);

export const DateIdParameter: PathParameter<'dateId', z.ZodString> = {
  name: 'dateId',
  in: 'path',
  required: true,
  schema: uuidIn().meta({ examples: ['019928a0-7d31-7a10-b8c4-2f9e11a4c001'] }),
};

export const streamingServiceV1: RouteBuilder<
  1,
  readonly [],
  Record<never, never>,
  ErrorCode,
  typeof serviceConventions
> = routeBuilder(serviceErrors).version(1).conventions(serviceConventions);
