/**
 * The branded identifiers.
 *
 * Every one is a UUIDv7 validated by SHAPE — including the version nibble, so
 * a v4 is refused rather than silently accepted. That matters because v7's
 * ordering is load-bearing: the outbox needs the aggregate to know its id
 * before insertion, and the temporal prefix is what fills a B-tree index well.
 * A v4 passing here would work everywhere and degrade quietly.
 *
 * ⚠ THE BRANDS ARE NOT DECORATION. `AccountId` and `ProfileId` are both UUIDs,
 * and on a shared television the difference between them is the difference
 * between disconnecting one profile and revoking the whole device. A bare
 * `string` lets those swap silently at a call site; a brand makes it a type
 * error.
 *
 * ⚠ AND WHAT IS EXPOSED IS NOT ALWAYS WHAT IS STORED. `data-model.md` §7.1: a
 * UUIDv7 reveals its creation time, so an account, a profile and a person are
 * addressed publicly by an opaque handle, and a pairing by a separate random
 * identifier — otherwise the instant a pairing opened leaks and helps guess the
 * code. These schemas describe the INTERNAL identifiers; a public handle has
 * its own shape.
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
/**
 * The PUBLIC handle — `@marie.j`. Opaque and chosen, because an account's
 * internal identifier is never exposed (§7.1).
 */
export declare const PublicHandleSchema: z.ZodString;
//# sourceMappingURL=identifiers.d.ts.map