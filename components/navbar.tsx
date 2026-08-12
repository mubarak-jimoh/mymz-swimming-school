"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "./button";
import { Logo } from "./logo";

const links = [["Home", "/#home"], ["Lessons", "/lessons"], ["About", "/#about"], ["Why MYMZ", "/#why-mymz"], ["Enquire", "/enquire"], ["Contact", "/contact"]];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const active = (href: string) => href === "/#home" ? pathname === "/" : !href.includes("#") && pathname === href;
  return <header className="sticky top-0 z-50 border-b border-navy/8 bg-white/90 backdrop-blur-xl"><div className="container-site flex h-[5.5rem] items-center justify-between"><Logo size="compact" /><nav aria-label="Main navigation" className="hidden items-center gap-7 lg:flex">{links.map(([label, href]) => <Link key={label} href={href} aria-current={active(href) ? "page" : undefined} className={`relative py-3 text-sm font-semibold transition after:absolute after:inset-x-0 after:bottom-1 after:h-0.5 after:origin-left after:rounded-full after:bg-ocean after:transition-transform ${active(href) ? "text-ocean after:scale-x-100" : "text-navy/70 after:scale-x-0 hover:text-ocean hover:after:scale-x-100"}`}>{label}</Link>)}</nav><div className="hidden lg:block"><Button href="/book">BOOK A LESSON</Button></div><button onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"} className="grid size-11 place-items-center rounded-full border border-navy/10 transition hover:border-ocean hover:text-ocean focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-aqua/30 lg:hidden">{open ? <X /> : <Menu />}</button></div>{open && <nav id="mobile-nav" aria-label="Mobile navigation" className="border-t border-navy/8 bg-white px-4 pb-6 shadow-xl lg:hidden"><div className="container-site flex flex-col py-3">{links.map(([label, href]) => <Link onClick={() => setOpen(false)} key={label} href={href} aria-current={active(href) ? "page" : undefined} className={`border-b border-navy/7 py-4 font-semibold ${active(href) ? "text-ocean" : "text-navy"}`}>{label}</Link>)}<Button href="/book" className="mt-5">BOOK A LESSON</Button></div></nav>}</header>;
}
