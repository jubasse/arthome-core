import {
  ArtistCategoryParameter,
  ArtistLiveOnlyParameter,
  ArtistSortParameter,
} from './schemas.js';
import type { GetArtistDetailRoute, ListArtistsRoute } from './types.js';
import { ArtistDetailSchema, ArtistSummarySchema } from '../../catalog/index.js';
import { Freshness, cursor } from '../../http/index.js';
import {
  ArtistIdParameter,
  CursorDirectionParameter,
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  publicRead,
  storefrontV1,
  viewer,
} from '../components.js';

const artists = storefrontV1
  .identity(viewer)
  .optionalAuth()
  .headers(SurfaceParameter, TraceparentParameter)
  .tags(StorefrontTag.DISCOVERY)
  .resource('artists', { id: ArtistIdParameter });

export const listArtists: ListArtistsRoute = artists.findAll({
  operationId: 'listArtists',
  summary: 'The artist directory, by cursor.',
  paging: cursor({ maxLimit: 50 }),
  parameters: [
    CursorDirectionParameter,
    ArtistCategoryParameter,
    ArtistSortParameter,
    ArtistLiveOnlyParameter,
  ],
  cache: publicRead(Freshness.FIVE_MINUTES),
  item: ArtistSummarySchema,
  answer: 'A page of artists.',
});

export const getArtistDetail: GetArtistDetailRoute = artists.find({
  operationId: 'getArtistDetail',
  summary: "An artist's page, their dates and their replays in the same response.",
  cache: publicRead(Freshness.FIVE_MINUTES),
  item: ArtistDetailSchema,
  answer: 'The page.',
});
