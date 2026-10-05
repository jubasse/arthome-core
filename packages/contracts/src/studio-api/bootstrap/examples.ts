import type { z } from 'zod';

import { CrewRole, DatePane, Locale, MemberRole, NavigationEntry } from '@arthome/core';

import type { ModuleExamples } from '../../openapi/docs.js';
import { StudioBootstrapSchema } from '../../studio-access/index.js';

const studioBootstrap: z.output<typeof StudioBootstrapSchema> = {
  person: {
    personId: '019928b0-0000-7000-8000-000000000001',
    displayName: 'Claire D.',
    isFreelance: true,
    runsCalled: 84,
    readingTimezone: 'Europe/Paris',
  },
  rightsVersion: 412,
  channels: [
    {
      channelId: '019928a0-7d31-7a10-b8c4-2f9e11a4c222',
      channelName: 'Compagnie Verticale',
      roles: [MemberRole.PRODUCTION, MemberRole.COORDINATION],
      isOwner: false,
      navigation: [
        NavigationEntry.DASHBOARD,
        DatePane.CREW,
        NavigationEntry.EVENTS,
        NavigationEntry.STREAM,
        NavigationEntry.STATS,
        DatePane.TICKETS,
        NavigationEntry.STORE,
        NavigationEntry.REPLAYS,
        NavigationEntry.TEAM,
        NavigationEntry.JOURNAL,
        NavigationEntry.HELP,
      ],
      datePanes: [
        DatePane.PUBLIC,
        DatePane.TICKETS,
        DatePane.CHAT,
        DatePane.TECH,
        DatePane.CREW,
        DatePane.REPLAY,
      ],
      canRevenue: true,
      canOps: true,
      canTech: true,
      canDecideOutcome: true,
      assignableRoles: [
        MemberRole.COORDINATION,
        CrewRole.DIRECTOR,
        CrewRole.VIDEO,
        CrewRole.SOUND,
        CrewRole.MODERATION,
      ],
      dateGrants: [],
    },
  ],
  constants: {
    technicalProvisionThreshold: 10000,
    provisionRevisionHours: 72,
    waitlistPriorityWindowHours: 2,
    cancelDeadlineMinutesBefore: 60,
    payoutDelayDays: 14,
    commissionRateBps: 1200,
    chatBurstThresholdPerMinute: 60,
    moderationQueueAlertThreshold: 10,
    crewUnassignedAlertHoursBefore: 24,
    holdScreenAutoAfterSec: 15,
    seasonBounds: {
      startsOn: '09-01',
      endsOn: '08-31',
    },
  },
  labelCatalog: {
    locale: Locale.FR,
    version: 41,
    url: 'https://cdn.arthome.fr/i18n/studio/fr/v41.json',
  },
  counters: {
    moderationPending: 14,
    inboxUnread: 2,
    dutiesTonight: 3,
    invitationsPending: 1,
    datesToCover: 3,
    payoutsDue: 0,
  },
  realtime: {
    namespace: '/studio',
    pulseIntervalSec: 5,
  },
};

export const bootstrapExamples: ModuleExamples = [[StudioBootstrapSchema, [studioBootstrap]]];
