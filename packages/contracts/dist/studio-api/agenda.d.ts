import { z } from 'zod';
import type { VocabularyIn } from '@arthome/core/schema';
import { BadRequestResponse, ChannelIdParameter, ForbiddenResponse, IfRightsVersionParameter, NotFoundResponse, PageParameter, PageSizeParameter, SortByParameter, SortDirParameter, SurfaceParameter, TraceparentParameter } from './components.js';
import { StudioEnvelopeMetaSchema, StudioErrorEnvelopeSchema } from '../envelope/index.js';
import type { JsonResponse, QueryParameter, Route } from '../http/index.js';
import { OffsetPageInfoSchema } from '../pagination/index.js';
import { DashboardScreenSchema, StatsAudienceSchema, StatsSeriesSchema } from '../studio-money/index.js';
import { EventsRowSchema } from '../studio-stage/index.js';
declare const LIST_CHANNEL_EVENTS_WINDOW: readonly ["upcoming", "past"];
declare const GET_CHANNEL_DASHBOARD_PERIOD: readonly ["last_7_days", "last_30_days", "last_90_days", "season", "custom"];
declare const GET_CHANNEL_STATS_TAB: readonly ["audience", "series"];
export declare const listChannelEvents: Route<{
    method: 'get';
    version: 1;
    path: '/channels/{channelId}/events';
    parameters: readonly [
        typeof ChannelIdParameter,
        typeof PageParameter,
        typeof PageSizeParameter,
        typeof SortByParameter,
        typeof SortDirParameter,
        QueryParameter<'window', z.ZodDefault<VocabularyIn<typeof LIST_CHANNEL_EVENTS_WINDOW>>>,
        QueryParameter<'states', z.ZodString>,
        QueryParameter<'q', z.ZodString>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<typeof EventsRowSchema>;
            page: typeof OffsetPageInfoSchema;
        }, z.core.$loose>>>;
        403: JsonResponse<typeof StudioErrorEnvelopeSchema>;
        404: typeof NotFoundResponse;
    };
}>;
export declare const getChannelDashboard: Route<{
    method: 'get';
    version: 1;
    path: '/channels/{channelId}/dashboard';
    parameters: readonly [
        typeof ChannelIdParameter,
        QueryParameter<'period', z.ZodDefault<VocabularyIn<typeof GET_CHANNEL_DASHBOARD_PERIOD>>>,
        QueryParameter<'from', z.ZodString>,
        QueryParameter<'to', z.ZodString>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            data: typeof DashboardScreenSchema;
        }, z.core.$loose>>>;
        400: typeof BadRequestResponse;
        403: typeof ForbiddenResponse;
    };
}>;
export declare const getChannelStats: Route<{
    method: 'get';
    version: 1;
    path: '/channels/{channelId}/stats';
    parameters: readonly [
        typeof ChannelIdParameter,
        QueryParameter<'tab', z.ZodDefault<VocabularyIn<typeof GET_CHANNEL_STATS_TAB>>>,
        QueryParameter<'period', z.ZodDefault<VocabularyIn<typeof GET_CHANNEL_DASHBOARD_PERIOD>>>,
        QueryParameter<'from', z.ZodString>,
        QueryParameter<'to', z.ZodString>,
        QueryParameter<'showId', z.ZodString>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            audience: z.ZodOptional<typeof StatsAudienceSchema>;
            series: z.ZodOptional<typeof StatsSeriesSchema>;
        }, z.core.$loose>>>;
        400: typeof BadRequestResponse;
        403: typeof ForbiddenResponse;
    };
}>;
export declare const getChannelAgenda: Route<{
    method: 'get';
    version: 1;
    path: '/channels/{channelId}/agenda';
    parameters: readonly [
        typeof ChannelIdParameter,
        QueryParameter<'from', z.ZodString, true>,
        QueryParameter<'to', z.ZodString, true>,
        typeof SurfaceParameter,
        typeof IfRightsVersionParameter,
        typeof TraceparentParameter
    ];
    responses: {
        200: JsonResponse<z.ZodIntersection<typeof StudioEnvelopeMetaSchema, z.ZodObject<{
            items: z.ZodArray<typeof EventsRowSchema>;
        }, z.core.$loose>>>;
        404: typeof NotFoundResponse;
    };
}>;
export {};
//# sourceMappingURL=agenda.d.ts.map