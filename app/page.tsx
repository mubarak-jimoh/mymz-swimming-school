import { About } from "@/components/about";
import { FAQ } from "@/components/faq";
import { FinalCTA } from "@/components/final-cta";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { Lessons } from "@/components/lessons";
import { Navbar } from "@/components/navbar";
import { WhyMymz } from "@/components/why-mymz";
import { EnquiryCTA } from "@/components/enquiry-cta";
import { TeachingExperience } from "@/components/teaching-experience";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Lessons />
        <TeachingExperience />
        <WhyMymz />
        <About />
        <HowItWorks />
        <EnquiryCTA />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
