import type { ModuleDocs } from '../../openapi/docs.js';
import { operationDocsOf } from '../../openapi/docs.js';
import { studioDocs } from '../../studio-api/docs.js';

export const incidentsDocs: ModuleDocs = operationDocsOf(studioDocs, ['resolveIncident']);
