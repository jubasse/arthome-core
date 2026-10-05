import { DeviceKind } from '@arthome/core';

import { DeviceRegistrationSchema, RegisterDeviceBodySchema } from './schemas.js';
import type { DeviceRegistration, RegisterDeviceBody } from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const registerDeviceBody: RegisterDeviceBody = {
  kind: DeviceKind.TV,
  label: 'Téléviseur du salon',
  osVersion: 'tvOS 19.2',
  appVersion: '1.4.0',
};

const deviceRegistration: DeviceRegistration = {
  deviceId: '019928f4-1b6c-7c3a-9f2e-6a1d0c4b8e77',
  deviceToken: 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImRldi0yMDI2LTA5In0',
  expiresAt: '2027-03-20T18:02:11.004Z',
};

export const devicesExamples: ModuleExamples = [
  [RegisterDeviceBodySchema, [registerDeviceBody]],
  [DeviceRegistrationSchema, [deviceRegistration]],
];
