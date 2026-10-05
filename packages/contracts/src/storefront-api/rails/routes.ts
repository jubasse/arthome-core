import { ApiErrorCode } from '@arthome/core';

import { RailIdParameter } from './schemas.js';
import type { ExtendRailRoute } from './types.js';
import { RailSchema } from '../../catalog/index.js';
import { Freshness } from '../../http/index.js';
import {
  CursorParameter,
  LimitParameter,
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  publicRead,
  storefrontV1,
  viewer,
} from '../components.js';

export const extendRail: ExtendRailRoute = storefrontV1
  .identity(viewer)
  .optionalAuth()
  .headers(SurfaceParameter, TraceparentParameter)
  .tags(StorefrontTag.DISCOVERY)
  .resource('rails', { id: RailIdParameter })
  .find({
    operationId: 'extendRail',
    summary: 'Extends a home rail — the consumer of `Rail.nextCursor`.',
    parameters: [CursorParameter, LimitParameter],
    cache: publicRead(Freshness.MINUTE),
    item: RailSchema,
    answer: 'The rest of the rail.',
    errors: [ApiErrorCode.CURSOR_TOO_OLD],
  });
