import type { GetLiveScreenRoute } from './types.js';
import { LiveScreenSchema } from '../../catalog/index.js';
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

export const getLiveScreen: GetLiveScreenRoute = discovery.single('live').find({
  operationId: 'getLiveScreen',
  summary: "What is live now and tonight's grid, grouped in the viewer's local time.",
  parameters: [ViewerTimezoneParameter],
  item: LiveScreenSchema,
  cache: publicRead(Freshness.FIFTEEN_SECONDS),
  answer: "Tonight's grid.",
});
