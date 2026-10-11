import type { MediaServerAuthorization } from './schemas.js';
import { MediaServerAuthorizationSchema } from './schemas.js';
import type { ModuleExamples } from '../../openapi/docs.js';

const mediaServerAuthorization: MediaServerAuthorization = {
  user: 'publisher',
  password: 'sk_live_9f2ac1b4',
  token: '',
  ip: '203.0.113.24',
  action: 'publish',
  path: 'live/studio-a',
  protocol: 'srt',
  id: '019928f4-1b6c-7c3a-9f2e-6a1d0c4b8e77',
  query: '',
  userAgent: '',
};

export const mediaServerExamples: ModuleExamples = [
  [MediaServerAuthorizationSchema, [mediaServerAuthorization]],
];
