export type NotificationKind="booking_confirmation"|"payment_receipt"|"cancellation"|"reschedule"|"lesson_reminder";
export type NotificationRequest={kind:NotificationKind;bookingId:string};
export interface NotificationProvider{send(request:NotificationRequest):Promise<{providerMessageId:string}>}
/** No provider is configured. Future implementations load recipient and booking details server-side by bookingId. */
