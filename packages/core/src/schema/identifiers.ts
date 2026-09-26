/**
 * The branded identifiers.
 *
 * Every one is a UUIDv7 validated by shape, version nibble included, so a v4 is refused
 * rather than silently accepted: v7's ordering is load-bearing — the outbox needs the
 * aggregate to know its id before insertion, and the temporal prefix is what fills a B-tree
 * index well. A v4 passing here would work everywhere and degrade quietly.
 *
 * `AccountId` and `ProfileId` are both UUIDs, and on a shared television the difference
 * between them is the difference between disconnecting one profile and revoking the whole
 * device. The brand makes a swapped argument a type error.
 *
 * What is exposed is not what is stored (`data-model.md` §7.1): a UUIDv7 reveals its
 * creation time, so an account, a profile and a person are addressed publicly by an opaque
 * handle, and a pairing by a separate random identifier — otherwise the instant a pairing
 * opened leaks and helps guess the code. These are the internal identifiers.
 */

import { z } from 'zod';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const uuidV7 = (): z.ZodString => z.string().regex(UUID_V7);

export const AccountIdSchema: z.ZodString = uuidV7();
export const ProfileIdSchema: z.ZodString = uuidV7();
export const PersonIdSchema: z.ZodString = uuidV7();
export const ChannelIdSchema: z.ZodString = uuidV7();
export const DeviceIdSchema: z.ZodString = uuidV7();
export const DateIdSchema: z.ZodString = uuidV7();
export const ShowIdSchema: z.ZodString = uuidV7();
export const ArtistIdSchema: z.ZodString = uuidV7();
export const VenueIdSchema: z.ZodString = uuidV7();
export const SeatIdSchema: z.ZodString = uuidV7();
export const OrderIdSchema: z.ZodString = uuidV7();

/** The public handle — `@marie.j`. Opaque and chosen: §7.1 keeps the internal id unexposed. */
export const PublicHandleSchema: z.ZodString = z
  .string()
  .regex(/^@[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])$/);
