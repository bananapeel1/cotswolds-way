"use client";

import { useUnits } from "@/contexts/UnitContext";

export default function TrailTotal() {
  const { trailTotal } = useUnits();
  return <>{trailTotal}</>;
}
