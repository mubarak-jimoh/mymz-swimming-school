"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { canChangeBookingStatus, isUuid, parseCalendarDate, parseLocalDateTime } from "@/lib/admin/validation";
import { isPriceUnit } from "@/lib/pricing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BookingMode, BookingStatus } from "@/lib/supabase/database.types";

export type ActionState = { ok?: boolean; error?: string };

const text = (form: FormData, key: string, max = 1000) => String(form.get(key) ?? "").trim().slice(0, max);
const integer = (form: FormData, key: string, min: number, max: number) => {
  const value = Number(form.get(key));
  return Number.isInteger(value) && value >= min && value <= max ? value : null;
};

async function admin() {
  const access = await requireAdmin();
  return access.state === "approved" ? access : null;
}

async function audit(
  access: NonNullable<Awaited<ReturnType<typeof admin>>>,
  action: string,
  entity: string,
  id: string,
  details: Record<string, unknown> = {},
) {
  const { error } = await access.supabase.from("admin_audit_log").insert({
    admin_user_id: access.userId,
    action,
    entity_type: entity,
    entity_id: id,
    details,
  });
  if (error) console.error("Admin audit write failed", { action, entity, code: error.code });
}

function safeMutationError(code?: string) {
  if (code === "23505") return "A record with the same unique details already exists.";
  if (code === "23503") return "This change conflicts with a related operational record.";
  if (code === "23514") return "One or more values are outside the permitted range.";
  return "The change could not be saved. Please review the details and try again.";
}

export async function loginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Staff sign-in is temporarily unavailable." };
  const email = text(formData, "email", 254);
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Sign-in failed. Check your credentials and approval status." };
  redirect("/admin");
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut({ scope: "local" });
  redirect("/admin/login");
}

export async function saveLesson(_state: ActionState, formData: FormData): Promise<ActionState> {
  const access = await admin();
  if (!access) return { error: "Admin access required." };
  const id = text(formData, "id");
  const name = text(formData, "name", 120);
  const slug = text(formData, "slug", 120).toLowerCase();
  const description = text(formData, "description", 2000);
  const duration = integer(formData, "duration_minutes", 1, 480);
  const capacity = integer(formData, "capacity", 1, 100);
  const order = integer(formData, "display_order", 0, 10000);
  const priceRaw = text(formData, "price");
  const price = priceRaw === "" ? null : Math.round(Number(priceRaw) * 100);
  const mode = text(formData, "booking_mode") as BookingMode;
  const priceUnit = text(formData, "price_unit");
  const minAge = text(formData, "minimum_age_months") === "" ? null : integer(formData, "minimum_age_months", 0, 2400);
  const maxAge = text(formData, "maximum_age_months") === "" ? null : integer(formData, "maximum_age_months", 0, 2400);
  if (
    (id && !isUuid(id)) || !name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || duration === null ||
    capacity === null || order === null || !["individual", "term", "block", "trial"].includes(mode) ||
    !isPriceUnit(priceUnit) ||
    (price !== null && (!Number.isInteger(price) || price < 0 || price > 100_000_000)) ||
    (minAge !== null && maxAge !== null && maxAge < minAge)
  ) return { error: "Check the lesson name, slug, duration, price, capacity and age range." };

  const values = {
    name, slug, description, duration_minutes: duration, price_pence: price, currency: "GBP",
    booking_mode: mode, price_unit: priceUnit,
    price_from: formData.get("price_from") === "on", capacity, display_order: order,
    minimum_age_months: minAge, maximum_age_months: maxAge,
    active: formData.get("active") === "on", featured: formData.get("featured") === "on",
  };
  const result = id
    ? await access.supabase.from("lesson_types").update(values).eq("id", id).select("id").single()
    : await access.supabase.from("lesson_types").insert(values).select("id").single();
  if (result.error) return { error: safeMutationError(result.error.code) };
  await audit(access, id ? "lesson.updated" : "lesson.created", "lesson_type", result.data.id);
  revalidatePath("/admin/lessons"); revalidatePath("/lessons"); revalidatePath("/book");
  return { ok: true };
}

export async function saveInstructor(_state: ActionState, formData: FormData): Promise<ActionState> {
  const access = await admin();
  if (!access) return { error: "Admin access required." };
  const id = text(formData, "id"), name = text(formData, "name", 120), bio = text(formData, "bio", 2000);
  if ((id && !isUuid(id)) || name.length < 2) return { error: "Enter a valid instructor name." };
  const values = { name, bio, active: formData.get("active") === "on" };
  const result = id
    ? await access.supabase.from("instructors").update(values).eq("id", id).select("id").single()
    : await access.supabase.from("instructors").insert(values).select("id").single();
  if (result.error) return { error: safeMutationError(result.error.code) };
  await audit(access, id ? "instructor.updated" : "instructor.created", "instructor", result.data.id);
  revalidatePath("/admin/instructors"); revalidatePath("/book");
  return { ok: true };
}

export async function saveLocation(_state: ActionState, formData: FormData): Promise<ActionState> {
  const access = await admin();
  if (!access) return { error: "Admin access required." };
  const id = text(formData, "id"), name = text(formData, "name", 160), address = text(formData, "address", 500);
  if ((id && !isUuid(id)) || name.length < 2 || address.length < 3) return { error: "Enter a valid location name and address." };
  const values = { name, address, active: formData.get("active") === "on" };
  const result = id
    ? await access.supabase.from("locations").update(values).eq("id", id).select("id").single()
    : await access.supabase.from("locations").insert(values).select("id").single();
  if (result.error) return { error: safeMutationError(result.error.code) };
  await audit(access, id ? "location.updated" : "location.created", "location", result.data.id);
  revalidatePath("/admin/locations"); revalidatePath("/book");
  return { ok: true };
}

export async function saveSlot(_state: ActionState, formData: FormData): Promise<ActionState> {
  const access = await admin();
  if (!access) return { error: "Admin access required." };
  const id = text(formData, "id"), lessonTypeId = text(formData, "lesson_type_id");
  const locationId = text(formData, "location_id"), instructorValue = text(formData, "instructor_id");
  const instructorId = instructorValue || null, capacity = integer(formData, "capacity", 1, 100);
  const startTime = parseLocalDateTime(text(formData, "start_time"));
  const endTime = parseLocalDateTime(text(formData, "end_time"));
  if (
    (id && !isUuid(id)) || !isUuid(lessonTypeId) || !isUuid(locationId) ||
    (instructorId !== null && !isUuid(instructorId)) || capacity === null || !startTime || !endTime || endTime <= startTime
  ) return { error: "Complete the slot details with valid records and an end time after its start." };

  if (id) {
    const { count, error } = await access.supabase.from("bookings").select("id", { count: "exact", head: true })
      .eq("lesson_slot_id", id).in("status", ["pending", "confirmed"]);
    if (error) return { error: "The slot capacity could not be verified safely." };
    if ((count ?? 0) > capacity) return { error: `Capacity cannot be below the slot's ${count} active booking(s).` };
  }

  const values = {
    lesson_type_id: lessonTypeId, location_id: locationId, instructor_id: instructorId,
    capacity, start_time: startTime, end_time: endTime, active: formData.get("active") === "on",
  };
  const result = id
    ? await access.supabase.from("lesson_slots").update(values).eq("id", id).select("id").single()
    : await access.supabase.from("lesson_slots").insert(values).select("id").single();
  if (result.error) return { error: result.error.code === "23505" ? "An identical slot already exists." : safeMutationError(result.error.code) };
  await audit(access, id ? "slot.updated" : "slot.created", "lesson_slot", result.data.id);
  revalidatePath("/admin/schedule"); revalidatePath("/book");
  return { ok: true };
}

export async function deactivateSlot(formData: FormData) {
  const access = await admin();
  if (!access) return;
  const id = text(formData, "id");
  if (!isUuid(id)) return;
  const { count, error: countError } = await access.supabase.from("bookings").select("id", { count: "exact", head: true })
    .eq("lesson_slot_id", id).in("status", ["pending", "confirmed"]);
  if (countError) redirect(`/admin/schedule?error=${encodeURIComponent("The slot could not be checked safely.")}`);
  if ((count ?? 0) > 0) redirect(`/admin/schedule?error=${encodeURIComponent("This slot has active bookings. Cancel or move those bookings before deactivating it.")}`);
  const { data, error } = await access.supabase.from("lesson_slots").update({ active: false }).eq("id", id).select("id").single();
  if (error || !data) redirect(`/admin/schedule?error=${encodeURIComponent("The slot could not be deactivated.")}`);
  await audit(access, "slot.deactivated", "lesson_slot", id);
  revalidatePath("/admin/schedule"); revalidatePath("/book");
}

export async function updateBookingStatus(formData: FormData) {
  const access = await admin();
  if (!access) return;
  const id = text(formData, "id"), status = text(formData, "status") as BookingStatus;
  if (!isUuid(id) || !["pending", "confirmed", "cancelled", "completed"].includes(status)) return;
  const { data: current, error: readError } = await access.supabase.from("bookings")
    .select("payment_status,status").eq("id", id).single();
  if (readError || !current || !canChangeBookingStatus(current.status, status, current.payment_status)) return;
  const { error } = await access.supabase.from("bookings").update({ status }).eq("id", id);
  if (error) return;
  await audit(access, "booking.status_changed", "booking", id, { from: current.status, to: status });
  revalidatePath(`/admin/bookings/${id}`); revalidatePath("/admin/bookings"); revalidatePath("/admin");
}

export async function saveSettings(_state: ActionState, formData: FormData): Promise<ActionState> {
  const access = await admin();
  if (!access) return { error: "Admin access required." };
  const timeout = integer(formData, "reservation_timeout_minutes", 5, 60);
  const email = text(formData, "email", 254).toLowerCase() || null;
  if (timeout === null || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { error: "Enter a valid email and a reservation timeout between 5 and 60 minutes." };
  }
  const { error } = await access.supabase.from("business_settings").update({
    business_name: "MYMZ Swimming School", phone: "07383 488189", email, currency: "GBP",
    reservation_timeout_minutes: timeout, booking_enabled: formData.get("booking_enabled") === "on",
    payments_enabled: formData.get("payments_enabled") === "on",
  }).eq("id", true);
  if (error) return { error: safeMutationError(error.code) };
  await audit(access, "settings.updated", "business_settings", "true", {
    bookingEnabled: formData.get("booking_enabled") === "on",
    paymentsEnabled: formData.get("payments_enabled") === "on",
    reservationTimeoutMinutes: timeout,
  });
  revalidatePath("/admin/settings"); revalidatePath("/book");
  return { ok: true };
}

export async function createRecurringSlots(_state: ActionState, formData: FormData): Promise<ActionState> {
  const access = await admin();
  if (!access) return { error: "Admin access required." };
  const lessonTypeId = text(formData, "lesson_type_id"), locationId = text(formData, "location_id");
  const instructorValue = text(formData, "instructor_id"), instructorId = instructorValue || null;
  const capacity = integer(formData, "capacity", 1, 100), duration = integer(formData, "duration", 1, 480);
  const time = text(formData, "time"), dateValues = formData.getAll("dates").map(String).slice(0, 104);
  if (
    !isUuid(lessonTypeId) || !isUuid(locationId) || (instructorId !== null && !isUuid(instructorId)) ||
    capacity === null || duration === null || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) || !dateValues.length
  ) return { error: "Preview and select at least one valid recurring date." };
  const dates = dateValues.map(parseCalendarDate);
  if (dates.some(date => date === null)) return { error: "One or more selected dates are invalid." };
  const rows = (dates as Date[]).map(date => {
    const [hours, minutes] = time.split(":").map(Number);
    const start = new Date(date); start.setHours(hours, minutes, 0, 0);
    return {
      lesson_type_id: lessonTypeId, location_id: locationId, instructor_id: instructorId, capacity,
      start_time: start.toISOString(), end_time: new Date(start.getTime() + duration * 60_000).toISOString(), active: true,
    };
  });
  const starts = rows.map(row => row.start_time);
  const { data: existing, error: lookupError } = await access.supabase.from("lesson_slots").select("start_time")
    .eq("lesson_type_id", lessonTypeId).eq("location_id", locationId).in("start_time", starts);
  if (lookupError) return { error: "Existing schedule entries could not be checked safely." };
  const existingSet = new Set(existing?.map(row => row.start_time));
  const safeRows = rows.filter(row => !existingSet.has(row.start_time));
  if (!safeRows.length) return { error: "Every selected date already has an identical slot." };
  const { data, error } = await access.supabase.from("lesson_slots").insert(safeRows).select("id");
  if (error) return { error: safeMutationError(error.code) };
  await Promise.all((data ?? []).map(row => audit(access, "slot.recurring_created", "lesson_slot", row.id)));
  revalidatePath("/admin/schedule"); revalidatePath("/book");
  return { ok: true, error: safeRows.length < rows.length ? `${rows.length - safeRows.length} duplicate date(s) were safely skipped.` : undefined };
}
