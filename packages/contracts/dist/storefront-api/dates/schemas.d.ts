import { z } from 'zod';
import { PRICE_TIERS } from '@arthome/core';
import type { VocabularyIn, VocabularyOutNullable } from '@arthome/core/schema';
import { MoneyOut } from '@arthome/core/schema';
import { DateCardSchema, PriceTierSchema } from '../../catalog/index.js';
import type { QueryParameter } from '../../http/index.js';
export declare const DateAvailabilitySchema: z.ZodObject<{
    seatsAvailable: z.ZodOptional<z.ZodInt>;
    waitlistCount: z.ZodOptional<z.ZodInt>;
    fillRateBps: z.ZodOptional<z.ZodInt>;
    soldOut: z.ZodOptional<z.ZodBoolean>;
    priceTiers: z.ZodOptional<z.ZodArray<typeof PriceTierSchema>>;
    serviceFeePerSeat: z.ZodOptional<typeof MoneyOut>;
}, z.core.$loose>;
export declare const QuoteSeatBodySchema: z.ZodObject<{
    tier: VocabularyIn<typeof PRICE_TIERS>;
    quantity: z.ZodInt;
    contributionMinor: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    applyCreditId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const WaitlistRegistrationSchema: z.ZodObject<{
    joined: z.ZodBoolean;
    state: z.ZodOptional<VocabularyOutNullable>;
    rankDisclosed: z.ZodBoolean;
    rank: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    priorityWindowHours: z.ZodOptional<z.ZodInt>;
    priorityUntil: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    priorityPoolSeats: z.ZodOptional<z.ZodInt>;
    date: z.ZodOptional<typeof DateCardSchema>;
}, z.core.$loose>;
export declare const WaitlistDepartureSchema: z.ZodOptional<z.ZodObject<{
    joined: z.ZodOptional<z.ZodBoolean>;
}, z.core.$loose>>;
export type DateAvailability = z.output<typeof DateAvailabilitySchema>;
export type QuoteSeatBody = z.output<typeof QuoteSeatBodySchema>;
export type WaitlistRegistration = z.output<typeof WaitlistRegistrationSchema>;
export type WaitlistDeparture = z.output<typeof WaitlistDepartureSchema>;
declare const SEND_REACTION_REACTION_ID: readonly ["applause", "heart", "bravo", "laugh", "wow", "sad"];
export declare const SinceSeqParameter: QueryParameter<'sinceSeq', z.ZodNumber>;
export declare const SendChatMessageBodySchema: z.ZodObject<{
    text: z.ZodString;
    atMediaSec: z.ZodInt;
}, z.core.$strip>;
export declare const SendReactionBodySchema: z.ZodObject<{
    reactionId: VocabularyIn<typeof SEND_REACTION_REACTION_ID>;
    atMediaSec: z.ZodInt;
}, z.core.$strip>;
export type SendChatMessageBody = z.output<typeof SendChatMessageBodySchema>;
export type SendReactionBody = z.output<typeof SendReactionBodySchema>;
export {};
//# sourceMappingURL=schemas.d.ts.map