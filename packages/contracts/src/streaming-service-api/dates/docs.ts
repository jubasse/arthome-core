import type { ModuleDocs } from '../../openapi/docs.js';
import { operationDocsOf } from '../../openapi/docs.js';
import { studioDocs } from '../../studio-api/docs.js';

export const datesDocs: ModuleDocs = operationDocsOf(studioDocs, [
  'getRunConsole',
  'runTechnicalCheck',
  'rehearseRun',
  'goOnAir',
  'endRun',
  'resetRun',
  'raiseIncident',
]);
