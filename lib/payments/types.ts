/** Provider-neutral boundary for the future Stripe phase. */
export type CheckoutRequest = { bookingId: string };
export type CheckoutSessionResult = { checkoutUrl: string };

export interface PaymentProvider {
  createCheckoutSession(request: CheckoutRequest): Promise<CheckoutSessionResult>;
}

/**
 * A future implementation must load amount/currency from the persisted booking on the server.
 * It must never accept an authoritative price from browser input.
 */
