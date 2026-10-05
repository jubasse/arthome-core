import { ApiErrorCode } from '@arthome/core';

import type { GetStudioBootstrapRoute } from './types.js';
import { StudioBootstrapSchema } from '../../studio-access/index.js';
import {
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  operator,
  studioV1,
} from '../components.js';

const bootstrap = studioV1
  .identity(operator)
  .headers(SurfaceParameter, TraceparentParameter)
  .tags(StudioTag.BOOTSTRAP)
  .single('bootstrap', { owner: 'caller' });

export const getStudioBootstrap: GetStudioBootstrapRoute = bootstrap.find({
  operationId: 'getStudioBootstrap',
  summary: 'The bootstrap — the only thing the first paint waits for.',
  item: StudioBootstrapSchema,
  answer: 'The bootstrap.',
  errors: [ApiErrorCode.SERVICE_UNAVAILABLE],
});
