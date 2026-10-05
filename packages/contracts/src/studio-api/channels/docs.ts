import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const channelsDocs: ModuleDocs = {
  listChannelReplays: {
    description:
      '`reopenReplayWindow` allowed you to **reopen a window you could not see**. It is also the\nscreen where you notice that a window closes in twenty-four hours — which the inbox already\nannounces with an alert.\n\nPage + total, like every stable collection in the studio.\n',
    upstream: [Service.STREAMING, Service.CATALOG, Service.TICKETING],
  },
  getChannelSettings: {
    description:
      '`PATCH /channels/{id}/identity` existed **without a GET**. Two further blocks that had no\ncarrier join it: the **moderation defaults**, and the **merchant integration** — one at a time\nper channel.\n\nThe moderation block settles a defect the surface named: `filterSeverity`, `slowModeSec`,\n`holdersOnly` and `retroactiveFilter` lived **only** on `PUT /dates/{id}/chat-policy`, hence\n**per date, with a date\'s `expectedVersion`**. Yet off air there is no date to point at, and\nthe design says the opposite in so many words: *"the dictionary, the severity and the\nsanctions stay editable off air — they will apply to the next live show"*. The dictionary was\nalready at channel level; the other three were not.\n',
    upstream: [Service.CATALOG, Service.CHAT, Service.STREAMING, Service.TICKETING],
  },
  updateChannelSettings: {
    description:
      "**The write counterpart of `getChannelSettings`** — without it I had just created a\nread-only screen, that is, exactly the defect this batch corrects elsewhere.\n\nIt settles the **off-air** gesture: filter severity, slow mode and holders-only are set here,\nat channel level, with no date to point at. The public identity stays on its own path,\nbecause it is a pure `catalog` write and because a channel's two faces never mix.\n\n**The defaults are inherited when a date is created, never applied retroactively**: a channel\nsetting does not change the regime of a live show in progress.\n\nThe `version` answered is the one `expectedVersion` is checked against: the moderation defaults'.\n",
    upstream: [Service.CHAT, Service.STREAMING],
  },
  // One call, not five: the audit log is a read model of `identity` fed only by Kafka, so a single
  // owner holds the exact total, the projection by role and the sort.
  listChannelJournal: {
    description:
      '**The audit log stays on page + total** (D-010), with a **mandatory period filter**. Nobody\npages to the 50,000th entry of a 24-month log: you filter by period first, which keeps the\npage numbers — the affordance wanted — and stays fast. Moving to a cursor would trade a\nproblem we do not have against the loss of what we wanted.\n\n`from` and `to` are **required**, and too wide a range is refused with\n`api.period_filter_required`, with the maximum range as a parameter.\n\nIt **names names and places them**, kept for 24 months. The **attempts** to walk back a\ncommitted transition appear in it: that is in itself a piece of operational information.\n',
    upstream: [Service.IDENTITY],
  },
  listChannelMerchItems: {
    description:
      '**Unpaginated** — dozens of items. One external integration at a time per channel.',
    upstream: [Service.TICKETING],
    maturity: 'provisional',
    maturityReason: 'studio merchandise is not built',
  },
  upsertMerchItem: {
    description:
      '**An item without a variant is not sellable.** The label is **bilingual**; the absence of an\nEnglish label in the sources is a **data gap** to be filled during the port, not a translation\ngap.\n',
    upstream: [Service.TICKETING],
    maturity: 'provisional',
    maturityReason: 'studio merchandise is not built',
  },
  updateChannelIdentity: {
    description:
      '**A pure `catalog` write.** A channel has two faces, and the contract separates them: the\nchannel **as an organisation** — members, roles, invitations, stream key — is authorisation,\nhence `identity`; the channel **as a public page** — name, biography, avatar, discipline — is\ncatalogue, hence `catalog.Artist`, in a 1:1 relation by `channelId`.\n\n**No studio command crosses the two**, and that is the proof the cut is right: the Settings\nscreen shows two blocks that never mix.\n',
    upstream: [Service.CATALOG],
  },
};
