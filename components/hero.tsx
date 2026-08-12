import Image from "next/image";
import { Check } from "lucide-react";
import { Button } from "./button";

export function Hero() {
  return <section id="home" className="relative overflow-hidden bg-cream py-12 sm:py-20 lg:py-24">
    <div className="absolute -left-36 top-32 size-72 rounded-full border-[46px] border-aqua/10" />
    <div className="container-site grid items-center gap-14 lg:grid-cols-[.9fr_1.1fr]">
      <div className="relative z-10">
        <div className="fade-up flex items-center gap-4">
          <span className="relative size-16 overflow-hidden rounded-full bg-white shadow-[0_8px_28px_rgba(6,27,44,.12)] ring-1 ring-navy/10">
            <Image src="/brand/mymz-official-logo.png" alt="MYMZ Swimming School" fill sizes="64px" className="object-contain" priority />
          </span>
          <p className="eyebrow">MYMZ SWIMMING SCHOOL</p>
        </div>
        <h1 className="display fade-up delay-1 mt-6 max-w-2xl text-[3.5rem] font-bold leading-[.98] text-navy sm:text-7xl lg:text-[5.4rem]">Swim with <span className="text-ocean">confidence.</span></h1>
        <p className="fade-up delay-2 mt-7 max-w-xl text-lg leading-8 text-slate-600">Supportive swimming lessons for children and adults, designed to build confidence, stronger technique and long-term swimming ability.</p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Button href="/book">BOOK A LESSON</Button><Button href="/enquire" variant="secondary">FIND THE RIGHT LESSON</Button></div>
        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3">{["Supportive teaching", "Clear progression", "Simple booking and communication"].map(x => <span key={x} className="flex items-center gap-2 text-sm font-semibold text-navy/70"><span className="grid size-5 place-items-center rounded-full bg-aqua/25"><Check className="size-3 text-ocean" /></span>{x}</span>)}</div>
      </div>
      <div className="relative mx-auto w-full max-w-2xl lg:mx-0">
        <figure className="relative aspect-[4/3] overflow-hidden rounded-[2.5rem] bg-navy shadow-[0_30px_80px_rgba(6,27,44,.22)] sm:aspect-[5/4]">
          <Image src="/images/mymz-group-swimming-confidence.jpg" alt="Swimming instructor encouraging two young swimmers during a pool lesson" fill priority sizes="(min-width: 1280px) 640px, (min-width: 1024px) 52vw, 100vw" className="object-cover object-[50%_50%]" />
          <div className="absolute inset-6 z-10 rounded-[1.75rem] border border-white/25" />
          <figcaption className="sr-only">Illustrative MYMZ promotional imagery.</figcaption>
        </figure>
        <div className="relative z-30 mx-3 -mt-8 max-w-[17rem] rounded-3xl bg-white p-6 shadow-[0_18px_50px_rgba(6,27,44,.18)] sm:absolute sm:-bottom-7 sm:-left-8 sm:mx-0 sm:mt-0"><div className="mb-4 h-1 w-10 rounded-full bg-aqua" /><h2 className="display text-xl font-bold text-navy">Find your perfect lesson</h2><p className="mt-2 text-sm leading-6 text-slate-500">Book directly or ask MYMZ to help you choose.</p></div>
      </div>
    </div>
  </section>;
}
