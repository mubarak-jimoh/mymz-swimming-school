import "server-only";
/** Stripe SDK is intentionally not installed until Checkout is implemented. */
export function isStripeConfigured(){return Boolean(process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_WEBHOOK_SECRET&&process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)}
export type StripeCheckoutInput={bookingId:string};
/** Future implementation must reload booking amount/status server-side and use bookingId as idempotency metadata. */
