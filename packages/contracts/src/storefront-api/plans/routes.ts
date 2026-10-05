import { PlanListSchema } from './schemas.js';
import type { ListPlansRoute } from './types.js';
import { Freshness } from '../../http/index.js';
import {
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  publicRead,
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
  cache: publicRead(Freshness.FIVE_MINUTES),
  responses: {
    200: {
      description: 'The plans.',
      content: { 'application/json': { schema: PlanListSchema } },
    },
  },
});
