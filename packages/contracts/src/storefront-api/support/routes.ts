import {
  ContactSupportBodySchema,
  SupportRequestIdParameter,
  SupportRequestOpeningSchema,
} from './schemas.js';
import type { ContactSupportRoute } from './types.js';
import { throttle } from '../../http/index.js';
import {
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  storefrontV1,
  viewer,
} from '../components.js';

export const contactSupport: ContactSupportRoute = storefrontV1
  .identity(viewer)
  .tags(StorefrontTag.ACCOUNT)
  .headers(SurfaceParameter, TraceparentParameter)
  .path('support')
  .resource('requests', { id: SupportRequestIdParameter })
  .create({
    operationId: 'contactSupport',
    summary: 'Opens a support request, with its context.',
    body: ContactSupportBodySchema,
    response: SupportRequestOpeningSchema,
    status: 202,
    requires: [throttle('contact')],
    answer: 'Request opened, with its reference and its priority computed server-side.',
  });
