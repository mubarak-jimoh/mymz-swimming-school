import Image from "next/image";

export function PageHero({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <section className="water-grid relative overflow-hidden bg-navy py-20 text-white sm:py-24"><div className="container-site relative z-10"><p className="eyebrow !text-aqua">{eyebrow}</p><h1 className="display mt-4 max-w-4xl text-5xl font-bold leading-tight sm:text-6xl">{title}</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-white/65">{copy}</p></div><div aria-hidden="true" className="absolute -bottom-20 -right-12 size-64 opacity-[.11] sm:right-8 sm:size-80"><Image src="/brand/mymz-official-logo.png" alt="" fill sizes="320px" className="object-contain" /></div></section>;
}
