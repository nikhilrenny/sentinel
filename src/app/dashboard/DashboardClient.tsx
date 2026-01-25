"use client";

import { GatewayLiveMap } from "@/components/maps/GatewayLiveMap";

export default function DashboardClient() {
  // Placeholder values
  const gatewaysOnline = 0;
  const gatewaysTotal = 0;
  const nodesOnline = 0;
  const nodesTotal = 0;
  const alertsCount = 0;
  const regionsCount = 0;

  const metrics = [
    { label: "Gateways", value: `${gatewaysOnline}/${gatewaysTotal}`, sub: "online / total" },
    { label: "Nodes", value: `${nodesOnline}/${nodesTotal}`, sub: "online / total" },
    { label: "Alerts", value: String(alertsCount), sub: "active" },
    { label: "Regions", value: String(regionsCount), sub: "monitored" },
  ] as const;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        {metrics.map((m) => (
          <div
            key={m.label}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 14,
              background: "#ffffff",
            }}
          >
            <div style={{ fontSize: 12, color: "#6b7280" }}>{m.label}</div>
            <div style={{ marginTop: 8, fontSize: 20, fontWeight: 900 }}>{m.value}</div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Deployment map */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", overflow: "hidden" }}>
        <div style={{ padding: "10px 12px", borderBottom: "1px solid #eee", fontWeight: 900 }}>
          Deployment map
        </div>

        <GatewayLiveMap
          points={[

          ]}
        />
      </div>

      {/* Recent activity */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: 14,
          background: "#fff",
          minHeight: 240,
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Recent activity</div>
        <div style={{ color: "#6b7280", fontSize: 13 }}>No data yet.</div>
      </div>
    </div>
  );
}
