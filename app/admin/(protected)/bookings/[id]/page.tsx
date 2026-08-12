import { notFound } from "next/navigation";
import { updateBookingStatus } from "@/app/admin/actions";
import { AdminHeader } from "@/components/admin/admin-shell";
import { allowedBookingStatuses, isUuid } from "@/lib/admin/validation";
import { requireAdmin } from "@/lib/auth/admin";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdmin();
  if (access.state !== "approved") return null;
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { data: booking } = await access.supabase.from("bookings").select("*").eq("id", id).single();
  if (!booking) notFound();
  const [{ data: customer }, { data: swimmer }, { data: slot }] = await Promise.all([
    access.supabase.from("customers").select("*").eq("id", booking.customer_id).single(),
    access.supabase.from("swimmers").select("*").eq("id", booking.swimmer_id).single(),
    access.supabase.from("lesson_slots").select("*").eq("id", booking.lesson_slot_id).single(),
  ]);
  const [{ data: lesson }, { data: location }, { data: instructor }] = await Promise.all([
    access.supabase.from("lesson_types").select("*").eq("id", slot?.lesson_type_id ?? "").maybeSingle(),
    access.supabase.from("locations").select("*").eq("id", slot?.location_id ?? "").maybeSingle(),
    slot?.instructor_id
      ? access.supabase.from("instructors").select("*").eq("id", slot.instructor_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const rows = [
    ["Reference", booking.booking_reference], ["Booking status", booking.status], ["Payment status", booking.payment_status],
    ["Swimmer", swimmer?.swimmer_name], [swimmer?.age_group ? "Age group" : "Date of birth", swimmer?.age_group ? ageLabel(swimmer.age_group) : swimmer?.date_of_birth], ["Ability", swimmer?.swimming_ability],
    ["Parent / customer", customer?.parent_guardian_name ?? "—"], ["Email", customer?.email], ["Phone", customer?.phone],
    ["Lesson", lesson?.name], ["Instructor", instructor?.name ?? "—"], ["Location", location?.name],
    ["Date / time", slot ? new Date(slot.start_time).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" }) : "—"],
    ["Amount", money(booking.amount_pence)], ["Created", new Date(booking.created_at).toLocaleString("en-GB")],
  ];
  const statuses = allowedBookingStatuses(booking.status, booking.payment_status);

  return <>
    <AdminHeader eyebrow="BOOKING DETAIL" title={booking.booking_reference}/>
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <dl className="divide-y divide-navy/8 rounded-2xl bg-white p-5">
        {rows.map(([key, value]) => <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]" key={key}>
          <dt className="text-sm font-bold text-slate-400">{key}</dt>
          <dd className="text-sm font-semibold text-navy">{value}</dd>
        </div>)}
      </dl>
      <aside className="rounded-2xl bg-white p-5">
        <h2 className="font-bold text-navy">Update booking status</h2>
        <p className="mt-2 text-xs leading-5 text-slate-500">Payment status is read-only. Stripe webhooks will own payment transitions. Cancelled and completed bookings cannot be reopened here.</p>
        <form action={updateBookingStatus} className="mt-5 space-y-4">
          <input type="hidden" name="id" value={booking.id}/>
          <select name="status" defaultValue={booking.status} className="h-11 w-full rounded-xl border border-navy/15 px-3">
            {statuses.map(status => <option key={status}>{status}</option>)}
          </select>
          <button disabled={statuses.length === 1} className="h-11 w-full rounded-full bg-ocean text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">Save status</button>
        </form>
      </aside>
    </div>
  </>;
}

function money(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

function ageLabel(value: string) {
  return ({ under_3: "Under 3", "3_5": "3–5", "6_8": "6–8", "9_12": "9–12", "13_17": "13–17", adult: "Adult" } as Record<string, string>)[value] ?? value;
}
