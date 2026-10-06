import type { ModuleDocs } from '../../openapi/docs.js';
import { operationDocsOf } from '../../openapi/docs.js';
import { storefrontDocs } from '../../storefront-api/docs.js';

export const playbackDocs: ModuleDocs = operationDocsOf(storefrontDocs, [
  'openPlayback',
  'renewPlaybackTicket',
  'releasePlayback',
]);
