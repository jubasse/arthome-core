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
export declare const AccountIdSchema: z.ZodString;
export declare const ProfileIdSchema: z.ZodString;
export declare const PersonIdSchema: z.ZodString;
export declare const ChannelIdSchema: z.ZodString;
export declare const DeviceIdSchema: z.ZodString;
export declare const DateIdSchema: z.ZodString;
export declare const ShowIdSchema: z.ZodString;
export declare const ArtistIdSchema: z.ZodString;
export declare const VenueIdSchema: z.ZodString;
export declare const SeatIdSchema: z.ZodString;
export declare const OrderIdSchema: z.ZodString;
/** The public handle — `@marie.j`. Opaque and chosen: §7.1 keeps the internal id unexposed. */
export declare const PublicHandleSchema: z.ZodString;
//# sourceMappingURL=identifiers.d.ts.map