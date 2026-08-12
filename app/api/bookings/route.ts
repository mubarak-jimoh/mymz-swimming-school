import { NextResponse, type NextRequest } from "next/server";
import { validateBookingDetails, type BookingDetails } from "@/lib/booking";
import { isStripeConfigured } from "@/lib/payments/stripe";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { hasValidOrigin, requestClientKey } from "@/lib/security/request";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { isUuid, readJsonBody } from "@/lib/validation/common";

const MAX_BODY_BYTES = 12_000;
type Body = { slotId: string; idempotencyKey: string; website: string; turnstileToken: string; details: BookingDetails };

export async function POST(request: NextRequest) {
  if (!hasValidOrigin(request)) return reply("Invalid request origin.", 403);
  const supabase = createServiceRoleClient();
  const clientKey = requestClientKey(request);
  const limit = await consumeRateLimit(supabase, "booking", clientKey, 5, 60);
  if (!limit.configured && process.env.NODE_ENV === "production") return reply("Online booking protection is temporarily unavailable. Please try again later or call MYMZ.", 503);
  if (!limit.allowed) return NextResponse.json({ error: "Too many booking attempts. Please wait and try again." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });

  let body: unknown;
  try { body = await readJsonBody(request, MAX_BODY_BYTES); }
  catch (error) { return reply(error instanceof Error && error.message === "PAYLOAD_TOO_LARGE" ? "The submitted booking is too large." : "Invalid request.", 400); }
  if (!isBody(body)) return reply("Invalid booking details.", 400);
  if (body.website) return NextResponse.json({ accepted: true }, { status: 202 });

  const challenge = await verifyTurnstile(body.turnstileToken, clientKey);
  if (!challenge.configured && process.env.NODE_ENV === "production") return reply("Security verification is temporarily unavailable. Please try again later.", 503);
  if (!challenge.ok) return reply("Security verification was not completed. Please try again.", 403);

  const errors = validateBookingDetails(body.details);
  if (Object.keys(errors).length) return NextResponse.json({ error: "Please check the swimmer and contact details.", fields: errors }, { status: 400 });
  if (!supabase) return reply("Online booking is not available right now. No reservation was created.", 503);

  const { data, error } = await supabase.rpc("create_booking", {
    p_lesson_slot_id: body.slotId,
    p_swimmer_name: body.details.swimmerName.trim(),
    p_date_of_birth: body.details.dateOfBirth,
    p_swimming_ability: body.details.swimmingAbility,
    p_relevant_notes: body.details.relevantNotes.trim(),
    p_parent_guardian_name: body.details.parentGuardianName.trim(),
    p_email: body.details.email.trim().toLowerCase(),
    p_phone: body.details.phone.trim(),
    p_idempotency_key: body.idempotencyKey,
  });
  if (error) {
    const full = /full|capacity/i.test(error.message);
    return reply(full ? "That lesson has just filled. Please choose another time." : "The reservation could not be created. No payment was taken.", full ? 409 : 400);
  }
  const booking = data?.[0];
  if (!booking) return reply("No reservation was created.", 500);
  const { data: settings } = await supabase.from("business_settings").select("payments_enabled").eq("id", true).single();
  return NextResponse.json({ reference: booking.booking_reference, amountPence: booking.amount_pence, status: booking.status, reservationExpiresAt: booking.reservation_expires_at, paymentConfigured: Boolean(settings?.payments_enabled && isStripeConfigured()) }, { status: 201 });
}

function isBody(value: unknown): value is Body {
  if (!value || typeof value !== "object") return false;
  const body = value as Partial<Body>;
  if (!isUuid(body.slotId ?? "") || !isUuid(body.idempotencyKey ?? "") || typeof body.website !== "string" || body.website.length > 200 || typeof body.turnstileToken !== "string") return false;
  if (!body.details || typeof body.details !== "object") return false;
  const details = body.details as Record<string, unknown>;
  return ["swimmerName", "dateOfBirth", "parentGuardianName", "email", "phone", "swimmingAbility", "relevantNotes"].every((key) => typeof details[key] === "string");
}

function reply(error: string, status: number) { return NextResponse.json({ error }, { status }); }
