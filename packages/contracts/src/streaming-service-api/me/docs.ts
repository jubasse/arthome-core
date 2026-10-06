import type { ModuleDocs } from '../../openapi/docs.js';
import { operationDocsOf } from '../../openapi/docs.js';
import { storefrontDocs } from '../../storefront-api/docs.js';
import { PROFILE_FROM_THE_TOKEN } from '../principal.docs.js';

export const meDocs: ModuleDocs = operationDocsOf(storefrontDocs, ['recordPlaybackPosition'], {
  recordPlaybackPosition: PROFILE_FROM_THE_TOKEN,
});
