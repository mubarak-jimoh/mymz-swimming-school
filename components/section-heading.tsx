export function SectionHeading({ eyebrow, title, copy, light=false, centered=false }: {eyebrow:string; title:string; copy?:string; light?:boolean; centered?:boolean}) {
  return <div className={`${centered?"mx-auto text-center":""} max-w-2xl`}><p className={`eyebrow ${light?"!text-aqua":""}`}>{eyebrow}</p><h2 className={`display mt-4 text-4xl font-bold leading-[1.08] sm:text-5xl ${light?"text-white":"text-navy"}`}>{title}</h2>{copy&&<p className={`mt-5 text-lg leading-8 ${light?"text-white/65":"text-slate-600"}`}>{copy}</p>}</div>;
}
