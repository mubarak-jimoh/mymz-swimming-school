import Link from "next/link";
import { Phone } from "lucide-react";
import { Logo } from "./logo";

const groups = [
  { title: "Explore", links: [["Home", "/#home"], ["Lessons", "/lessons"], ["About", "/#about"], ["Why MYMZ", "/#why-mymz"]] },
  { title: "Get started", links: [["Book a lesson", "/book"], ["Find the right lesson", "/enquire"], ["Contact", "/contact"], ["FAQs", "/#faqs"]] },
  { title: "Information", links: [["Privacy", "/privacy"], ["Terms", "/terms"], ["Cancellation policy", "/cancellation-policy"]] },
];

export function Footer() {
  return <footer id="contact" className="bg-navy pt-20 text-white">
    <div className="container-site grid gap-12 pb-16 sm:grid-cols-2 lg:grid-cols-[1.35fr_repeat(4,1fr)]">
      <div><Logo light size="large" /><p className="mt-6 max-w-xs text-sm leading-7 text-white/60">Confidence in the water.<br />Skills for life.</p><p className="mt-6 max-w-xs text-sm leading-7 text-white/45">Supportive swimming lessons for children and adults.</p></div>
      {groups.map(group => <div key={group.title}><h2 className="text-xs font-bold uppercase tracking-[.16em] text-aqua">{group.title}</h2><ul className="mt-6 space-y-4">{group.links.map(([label, href]) => <li key={label}><Link href={href} className="text-sm text-white/60 transition hover:text-white focus-visible:text-white">{label}</Link></li>)}</ul></div>)}
      <div><h2 className="text-xs font-bold uppercase tracking-[.16em] text-aqua">Contact</h2><p className="mt-6 text-sm leading-6 text-white/55">Prefer to speak with MYMZ directly?</p><a href="tel:07383488189" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-bold text-white transition hover:border-aqua hover:text-aqua"><Phone className="size-4" />07383 488189</a><p className="mt-5 text-sm text-white/50"><Link href="/enquire" className="underline decoration-white/25 underline-offset-4 hover:text-white">Send a secure written enquiry</Link></p></div>
    </div>
    <div className="border-t border-white/10"><div className="container-site flex flex-col gap-3 py-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} MYMZ Swimming School. All rights reserved.</p><p>Official lesson details are confirmed during booking or enquiry.</p></div></div>
  </footer>;
}
