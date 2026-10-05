import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const seatsDocs: ModuleDocs = {
  cancelSeat: {
    description:
      'The deadline is **served as an instant** on the seat (`cancelDeadline`), never as the\nsentence "up to 1 h before". The refusal after the deadline carries\n`seat.cancel_deadline_passed`, with the instant as a parameter.\n',
    upstream: [Service.TICKETING],
  },
};
