import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const seatsDocs: ModuleDocs = {
  refundSeat: {
    description:
      "**The refund refunds the commission too**: we do not keep 12% of a show that did not happen.\nIt is not merely decent, it is what the copy promises.\n\n**Only `date_cancelled` cancels the seat** (D-095): a refund for `goodwill`, `duplicate` or\n`dispute` gives money back and leaves the seat active, whatever the amount. `date_cancelled` on a\ndate that is not cancelled is refused with `409` `state.conflict` (D-097).\n\n**Never more than is left**: the amount asked, `partialAmountMinor` or else the seat's share of\nthe order, is refused above what remains to refund on the order, every refund decided counted,\nwith `409` `refund.amount_exceeds_remaining` and the amount left in its params.\n\n`payoutId` stays `null` while `ticketing` owns no payout, and `commissionRefunded` is absent until\nthe payouts slice computes it.\n\n**Never queued offline**: it is a money command, it is refused locally with\n`offline_forbidden`.\n",
    upstream: [Service.TICKETING],
  },
};
