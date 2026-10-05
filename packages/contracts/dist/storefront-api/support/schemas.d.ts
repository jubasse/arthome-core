import { z } from 'zod';
import type { VocabularyIn } from '@arthome/core/schema';
import type { PathParameter } from '../../http/index.js';
declare const SUPPORT_TOPICS: readonly ["ticketing_refund", "playback_quality", "replay", "store_shipping", "account_signin", "personal_data"];
export declare const ContactSupportBodySchema: z.ZodObject<{
    topic: VocabularyIn<typeof SUPPORT_TOPICS>;
    message: z.ZodString;
    context: z.ZodOptional<z.ZodObject<{
        dateId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        seatId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        orderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        traceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const SupportRequestOpeningSchema: z.ZodOptional<z.ZodObject<{
    requestId: z.ZodOptional<z.ZodString>;
    reference: z.ZodOptional<z.ZodString>;
    priorityCode: z.ZodOptional<z.ZodString>;
}, z.core.$loose>>;
export declare const SupportRequestIdParameter: PathParameter<'requestId', z.ZodString>;
export type ContactSupportBody = z.output<typeof ContactSupportBodySchema>;
export type SupportRequestOpening = z.output<typeof SupportRequestOpeningSchema>;
export {};
//# sourceMappingURL=schemas.d.ts.map