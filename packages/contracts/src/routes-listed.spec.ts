import { describe, expect, it } from 'vitest';

import type { Api, Route } from './http/index.js';
import * as storefrontAccount from './storefront-api/account.js';
import * as storefrontBootstrap from './storefront-api/bootstrap.js';
import * as storefrontChat from './storefront-api/chat.js';
import * as storefrontCommerce from './storefront-api/commerce.js';
import * as storefrontDate from './storefront-api/date.js';
import * as storefrontDiscovery from './storefront-api/discovery.js';
import { storefrontApi } from './storefront-api/index.js';
import * as storefrontMe from './storefront-api/me/routes.js';
import * as storefrontPairing from './storefront-api/pairing.js';
import * as storefrontPlayback from './storefront-api/playback.js';
import * as studioAgenda from './studio-api/agenda.js';
import * as studioAuth from './studio-api/auth/routes.js';
import * as studioBankChangeRequests from './studio-api/bank-change-requests/routes.js';
import * as studioBootstrap from './studio-api/bootstrap.js';
import * as studioChannel from './studio-api/channel.js';
import * as studioCrew from './studio-api/crew.js';
import * as studioDateAccessGrants from './studio-api/date-access-grants/routes.js';
import * as studioDates from './studio-api/dates/routes.js';
import * as studioExports from './studio-api/exports/routes.js';
import * as studioInbox from './studio-api/inbox/routes.js';
import * as studioIncidents from './studio-api/incidents/routes.js';
import { studioApi } from './studio-api/index.js';
import * as studioInvitations from './studio-api/invitations/routes.js';
import * as studioModerationItems from './studio-api/moderation/routes.js';
import * as studioModeration from './studio-api/moderation.js';
import * as studioPayouts from './studio-api/payouts.js';
import * as studioPublication from './studio-api/publication.js';
import * as studioRun from './studio-api/run.js';
import * as studioSeats from './studio-api/seats/routes.js';
import * as studioTicketing from './studio-api/ticketing.js';
import * as studioUploads from './studio-api/uploads/routes.js';

type Module = Readonly<Record<string, unknown>>;

function isRoute(value: unknown): value is Route {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { operationId?: unknown }).operationId === 'string' &&
    typeof (value as { method?: unknown }).method === 'string' &&
    typeof (value as { path?: unknown }).path === 'string'
  );
}

function exportedRoutes(modules: readonly Module[]): Map<string, Route> {
  const found = new Map<string, Route>();
  for (const loaded of modules) {
    for (const value of Object.values(loaded)) {
      if (isRoute(value)) found.set(value.operationId, value);
    }
  }
  return found;
}

const APIS: readonly (readonly [string, Api, readonly Module[]])[] = [
  [
    'storefront-api',
    storefrontApi,
    [
      storefrontAccount,
      storefrontBootstrap,
      storefrontChat,
      storefrontCommerce,
      storefrontDate,
      storefrontDiscovery,
      storefrontMe,
      storefrontPairing,
      storefrontPlayback,
    ],
  ],
  [
    'studio-api',
    studioApi,
    [
      studioAgenda,
      studioBootstrap,
      studioChannel,
      studioCrew,
      studioDates,
      studioModeration,
      studioPayouts,
      studioPublication,
      studioRun,
      studioTicketing,
      studioExports,
      studioBankChangeRequests,
      studioUploads,
      studioDateAccessGrants,
      studioInvitations,
      studioSeats,
      studioIncidents,
      studioModerationItems,
      studioAuth,
      studioInbox,
    ],
  ],
];

describe.each(APIS)('%s', (_name, api, modules) => {
  it('lists every route its modules export, and exports every route it lists', () => {
    const exported = exportedRoutes(modules);
    const listed = new Map(Object.entries(api.routes));

    const unlisted = [...exported.keys()].filter((id) => listed.get(id) !== exported.get(id));
    const unexported = [...listed.keys()].filter((id) => exported.get(id) !== listed.get(id));

    expect(unlisted).toEqual([]);
    expect(unexported).toEqual([]);
  });
});
