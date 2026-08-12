import Image from "next/image";
import Link from "next/link";

const sizes = {
  compact: "size-14",
  default: "size-16 sm:size-[4.5rem]",
  large: "size-24 sm:size-28",
};

export function Logo({ light = false, size = "default" }: { light?: boolean; size?: keyof typeof sizes }) {
  return <Link href="/" aria-label="MYMZ Swimming School home" className="group inline-flex shrink-0 items-center rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-aqua/50">
    <span className={`relative overflow-hidden rounded-full bg-white p-0.5 ring-1 transition duration-300 group-hover:scale-[1.03] ${light ? "ring-white/25 shadow-[0_10px_35px_rgba(0,0,0,.22)]" : "ring-navy/10 shadow-[0_8px_28px_rgba(6,27,44,.12)]"} ${sizes[size]}`}>
      <Image src="/brand/mymz-official-logo.png" alt="MYMZ Swimming School" fill sizes={size === "large" ? "112px" : "72px"} className="object-contain" priority={size !== "large"} />
    </span>
  </Link>;
}
