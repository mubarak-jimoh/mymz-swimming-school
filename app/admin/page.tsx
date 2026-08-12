import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { AdminHeader, AdminShell, EmptyAdmin } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

export default async function AdminDashboard() {
  const access = await requireAdmin();
  if (access.state === "unconfigured") {
    return <AccessState title="Staff access unavailable" copy="The administration service is not available. Check the server configuration before trying again."/>;
  }
  if (access.state === "denied") {
    return <AccessState title="Access denied" copy={`${access.email} is authenticated but is not listed as an approved MYMZ administrator.`}/>;
  }

  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const tomorrow = new Date(start); tomorrow.setDate(tomorrow.getDate() + 1);
  const { data: futureSlots } = await access.supabase.from("lesson_slots").select("id")
    .eq("active", true).gte("start_time", now.toISOString()).limit(5000);
  const futureSlotIds = futureSlots?.map(slot => slot.id) ?? [];
  const operationalSlotIds = futureSlotIds.length ? futureSlotIds : [EMPTY_UUID];
  const results = await Promise.all([
    access.supabase.from("lesson_slots").select("id", { count: "exact", head: true }).eq("active", true)
      .gte("start_time", start.toISOString()).lt("start_time", tomorrow.toISOString()),
    access.supabase.from("bookings").select("id", { count: "exact", head: true })
      .in("lesson_slot_id", operationalSlotIds).in("status", ["pending", "confirmed"]),
    access.supabase.from("bookings").select("id", { count: "exact", head: true })
      .in("lesson_slot_id", operationalSlotIds).eq("status", "pending").gt("reservation_expires_at", now.toISOString()),
    access.supabase.from("bookings").select("id", { count: "exact", head: true })
      .in("lesson_slot_id", operationalSlotIds).eq("status", "confirmed"),
    access.supabase.from("available_lesson_slots").select("spaces_available"),
    access.supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
    access.supabase.from("enquiries").select("id", { count: "exact", head: true }).in("status", ["new", "follow_up"]),
    access.supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "converted"),
    access.supabase.from("enquiries").select("id,reference,swimmer_name,swimmer_first_name,swimmer_last_name,status,created_at")
      .order("created_at", { ascending: false }).limit(5),
  ]);
  const spaces = results[4].data?.reduce((sum, slot) => sum + slot.spaces_available, 0) ?? 0;
  const metrics = [
    ["Today's lessons", results[0].count ?? 0], ["Upcoming bookings", results[1].count ?? 0],
    ["Pending reservations", results[2].count ?? 0], ["Confirmed upcoming", results[3].count ?? 0],
    ["Available spaces", spaces], ["New enquiries", results[5].count ?? 0],
    ["Awaiting contact", results[6].count ?? 0], ["Converted enquiries", results[7].count ?? 0],
  ];
  const recent = results[8].data;

  return <AdminShell email={access.email}>
    <AdminHeader eyebrow="OPERATIONS" title="Dashboard" copy="Live operational totals from the MYMZ database."/>
    <section aria-label="Operational summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(([label, value]) => <article key={label} className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="display mt-4 text-4xl font-bold text-navy">{value}</p>
      </article>)}
    </section>
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="display text-2xl font-bold text-navy">Recent enquiries</h2>
        <Link href="/admin/enquiries" className="text-sm font-bold text-ocean">View all</Link>
      </div>
      {recent?.length ? <div className="overflow-x-auto rounded-2xl bg-white"><table className="w-full text-left text-sm">
        <thead className="bg-navy text-white"><tr><th className="p-4">Reference</th><th className="p-4">Swimmer</th><th className="p-4">Status</th><th className="p-4">Received</th></tr></thead>
        <tbody>{recent.map(enquiry => <tr key={enquiry.id} className="border-t border-navy/8">
          <td className="p-4"><Link href={`/admin/enquiries/${enquiry.id}`} className="font-bold text-ocean">{enquiry.reference}</Link></td>
          <td className="p-4">{enquiry.swimmer_name??[enquiry.swimmer_first_name,enquiry.swimmer_last_name].filter(Boolean).join(" ")}</td>
          <td className="p-4 capitalize">{enquiry.status.replaceAll("_", " ")}</td>
          <td className="p-4">{new Date(enquiry.created_at).toLocaleDateString("en-GB")}</td>
        </tr>)}</tbody>
      </table></div> : <EmptyAdmin title="No enquiries yet" copy="Real successfully stored customer enquiries will appear here."/>}
    </section>
  </AdminShell>;
}

function AccessState({ title, copy }: { title: string; copy: string }) {
  return <main className="grid min-h-screen place-items-center bg-cream p-5">
    <div className="max-w-lg rounded-[2rem] bg-navy p-10 text-white">
      <LockKeyhole className="size-10 text-aqua"/>
      <h1 className="display mt-6 text-4xl font-bold">{title}</h1>
      <p className="mt-4 leading-7 text-white/65">{copy}</p>
    </div>
  </main>;
}
