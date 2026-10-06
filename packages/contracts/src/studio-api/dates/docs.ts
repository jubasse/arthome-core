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
  getDateTicketsPane: {
    description:
      'Served by `ticketing`, **projected according to the role**: `grossRevenue` is absent without\n`canRevenue`. The pane is open to `artist`, `production` and `treasury`.\n',
    upstream: [Service.TICKETING],
  },
  setDatePrices: {
    description:
      '**`ticketing` applies its own lock**, it asks `catalog` for nothing: it refuses as soon as it\nhas consumed `publication.engaged`, with its own code and its own trace. This is the answer to\nthe reproach "an aggregate straddling three contexts" — publication publishes a fact, each\nowner locks what it owns.\n\n**"Apply to the series" excludes prices**: each date commits its own buyers.\n\n**One currency per date**, its billing market\'s (D-016): tiers in two currencies are refused\nwith `date.prices_currency_mismatch`, whose `params` name the stray `tier`, its `currency`,\nand the `expected` one.\n',
    upstream: [Service.TICKETING],
  },
  openCapacityTier: {
    description:
      '**One transactional command, not two.** Two calls would let the scarcity dissipate between\nthem: the priority window (`WAITLIST_PRIORITY_HOURS`, `@arthome/core`) is a **domain parameter**,\nserved and not copied out.\n\n**With `notifyWaitlist: true`**, the default (D-083), the new seats become a priority pool: every\n`waiting` entry is notified in the same transaction (`waitlistNotified`) and may buy from the pool\nuntil `priorityUntil`, first come first served. The public sees the date without the pool, and what\nis left returns to public sale at `priorityUntil`; meanwhile `sales.priorityPool` serves the seats\nleft. **With an empty list** there is no pool either: `waitlistNotified` is `0`, `priorityUntil` is\nabsent, and the seats go on public sale at once.\n\n**With `notifyWaitlist: false`** (D-094), nobody is notified and no pool is made: `waitlistNotified`\nis `0`, `priorityUntil` is absent, and the new seats go on public sale at once.\n\n**Capacity widens in tiers and never shrinks** once the sale has opened: a reduction is\nrefused with `capacity.tier_must_widen`.\n\nBeyond `TECHNICAL_PROVISION_THRESHOLD` seats (`@arthome/core`), the technical provision is\nrequired: a capacity no recorded provision covers is refused with\n`date.technical_provision_required`, whose `params` name the `threshold`, the `capacityTotal`\nasked for, the `provisionedCapacity` when one is recorded, and `revisableUntil`,\n`PROVISION_REVISION_HOURS` before the start, once the date has one. The studio records the\nprovision first, with `setTechnicalProvision`. Threshold, provision, deadline and exposure to\nthe penalty are **contract data**.\n',
    upstream: [Service.TICKETING],
  },
  setTechnicalProvision: {
    description:
      'Beyond `TECHNICAL_PROVISION_THRESHOLD` seats (`@arthome/core`), `openCapacityTier` refuses a\ncapacity no recorded provision covers (D-088). This records the capacity the infrastructure\nis provisioned for, and replaces the one recorded before.\n\n**Revisable until `revisableUntil`**, `PROVISION_REVISION_HOURS` before the start: from then\non it is refused with `date.provision_deadline_passed`. A date with no start yet has no\ndeadline. A provision below the capacity already open covers nothing and is refused with\n`date.provision_below_capacity`, whose `params` name both figures.\n\nThe penalty for a forecast far above the real figure is not defined yet (D-088).\n',
    upstream: [Service.TICKETING],
  },
  issueComplimentary: {
    description:
      'Complimentary tickets **by category** are one of the six shapes the sources did not carry.\nThey enter the `ticketing` contract at tier 3, **marked provisional**.\n',
    upstream: [Service.TICKETING],
    maturity: 'provisional',
    maturityReason: 'complimentary tickets entered the ticketing contract marked provisional',
  },
  getDateChatPane: {
    description:
      '**This is the pane that justified the whole mechanism**: *"a moderator must be able to load\nthe `chat` pane without loading the whole record, otherwise ticketing travels for nothing"*.\nThe argument was quoted in the contract and undone by its own implementation.\n\nOpen to `artist`, `production` and `moderation`.\n',
    upstream: [Service.CHAT],
  },
  setDateChatPolicy: {
    description:
      '**`chat` applies its own lock.** Once publication is committed, a live chat can still be\n**closed**; it can no longer be **opened wider**. `chat` knows this because it consumed the\nevent, not because it asked `catalog`.\n',
    upstream: [Service.CHAT],
  },
  listStudioChatMessages: {
    description:
      "**The studio sees both states of a message, the viewer sees one.** A removed message never\nreaches a public surface; here it is served with its state, because that is what moderation\narbitrates.\n\nCursor, never page + total: counting a live show's messages in order to display a total is a\npointless cost, and the total changes between the call and the display.\n",
    upstream: [Service.CHAT],
  },
  getDateTechPane: {
    description:
      "Open to `artist`, `production`, `director`, `video`, `sound` and `coordination`. It is a\n`director`'s only pane; it did not exist.\n\n**The stream key does not appear in it**: it appears in no list payload, and revealing it is a\nseparate command, audited and by name.\n",
    upstream: [Service.STREAMING],
  },
  getRunConsole: {
    description:
      '**The return path actually open is served** (`monitorPath`): the studio must **know** it so\nas not to promise the operator a latency it does not have. The contract carries the truth, not\nuniformity — creating a media branch to make a schema uniform would cost more than it returns.\n\n**Two fields, not one**: `state` and `afterGracePeriod`. The studio distinguishes "hiccup\nabsorbed" from "publisher gone", and a two-second network break in a room must produce neither\nan incident nor a manifest restarted from zero.\n\n**The stream key is never here**: it appears in no list payload.\n',
    upstream: [Service.STREAMING],
  },
  runTechnicalCheck: {
    description:
      'Its success **unlocks publication**: `technical_check_passed` is one of the seven checklist\nitems, and it comes from here. `catalog` **projects** it, it does not ask for it.\n`idle → on_air` is refused as long as the check has never passed.\n',
    upstream: [Service.STREAMING],
  },
  rehearseRun: {
    description:
      'The run goes from `idle` to `rehearsal`: the feed is checked, nothing is sold against it.',
    upstream: [Service.STREAMING],
  },
  goOnAir: {
    description:
      '**The "go on air" command goes to `streaming`, not to `catalog`**: only `streaming` knows\nwhether the feed is arriving. Publication **learns** of it afterwards, by event — two\ntransitions out of eight are caused that way, which leaves `Publication` the aggregate of a\nsingle context.\n\n`idle → on_air` is **refused** if the technical check has never passed.\n',
    upstream: [Service.STREAMING],
  },
  endRun: {
    description: 'The run goes to `ended`. It is final for this date: a new run is a new date.',
    upstream: [Service.STREAMING],
  },
  resetRun: {
    description: 'The run goes back to `idle`, before the date starts: the console is emptied.',
    upstream: [Service.STREAMING],
  },
  setQualityProfile: {
    description:
      'Named encoding profiles are an **account** preference, not a value local to the workstation.',
    upstream: [Service.STREAMING],
  },
  getHealthSeries: {
    description:
      '**The write promised a read that did not exist.** `submitHealthSample`\'s own exemption motive\nsays the series "is **re-requested**, it is not replayed", and `realtime.md` §5.1 files a\nbitrate curve under "to throw away" for that same reason — yet nothing could request it, and\n`RunConsole` served `lastSample` alone. One point is not a curve.\n\nThree paths cross this read every evening and none of them is exceptional: after a\n`resume:too_old`, after a reconnection, and simply opening the console in the middle of a\nlive show.\n\n**Bounded by construction.** The window is a parameter, capped, and defaults to the last\nthree minutes — `studio-mobile` asked for it short, and a control room reads the last three\nminutes, not the last three hours.\n',
    upstream: [Service.STREAMING],
  },
  submitHealthSample: {
    description:
      "**End-to-end latency is a dedicated measurement**, never a native figure presented as one.\nIt is measured by `RTCPeerConnection.getStats()` on the WHEP return path and **submitted**,\nhence `source: client_submitted`. **If it is not measured, it is absent** — never replaced by\na zero.\n\n`deviceUpKbps` measures the workstation's uplink, **not the encoder**: two different bitrates\nnever carry the same name, and only `ingestUpKbps` feeds the pre-flight checklist.\n",
    upstream: [Service.STREAMING],
    idempotencyExemption:
      "**One measurement per second per live show, loss-tolerant.** A replayed sample is one more\nsample in a series; a lost sample is missed by nobody. The series is **re-requested**, it is\nnot replayed — that is already the channel's resume rule.\n",
  },
  postChapter: {
    description:
      "A chapter carries `atMediaSec` — its **position in the media** — never the time it was set.\nIt is free now and unrecoverable later: without it, a replay's chapters are offset by however\nlong the control room took to set them.\n\n`vocabId` is a vocabulary identifier, **never an authored label**.\n",
    upstream: [Service.STREAMING],
  },
  removeChapter: {
    description: 'Replayed on an already-removed chapter, it succeeds.',
    upstream: [Service.STREAMING],
  },
  raiseIncident: {
    description:
      '**A client-side veil, never a stream switch**: the control plane publishes the state, the\nplayer displays it **over an untouched video**. Instant, identical on all three storefronts,\nand the media stays intact for the resume.\n\n**Cause and outcome are two vocabularies**, and separating them was necessary: the four\nentries in the sources are **outcomes**, while the mobile control room distinguished three\nmore **causes** that existed nowhere.\n\nThe message travels **with its authoring language**. The catalogue supplies **templates** per\nkind of incident, which the control room reuses or replaces.\n\n**Broadcast latency: ≤ 2 s, non-negotiable** — the client-side veil depends on it.\n',
    upstream: [Service.STREAMING],
  },
  revealStreamKey: {
    description:
      "**It is a secret displayed on a phone, in a room, often in front of a contractor.** Four\nguarantees, and they are in the contract because none of them is verifiable client-side:\n\n- the key is **never** in a list payload;\n- revealing it is **this command**, separate, audited and by name;\n- the response carries **`Cache-Control: no-store`** — it must end up neither in the phone's\n  HTTP cache, nor in the application snapshot the OS takes when it goes to the background;\n- **assignment to the `director` slot**, which grants access to the key, is reserved to\n  `artist ∨ production`.\n\n**Re-authentication required**: this is a sensitive operation, and it is asked for **at the\nmoment of the operation**, never on returning to a screen.\n",
    upstream: [Service.STREAMING],
  },
  rotateStreamKey: {
    description:
      '**Immediate**, and the contract says so: the old key stops broadcasting at once. Rotating\n**during a live show** cuts the ingest in progress — the refusal carries a distinct code\n(`date.stream_key_rotation_during_run`) rather than silently executing a command whose consequence\nis dead air.\n',
    upstream: [Service.STREAMING],
  },
  getDateCrewPane: {
    description:
      'Three gaps compounded on the same page, the one belonging to the `coordination` persona,\nwhose entire navigation is `crew · log · help`:\n\n- `/v1/dates/{dateId}/crew` was **POST only**: the dates × posts matrix and the "tonight"\n  list had no read path at all. `listDuties` gives **my** duties,\n  `EffectiveRights.dateGrants` gives **my** accesses — neither gives the coverage;\n- **`revokeDateAccess` revokes by `grantId`, an identifier no read handed out**;\n- `moderator_assigned` is one of the checklist items and `datesToCover` a served counter:\n  **both were computed against a coverage the studio could not read.**\n\nOpen to `artist`, `production` and `coordination`.\n',
    upstream: [Service.IDENTITY],
  },
  grantDateAccess: {
    description:
      '**Scoped to one date, expiry served as an instant.** "Expires at curtain call + 1 h" is a\nscreen sentence; the contract carries the instant. Revocable **without touching channel\nmembership** — conflating the two would turn revoking a stand-in into expulsion.\n\n**Assignment to the `director` slot grants access to the stream key.** It is therefore\nreserved to `artist ∨ production`, and the contract makes **that reason** explicit rather than\nleaving it to be guessed.\n\n**Sixty seconds is not good enough for an access that expires**: the internal token carries the\nroles, but the service checks the time-boxed access **on the loaded resource**.\n',
    upstream: [Service.IDENTITY],
  },
  pinMerchDuringLive: {
    description: '**A put**: pinning the same item twice does not pin it twice.',
    upstream: [Service.TICKETING],
    maturity: 'provisional',
    maturityReason: 'studio merchandise is not built',
  },
  reopenReplayWindow: {
    description:
      'Possible **only** if the policy was not `none`: the promise made before the purchase does not\nreopen. The new expiry is **derived** from the end of the live show and the served window,\nnever set by hand — otherwise the replay policy would end up encoded in a storage lifecycle,\nout of reach of the tests.\n',
    upstream: [Service.STREAMING],
  },
};
