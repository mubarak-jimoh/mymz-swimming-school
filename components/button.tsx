import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

export function Button({ href, children, variant="primary", className="" }: { href:string; children:ReactNode; variant?:"primary"|"secondary"|"light"; className?:string }) {
  const styles={primary:"bg-ocean text-white hover:bg-navy shadow-[0_12px_30px_rgba(8,126,164,.22)]",secondary:"border border-navy/15 bg-white text-navy hover:border-ocean hover:text-ocean",light:"bg-white text-navy hover:bg-aqua"};
  return <Link href={href} className={`group inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-xs font-extrabold tracking-[.1em] transition duration-300 ${styles[variant]} ${className}`}>{children}<ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/></Link>;
}
