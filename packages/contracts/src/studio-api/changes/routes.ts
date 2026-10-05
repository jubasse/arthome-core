import { ChangesChannelParameter, ChangesSinceParameter, StudioChangesSchema } from './schemas.js';
import type { ListStudioChangesRoute } from './types.js';
import {
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  operator,
  studioV1,
} from '../components.js';

export const listStudioChanges: ListStudioChangesRoute = studioV1
  .identity(operator)
  .headers(SurfaceParameter, TraceparentParameter)
  .tags(StudioTag.BOOTSTRAP)
  .single('changes', { owner: 'caller' })
  .find({
    operationId: 'listStudioChanges',
    summary: 'The invalidations since a given instant — not the data.',
    parameters: [ChangesSinceParameter, ChangesChannelParameter],
    responses: {
      200: {
        description: 'A list of invalidated tags.',
        content: { 'application/json': { schema: StudioChangesSchema } },
      },
    },
  });
