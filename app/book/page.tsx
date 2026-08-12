import type { Metadata } from "next";
import { BookingFlow } from "@/components/booking-flow";
import { Footer } from "@/components/footer";
import { Logo } from "@/components/logo";
import { Navbar } from "@/components/navbar";
import { getBookingCatalog } from "@/lib/supabase/queries";

export const metadata: Metadata = { title: "Book Swimming Lessons | MYMZ Swimming School", description: "Choose an active children's, adult or private MYMZ swimming lesson and genuine available time." };
export const dynamic = "force-dynamic";

export default async function BookPage({ searchParams }: { searchParams: Promise<{ lesson?: string }> }) {
  const [catalog, params] = await Promise.all([getBookingCatalog(), searchParams]);
  return <><Navbar /><main className="min-h-screen bg-cream"><section className="container-site py-14 sm:py-20"><div className="mx-auto max-w-3xl text-center"><div className="mb-6 flex justify-center"><Logo size="large" /></div><p className="eyebrow">BOOK WITH MYMZ</p><h1 className="display mt-4 text-5xl font-bold text-navy sm:text-6xl">Your swimming journey starts here.</h1><p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-600">Choose a genuine available lesson, tell us about the swimmer and review every detail before reserving a place.</p></div><BookingFlow catalog={catalog} initialLessonSlug={params.lesson} /></section></main><Footer /></>;
}
