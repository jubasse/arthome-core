import { describe, expect, it } from 'vitest';

import type { Api, Route } from './http/index.js';
import * as storefrontAccountDeepLink from './storefront-api/account-deep-link/routes.js';
import * as storefrontArtists from './storefront-api/artists/routes.js';
import * as storefrontAuth from './storefront-api/auth/routes.js';
import * as storefrontCart from './storefront-api/cart/routes.js';
import * as storefrontCategories from './storefront-api/categories/routes.js';
import * as storefrontChanges from './storefront-api/changes/routes.js';
import * as storefrontChat from './storefront-api/chat/routes.js';
import * as storefrontDates from './storefront-api/dates/routes.js';
import * as storefrontDevices from './storefront-api/devices/routes.js';
import * as storefrontHome from './storefront-api/home/routes.js';
import { storefrontApi } from './storefront-api/index.js';
import * as storefrontLive from './storefront-api/live/routes.js';
import * as storefrontMe from './storefront-api/me/routes.js';
import * as storefrontOrders from './storefront-api/orders/routes.js';
import * as storefrontPairings from './storefront-api/pairings/routes.js';
import * as storefrontPlans from './storefront-api/plans/routes.js';
import * as storefrontPlayback from './storefront-api/playback/routes.js';
import * as storefrontRails from './storefront-api/rails/routes.js';
import * as storefrontReplays from './storefront-api/replays/routes.js';
import * as storefrontResolve from './storefront-api/resolve/routes.js';
import * as storefrontSearch from './storefront-api/search/routes.js';
import * as storefrontSeats from './storefront-api/seats/routes.js';
import * as storefrontSubscription from './storefront-api/subscription/routes.js';
import * as storefrontSupport from './storefront-api/support/routes.js';
import * as storefrontViewerContext from './storefront-api/viewer-context/routes.js';
import * as studioAgenda from './studio-api/agenda.js';
import * as studioBootstrap from './studio-api/bootstrap.js';
import * as studioChannel from './studio-api/channel.js';
import * as studioCrew from './studio-api/crew.js';
import * as studioDates from './studio-api/dates/routes.js';
import { studioApi } from './studio-api/index.js';
import * as studioModeration from './studio-api/moderation.js';
import * as studioPayouts from './studio-api/payouts.js';
import * as studioPublication from './studio-api/publication.js';
import * as studioRun from './studio-api/run.js';
import * as studioTicketing from './studio-api/ticketing.js';

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
      storefrontAccountDeepLink,
      storefrontArtists,
      storefrontAuth,
      storefrontCart,
      storefrontCategories,
      storefrontChanges,
      storefrontChat,
      storefrontDates,
      storefrontDevices,
      storefrontHome,
      storefrontLive,
      storefrontMe,
      storefrontOrders,
      storefrontPairings,
      storefrontPlans,
      storefrontPlayback,
      storefrontRails,
      storefrontReplays,
      storefrontResolve,
      storefrontSearch,
      storefrontSeats,
      storefrontSubscription,
      storefrontSupport,
      storefrontViewerContext,
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
