import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { SectionHeading } from "./section-heading";

const steps = [
  ["01", "Choose your route", "Browse genuine available lessons or ask MYMZ for personal guidance."],
  ["02", "Tell us about the swimmer", "Share their ability, water confidence, goals and preferred availability."],
  ["03", "Find the right fit", "Choose an available lesson or let MYMZ help identify the most suitable option."],
  ["04", "Start swimming", "Once availability and the booking are confirmed, the swimming journey can begin."],
];

export function HowItWorks() {
  return <section className="bg-cream py-24 sm:py-32"><div className="container-site"><SectionHeading eyebrow="YOUR ROUTE INTO THE WATER" title="Getting started is simple." centered copy="Book directly when you know what you need, or tell us about the swimmer and let MYMZ help." /><div className="relative mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{steps.map(([n, t, d]) => <article key={n} className="group relative rounded-[1.75rem] border border-navy/5 bg-white p-8 shadow-[0_12px_40px_rgba(6,27,44,.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(6,27,44,.09)]"><span className="display text-5xl font-bold text-aqua/70">{n}</span><h3 className="display mt-10 text-xl font-bold text-navy">{t}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{d}</p></article>)}</div><div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/book" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ocean px-6 text-xs font-extrabold tracking-[.1em] text-white shadow-[0_12px_30px_rgba(8,126,164,.22)] transition hover:bg-navy">BOOK A LESSON <ArrowRight className="size-4" /></Link><Link href="/enquire" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-navy/15 bg-white px-6 text-xs font-extrabold tracking-[.1em] text-navy transition hover:border-ocean hover:text-ocean">FIND THE RIGHT LESSON <ArrowRight className="size-4" /></Link></div></div></section>;
}
