import type { z } from 'zod';

import { ArtistDetailSchema } from '../../catalog/index.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const artistDetail: z.output<typeof ArtistDetailSchema> = {
  id: '019928a0-7d31-7a10-b8c4-2f9e11a4c333',
  channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
  name: 'Compagnie Verticale',
  categoryId: 'dance-contemporary',
  followers: 4120,
  isLiveNow: true,
};

export const artistsExamples: ModuleExamples = [[ArtistDetailSchema, [artistDetail]]];
