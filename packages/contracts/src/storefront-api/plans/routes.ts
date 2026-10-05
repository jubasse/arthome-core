import { PlanListSchema } from './schemas.js';
import type { ListPlansRoute } from './types.js';
import { Freshness, cache } from '../../http/index.js';
import {
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  storefrontV1,
  viewer,
} from '../components.js';

const plans = storefrontV1
  .identity(viewer)
  .optionalAuth()
  .tags(StorefrontTag.COMMERCE)
  .headers(SurfaceParameter, TraceparentParameter)
  .single('plans');

export const listPlans: ListPlansRoute = plans.find({
  operationId: 'listPlans',
  summary: 'The three plans, what they open, and the discount on seats.',
  cache: cache(Freshness.FIVE_MINUTES, {
    scope: 'public',
    vary: ['Cookie', 'Authorization', 'X-Arthome-Device-Token', 'X-Arthome-Surface'],
  }),
  responses: {
    200: {
      description: 'The plans.',
      content: { 'application/json': { schema: PlanListSchema } },
    },
  },
});
