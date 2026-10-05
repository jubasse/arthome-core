import { z } from 'zod';
import type { VocabularyIn } from '@arthome/core/schema';
import { BadRequestResponse, ChannelIdParameter, IdempotencyKeyParameter, IfRightsVersionParameter, SurfaceParameter, TraceparentParameter } from './components.js';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonRequestBody, JsonResponse, Route } from '../http/index.js';
import { UploadTicketSchema } from '../studio-stage/index.js';
declare const CREATE_UPLOAD_TICKET_PURPOSE: readonly ["poster", "wide", "avatar", "merch_image"];
declare const CREATE_UPLOAD_TICKET_CONTENT_TYPE: readonly ["image/jpeg", "image/png", "image/webp"];
export declare const deleteChannel: Route<{
    method: 'delete';
    version: 1;
    path: '/channels/{channelId}';
    parameters: readonly [
        typeof ChannelIdParameter,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        reauthToken: z.ZodString;
        confirmName: z.ZodString;
    }, z.core.$strip>>;
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: z.ZodOptional<z.ZodObject<{
                deleted: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$loose>>;
        }, z.core.$loose>>>;
        409: JsonResponse<typeof StudioErrorEnvelopeSchema>;
    };
}>;
export declare const createUploadTicket: Route<{
    method: 'post';
    version: 1;
    path: '/uploads';
    parameters: readonly [
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter,
        typeof IdempotencyKeyParameter
    ];
    requestBody: JsonRequestBody<z.ZodObject<{
        purpose: VocabularyIn<typeof CREATE_UPLOAD_TICKET_PURPOSE>;
        contentType: VocabularyIn<typeof CREATE_UPLOAD_TICKET_CONTENT_TYPE>;
        sizeBytes: z.ZodInt;
    }, z.core.$strip>>;
    responses: {
        201: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof UploadTicketSchema;
        }, z.core.$loose>>>;
        400: typeof BadRequestResponse;
    };
}>;
export {};
//# sourceMappingURL=channel.d.ts.map