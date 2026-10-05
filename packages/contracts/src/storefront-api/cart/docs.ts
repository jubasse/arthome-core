import { Service } from '@arthome/core';

import type { ModuleDocs } from '../../openapi/docs.js';

export const cartDocs: ModuleDocs = {
  getCart: {
    description:
      "The cart lives **on the account**, not in the browser: it is persistent in the header, it is\nbuilt up across several sessions from a live show's shop, and all three storefronts display\nit. It is served **already split by vendor**, because that is how it will be paid.\n",
    upstream: [Service.TICKETING],
  },
  addCartLine: {
    description:
      'A line references a **variant**, never a bare item: a T-shirt without a size is not\nsellable. Shipping is **not** computed here — it is computed at quoting time.\n',
    upstream: [Service.TICKETING],
  },
  updateCartLine: {
    description:
      '**Conflict between two devices: per line, last writer wins, and the ordering comes from the\nserver** — `version`, never a date from the phone, whose clock drifts and jumps.\n',
    upstream: [Service.TICKETING],
  },
  removeCartLine: {
    description:
      'Replayed on an already-removed line, it **succeeds**. Returns the whole cart, split by\nvendor, so the surface repaints without a second round trip.\n',
    upstream: [Service.TICKETING],
  },
  quoteCart: {
    description:
      '**The total presented is the one that will be charged**, for 15 minutes. Shipping is computed\n**here**, not on adding. A cart spanning two channels returns **two groups**: it will split\ninto two orders at payment.\n',
    upstream: [Service.TICKETING],
    idempotencyExemption:
      '**A read disguised as a `POST`**, for the same reason as `quoteSeat`: the cart and the\nshipping address do not fit in a URL. A quote computes shipping and discounts; it creates\nneither an order nor a reservation.\n\n**A key would protect nothing here** — `checkoutCart` carries the `quoteId` and refuses a\nstale quote — **and it would do harm**: the total presented is the one that will be charged,\nand that promise holds for **fifteen minutes**. Serving a memorised quote would return a\ntotal whose window is part-spent or closed, that is, **a binding quote that no longer\nbinds**. A replay therefore produces a fresh quote, with its own window.\n',
  },
};
