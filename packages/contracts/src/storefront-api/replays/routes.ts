import { ReplayCategoryParameter, ReplaySortParameter } from './schemas.js';
import type { ListReplaysRoute } from './types.js';
import { DateCardSchema } from '../../catalog/index.js';
import { Freshness, cursor } from '../../http/index.js';
import {
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  publicRead,
  storefrontV1,
  viewer,
} from '../components.js';

export const listReplays: ListReplaysRoute = storefrontV1
  .identity(viewer)
  .optionalAuth()
  .headers(SurfaceParameter, TraceparentParameter)
  .tags(StorefrontTag.DISCOVERY)
  .single('replays')
  .findAll({
    operationId: 'listReplays',
    summary: 'Replays online, the ones expiring first — a discovery page, public.',
    paging: cursor({ maxLimit: 50 }),
    parameters: [ReplaySortParameter, ReplayCategoryParameter],
    cache: publicRead(Freshness.MINUTE),
    item: DateCardSchema,
    answer: 'Page of online replays, sorted by shortest remaining window first.',
  });
