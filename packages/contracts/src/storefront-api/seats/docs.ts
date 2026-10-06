import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const seatsDocs: ModuleDocs = {
  cancelSeat: {
    description:
      'The deadline is **served as an instant** on the seat (`cancelDeadline`), never as the\nsentence "up to 1 h before". A cancellation at or after it is refused with\n`seat.cancel_deadline_passed`, `cancelDeadline` as its parameter; a seat no longer active\n(cancelled, refunded, credited or transferred) is refused with `seat.not_active` and its `state`.\n\n**Cancelled at once, refunded once settled.** The answer serves the seat `cancelled`, with the\nrefund\'s amount, its `method` and its `delayCode`; the seat becomes `refunded` once the payment\nprovider confirms the money went back. On a disputed order the seat is cancelled and `refund` is\n`null`: the provider holds the money (adr-payments.md §9).\n\n**The seat returns to public sale at once** (D-093), first come first served: the waiting list is\nnot notified and gets no priority.\n',
    upstream: [Service.TICKETING],
  },
};
