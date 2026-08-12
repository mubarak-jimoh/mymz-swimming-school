import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Phone } from "lucide-react";
import { Button } from "@/components/button";
import { Footer } from "@/components/footer";
import { Logo } from "@/components/logo";
import { Navbar } from "@/components/navbar";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Enquiry Received | MYMZ Swimming School", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference } = await searchParams;
  if (!reference || !/^MYMZ-E-[A-Z0-9-]+$/.test(reference)) notFound();
  const supabase = createServiceRoleClient();
  if (!supabase) notFound();
  const { data } = await supabase.from("enquiries").select("id").eq("reference", reference).maybeSingle();
  if (!data) notFound();
  return <><Navbar /><main className="bg-cream py-16 sm:py-24"><div className="container-site"><div className="mx-auto max-w-3xl rounded-[2.5rem] bg-white p-7 text-center shadow-[0_24px_80px_rgba(6,27,44,.1)] sm:p-12"><div className="mb-5 flex justify-center"><Logo size="large" /></div><span className="mx-auto grid size-20 place-items-center rounded-full bg-aqua/20 text-ocean"><Check className="size-9" /></span><p className="eyebrow mt-7">ENQUIRY {reference}</p><h1 className="display mt-4 text-4xl font-bold text-navy sm:text-5xl">Thanks — we&apos;ve received your enquiry.</h1><p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-600">Your details have been stored securely. MYMZ will review them and get in touch to help find the right lesson.</p><div className="mt-9 rounded-2xl bg-cream p-6 text-left sm:p-8"><h2 className="display text-xl font-bold text-navy">What happens next?</h2><ol className="mt-5 space-y-4">{["We review your enquiry", "We help identify the most suitable lesson option", "MYMZ contacts you using the details provided"].map((x, i) => <li key={x} className="flex gap-3 text-sm text-slate-600"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-white">{i + 1}</span><span className="pt-1">{x}</span></li>)}</ol></div><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Button href="/" variant="secondary">RETURN HOME</Button><Button href="/lessons">VIEW LESSONS</Button><a href="tel:07383488189" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-navy/15 px-6 text-xs font-extrabold tracking-[.08em] text-navy transition hover:border-ocean hover:text-ocean"><Phone className="size-4" />CALL 07383 488189</a></div></div></div></main><Footer /></>;
}
