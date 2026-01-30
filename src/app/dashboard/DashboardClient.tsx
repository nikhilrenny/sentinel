"use client";

import { useMemo } from "react";
import { GatewayLiveMap } from "@/components/maps/GatewayLiveMap";
import { useTelemetrySource } from "@/lib/data/useTelemetrySource";
import { buildGatewayMapPoints, countRegions, deriveHealthForGateway, isNodeOnline } from "@/lib/data/derive";

export default function DashboardClient() {
  const { enabled, runMode, gateways, nodes, latestByNode, lastUpdatedAt } = useTelemetrySource();

  const nowMs = lastUpdatedAt;

  const { gatewayPoints, gatewaysOnline, nodesOnline, alertsCount, regionsCount } = useMemo(() => {
    const gatewayPoints = buildGatewayMapPoints({ gateways, nodes, latestByNode, nowMs });

    let gatewaysOnline = 0;
    let nodesOnline = 0;
    let alertsCount = 0;

    for (const g of gateways) {
      const s = deriveHealthForGateway({ gateway_id: g.gateway_id, nodes, latestByNode, nowMs });
      if (s.online > 0) gatewaysOnline++;
      nodesOnline += s.online;
      alertsCount += s.alerts;
    }

    return {
      gatewayPoints,
      gatewaysOnline,
      nodesOnline,
      alertsCount,
      regionsCount: countRegions(gateways),
    };
  }, [gateways, nodes, latestByNode, nowMs]);

  const gatewaysTotal = gateways.length;
  const nodesTotal = nodes.length;

  const metrics = [
    { label: "Gateways", value: `${gatewaysOnline}/${gatewaysTotal}`, sub: "online / total" },
    { label: "Nodes", value: `${nodesOnline}/${nodesTotal}`, sub: "online / total" },
    { label: "Alerts", value: String(alertsCount), sub: "active" },
    { label: "Regions", value: String(regionsCount), sub: "monitored" },
  ] as const;

  // recent: last 8 messages by timestamp
  const recent = useMemo(() => {
    const msgs = Object.values(latestByNode).filter(Boolean) as any[];
    msgs.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
    return msgs.slice(0, 8);
  }, [latestByNode]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        {metrics.map((m) => (
          <div
            key={m.label}
            style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#ffffff" }}
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

        <GatewayLiveMap points={gatewayPoints} />

        {!enabled ? (
          <div style={{ padding: 12, fontSize: 13, color: "#6b7280", borderTop: "1px solid #f3f4f6" }}>
            Simulation is off (or Mode is Live). Enable it in <b>Settings → Telemetry & Fleet</b>.
          </div>
        ) : null}
      </div>

      {/* Recent activity */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#fff" }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Recent activity</div>
        {recent.length === 0 ? (
          <div style={{ color: "#6b7280", fontSize: 13 }}>
            {enabled ? "Waiting for first telemetry..." : "No data (simulation disabled)."}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {recent.map((m) => {
              const online = isNodeOnline(m, nowMs);
              return (
                <div
                  key={m.node_id}
                  style={{
                    border: "1px solid #f3f4f6",
                    borderRadius: 12,
                    padding: "10px 12px",
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900 }}>{m.node_id}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                      {m.gateway_id} · {m.profile.toUpperCase()} · {m.networks.join("+")}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 900 }}>{online ? "online" : "stale"}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{m.timestamp}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
