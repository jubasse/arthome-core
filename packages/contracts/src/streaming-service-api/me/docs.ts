import type { ModuleDocs } from '../../openapi/docs.js';
import { operationDocsOf } from '../../openapi/docs.js';
import { storefrontDocs } from '../../storefront-api/docs.js';

export const meDocs: ModuleDocs = operationDocsOf(storefrontDocs, ['recordPlaybackPosition']);
