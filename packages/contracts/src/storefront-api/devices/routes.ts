import { DeviceRegistrationSchema, RegisterDeviceBodySchema } from './schemas.js';
import type { RegisterDeviceRoute } from './types.js';
import {
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  storefrontV1,
} from '../components.js';
import { DeviceIdParameter } from '../me/schemas.js';

export const registerDevice: RegisterDeviceRoute = storefrontV1
  .public()
  .tags(StorefrontTag.BOOTSTRAP)
  .headers(SurfaceParameter, TraceparentParameter)
  .resource('devices', { id: DeviceIdParameter })
  .create({
    operationId: 'registerDevice',
    summary: 'Registers the device and returns its device token.',
    body: RegisterDeviceBodySchema,
    response: DeviceRegistrationSchema,
    answer: 'Device registered. The token is to be kept in the native store.',
  });
