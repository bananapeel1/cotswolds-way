import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TripPlanner from "@/components/TripPlanner";
import TrailTotal from "@/components/TrailTotal";

export const metadata: Metadata = {
  title: "Plan Your Cotswold Way Walk — Itinerary Builder & Route Planner",
  description:
    "Build a custom Cotswold Way itinerary in minutes. Choose your pace (4–14 days), see walk difficulty scores, find pub lunch stops, estimate costs, and export GPX files for offline navigation.",
  alternates: { canonical: "https://thecotswoldsway.com/plan" },
};

export default function PlanMyHikePage() {
  return (
    <>
      <Navbar />

      {/* Hero header */}
      <section className="plan-hero py-12 md:py-14 px-8 text-center">
        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 bg-white/6 border border-brass/20 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brass-light mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-brass" />
            Itinerary Builder
          </span>
          <h1 className="text-4xl md:text-[42px] font-medium text-cream leading-tight mb-2.5" style={{ fontFamily: "var(--font-serif)" }}>
            Plan <em className="italic text-brass-light">Your</em> Walk
          </h1>
          <p className="text-[15px] text-white/55 font-light">
            <TrailTotal />{" "}of England&apos;s finest trail. Build your perfect itinerary.
          </p>
        </div>
      </section>

      {/* Trip Planner */}
      <section className="max-w-[720px] mx-auto px-6 py-10">
        <TripPlanner />
      </section>

      <Footer />
    </>
  );
}
