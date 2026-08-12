# MYMZ booking platform setup

The website works without backend credentials in a safe setup state. It never fabricates lesson slots or reports a successful booking.

## 1. Create and connect Supabase

1. Create a Supabase project in the MYMZ-owned organisation.
2. In Supabase **Project Settings → API**, copy the project URL and anon/public key.
3. Copy `.env.example` to `.env.local`.
4. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the server-only `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
5. Restart the Next.js development server.

`.env.local` is gitignored. The anon key is safe to expose only because Row Level Security remains enabled. Never put the service-role key in a `NEXT_PUBLIC_` variable or commit it.

## 2. Apply the database migration

Run both migrations in filename order through the Supabase SQL editor, or link the Supabase CLI and run the normal migration deployment command:

1. `202608110001_booking_foundation.sql`
2. `202608110002_operational_system.sql`
3. `202608110003_enquiries_and_pricing.sql`
4. `202608120004_production_hardening.sql`

Apply them first to a non-production project and review the Security Advisor before production.

The migration contains no production customers, bookings, prices or availability. Add genuine lesson types, instructors, locations and slots from an authenticated admin workflow or directly in the Supabase dashboard during initial setup.

After schema changes, generate fresh Supabase TypeScript types and replace/extend `lib/supabase/database.types.ts` so application types stay aligned with the database.

## 3. Security model

- Anonymous visitors can read only active lesson types, active instructors, active locations and future active lesson slots.
- `available_lesson_slots` exposes a safe availability projection. It counts private bookings internally but returns no customer or booking information.
- Customers, swimmers, bookings and admin role assignments have RLS enabled and no anonymous read policies.
- Schedule writes and admin reads require an authenticated user present in `admin_users`.
- The browser uses only the anon key. `lib/supabase/server.ts` is server-only and still obeys RLS.
- Booking creation is designed as a security-definer database function, but anonymous execution is deliberately revoked until a protected server endpoint is added.
- Before enabling public booking creation, add server-side input validation, IP/user rate limiting, bot protection and request logging that excludes sensitive form content.

Do not expose the service-role key to the browser. If a future server route requires it, use a non-public server environment variable and limit the route to the narrow operation it performs.

## 4. Capacity and booking integrity

`create_booking` looks up the real slot and lesson price inside PostgreSQL. It does not accept price, capacity, status or payment status from the client. Pending reservations receive a 15-minute expiry.

The `booking_capacity_guard` trigger locks the selected `lesson_slots` row with `FOR UPDATE`, counts confirmed and unexpired pending bookings, and rejects an insert when capacity has been reached. Concurrent attempts for the final place therefore serialize at the database row instead of trusting a stale browser count.

New references use `MYMZ-YYMM-XXXXXXXXXXXX`, generated from cryptographic randomness and protected by a unique constraint. The corrective migration serialises repeated idempotency keys with transaction advisory locks.

Availability ignores expired pending reservations immediately. Schedule `expire_pending_bookings()` from Supabase Cron (for example every five minutes); it is repeatable and safely cancels only expired pending unpaid/failed reservations.

## 5. Admin authentication

`/admin` uses cookie-based Supabase SSR Auth and independently checks membership in `admin_users`. To add the first approved administrator:

1. In **Authentication → Providers → Email**, enable email/password and disable public user sign-up.
2. Create the staff user through **Authentication → Users → Add user**. Do not put their password in SQL or source code.
3. Copy that user’s UUID.
4. In the SQL editor, run the following idempotent statement, replacing the placeholder with the genuine UUID copied from Authentication → Users:

```sql
insert into public.admin_users (user_id)
values ('<AUTH_USER_UUID>'::uuid)
on conflict (user_id) do nothing;
```
5. Visit `/admin/login` and sign in with that account.
6. Require MFA for staff when the MYMZ operational policy is agreed.

Hiding navigation is not authorization. Every query and mutation must continue to be protected by RLS and server-side role checks.

## 6. Stripe next phase

The provider-neutral contract is in `lib/payments/types.ts` and environment detection is in `lib/payments/stripe.ts`. Stripe is deliberately not installed because Checkout/webhooks are not yet implemented. The payment phase should:

1. Persist a pending booking/reservation through the protected server endpoint.
2. Load the authoritative `amount_pence` from that booking on the server.
3. Create Stripe Checkout with the booking ID/reference in metadata and an idempotency key.
4. Confirm payment only from a verified Stripe webhook—not from the success-page redirect.
5. Atomically move payment and booking statuses according to business-approved rules.
6. Expire unpaid reservations and handle refunds/cancellations using approved policies.

Stripe secrets belong in server-only environment variables. Genuine prices, refund/cancellation rules, currency, Stripe account configuration, success/cancel URLs and receipt requirements are still needed.

## 7. Required before production

- Genuine lesson types, durations and prices
- Real locations, instructors and schedules
- Approved privacy, terms and cancellation/refund policies
- Business email, physical/pool address and social profile links
- Staff authentication decisions and authorised admin users
- Production rate-limit hash secret, Turnstile and operational alerting
- Data retention/deletion rules and a process for data subject requests
- Stripe configuration and webhook endpoint
- Genuine customer testimonials and official photography
- End-to-end tests against a staging Supabase project, including concurrent final-place booking tests

## 8. Phase 3 operational flow

- Configure real lesson products through `/admin/lessons`; leave unapproved prices blank.
- Add genuine instructors and locations.
- Create one-off or previewed recurring slots through `/admin/schedule`.
- Keep **Booking enabled** off until the catalogue, prices and schedules are approved.
- Enabling booking allows the server endpoint to create real 15-minute pending reservations. It does not confirm or mark them paid.
- Production submissions use the Supabase-backed `consume_rate_limit` RPC, shared across application instances. Raw addresses are HMAC-pseudonymised before storage. Development can use a bounded in-memory fallback.
- Email types and a Resend provider are implemented; delivery activates only when a verified sender and server-side credentials are configured.

## 9. Enquiries and email notifications

The enquiry funnel stores data first, then attempts email delivery. Configure these server-side variables:

```env
MYMZ_ENQUIRY_EMAIL=aminatoluwatoyin@yahoo.co.uk
RESEND_API_KEY=
MYMZ_FROM_EMAIL=
NEXT_PUBLIC_SITE_URL=
```

1. Create a Resend account owned by MYMZ.
2. Verify a sending domain in Resend.
3. Create a restricted sending API key and store it only as `RESEND_API_KEY`.
4. Set `MYMZ_FROM_EMAIL` to a verified sender such as `MYMZ Swimming School <enquiries@the-verified-domain>` once a genuine domain is available.
5. Set `MYMZ_ENQUIRY_EMAIL` to the internal recipient.
6. Set `NEXT_PUBLIC_SITE_URL` to the deployed HTTPS origin so internal notifications can link to the protected admin record.

If email is missing or delivery fails, the enquiry remains safely stored and visible in `/admin/enquiries`. The `notification_status` and non-sensitive failure summary are recorded for follow-up. The customer confirmation page only appears after the database record is verified.

To test locally, apply all three migrations, configure Supabase/service-role variables, run the application, submit `/enquire`, verify the `enquiries` row, then check its notification status. Email configuration is optional for persistence testing.

The endpoint includes same-origin validation, a honeypot, idempotency, a distributed database limiter and Cloudflare Turnstile verification. Production fails closed if `RATE_LIMIT_HASH_SECRET` or either Turnstile key is missing. Apply migration 004 before testing submissions.

## 12. Production protection and local tests

Set a unique high-entropy `RATE_LIMIT_HASH_SECRET`; it is used only server-side to HMAC client network identifiers. Configure `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and server-only `TURNSTILE_SECRET_KEY` from the same Cloudflare Turnstile widget. Development may omit these keys; production enquiry and booking endpoints deliberately refuse submissions when protection is incomplete.

Run `npm test` for validation and security-invariant tests. Run `npm run check:production` in a shell containing deployment environment variables to see configuration presence by capability. The checker reports names and presence only, never values.

## 10. Enquiry admin workflow

- New enquiries appear in `/admin/enquiries` and on the dashboard.
- Staff can search and filter without downloading the full table to the browser.
- Status changes are written to `admin_audit_log`.
- Conversion atomically creates a customer and swimmer, marks the enquiry converted and creates no booking.
- A booking must still use a genuine lesson slot and the normal capacity-protected reservation flow.

## 11. Privacy implementation notes

The system technically processes swimmer/contact names, date of birth, swimming experience, lesson interest, availability preferences, goal/message, email, phone, consent timestamps and operational status. Optional notes must not be used to solicit diagnoses or unnecessary medical information.

MYMZ must approve a UK privacy notice covering purposes, lawful basis, retention, processors (including Supabase and the selected email provider), rights, security, international transfers where applicable, marketing consent and contact details. The public Privacy Policy remains deliberately marked as awaiting approved wording.
