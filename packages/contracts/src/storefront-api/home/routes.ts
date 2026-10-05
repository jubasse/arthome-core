import type { GetHomeScreenRoute } from './types.js';
import { HomeScreenSchema } from '../../catalog/index.js';
import { Freshness } from '../../http/index.js';
import {
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  ViewerTimezoneParameter,
  publicRead,
  storefrontV1,
  viewer,
} from '../components.js';

const discovery = storefrontV1
  .identity(viewer)
  .optionalAuth()
  .headers(SurfaceParameter, TraceparentParameter)
  .tags(StorefrontTag.DISCOVERY);

export const getHomeScreen: GetHomeScreenRoute = discovery.single('home').find({
  operationId: 'getHomeScreen',
  summary: 'Billboard and rails, composed and ordered by the server.',
  parameters: [ViewerTimezoneParameter],
  item: HomeScreenSchema,
  cache: publicRead(Freshness.MINUTE),
  answer: 'Home.',
});
