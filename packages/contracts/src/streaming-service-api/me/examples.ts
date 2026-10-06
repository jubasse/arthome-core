import type { ModuleExamples } from '../../openapi/docs.js';
import { storefrontDocs } from '../../storefront-api/docs.js';
import {
  PlaybackPositionSchema,
  RecordPlaybackPositionBodySchema,
} from '../../storefront-api/me/schemas.js';

export const meExamples: ModuleExamples = storefrontDocs.examples.entriesOf([
  RecordPlaybackPositionBodySchema,
  PlaybackPositionSchema,
]);
