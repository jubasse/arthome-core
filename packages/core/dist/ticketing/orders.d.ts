import { OrderState } from '../vocabulary/commerce.js';
export declare function orderStateMovesForward(from: OrderState, to: OrderState): boolean;
/** `Order.reference`, the one support reads out over the phone: `ATH-2026-00042`. */
export declare function orderReference(year: number, sequence: number): string;
export declare function isOrderReference(value: string): boolean;
/** Where the provider sends the buyer back after strong authentication; it concludes nothing. */
export declare function paymentReturnPath(orderId: string): string;
//# sourceMappingURL=orders.d.ts.map