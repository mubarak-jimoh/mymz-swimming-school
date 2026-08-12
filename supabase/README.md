# Supabase files

- `migrations/202608110001_booking_foundation.sql` is the production-minded base schema.
- `migrations/202608110002_operational_system.sql` adds configurable products, settings, audit records and idempotent reservations.
- `migrations/202608110003_enquiries_and_pricing.sql` adds private enquiries, safe conversion and configurable price units.
- No development seed data is included; the project must not display fabricated availability.
- Apply and test migrations in a non-production Supabase project before production.
- See `docs/SETUP.md` for connection, security, admin and Stripe guidance.
