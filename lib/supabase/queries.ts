import "server-only";
import type { BookingCatalog } from "./database.types";
import { createSupabaseServerClient } from "./server";

export async function getBookingCatalog(): Promise<BookingCatalog> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { configured: false, lessonTypes: [], slots: [] };

  const [lessonResult, slotResult,settingsResult] = await Promise.all([
    supabase.from("lesson_types").select("*").eq("active", true).order("display_order"),
    supabase.from("available_lesson_slots").select("*").order("start_time"),
    supabase.from("public_booking_settings").select("booking_enabled").maybeSingle(),
  ]);

  if (lessonResult.error || slotResult.error) {
    console.error("Supabase catalogue query failed", lessonResult.error?.code, slotResult.error?.code);
    return { configured: true, lessonTypes: [], slots: [], error: "Live lesson availability is temporarily unavailable." };
  }

  return { configured: true, lessonTypes: lessonResult.data, slots: slotResult.data,bookingEnabled:settingsResult.data?.booking_enabled??false };
}
