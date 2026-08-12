"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SectionHeading } from "./section-heading";

const faqs = [
  ["How do I know which lesson is right?", "You can browse the active lessons online, or use our enquiry form to share the swimmer's age, confidence, ability and goals. MYMZ can then help you identify the most suitable route."],
  ["What if I'm unsure of the swimmer's level?", "That is completely fine. Select ‘Not sure’ on the enquiry form and describe what the swimmer is comfortable doing in the water."],
  ["Do you teach beginners?", "MYMZ welcomes enquiries from beginners. The most suitable lesson will depend on the swimmer's age, confidence and the genuine lesson options available."],
  ["Can adults enquire about lessons?", "Yes. Adult swimmers can submit the enquiry themselves and tell MYMZ about their experience, goals and availability."],
  ["How do I make an enquiry?", "Complete the Find the Right Lesson form with the swimmer's details and your availability preferences. An enquiry does not reserve a lesson or create a booking."],
  ["How will MYMZ contact me?", "MYMZ will use the contact details you provide with your enquiry. You can also call 07383 488189 if you would prefer to speak with us."],
  ["Can I book online?", "Yes, when a genuine active lesson and available time are published. If you cannot find a suitable option, send an enquiry and MYMZ can help."],
  ["What happens after I submit an enquiry?", "MYMZ reviews the information, considers the most suitable lesson route and contacts you using the details provided. A lesson is only secured once availability and booking are confirmed."],
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return <section id="faqs" className="py-24 sm:py-32"><div className="container-site grid gap-12 lg:grid-cols-[.75fr_1.25fr]"><SectionHeading eyebrow="COMMON QUESTIONS" title="Clear answers before you begin." copy="If your question depends on a specific lesson or availability, send an enquiry and MYMZ will help." /><div className="divide-y divide-navy/10 border-y border-navy/10">{faqs.map(([q, a], i) => { const active = open === i; const panelId = `faq-panel-${i}`; return <div key={q}><h3><button onClick={() => setOpen(active ? null : i)} className="flex min-h-16 w-full items-center justify-between gap-5 py-5 text-left focus-visible:outline-none" aria-expanded={active} aria-controls={panelId}><span className="display text-lg font-bold text-navy sm:text-xl">{q}</span><span className="grid size-9 shrink-0 place-items-center rounded-full bg-cream"><ChevronDown className={`size-4 transition-transform ${active ? "rotate-180" : ""}`} /></span></button></h3><div id={panelId} className={`grid transition-[grid-template-rows] duration-300 ${active ? "grid-rows-[1fr] pb-6" : "grid-rows-[0fr]"}`}><div className="overflow-hidden"><p className="max-w-2xl pr-8 leading-7 text-slate-600">{a}</p></div></div></div>; })}</div></div></section>;
}
