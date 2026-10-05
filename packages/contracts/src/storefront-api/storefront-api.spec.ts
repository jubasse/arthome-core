import { describe, expect, it } from 'vitest';

import { storefrontApi } from './index.js';
import { paramsSchemaOf, querySchemaOf } from '../http/index.js';
import { studioApi } from '../studio-api/index.js';

const DATE_ID = '019928a0-7d31-7a10-b8c4-2f9e11a4c001';

describe('request parameters validate what the document publishes as a format', () => {
  it('refuses a path identifier that is not a uuid', () => {
    const params = paramsSchemaOf(storefrontApi.routes.getDateDetail);

    expect(params.safeParse({ dateId: DATE_ID }).success).toBe(true);
    expect(params.safeParse({ dateId: 'not-a-date' }).success).toBe(false);
  });

  it('refuses a query value that is not an absolute URI', () => {
    const query = querySchemaOf(storefrontApi.routes.resolvePublicLink);

    expect(query.safeParse({ url: 'https://arthome.fr/dates/nuit-blanche' }).success).toBe(true);
    expect(query.safeParse({ url: 'nuit-blanche' }).success).toBe(false);
  });

  it('refuses a day that does not exist', () => {
    const query = querySchemaOf(studioApi.routes.getChannelDashboard);

    const refused = query.safeParse({ from: '2026-02-30' });
    const accepted = query.safeParse({ from: '2026-02-28' });

    expect(refused.error?.issues.map((issue) => issue.path[0])).toContain('from');
    expect(accepted.error?.issues.map((issue) => issue.path[0]) ?? []).not.toContain('from');
  });
});
