import { z } from 'zod';
import type { VocabularyIn } from '@arthome/core/schema';
import { StudioSessionModeSchema } from '../../studio-access/index.js';
export declare const SignInStudioBodySchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    mode: typeof StudioSessionModeSchema;
    deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    deviceLabel: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const VerifyTwoFactorStudioBodySchema: z.ZodObject<{
    challengeId: z.ZodString;
    code: z.ZodString;
    mode: typeof StudioSessionModeSchema;
    deviceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const RequestPasswordResetStudioBodySchema: z.ZodObject<{
    email: z.ZodString;
    locale: z.ZodOptional<VocabularyIn<readonly ['fr', 'en']>>;
}, z.core.$strip>;
export type SignInStudioBody = z.output<typeof SignInStudioBodySchema>;
export type VerifyTwoFactorStudioBody = z.output<typeof VerifyTwoFactorStudioBodySchema>;
export type RequestPasswordResetStudioBody = z.output<typeof RequestPasswordResetStudioBodySchema>;
//# sourceMappingURL=schemas.d.ts.map