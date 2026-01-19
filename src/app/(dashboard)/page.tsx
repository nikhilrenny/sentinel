"use client";

import { useMemo } from "react";
import { GATEWAYS } from "@/lib/gateways";
import { GatewayLiveMap } from "@/components/GatewayLiveMap";
import { HealthBadge } from "@/components/HealthBadge";
import { useSentinel } from "@/lib/store"; // we wire this next if not present

function isOnline(lastSeenTs: number, now: number, windowMs = 30_000) {
  return now - lastSeenTs <= windowMs;
}

type Health = "green" | "amber" | "red" | "grey";

function healthFromRatio(online: number, total: number): Health {
  if (total === 0) return "grey";
  const r = online / total;
  if (r >= 0.9) return "green";
  if (r >= 0.5) return "amber";
  return "red";
}

export default function OverviewPage() {
  const { nodes, alerts } = useSentinel();
  const now = Date.now();

  const computed = useMemo(() => {
    const gatewayStats = GATEWAYS.map((g) => {
      const expectedTotal = (g.nodes?.lora ?? 0) + (g.nodes?.mesh ?? 0);

      const gatewayNodes = nodes.filter((n) => n.gatewayId === g.id);
      const totalSeen = gatewayNodes.length;

      const onlineSeen = gatewayNodes.filter((n) => isOnline(n.lastSeenTs, now)).length;

      // If a gateway is "historical", you may want health always grey.
      // For now: live gateways use ratio; historical gateways are grey unless you later load DB lastSeen.
      const health: Health = g.mode === "historical"
        ? "grey"
        : healthFromRatio(onlineSeen, Math.max(expectedTotal, totalSeen));

      return {
        gateway: g,
        expectedTotal,
        totalSeen,
        onlineSeen,
        offlineSeen: Math.max(0, Math.max(expectedTotal, totalSeen) - onlineSeen),
        health,
      };
    });

    const gatewaysTotal = GATEWAYS.length;
    const nodesTotalExpected = GATEWAYS.reduce(
      (acc, g) => acc + (g.nodes?.lora ?? 0) + (g.nodes?.mesh ?? 0),
      0
    );

    const nodesOnline = nodes.filter((n) => isOnline(n.lastSeenTs, now)).length;
    const nodesOffline = Math.max(0, nodesTotalExpected - nodesOnline);

    const activeAlerts = alerts.filter((a) => a.severity !== "info" && a.isActive);

    return {
      gatewayStats,
      gatewaysTotal,
      nodesTotalExpected,
      nodesOnline,
      nodesOffline,
      activeAlerts,
    };
  }, [nodes, alerts, now]);

  return (
    <main style={{ background: "white", color: "#111" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Overview</h1>
            <div style={{ marginTop: 6, opacity: 0.7 }}>
              Live: <b>sentinel-gw01</b> · Historical datasets: <b>gw02–gw05</b>
            </div>
          </div>
        </header>

        {/* Summary cards */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <Card label="Gateways" value={computed.gatewaysTotal} />
          <Card label="Nodes (expected)" value={computed.nodesTotalExpected} />
          <Card label="Nodes online (30s)" value={computed.nodesOnline} />
          <Card label="Active alerts" value={computed.activeAlerts.length} />
        </section>

        {/* Map + Alerts */}
        <section style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 12 }}>
          <Panel title="Deployment map">
            <GatewayLiveMap
              points={computed.gatewayStats.map((s) => ({
                id: s.gateway.id,
                label: s.gateway.label,
                name: s.gateway.location?.name ?? s.gateway.id,
                lat: s.gateway.location?.lat ?? 0,
                lon: s.gateway.location?.lon ?? 0,
                health: s.health,
              }))}
            />
          </Panel>

          <Panel title="Alerts">
            {computed.activeAlerts.length === 0 ? (
              <div style={{ padding: 12, opacity: 0.7 }}>No active alerts.</div>
            ) : (
              <div style={{ display: "grid", gap: 10, padding: 12 }}>
                {computed.activeAlerts.slice(0, 8).map((a) => (
                  <div
                    key={a.id}
                    style={{
                      border: "1px solid #e5e5e5",
                      borderRadius: 12,
                      padding: 10,
                      background: "white",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 800 }}>{a.title}</div>
                      <span style={{ opacity: 0.75, fontSize: 12 }}>{a.severity.toUpperCase()}</span>
                    </div>
                    <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>{a.message}</div>
                    <div style={{ marginTop: 6, opacity: 0.6, fontSize: 12 }}>
                      {a.gatewayId} · {a.nodeId ?? "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </section>

        {/* Gateway health table */}
        <section>
          <Panel title="Gateway health">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", background: "#fafafa" }}>
                    {["Gateway", "Mode", "Location", "Nodes", "Online", "Offline", "Health"].map((h) => (
                      <th key={h} style={{ padding: "10px 12px", borderBottom: "1px solid #eee", fontSize: 13 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {computed.gatewayStats.map((s) => (
                    <tr key={s.gateway.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 800 }}>{s.gateway.id}</td>
                      <td style={{ padding: "10px 12px" }}>{s.gateway.mode}</td>
                      <td style={{ padding: "10px 12px" }}>{s.gateway.location?.name ?? "—"}</td>
                      <td style={{ padding: "10px 12px" }}>{s.expectedTotal}</td>
                      <td style={{ padding: "10px 12px" }}>{s.onlineSeen}</td>
                      <td style={{ padding: "10px 12px" }}>{s.offlineSeen}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <HealthBadge health={s.health} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ border: "1px solid #e5e5e5", borderRadius: 14, padding: 14, background: "white" }}>
      <div style={{ opacity: 0.7, fontSize: 13 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 28, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #e5e5e5", borderRadius: 14, background: "white", overflow: "hidden" }}>
      <div style={{ padding: "10px 12px", borderBottom: "1px solid #eee", fontWeight: 900 }}>{title}</div>
      {children}
    </div>
  );
}
