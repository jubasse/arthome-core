import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const seatsDocs: ModuleDocs = {
  refundSeat: {
    description:
      '**The refund refunds the commission too**: we do not keep 12% of a show that did not happen.\nIt is not merely decent, it is what the copy promises.\n\n**Never queued offline**: it is a money command, it is refused locally with\n`offline_forbidden`.\n',
    upstream: [Service.TICKETING],
  },
};
