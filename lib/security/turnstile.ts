import "server-only";
import { turnstileConfiguration, validTurnstileToken } from "./turnstile-core.ts";

type Verification = { ok: boolean; configured: boolean };

export async function verifyTurnstile(token: string, remoteIp?: string): Promise<Verification> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const config = turnstileConfiguration(process.env.NODE_ENV, siteKey, secret);
  if (!config.configured) return { ok: config.allowMissing, configured: false };
  if (!validTurnstileToken(token)) return { ok: false, configured: true };

  try {
    const body = new URLSearchParams({ secret: secret as string, response: token });
    if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return { ok: false, configured: true };
    const result = await response.json() as { success?: boolean };
    return { ok: result.success === true, configured: true };
  } catch {
    return { ok: false, configured: true };
  }
}
