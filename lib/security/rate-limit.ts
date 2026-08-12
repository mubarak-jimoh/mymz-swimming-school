import "server-only";
import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type LimitResult = { allowed: boolean; retryAfterSeconds: number; configured: boolean };
type MemoryEntry = { count: number; resetAt: number };
const memory = new Map<string, MemoryEntry>();

/**
 * Supabase-backed in production so limits are shared by all serverless instances.
 * Local development uses a bounded in-memory fallback so contributors do not need
 * production credentials merely to render and exercise forms.
 */
export async function consumeRateLimit(
  supabase: SupabaseClient<Database> | null,
  scope: "enquiry" | "booking",
  clientKey: string,
  limit: number,
  windowSeconds: number,
): Promise<LimitResult> {
  const key = `${scope}:${clientKey}`;
  if (supabase) {
    const pepper = process.env.RATE_LIMIT_HASH_SECRET?.trim() || (process.env.NODE_ENV !== "production" ? "mymz-local-development" : "");
    if (!pepper) return { allowed: false, retryAfterSeconds: 60, configured: false };
    const digest = createHmac("sha256", pepper).update(clientKey).digest("hex");
    const { data, error } = await supabase.rpc("consume_rate_limit", {
      p_scope: scope,
      p_client_key: digest,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (!error && data?.[0]) return { allowed: data[0].allowed, retryAfterSeconds: data[0].retry_after_seconds, configured: true };
    if (process.env.NODE_ENV === "production") return { allowed: false, retryAfterSeconds: 60, configured: false };
  } else if (process.env.NODE_ENV === "production") {
    return { allowed: false, retryAfterSeconds: 60, configured: false };
  }

  const now = Date.now();
  if (memory.size > 2_000) for (const [entryKey, entry] of memory) if (entry.resetAt <= now) memory.delete(entryKey);
  const current = memory.get(key);
  const next = !current || current.resetAt <= now ? { count: 1, resetAt: now + windowSeconds * 1_000 } : { ...current, count: current.count + 1 };
  memory.set(key, next);
  return { allowed: next.count <= limit, retryAfterSeconds: Math.max(1, Math.ceil((next.resetAt - now) / 1_000)), configured: false };
}
