import Navbar from "@/components/Navbar";
import TrailExplorer from "@/components/TrailExplorer";

export const metadata = {
  title: "Trail Explorer | The Cotswolds Way",
  description: "Find pubs, water points, toilets, shops and more along the Cotswold Way. Live GPS tracking shows what\u2019s nearest to you on the trail.",
};

export default function ExplorePage() {
  return (
    <>
      <Navbar />
      <TrailExplorer />
    </>
  );
}
