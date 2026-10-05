import type { z } from 'zod';

import { AccountDeepLinkSchema } from '../../identity/index.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const accountDeepLink: z.output<typeof AccountDeepLinkSchema> = {
  url: 'https://arthome.fr/compte',
};

export const accountDeepLinkExamples: ModuleExamples = [[AccountDeepLinkSchema, [accountDeepLink]]];
