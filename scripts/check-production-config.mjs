import { existsSync } from "node:fs";

if (existsSync(".env.local") && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(".env.local");
}

const groups = {
  "REQUIRED FOR WEBSITE": ["NEXT_PUBLIC_SITE_URL"],
  "REQUIRED FOR ENQUIRIES": ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "RATE_LIMIT_HASH_SECRET", "NEXT_PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY", "MYMZ_ENQUIRY_EMAIL", "RESEND_API_KEY", "MYMZ_FROM_EMAIL"],
  "REQUIRED FOR BOOKINGS": ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "RATE_LIMIT_HASH_SECRET", "NEXT_PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"],
  "REQUIRED FOR PAYMENTS": ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET"],
};
let websiteReady = true;
for (const [name, keys] of Object.entries(groups)) {
  const missing = keys.filter((key) => !process.env[key]?.trim());
  if (name === "REQUIRED FOR WEBSITE" && missing.length) websiteReady = false;
  console.log(`${name}: ${missing.length ? `MISSING ${missing.join(", ")}` : "CONFIGURED"}`);
}
console.log("OPTIONAL: analytics and social profiles remain intentionally unconfigured unless approved.");
if (!websiteReady) process.exitCode = 1;
