export type AnalyticsEvent="book_lesson_clicked"|"enquiry_started"|"enquiry_submitted"|"lesson_selected"|"booking_started"|"booking_reserved"|"checkout_started"|"booking_confirmed";
/** Privacy-safe abstraction only. No analytics provider is installed and payloads must never contain form/PII data. */
export function trackEvent(event:AnalyticsEvent,properties?:Record<string,string|number|boolean>){void event;void properties}
