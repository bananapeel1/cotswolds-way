import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SharedPlanView from "@/components/plans/SharedPlanView";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import type { PlanState } from "@/lib/plan-engine";

interface SharedPlanRow {
  id: string;
  plan: PlanState;
  brief: Record<string, unknown> | null;
  source: string;
  created_at: string;
  view_count: number;
}

async function fetchPlan(id: string): Promise<SharedPlanRow | null> {
  if (!/^[0-9A-Za-z]{12}$/.test(id)) return null;
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("shared_plans")
      .select("id, plan, brief, source, created_at, view_count")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return data as SharedPlanRow;
  } catch {
    return null;
  }
}

function describePlan(plan: PlanState): string {
  const dir = plan.direction === "north_to_south" ? "Chipping Campden to Bath" : "Bath to Chipping Campden";
  const totalMiles = plan.stops.reduce((sum, s) => sum + s.miles, 0);
  const stops = plan.stops
    .map((s) => s.village)
    .slice(0, -1)
    .join(", ");
  return `A ${plan.days}-day Cotswold Way itinerary, ${dir} via ${stops}. Total ${totalMiles.toFixed(0)} miles.`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const row = await fetchPlan(id);
  if (!row) {
    return { title: "Plan not found", robots: { index: false } };
  }
  const { plan } = row;
  const dirLabel = plan.direction === "north_to_south" ? "N→S" : "S→N";
  const title = `${plan.days}-day Cotswold Way itinerary (${dirLabel})`;
  const description = describePlan(plan);
  const canonical = `https://thecotswoldsway.com/plans/${id}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "article" },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true },
  };
}

export default async function SharedPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await fetchPlan(id);
  if (!row) notFound();

  return (
    <>
      <Navbar />
      <SharedPlanView id={id} plan={row.plan} createdAt={row.created_at} />
      <Footer />
    </>
  );
}
