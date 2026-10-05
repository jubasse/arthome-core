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
  listChannelMembers: {
    description:
      'The **per-role counter** is a **served aggregation**, not a count over the current page: the\nrole filter displays "production (4)", and that number bears on the whole team.\n\nThe search covers the name, the email, the note and the role, **server-side**: the directory\nof contributors runs into the thousands, freelancers included.\n',
    upstream: [Service.IDENTITY],
  },
  inviteMember: {
    description:
      '**`role ∈ assignableRoles` of the inviter**, a projection of `grants` onto the roles they\nhold. The refusal carries **the list of roles assignable from this level and whom to ask** — a\nbare refusal would force the person to guess.\n\n`director` can invite `video` and `sound`; `video`, `sound`, `moderation` and `treasury`\ninvite nobody. **The fallback to six personas erases that right**, and that is why it appears\nin no response.\n\n**A two-stage command**: the invitation stays pending until the invitee answers, and it is\n**visible as such** in the member list.\n',
    upstream: [Service.IDENTITY],
  },
  changeMemberRoles: {
    description:
      '**A set, never a single role.** The owner can be **neither removed nor have their roles\nchanged**: `transferOwnership` moves the flag, and it requires the recipient to be **already a\nmember** and to have two-factor authentication.\n',
    upstream: [Service.IDENTITY],
  },
  removeMember: {
    description: '**The owner is never removable**: the refusal carries `OWNER_NOT_REMOVABLE`.',
    upstream: [Service.IDENTITY],
  },
  transferChannelOwnership: {
    description:
      '**The recipient must already be a member and have two-factor authentication.** These are\ndomain rules, not interface guards, and the refusal is **served with its reason**. The bank\naccount (`payouts`) and the public page (`catalog`) **follow** the transfer, by event.\n',
    upstream: [Service.IDENTITY],
  },
  listChannelEvents: {
    description:
      '**Page + total**: the design displays "1–8 OF N" and lists the page numbers. You pin a page\nand send it to a colleague — that is an interface affordance, and it is the reason for the\ndecision.\n\n**Sorting by state follows the state machine\'s canonical order**, not the alphabet:\n`orderRank` travels with the state for exactly that.\n\n**Sorting by revenue is refused** (`api.sort_key_forbidden`) to roles without `canRevenue`, and\nthe field is **absent** from their rows. A sort silently accepted would betray the ordering of\nthe very values one is not allowed to show.\n\nThe temporal split (upcoming / past) and the multi-state filter are **contract parameters**,\nnever a filter applied after fetching: "past" bears on the channel\'s whole history.\n',
    upstream: [Service.CATALOG, Service.TICKETING],
  },
  getChannelDashboard: {
    description:
      "**It is the default tab of three personas out of six**, and it had no operation at all.\n\nIt carries **only what had no carrier**: the aggregated tiles and the routed list. Everything\nelse on that screen is a recomposition of collections already served — the next dates and the\ncountdown card come from `listChannelEvents`, revenue per date from `listPayouts`, dates held\nin reserve from `listChannelEvents?state=reserve`, and the countdown **is computed locally**\nagainst `startsAt` and the channel's `serverTime`, as the contract prescribes everywhere else.\nAsking for them again here would have been the value composed in two places.\n",
    upstream: [Service.CATALOG, Service.TICKETING, Service.STREAMING, Service.CHAT],
    maturity: 'provisional',
    maturityReason: 'the studio statistics (studio-money) are not built',
  },
  getChannelStats: {
    description:
      'Two tabs, one path. The `stats_csv` export already existed: **one could export a statistic\none could not read.**\n\nThe screen\'s title varies with the role — "Audience and revenue" under `canRevenue`,\n"Audience" otherwise — and it is the **projection** that decides it: without `canRevenue`, the\nrevenue fields are **absent**, not masked.\n\n**Where viewers came from is not served**: see `StatsAudience`. It is the only point on these\ntwo screens that required a datum the system produces nowhere.\n',
    upstream: [Service.CATALOG, Service.TICKETING, Service.STREAMING],
    maturity: 'provisional',
    maturityReason: 'the studio statistics (studio-money) are not built',
  },
  getChannelAgenda: {
    description:
      'Composed by `catalog` and fed by `ticketing` for the capacity and the revenue. The revenue is\n**absent** without `canRevenue` — and that is why the schedule served to a control room has no\n`grossRevenue` field, while the one served to the treasury has no stream key.\n',
    upstream: [Service.CATALOG, Service.TICKETING],
  },
};
