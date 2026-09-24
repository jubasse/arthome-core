/**
 * `@arthome/contracts/ticketing` — Buying: the cart, the quote, the order, the ticket, prices, merchandise and subscriptions.
 *
 * EMPTY ON PURPOSE, FOR NOW. The subpath exists and resolves, so the `exports`
 * list stays honest rather than pointing at a file that is not there — which
 * this package's manifest calls out as unreachable with a laconic error.
 *
 * Schemas land here one at a time, each verified against the contract it must
 * emit by `pnpm run check:emit-diff`. That gate is green and in `verify`, so a
 * schema that does not reproduce its document cannot be committed.
 */

export {};
