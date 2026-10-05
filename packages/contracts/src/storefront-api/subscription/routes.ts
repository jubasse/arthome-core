import { OrderErrorCode } from '@arthome/core';

import {
  PaymentHandoffAnswerSchema,
  SetSubscriptionPlanBodySchema,
  SubscriptionAnswerSchema,
} from './schemas.js';
import type { CancelSubscriptionRoute, SetSubscriptionPlanRoute } from './types.js';
import { SubscriptionSchema } from '../../ticketing/index.js';
import {
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  storefrontV1,
  viewer,
} from '../components.js';

const subscription = storefrontV1
  .identity(viewer)
  .tags(StorefrontTag.COMMERCE)
  .headers(SurfaceParameter, TraceparentParameter)
  .single('subscription', { owner: 'caller' });

export const setSubscriptionPlan: SetSubscriptionPlanRoute = subscription.action('change-plan', {
  operationId: 'setSubscriptionPlan',
  summary: 'Subscribes or changes plan.',
  'x-arthome-invalidates': ['account:subscription', 'home:rails', 'account:tickets'],
  body: SetSubscriptionPlanBodySchema,
  responses: {
    200: {
      description: 'Subscription updated.',
      content: { 'application/json': { schema: SubscriptionAnswerSchema } },
    },
    202: {
      description:
        '**Strong authentication required.** See `PaymentHandoff` — the return URL concludes nothing, `getOrder` is authoritative.',
      content: { 'application/json': { schema: PaymentHandoffAnswerSchema } },
    },
  },
  errors: [OrderErrorCode.PAYMENT_DECLINED, OrderErrorCode.PLAN_UNAVAILABLE],
});

export const cancelSubscription: CancelSubscriptionRoute = subscription.action('cancel', {
  operationId: 'cancelSubscription',
  summary: 'Cancels the subscription at the end of the period.',
  'x-arthome-invalidates': ['account:subscription'],
  response: SubscriptionSchema,
  answer: 'Cancellation recorded. Rights run until `currentPeriodEnd`.',
});
