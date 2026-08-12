import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function TeachingExperience() {
  return <section aria-labelledby="teaching-experience-title" className="pb-24 sm:pb-32">
    <div className="container-site grid overflow-hidden rounded-[2.25rem] bg-cream shadow-[0_20px_65px_rgba(6,27,44,.08)] lg:grid-cols-[1.08fr_.92fr]">
      <figure className="relative min-h-[20rem] overflow-hidden sm:min-h-[25rem] lg:min-h-[30rem]">
        <Image src="/images/mymz-supportive-swimming-instruction.jpg" alt="Swimming instructor supporting a young swimmer practising with a float" fill sizes="(min-width: 1280px) 650px, (min-width: 1024px) 55vw, 100vw" className="object-cover object-[49%_50%] sm:object-[50%_48%]" />
        <div aria-hidden="true" className="absolute inset-6 rounded-[1.5rem] border border-white/35" />
        <figcaption className="sr-only">Illustrative MYMZ promotional imagery.</figcaption>
      </figure>
      <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
        <p className="eyebrow">THE LESSON EXPERIENCE</p>
        <h2 id="teaching-experience-title" className="display mt-4 text-3xl font-bold text-navy sm:text-4xl">Support that meets the swimmer where they are.</h2>
        <p className="mt-5 text-base leading-8 text-slate-600">A calm, encouraging approach helps swimmers practise skills, build confidence and develop at a pace that feels right for them.</p>
        <Link href="/enquire" className="mt-7 inline-flex min-h-11 items-center gap-2 self-start text-sm font-bold text-ocean transition hover:text-navy">Tell us about the swimmer <ArrowRight className="size-4" /></Link>
      </div>
    </div>
  </section>;
}
