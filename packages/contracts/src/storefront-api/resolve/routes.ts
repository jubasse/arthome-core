import { ApiErrorCode } from '@arthome/core';

import {
  PublicLinkKindParameter,
  PublicLinkSlugParameter,
  PublicLinkTargetSchema,
  PublicLinkUrlParameter,
} from './schemas.js';
import type { ResolvePublicLinkRoute } from './types.js';
import { Freshness } from '../../http/index.js';
import {
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  publicRead,
  storefrontV1,
  viewer,
} from '../components.js';

export const resolvePublicLink: ResolvePublicLinkRoute = storefrontV1
  .identity(viewer)
  .optionalAuth()
  .headers(SurfaceParameter, TraceparentParameter)
  .tags(StorefrontTag.DISCOVERY)
  .single('resolve')
  .find({
    operationId: 'resolvePublicLink',
    summary: 'Resolves a canonical URL or a slug to the resource it designates.',
    parameters: [PublicLinkUrlParameter, PublicLinkKindParameter, PublicLinkSlugParameter],
    cache: publicRead(Freshness.FIVE_MINUTES),
    item: PublicLinkTargetSchema,
    answer: 'The designated resource, and enough to paint immediately.',
    errors: [ApiErrorCode.NOT_FOUND],
  });
