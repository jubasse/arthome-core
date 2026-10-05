import { z } from 'zod';
import { REPLAY_POLICIES } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import type { IdempotencyKeyParameter, IfRightsVersionParameter } from './components.js';
import { ChannelIdParameter, ConflictResponse, ForbiddenResponse, SurfaceParameter, TraceparentParameter, operator } from './components.js';
import { StudioEnvelopeMetaSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, Route, IdentifiedAccess } from '../http/index.js';
import { DateSheetSchema } from '../studio-stage/index.js';
export declare const createDateDraft: Route<{
    method: 'post';
    version: 1;
    path: '/channels/{channelId}/dates';
    parameters: readonly [
        typeof ChannelIdParameter,
        typeof IdempotencyKeyParameter,
        typeof SurfaceParameter,
        typeof TraceparentParameter,
        typeof IfRightsVersionParameter
    ];
    access: IdentifiedAccess<typeof operator, false>;
    requestBody: JsonRequestBody<z.ZodObject<{
        dateId: z.ZodString;
        showId: z.ZodString;
        venueId: z.ZodString;
        startsAt: z.ZodString;
        replayPolicy: VocabularyIn<typeof REPLAY_POLICIES>;
        replayWindowHours: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    }, z.core.$strip>>;
    responses: {
        201: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof DateSheetSchema;
        }, z.core.$loose>>>;
        403: typeof ForbiddenResponse;
        409: typeof ConflictResponse;
    };
}>;
//# sourceMappingURL=publication.d.ts.map