import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const datesDocs: ModuleDocs = {
  getDateSheet: {
    description:
      '**One call for the record, then one call per open pane, at its owner.** A moderator must be\nable to load the `chat` pane **without** loading the whole record, otherwise ticketing travels\nfor nothing.\n\n`openPanes` is **served**, not inferred: the very layout of the screen depends on the\neffective rights, and the overview appears only beyond three open panes.\n',
    upstream: [Service.CATALOG],
  },
  getDatePublicPane: {
    description:
      'One of the five panes that were missing. The motive "one call for the record, then one call\nper open pane, **at its owner**" was stated twice and implemented once: a `moderation` role\nreceived `openPanes: [chat]` and had **no pane to call**, a `coordination` role received\n`[tech, crew]` — neither of the two existed.\n\nOpen to `artist` and `production`.\n',
    upstream: [Service.CATALOG],
  },
  getDateReplayPane: {
    description:
      'The three things the sources conflated, served separately: the **promise** belongs to\n`catalog`, the **file and its expiry** to `streaming`, the **sale** to `ticketing`.\n\nOpen to `artist` and `production`.\n',
    upstream: [Service.CATALOG, Service.STREAMING, Service.TICKETING],
    maturity: 'provisional',
    maturityReason: 'the replay slice (adr-replay, D-090 to D-092) is not built',
  },
  moveDatePublicationState: {
    description:
      '**Three guarantees, and not one of them is an interface courtesy.**\n\n1. **The server refuses the reverse transition.** Not offering it in the interface is not a\n   guarantee. The refusal carries `publication.transition_irreversible`, the transition attempted **and\n   the promise committed** as parameters — `prices_engaged` for `draft|reserve → scheduled`,\n   `replay_sold` for `ended → replay_online`. **The lock bears on the `from > to` pair, not\n   on the state.**\n2. **It is conditional and versioned.** Two people can be on the record: a command sent from\n   `technical` while the current state is `live` is refused with `state.conflict`,\n   **with the current version, and the current state when the record has one**. The studio is multi-operator without a lock; the arbitration\n   is on the server.\n3. **`Idempotency-Key` is mandatory, not recommended**: the transition commits a public price\n   or a sale.\n\n**The publication gate is served, not recomputed**: the refusal names the **missing** items as\nparameters, since the screen counts them ("publish — 3 missing"). Never a percentage, which\nthe client would compute.\n\n**The attempt to go backwards is itself logged**: an attempt to walk back a committed price is\nin itself a piece of operational information.\n\nTwo transitions are **not** commands: `technical → live` and `live → ended` are **caused by a\n`streaming` event**. Publication does not command the broadcast, it **learns** of it — only\n`streaming` knows whether the feed is arriving.\n',
    upstream: [Service.CATALOG],
  },
  setDateReplayPolicy: {
    description:
      '**`none` is final for this date.** You cannot later switch on a replay you promised not to\nmake: the public price depended on it. The other values lock when ticketing opens.\n\nThe contract separates three things the sources conflated: the **promise** belongs to\n`catalog`, the **sale** to `ticketing`, the **file and its expiry** to `streaming`.\n',
    upstream: [Service.CATALOG],
  },
  deleteDate: {
    description:
      '**Refused if seats remain sold**, and the refusal carries **the count** as a parameter: the\nscreen must say "174 seats sold", not "not possible". It is a domain rule, not an interface\nguard, and the application must not try to check it on its own.\n',
    upstream: [Service.CATALOG],
  },
  duplicateDate: {
    description:
      '**"Apply to the series" excludes prices and capacity** — never carried over, because each\ndate commits its own buyers. The contract says so rather than leaving the interface to guess\nit.\n',
    upstream: [Service.CATALOG],
  },
  decideDateOutcome: {
    description:
      "**Reserved to the owner and to production.** The other roles can only **report**. An outcome\ndecision is worth several thousand euros, and the log names names.\n\n**One event, four consequences, and none of the four consumers talks to the others**:\n`ticketing` refunds (cancelled) / credits (interrupted) / **does not move** (postponed — the\nseat follows the new date); `payouts` withholds; `catalog` replaces the state **on every\ncard**, not only on the record; `notifications` warns the holders.\n\n**A declared outcome is a fact: never rewritten, never erased.**\n\nThe control room's message travels **with its authoring language**: it is content, not an i18n\nkey.\n",
    upstream: [Service.CATALOG],
  },
};
