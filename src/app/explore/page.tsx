import Navbar from "@/components/Navbar";
import TrailExplorer from "@/components/TrailExplorer";

export const metadata = {
  title: "Cotswold Way Trail Explorer — Pubs, Water Points & Amenities Map",
  description:
    "Interactive map of pubs, cafes, water points, toilets, shops and transport along the Cotswold Way. Filter by type and trail stage. Essential planning tool for walkers.",
  alternates: { canonical: "https://thecotswoldsway.com/explore" },
};

export default function ExplorePage() {
  return (
    <>
      <Navbar />
      <TrailExplorer />
    </>
  );
}
