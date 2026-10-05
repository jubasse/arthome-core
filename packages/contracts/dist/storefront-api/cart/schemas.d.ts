import { z } from 'zod';
import { StorefrontEnvelopeMetaSchema } from '../../envelope/index.js';
import type { PathParameter } from '../../http/index.js';
import { CartSchema } from '../../ticketing/index.js';
export declare const CartLineIdParameter: PathParameter<'lineId', z.ZodString>;
export declare const AddCartLineBodySchema: z.ZodObject<{
    itemId: z.ZodString;
    variantId: z.ZodString;
    quantity: z.ZodInt;
}, z.core.$strip>;
export declare const UpdateCartLineBodySchema: z.ZodObject<{
    quantity: z.ZodInt;
}, z.core.$strip>;
export declare const QuoteCartBodySchema: z.ZodObject<{
    shippingCountryCode: z.ZodString;
    shippingPostalCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const CartAnswerSchema: z.ZodIntersection<typeof StorefrontEnvelopeMetaSchema, z.ZodObject<{
    data: typeof CartSchema;
}, z.core.$loose>>;
export type AddCartLineBody = z.output<typeof AddCartLineBodySchema>;
export type UpdateCartLineBody = z.output<typeof UpdateCartLineBodySchema>;
export type QuoteCartBody = z.output<typeof QuoteCartBodySchema>;
export type CartAnswer = z.output<typeof CartAnswerSchema>;
//# sourceMappingURL=schemas.d.ts.map