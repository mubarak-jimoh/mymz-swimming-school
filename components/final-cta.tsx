import Link from "next/link";
import { Button } from "./button";

export function FinalCTA() {
  return <section className="px-4 pb-4 sm:px-6 sm:pb-6"><div className="pool-lines water-grid relative mx-auto max-w-[90rem] overflow-hidden rounded-[2.5rem] px-6 py-20 text-center sm:py-28"><div className="relative z-10 mx-auto max-w-3xl"><p className="text-xs font-bold tracking-[.18em] text-white/75">YOUR NEXT CHAPTER STARTS HERE</p><h2 className="display mt-5 text-5xl font-bold text-white sm:text-7xl">Ready to make a splash?</h2><p className="mt-6 text-lg text-white/80">Book an available lesson or ask MYMZ to help you find the right option.</p><div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"><Button href="/book" variant="light">BOOK A LESSON</Button><Link href="/enquire" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/35 px-6 text-xs font-extrabold tracking-[.1em] text-white transition hover:border-white hover:bg-white/10">FIND THE RIGHT LESSON</Link></div></div></div></section>;
}
