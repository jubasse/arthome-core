import { ChangesScopeParameter, ChangesSinceParameter } from './schemas.js';
import type { ListChangesRoute } from './types.js';
import { ChangeFeedSchema } from '../../engagement/index.js';
import {
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  storefrontV1,
  viewer,
} from '../components.js';

export const listChanges: ListChangesRoute = storefrontV1
  .identity(viewer)
  .tags(StorefrontTag.BOOTSTRAP)
  .headers(SurfaceParameter, TraceparentParameter)
  .single('changes')
  .find({
    operationId: 'listChanges',
    summary: 'The invalidations since a given instant — not the data.',
    item: ChangeFeedSchema,
    parameters: [ChangesSinceParameter, ChangesScopeParameter],
    answer: 'A list of invalidations.',
  });
