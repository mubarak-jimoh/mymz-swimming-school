import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path: string) { return readFile(new URL(`../${path}`, import.meta.url), "utf8"); }

test("booking endpoint accepts identifiers/details but not browser price, capacity or status", async () => {
  const api = await source("app/api/bookings/route.ts");
  const bodyDeclaration = api.match(/type Body\s*=\s*\{([^}]+details:[^}]+\})/)?.[0] ?? "";
  assert.match(bodyDeclaration, /slotId/);
  assert.doesNotMatch(bodyDeclaration, /price|amount|capacity|paymentStatus|bookingStatus/i);
  assert.match(api, /supabase\.rpc\("create_booking"/);
  assert.doesNotMatch(api, /lessonName/);
});

test("admin authorisation requires both a verified user and database admin membership", async () => {
  const auth = await source("lib/auth/admin.ts");
  assert.match(auth, /auth\.getUser\(\)/);
  assert.match(auth, /rpc\("is_admin"\)/);
  assert.match(auth, /redirect\("\/admin\/login"\)/);
});

test("corrective migration locks idempotency keys and protects expiry/capacity", async () => {
  const sql = await source("supabase/migrations/202608120004_production_hardening.sql");
  assert.ok((sql.match(/pg_advisory_xact_lock/g) ?? []).length >= 3);
  assert.match(sql, /update of lesson_slot_id, status, reservation_expires_at/i);
  assert.match(sql, /grant execute on function public\.create_booking[\s\S]+to service_role/i);
  assert.match(sql, /revoke all on public\.request_rate_limits from anon, authenticated/i);
  assert.match(sql, /expire_pending_bookings/);
});

test("production throttling is distributed and identifiers are pseudonymised", async () => {
  const limiter = await source("lib/security/rate-limit.ts");
  assert.match(limiter, /createHmac\("sha256"/);
  assert.match(limiter, /supabase\.rpc\("consume_rate_limit"/);
  assert.match(limiter, /NODE_ENV === "production"/);
  assert.doesNotMatch(limiter, /p_client_key:\s*clientKey/);
});

test("sensitive service credentials have no NEXT_PUBLIC names", async () => {
  const env = await source(".env.example");
  for (const name of ["SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "TURNSTILE_SECRET_KEY", "RATE_LIMIT_HASH_SECRET"]) {
    assert.match(env, new RegExp(`^${name}=`, "m"));
    assert.doesNotMatch(env, new RegExp(`NEXT_PUBLIC_${name}`));
  }
});

test("monthly catalogue pricing is allowed by a forward-only database constraint", async () => {
  const sql = await source("supabase/migrations/202608120005_monthly_price_unit.sql");
  assert.match(sql, /drop constraint if exists lesson_types_price_unit_check/i);
  assert.match(sql, /'lesson'[\s\S]+'swimmer'[\s\S]+'block'[\s\S]+'term'[\s\S]+'per_month'/i);
  assert.doesNotMatch(sql, /insert into|update public\.lesson_types|delete from/i);
});

test("simplified enquiry migration preserves legacy fields and private conversion", async () => {
  const sql = await source("supabase/migrations/202608120006_simplified_enquiries.sql");
  assert.match(sql, /add column swimmer_name/i);
  assert.match(sql, /add column age_group/i);
  assert.doesNotMatch(sql, /drop column|delete from|truncate/i);
  assert.match(sql, /create function public\.create_enquiry_v2/i);
  assert.match(sql, /grant execute[\s\S]+create_enquiry_v2[\s\S]+to service_role/i);
  assert.match(sql, /if not public\.is_admin\(\)/i);
  assert.match(sql, /if e\.converted_customer_id is not null/i);
  assert.doesNotMatch(sql.match(/create or replace function public\.convert_enquiry_to_customer[\s\S]+$/i)?.[0] ?? "", /insert into public\.bookings/i);
});

test("short enquiry RPC is service-only and omits lesson selection", async () => {
  const route = await source("app/api/enquiries/route.ts");
  const migration = await source("supabase/migrations/202608120007_short_enquiry_flow.sql");
  assert.match(route, /create_enquiry_v3/);
  assert.doesNotMatch(route, /p_lesson_type_id|p_lesson_interest_text/);
  assert.match(migration, /revoke all on function public\.create_enquiry_v3[\s\S]*from public/i);
  assert.match(migration, /grant execute on function public\.create_enquiry_v3[\s\S]*to service_role/i);
  assert.doesNotMatch(migration, /drop column|delete from|truncate/i);
});
