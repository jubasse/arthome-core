import { z } from 'zod';
import type { VocabularyIn } from '@arthome/core/schema';
declare const UPLOAD_PURPOSES: readonly ["poster", "wide", "avatar", "merch_image"];
declare const UPLOAD_CONTENT_TYPES: readonly ["image/jpeg", "image/png", "image/webp"];
export declare const CreateUploadTicketBodySchema: z.ZodObject<{
    purpose: VocabularyIn<typeof UPLOAD_PURPOSES>;
    contentType: VocabularyIn<typeof UPLOAD_CONTENT_TYPES>;
    sizeBytes: z.ZodInt;
}, z.core.$strip>;
export type CreateUploadTicketBody = z.output<typeof CreateUploadTicketBodySchema>;
export {};
//# sourceMappingURL=schemas.d.ts.map