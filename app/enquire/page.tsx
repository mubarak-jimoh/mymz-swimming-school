import type { Metadata } from "next";
import { Headphones, ShieldCheck, Sparkles } from "lucide-react";
import { EnquiryForm } from "@/components/enquiry/enquiry-form";
import { Footer } from "@/components/footer";
import { Logo } from "@/components/logo";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = { title: "Find the Right Swimming Lesson | MYMZ Swimming School", description: "Tell MYMZ about the swimmer and we'll help identify the most suitable children's, adult or private swimming lesson." };
export const dynamic = "force-dynamic";

export default async function Page() {
  const reasons = [[Sparkles, "Not sure of the level? That's okay."], [Headphones, "Easy, personal communication."], [ShieldCheck, "Only relevant details are collected."]] as const;
  return <><Navbar /><main className="bg-cream">
    <section className="water-grid bg-navy py-16 text-white sm:py-24"><div className="container-site grid gap-10 lg:grid-cols-[1fr_.7fr]"><div><div className="mb-6"><Logo light size="large" /></div><p className="eyebrow !text-aqua">PERSONAL LESSON GUIDANCE</p><h1 className="display mt-5 max-w-3xl text-5xl font-bold leading-tight sm:text-6xl">Let&apos;s find the right lesson.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">Tell us a little about the swimmer and what you&apos;re looking for. The MYMZ team will review your enquiry and get in touch.</p></div><div className="grid gap-3 self-end">{reasons.map(([Icon, text]) => <p key={text} className="flex items-center gap-3 rounded-xl bg-white/5 p-3 text-sm text-white/70"><Icon className="size-5 text-aqua" />{text}</p>)}</div></div></section>
    <section className="py-12 sm:py-20"><div className="container-site grid gap-10 lg:grid-cols-[1fr_18rem]"><EnquiryForm /><aside className="order-first lg:order-last"><div className="sticky top-28 rounded-2xl bg-white p-6 shadow-sm"><p className="eyebrow">TWO EASY ROUTES</p><h2 className="display mt-3 text-2xl font-bold text-navy">Already know what you need?</h2><p className="mt-3 text-sm leading-6 text-slate-500">Skip the enquiry and choose genuine lesson availability online.</p><a href="/book" className="mt-5 flex min-h-11 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">Book a lesson</a><div className="mt-5 border-t border-navy/8 pt-5"><p className="text-sm text-slate-500">Prefer to talk?</p><a href="tel:07383488189" className="mt-1 block font-bold text-ocean">07383 488189</a></div></div></aside></div></section>
  </main><Footer /></>;
}
