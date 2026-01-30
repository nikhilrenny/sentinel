import { Suspense } from "react";
import DataClient from "./DataClient";

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 16, color: "#6b7280", fontSize: 13 }}>Loading…</div>}>
      <DataClient />
    </Suspense>
  );
}
