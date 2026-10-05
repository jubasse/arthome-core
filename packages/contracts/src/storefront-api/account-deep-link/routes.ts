import type { GetAccountDeepLinkRoute } from './types.js';
import { AccountDeepLinkSchema } from '../../identity/index.js';
import {
  StorefrontTag,
  SurfaceParameter,
  TraceparentParameter,
  storefrontV1,
  viewer,
} from '../components.js';

export const getAccountDeepLink: GetAccountDeepLinkRoute = storefrontV1
  .identity(viewer)
  .tags(StorefrontTag.PAIRING)
  .headers(SurfaceParameter, TraceparentParameter)
  .single('account-deep-link')
  .find({
    operationId: 'getAccountDeepLink',
    summary: 'The QR that hands off to account management — what is NOT a pairing.',
    item: AccountDeepLinkSchema,
    answer: 'The link.',
  });
