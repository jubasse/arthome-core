import type { ModuleExamples } from '../../openapi/docs.js';
import { storefrontDocs } from '../../storefront-api/docs.js';
import { OpenPlaybackBodySchema } from '../../storefront-api/playback/schemas.js';
import { PlaybackRenewalSchema, PlaybackTicketSchema } from '../../streaming/index.js';

export const playbackExamples: ModuleExamples = storefrontDocs.examples.entriesOf([
  OpenPlaybackBodySchema,
  PlaybackTicketSchema,
  PlaybackRenewalSchema,
]);
