import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AIPlanComposer from "@/components/ai/AIPlanComposer";

export const metadata: Metadata = {
  title: "AI Trip Planner — The Cotswold Way",
  description:
    "Describe the walk you want in your own words. The Cotswold Way AI builds a day-by-day itinerary that fits your pace, budget, and preferences — then hands it to the planner for editing.",
  alternates: { canonical: "https://thecotswoldsway.com/plan/ai" },
};

export default function AIPlanPage() {
  return (
    <>
      <Navbar />

      <section className="plan-hero py-12 md:py-14 px-8 text-center">
        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 bg-white/6 border border-brass/20 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brass-light mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-brass" />
            AI Trip Planner
          </span>
          <h1 className="text-4xl md:text-[42px] font-medium text-cream leading-tight mb-2.5" style={{ fontFamily: "var(--font-serif)" }}>
            Tell us about <em className="italic text-brass-light">your</em> walk
          </h1>
          <p className="text-[15px] text-white/55 font-light">
            A sentence is enough. We&apos;ll build the days, the stays, and the trade-offs.
          </p>
        </div>
      </section>

      <section className="max-w-[920px] mx-auto px-6 py-10">
        <AIPlanComposer />
      </section>

      <Footer />
    </>
  );
}
