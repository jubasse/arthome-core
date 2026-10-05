import { z } from 'zod';

import { DEVICE_KINDS } from '@arthome/core';
import type { VocabularyIn } from '@arthome/core/schema';
import { InstantOut, uuidOut, vocabularyIn } from '@arthome/core/schema';

import { sensitive } from '../../http/index.js';

export const RegisterDeviceBodySchema: z.ZodObject<
  {
    kind: VocabularyIn<typeof DEVICE_KINDS>;
    label: z.ZodString;
    osVersion: z.ZodOptional<z.ZodString>;
    appVersion: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
> = z.object({
  kind: vocabularyIn(DEVICE_KINDS).meta({
    'x-arthome-vocabulary-source': 'DEVICE_KINDS',
  }),
  label: z.string().max(80),
  osVersion: z.string().optional(),
  appVersion: z.string().optional(),
});

export const DeviceRegistrationSchema: z.ZodObject<
  { deviceId: z.ZodString; deviceToken: z.ZodString; expiresAt: z.ZodString },
  z.core.$loose
> = z.looseObject({
  deviceId: uuidOut(),
  deviceToken: sensitive(z.string()),
  expiresAt: InstantOut,
});

export type RegisterDeviceBody = z.output<typeof RegisterDeviceBodySchema>;
export type DeviceRegistration = z.output<typeof DeviceRegistrationSchema>;
