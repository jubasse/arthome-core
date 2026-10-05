import type { GetViewerContextRoute } from './types.js';
import { Freshness, cache } from '../../http/index.js';
import { ViewerContextSchema } from '../../identity/index.js';
import {
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  ViewerTimezoneParameter,
  storefrontV1,
  viewerOrDevice,
} from '../components.js';

export const getViewerContext: GetViewerContextRoute = storefrontV1
  .identity(viewerOrDevice)
  .tags(StorefrontTag.BOOTSTRAP)
  .headers(SurfaceParameter, TraceparentParameter)
  .single('viewer-context')
  .find({
    operationId: 'getViewerContext',
    summary: 'The bootstrap — the entire budget of the start-up screen.',
    item: ViewerContextSchema,
    parameters: [ViewerTimezoneParameter],
    cache: cache(Freshness.FIVE_MINUTES),
    answer: 'Viewer context.',
  });
