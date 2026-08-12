# MYMZ production launch procedure

Use staging first. Do not enable public booking or payments until every applicable check below has passed with genuine data.

1. Create a production Supabase project in a MYMZ-owned organisation.
2. Copy `.env.example` values into the deployment provider’s encrypted environment settings. Never commit `.env.local`.
3. Apply migrations `001`, `002`, `003`, then `004` in filename order. Run Supabase Security Advisor and resolve unexpected findings.
4. Enable Supabase email/password Auth, disable public sign-up, and set the production redirect/site URLs.
5. Create the first staff user in Supabase Auth, copy its UUID, then insert that UUID into `public.admin_users`. Confirm an authenticated non-admin receives Access denied.
6. Add only approved lesson catalogue records through `/admin/lessons`.
7. Add genuine pool names/addresses through `/admin/locations`.
8. Add genuine instructors and approved biographies through `/admin/instructors`.
9. Add schedules through `/admin/schedule`; preview recurring dates and check duplicates before creating them.
10. Enter approved integer-pence pricing and presentation units. Confirm missing prices display “Contact us”.
11. Review `/admin/settings`; set reservation timeout and enable bookings only after a staging concurrency test.
12. Create a MYMZ-owned Resend account and verify the genuine sending domain.
13. Configure `RESEND_API_KEY`, verified `MYMZ_FROM_EMAIL`, and `MYMZ_ENQUIRY_EMAIL=aminatoluwatoyin@yahoo.co.uk`. Send a real staging enquiry and verify both messages plus the stored notification state.
14. Generate a unique `RATE_LIMIT_HASH_SECRET`. Migration 004 provides distributed Supabase-backed throttling; optionally add an edge/WAF limiter for volumetric protection.
15. Create a Cloudflare Turnstile widget for the final domain and configure both Turnstile variables. Verify success, invalid-token, unavailable-provider and rate-limited states.
16. If payments are enabled, create/verify the Stripe business account and complete the webhook/Checkout implementation described below. Keep `payments_enabled` false until test-mode end-to-end verification passes.
17. Replace the pre-launch Privacy, Terms and Cancellation states with MYMZ-approved UK wording and record approval/version dates.
18. Replace representative photography with approved MYMZ photography when supplied; preserve the current asset dimensions/crops.
19. Configure `NEXT_PUBLIC_SITE_URL` as the canonical HTTPS production origin and confirm sitemap, robots, Open Graph and email admin links.
20. Deploy to a staging/preview environment, then production only after smoke testing.
21. Test all public routes, 404/error states, mobile widths, keyboard operation, admin noindex headers and security headers.
22. Submit a genuine controlled enquiry; verify database persistence, internal recipient, customer acknowledgement and failure-state recording.
23. In staging, run concurrent attempts for the final slot and verify exactly one succeeds. Verify expired pending reservations release capacity and the cleanup RPC is repeatable.
24. Test login, logout, session refresh, every direct admin URL, an approved admin and a signed-in non-admin.
25. If payments are implemented, test Stripe test-mode success, cancel, expiration, duplicate webhooks, failed payments and refunds; confirm redirects alone never mark paid.
26. Enable production capabilities one at a time only after their evidence is recorded.

## Scheduled reservation cleanup

Configure Supabase Cron or another trusted scheduler to call `select public.expire_pending_bookings();` approximately every five minutes using a role allowed to execute it. Availability already ignores expired reservations; cleanup closes their operational status. The function is idempotent under repeated execution.

## Stripe boundary still required

Stripe credentials alone are not enough. Implement a server-only Checkout session endpoint that accepts only a booking identifier, reloads the pending booking and authoritative amount, and uses idempotency. Add a raw-body webhook route that verifies `STRIPE_WEBHOOK_SECRET`, stores processed event IDs, and changes payment/booking status transactionally. Confirm only from verified webhook events—not success redirects. Business-approved refund/cancellation rules are required before this is safely enabled.

## Verification commands

Run `npm run check:production`, `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm audit --omit=dev`. Also inspect the deployed response headers and browser console; local build success does not verify external services.
