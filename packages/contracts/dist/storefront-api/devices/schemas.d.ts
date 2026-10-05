import { z } from 'zod';
import { DEVICE_KINDS } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
export declare const RegisterDeviceBodySchema: z.ZodObject<{
    kind: VocabularyIn<typeof DEVICE_KINDS>;
    label: z.ZodString;
    osVersion: z.ZodOptional<z.ZodString>;
    appVersion: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const DeviceRegistrationSchema: z.ZodObject<{
    deviceId: z.ZodString;
    deviceToken: z.ZodString;
    expiresAt: z.ZodString;
}, z.core.$loose>;
export type RegisterDeviceBody = z.output<typeof RegisterDeviceBodySchema>;
export type DeviceRegistration = z.output<typeof DeviceRegistrationSchema>;
//# sourceMappingURL=schemas.d.ts.map