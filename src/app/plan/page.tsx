import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TripPlanner from "@/components/TripPlanner";

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

      {/* Compact header */}
      <section className="bg-topo py-10 px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-medium text-primary mb-2 italic" style={{ fontFamily: "var(--font-serif)" }}>Plan Your Walk</h1>
          <p className="text-sm text-secondary">
            102 miles of England's finest trail. Build your perfect itinerary.
          </p>
        </div>
      </section>

      {/* Trip Planner */}
      <section className="max-w-4xl mx-auto px-6 py-8">
        <TripPlanner />
      </section>

      <Footer />
    </>
  );
}
