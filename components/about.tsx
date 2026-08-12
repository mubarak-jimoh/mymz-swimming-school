import Image from "next/image";
import { Button } from "./button";
import { SectionHeading } from "./section-heading";

export function About() {
  return <section id="about" className="overflow-hidden py-24 sm:py-32"><div className="container-site grid items-center gap-14 lg:grid-cols-2">
    <div className="relative order-2 lg:order-1">
      <figure className="relative aspect-[4/3] overflow-hidden rounded-[2.5rem] bg-navy shadow-[0_24px_70px_rgba(6,27,44,.16)]">
        <Image src="/images/mymz-individual-swimming-support.jpg" alt="Swimming instructor giving individual support to a young swimmer in the pool" fill sizes="(min-width: 1280px) 580px, (min-width: 1024px) 48vw, 100vw" className="object-cover object-[52%_50%] sm:object-[50%_48%]" />
        <div aria-hidden="true" className="absolute inset-7 z-10 rounded-[1.75rem] border border-white/30" />
        <figcaption className="sr-only">Illustrative MYMZ promotional imagery.</figcaption>
      </figure>
      <div className="absolute -right-4 -top-5 size-28 rounded-full border-2 border-aqua/40 sm:-right-8" />
    </div>
    <div className="order-1 lg:order-2"><SectionHeading eyebrow="ABOUT MYMZ" title="Helping swimmers feel at home in the water." /><div className="mt-6 space-y-5 text-lg leading-8 text-slate-600"><p>At MYMZ, swimming is about more than technique. It is about feeling safe, capable and genuinely comfortable in the water.</p><p>Our supportive lessons help each swimmer progress at their own pace, building water confidence and essential skills through enjoyable, encouraging teaching.</p></div><Button href="/book" className="mt-8">START YOUR JOURNEY</Button></div>
  </div></section>;
}
