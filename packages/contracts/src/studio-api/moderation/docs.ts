import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const moderationDocs: ModuleDocs = {
  claimModerationItem: {
    description:
      '**"Taking charge is not deciding."** It is a **short lease**, renewed while the person is\npresent and **released by the server** on expiry: a moderator whose phone dies does not freeze\na row for the whole live show.\n\n**Never queued offline**: replayed on reconnection, it would claim a row someone else has\nalready handled.\n',
    upstream: [Service.CHAT],
  },
  releaseModerationItem: {
    description: 'Speeds up the release; **nothing depends on it**, the lease expires by itself.',
    upstream: [Service.CHAT],
  },
  settleModerationItem: {
    description:
      '**The second verdict is refused, and the refusal carries the winning decision** — author\n**and** verdict — so the screen can display "X has already deleted this message" instead of a\nbare failure. A bare refusal would force a second round trip in the middle of a live show.\n\n**This is why the command is conditional** (`expectedVersion`) and **not** a blind idempotent\nwrite: an idempotent replay would overwrite the first verdict, which is exactly the opposite\nof the rule.\n\n**Two of the four verdicts bear on the person, not on the message**: `mute` and `ban` compose\nwith the channel sanction. The three axes — message state, nature of the queue row, sanction\non the person — never stack.\n\n**Queued offline**, together with sanctions on a named person, and **nothing else**: it is the\none gesture on duty that a basement 4G must be able to defer.\n',
    upstream: [Service.CHAT],
  },
};
