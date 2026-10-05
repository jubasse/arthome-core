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
  listPayouts: {
    description:
      '**One balance per currency, never a converted balance.** A channel selling in two currencies\nhas **two balances**: converting would introduce a rate, hence an exchange date, hence a\nreconciliation gap nobody could explain. Stripe keeps one balance per currency; we mirror it,\nwe do not aggregate it.\n\n**Reserved to roles with `canRevenue`** — the whole page, not only its columns.\n',
    upstream: [Service.PAYOUTS],
  },
  requestBankChange: {
    description:
      '**An aggregate in its own right, not a write.** Two actors, two distinct roles (owner **and**\ntreasury), a delay, a trace — **and it suspends the payout in flight** for the duration of the\nsigning. A write cannot carry that.\n\nOnly the **last four characters** of the account travel: a full IBAN has no business in an\nevent log that gets replayed.\n\n**The return from an external browser confirms nothing**: the pending state lives\n**server-side**, and on the way back, "the deep link says where to go, the backend says what\nchanged".\n',
    upstream: [Service.PAYOUTS],
  },
  closeReconciliationPeriod: {
    description:
      "**A period does not close with an unexplained discrepancy.** The refusal carries the gap and\nthe lines concerned. We never rebuild the provider's ledger: we **reconcile** ours against it,\nand any discrepancy routes an alert to `treasury`.\n",
    upstream: [Service.PAYOUTS],
  },
  requestChannelExport: {
    description:
      '**An asynchronous job** (BullMQ **internal to its service**), never a synchronous download:\nover 24 months that is not tenable. The URL returned is **signed, short-lived, and usable\nwithout a session cookie** — an export protected by a cookie is undownloadable from the native\nshell.\n',
    upstream: [Service.PAYOUTS, Service.CATALOG, Service.CHAT],
  },
  listModerationQueue: {
    description:
      "**A moderation queue grows while it is being read.** Offset pagination duplicates rows there\nand skips others — **mechanically, not exceptionally**. It is a stream, even hosted in the\nstudio, hence a cursor (D-010).\n\nThe **separate total** (`pendingCount`) feeds the badge: it is not counted over the current\npage, otherwise the bottom bar would display the number of rows loaded.\n\n**Other people's claims are visible**: `claimedBy` and `claimExpiresAt` arrive on the same\nchannel, with the name of whoever is acting. Without that, two moderators work blind to each\nother and collide on every row.\n",
    upstream: [Service.CHAT],
  },
  searchAudience: {
    description:
      '**A collection queryable in its own right, not a projection of the chat**: the console looks\nfor "a viewer **present, who has not written**". Thousands of nicknames, hence **server-side\nsearch is mandatory**.\n',
    upstream: [Service.CHAT],
  },
  sanctionAudienceMember: {
    description:
      '**The sanction bears on the person, within a channel**: the same person is banned at one\nartist\'s and welcome at another\'s. That is why it belongs to `chat` and not to `identity` —\nhousing the sanction there would force every verdict, the most frequent gesture of a saturated\nlive show, into a cross-service write to the most sensitive service in the system.\n\n**A sanction carries an instant of expiry, never a label.** "No limit", 1 min, 10 min, 1 h and\na free-form duration are **a single field**, computed once.\n',
    upstream: [Service.CHAT],
  },
  addBannedWord: {
    description:
      '**The ambiguity is settled: retroactive processing is asynchronous.** The command answers\n**immediately** with `reprocessing: true` and the **estimated** number of messages affected;\nthe new queue items arrive over the real-time channel, marked `origin: retroactive_filter` so\nthe log can tell them apart from a human decision.\n\nReason: a synchronous reclassification over thousands of messages **would block the command in\nthe middle of a live show**.\n',
    upstream: [Service.CHAT],
  },
  removeBannedWord: {
    description:
      'Removal **does not republish** messages already removed: a moderation decision stays a fact.',
    upstream: [Service.CHAT],
  },
};
