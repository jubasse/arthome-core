import type { z } from 'zod';

import { AccountStatus, OrderState, PlanTier } from '@arthome/core';

import type {
  PaymentHandoffAnswer,
  SetSubscriptionPlanBody,
  SubscriptionAnswer,
} from './schemas.js';
import {
  PaymentHandoffAnswerSchema,
  SetSubscriptionPlanBodySchema,
  SubscriptionAnswerSchema,
} from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';
import { SubscriptionSchema } from '../../ticketing/index.js';

const setSubscriptionPlanBody: SetSubscriptionPlanBody = {
  planTier: PlanTier.PREMIUM,
  paymentMethodRef: 'pm_1Ab2Cd',
};

const subscriptionAnswer: SubscriptionAnswer = {
  servedAt: '2026-09-21T18:47:00.000Z',
  data: {
    planTier: PlanTier.PREMIUM,
    state: AccountStatus.ACTIVE,
    startedAt: '2026-09-21T18:47:00Z',
    currentPeriodEnd: '2026-10-21T18:47:00Z',
    cancelAtPeriodEnd: false,
  },
};

const paymentHandoffAnswer: PaymentHandoffAnswer = {
  servedAt: '2026-09-21T18:47:00.000Z',
  data: {
    orderId: '019928f7-3333-7000-8000-000000000001',
    state: OrderState.AWAITING_ACTION,
    paymentIntentRef: 'pi_3Ij5Kl',
    clientSecret: 'pi_3Ij5Kl_secret_3c4',
    nextAction: {
      kind: 'redirect_to_url',
      redirectUrl: 'https://hooks.stripe.com/3ds/authenticate',
    },
    returnUrl: 'https://arthome.fr/paiement/retour?order=019928f7-3333-7000-8000-000000000001',
    expiresAt: '2026-09-21T19:02:00Z',
  },
};

const cancelledSubscription: z.output<typeof SubscriptionSchema> = {
  planTier: PlanTier.PREMIUM,
  state: AccountStatus.ACTIVE,
  currentPeriodEnd: '2026-10-21T18:47:00Z',
  cancelAtPeriodEnd: true,
};

export const subscriptionExamples: ModuleExamples = [
  [SetSubscriptionPlanBodySchema, [setSubscriptionPlanBody]],
  [SubscriptionAnswerSchema, [subscriptionAnswer]],
  [PaymentHandoffAnswerSchema, [paymentHandoffAnswer]],
  [SubscriptionSchema, [cancelledSubscription]],
];
