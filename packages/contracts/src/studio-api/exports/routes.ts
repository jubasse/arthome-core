import { ApiErrorCode } from '@arthome/core';

import { ExportIdParameter } from './schemas.js';
import type { GetChannelExportRoute } from './types.js';
import { ExportJobSchema } from '../../studio-money/index.js';
import {
  StudioTag,
  SurfaceParameter,
  TraceparentParameter,
  operator,
  studioV1,
} from '../components.js';

const exportJobs = studioV1
  .identity(operator)
  .headers(SurfaceParameter, TraceparentParameter)
  .errors([ApiErrorCode.FORBIDDEN, ApiErrorCode.NOT_FOUND])
  .tags(StudioTag.PAYOUTS)
  .resource('exports', { id: ExportIdParameter });

export const getChannelExport: GetChannelExportRoute = exportJobs.find({
  operationId: 'getChannelExport',
  summary: "An export's state, and its signed URL once it is ready.",
  item: ExportJobSchema,
  answer: "The export's state.",
});
