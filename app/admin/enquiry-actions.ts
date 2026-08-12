"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "@/lib/admin/validation";
import { requireAdmin } from "@/lib/auth/admin";
import type { Database, EnquiryStatus } from "@/lib/supabase/database.types";

type ConversionDatabase = {
  public: Omit<Database["public"], "Functions"> & {
    Functions: Database["public"]["Functions"] & {
      convert_enquiry_to_customer: {
        Args: { p_enquiry_id: string };
        Returns: { customer_id: string; swimmer_id: string }[];
      };
    };
  };
};

async function approved() {
  const access = await requireAdmin();
  return access.state === "approved" ? access : null;
}

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

async function log(
  access: NonNullable<Awaited<ReturnType<typeof approved>>>,
  action: string,
  id: string,
  details: Record<string, unknown>,
) {
  const { error } = await access.supabase.from("admin_audit_log").insert({
    admin_user_id: access.userId,
    action,
    entity_type: "enquiry",
    entity_id: id,
    details,
  });
  if (error) console.error("Admin audit write failed", { action, entity: "enquiry", code: error.code });
}

export async function updateEnquiryStatus(formData: FormData) {
  const access = await approved();
  if (!access) return;
  const id = value(formData, "id");
  const status = value(formData, "status") as EnquiryStatus;
  if (!isUuid(id) || !["new", "contacted", "follow_up", "converted", "closed"].includes(status)) return;
  const { data: current, error: readError } = await access.supabase.from("enquiries").select("status").eq("id", id).single();
  if (readError || !current || current.status === status) return;
  if (current.status === "converted" && status !== "closed") return;
  const { error } = await access.supabase.from("enquiries").update({ status }).eq("id", id);
  if (error) return;
  await log(access, "enquiry.status_changed", id, { from: current.status, to: status });
  revalidatePath(`/admin/enquiries/${id}`); revalidatePath("/admin/enquiries"); revalidatePath("/admin");
}

export async function convertEnquiry(formData: FormData) {
  const access = await approved();
  if (!access) return;
  const id = value(formData, "id");
  if (!isUuid(id)) return;
  if (formData.get("confirm") !== "yes") {
    redirect(`/admin/enquiries/${id}?error=${encodeURIComponent("Confirm the conversion before continuing.")}`);
  }
  const client = access.supabase as unknown as SupabaseClient<ConversionDatabase>;
  const { data, error } = await client.rpc("convert_enquiry_to_customer", { p_enquiry_id: id });
  if (error || !data?.[0]) {
    redirect(`/admin/enquiries/${id}?error=${encodeURIComponent("Conversion could not be completed safely.")}`);
  }
  await log(access, "enquiry.converted_to_customer", id, {
    customerId: data[0].customer_id,
    swimmerId: data[0].swimmer_id,
    bookingCreated: false,
  });
  revalidatePath(`/admin/enquiries/${id}`); revalidatePath("/admin/enquiries");
  revalidatePath("/admin/customers"); revalidatePath("/admin");
}
