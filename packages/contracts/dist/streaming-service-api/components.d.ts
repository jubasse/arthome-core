import type { z } from 'zod';
import type { ErrorCode } from '@arthome/core';
import type { AccessorOf, PathParameter, RouteBuilder } from '../http/index.js';
import { serviceConventions } from '../http/index.js';
declare const STREAMING_SERVICE_TAGS: readonly ["run", "playback"];
/** The tags streaming's document groups its operations by. */
export declare const StreamingServiceTag: AccessorOf<typeof STREAMING_SERVICE_TAGS>;
export declare const DateIdParameter: PathParameter<'dateId', z.ZodString>;
export declare const streamingServiceV1: RouteBuilder<1, readonly [], Record<never, never>, ErrorCode, typeof serviceConventions>;
export {};
//# sourceMappingURL=components.d.ts.map