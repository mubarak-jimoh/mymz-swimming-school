import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { allowedBookingStatuses, canChangeBookingStatus, isUuid, parseCalendarDate, parseLocalDateTime } from "../lib/admin/validation.ts";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("admin runtime validation rejects malformed identifiers and schedule dates", () => {
  assert.equal(isUuid("9d912fb8-6404-4ccf-8f09-2646896639ab"), true);
  assert.equal(isUuid("not-a-record-id"), false);
  assert.equal(parseLocalDateTime("not-a-date"), null);
  assert.equal(parseCalendarDate("2026-02-30"), null);
  assert.ok(parseLocalDateTime("2026-08-15T10:30"));
  assert.ok(parseCalendarDate("2026-08-15"));
});

test("booking status management cannot reverse terminal states or confirm an in-flight payment", () => {
  assert.equal(canChangeBookingStatus("pending", "confirmed", "pending"), false);
  assert.equal(canChangeBookingStatus("pending", "confirmed", "failed"), false);
  assert.equal(canChangeBookingStatus("pending", "confirmed", "unpaid"), true);
  assert.equal(canChangeBookingStatus("confirmed", "completed", "paid"), true);
  assert.equal(canChangeBookingStatus("cancelled", "pending", "unpaid"), false);
  assert.equal(canChangeBookingStatus("completed", "confirmed", "paid"), false);
  assert.deepEqual(allowedBookingStatuses("cancelled", "unpaid"), ["cancelled"]);
});

test("every protected admin page is guarded server-side in addition to the protected layout", async () => {
  const pages = [
    "app/admin/page.tsx",
    "app/admin/(protected)/bookings/page.tsx",
    "app/admin/(protected)/bookings/[id]/page.tsx",
    "app/admin/(protected)/customers/page.tsx",
    "app/admin/(protected)/enquiries/page.tsx",
    "app/admin/(protected)/enquiries/[id]/page.tsx",
    "app/admin/(protected)/instructors/page.tsx",
    "app/admin/(protected)/lessons/page.tsx",
    "app/admin/(protected)/locations/page.tsx",
    "app/admin/(protected)/schedule/page.tsx",
    "app/admin/(protected)/settings/page.tsx",
  ];
  for (const page of pages) assert.match(await source(page), /requireAdmin\(\)/, page);
  const layout = await source("app/admin/(protected)/layout.tsx");
  assert.match(layout, /requireAdmin\(\)/);
  assert.match(await source("app/admin/layout.tsx"), /index:\s*false/);
});

test("admin dashboard has an explicit route and complete operational navigation", async () => {
  const dashboard = await source("app/admin/page.tsx");
  assert.match(dashboard, /requireAdmin\(\)/);
  assert.match(dashboard, /<AdminShell/);
  const shell = await source("components/admin/admin-shell.tsx");
  for (const route of ["/admin", "/admin/enquiries", "/admin/bookings", "/admin/customers", "/admin/lessons", "/admin/instructors", "/admin/locations", "/admin/schedule", "/admin/settings"]) {
    assert.match(shell, new RegExp(route.replaceAll("/", "\\/")));
  }
  assert.match(shell, /logoutAction/);
});

test("admin mutations authorise through the user session and never import the service-role client", async () => {
  for (const path of ["app/admin/actions.ts", "app/admin/enquiry-actions.ts"]) {
    const actions = await source(path);
    assert.match(actions, /requireAdmin/);
    assert.doesNotMatch(actions, /createServiceRoleClient|SUPABASE_SERVICE_ROLE_KEY/);
  }
  const actions = await source("app/admin/actions.ts");
  for (const event of ["lesson.updated", "instructor.updated", "location.updated", "slot.updated", "slot.deactivated", "booking.status_changed", "settings.updated"]) {
    assert.match(actions, new RegExp(event.replace(".", "\\.")));
  }
});

test("enquiry conversion is idempotent and cannot create a booking or reservation", async () => {
  const sql = await source("supabase/migrations/202608110003_enquiries_and_pricing.sql");
  const conversion = sql.match(/create function public\.convert_enquiry_to_customer[\s\S]+?grant execute on function public\.convert_enquiry_to_customer\(uuid\) to authenticated;/i)?.[0] ?? "";
  assert.match(conversion, /if not public\.is_admin\(\)/i);
  assert.match(conversion, /if e\.converted_customer_id is not null/i);
  assert.match(conversion, /insert into public\.customers/i);
  assert.match(conversion, /insert into public\.swimmers/i);
  assert.doesNotMatch(conversion, /insert into public\.bookings|lesson_slot_id|reservation_expires_at/i);
});

test("RLS grants private records only to authorised admin policies", async () => {
  const foundation = await source("supabase/migrations/202608110001_booking_foundation.sql");
  const operational = await source("supabase/migrations/202608110002_operational_system.sql");
  const enquiries = await source("supabase/migrations/202608110003_enquiries_and_pricing.sql");
  assert.match(foundation, /alter table public\.customers enable row level security/i);
  assert.match(foundation, /alter table public\.swimmers enable row level security/i);
  assert.match(foundation, /alter table public\.bookings enable row level security/i);
  assert.match(foundation, /using \(public\.is_admin\(\)\)/i);
  assert.match(operational, /admins read audit log[\s\S]+using \(public\.is_admin\(\)\)/i);
  assert.match(enquiries, /revoke all on public\.enquiries from anon,authenticated/i);
  assert.match(enquiries, /admins manage enquiries[\s\S]+public\.is_admin\(\)/i);
});

test("ordinary admin settings do not expose infrastructure secrets", async () => {
  const page = await source("app/admin/(protected)/settings/page.tsx");
  for (const secret of ["SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY", "TURNSTILE_SECRET_KEY", "STRIPE_SECRET_KEY", "RATE_LIMIT_HASH_SECRET"]) {
    assert.doesNotMatch(page, new RegExp(secret));
  }
});
