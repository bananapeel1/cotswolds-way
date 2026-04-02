import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import MyTripSummary from "@/components/MyTripSummary";

export const metadata: Metadata = {
  title: "My Trip Summary — The Cotswold Way",
  description:
    "Your complete Cotswold Way trip plan: day-by-day route, accommodation, lunch stops, and points of interest. Print or share your itinerary.",
  alternates: { canonical: "https://thecotswoldsway.com/my-trip" },
};

export default function MyTripPage() {
  return (
    <>
      <Navbar />
      <MyTripSummary />
    </>
  );
}
