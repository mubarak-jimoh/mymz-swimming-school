import { NextResponse, type NextRequest } from "next/server";
import { customerEnquiryEmail, internalEnquiryEmail } from "@/emails/enquiry-templates";
import { cleanEnquiry, validateEnquiry, type EnquiryInput } from "@/lib/enquiries/validation";
import { sendEmail } from "@/lib/notifications/resend";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { hasValidOrigin, requestClientKey } from "@/lib/security/request";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { readJsonBody } from "@/lib/validation/common";

const MAX_BODY_BYTES = 16_000;
type Submission = EnquiryInput & { turnstileToken: string };

export async function POST(request: NextRequest) {
  if (!hasValidOrigin(request)) return reply("Invalid request origin.", 403);
  const supabase = createServiceRoleClient();
  const clientKey = requestClientKey(request);
  const limit = await consumeRateLimit(supabase, "enquiry", clientKey, 4, 60);
  if (!limit.configured && process.env.NODE_ENV === "production") return reply("Enquiry protection is temporarily unavailable. Please call MYMZ or try again later.", 503);
  if (!limit.allowed) return NextResponse.json({ error: "Too many enquiries have been submitted. Please wait and try again, or call us." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });

  let raw: unknown;
  try { raw = await readJsonBody(request, MAX_BODY_BYTES); }
  catch (error) { return reply(error instanceof Error && error.message === "PAYLOAD_TOO_LARGE" ? "The submitted enquiry is too large." : "We couldn't read that enquiry. Please check the form and try again.", 400); }
  if (!isInput(raw)) return reply("Please check the enquiry details.", 400);
  if (raw.website) return NextResponse.json({ accepted: true }, { status: 202 });

  const challenge = await verifyTurnstile(raw.turnstileToken, clientKey);
  if (!challenge.configured && process.env.NODE_ENV === "production") return reply("Security verification is temporarily unavailable. Please try again later.", 503);
  if (!challenge.ok) return reply("Security verification was not completed. Please try again.", 403);

  const input = cleanEnquiry(raw);
  const errors = validateEnquiry(input);
  if (Object.keys(errors).length) return NextResponse.json({ error: "Please check the highlighted fields.", fields: errors }, { status: 400 });
  if (!supabase) return reply("Enquiries are temporarily unavailable. Your information was not stored. Please call us instead.", 503);

  const { data, error } = await supabase.rpc("create_enquiry_v3", {
    p_swimmer_name: input.swimmerName, p_age_group: input.ageGroup, p_swimming_level: input.swimmingLevel,
    p_preferred_days: input.preferredDays, p_preferred_period: input.preferredPeriod,
    p_contact_name: input.contactName, p_email: input.email, p_phone: input.phone, p_message: input.message,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) {
    console.error("Enquiry persistence failed", { code: error.code });
    return reply("We couldn't save your enquiry. Your information was not stored. Please try again.", 500);
  }
  const enquiry = data?.[0];
  if (!enquiry) return reply("We couldn't confirm that your enquiry was stored.", 500);

  const recipient = process.env.MYMZ_ENQUIRY_EMAIL?.trim();
  const site = validSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const internal = internalEnquiryEmail(input, enquiry.enquiry_reference, enquiry.created_at, site ? `${site}/admin/enquiries/${enquiry.enquiry_id}` : null);
  const customer = customerEnquiryEmail(input.contactName, enquiry.enquiry_reference);
  const deliveries = await Promise.all([
    recipient ? sendEmail({ ...internal, to: recipient, idempotencyKey: `enquiry-internal-${enquiry.enquiry_id}` }) : Promise.resolve({ status: "not_configured" as const, reason: "Recipient email is not configured." }),
    sendEmail({ ...customer, to: input.email, idempotencyKey: `enquiry-customer-${enquiry.enquiry_id}` }),
  ]);
  const sent = deliveries.filter((item) => item.status === "sent").length;
  const status = sent === 2 ? "sent" : sent === 1 ? "partial" : deliveries.every((item) => item.status === "not_configured") ? "not_configured" : "failed";
  const reason = deliveries.filter((item) => item.status !== "sent").map((item) => item.reason).join(" ").slice(0, 500);
  if (status !== "sent") console.error("Enquiry email notification incomplete", { enquiryId: enquiry.enquiry_id, status });
  const { error: notificationUpdateError } = await supabase.from("enquiries").update({ notification_status: status, notification_error: reason || null }).eq("id", enquiry.enquiry_id);
  if (notificationUpdateError) console.error("Enquiry notification status update failed", { enquiryId: enquiry.enquiry_id, code: notificationUpdateError.code });
  return NextResponse.json({ reference: enquiry.enquiry_reference }, { status: 201 });
}

function isInput(value: unknown): value is Submission {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Submission>;
  const stringKeys: (keyof Submission)[] = ["swimmerName", "ageGroup", "swimmingLevel", "preferredPeriod", "contactName", "email", "phone", "message", "idempotencyKey", "website", "turnstileToken"];
  return stringKeys.every((key) => typeof item[key] === "string") && Array.isArray(item.preferredDays) && item.preferredDays.every((day) => typeof day === "string") && typeof item.privacyAcknowledged === "boolean";
}
function validSiteUrl(value?: string) { try { if (!value) return null; const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.origin : null; } catch { return null; } }
function reply(error: string, status: number) { return NextResponse.json({ error }, { status }); }
