"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTelemetrySource } from "@/lib/data/useTelemetrySource";
import { deriveHealthForGateway } from "@/lib/data/derive";
import type { Profile } from "@/lib/demo/types";

const PROFILES: Profile[] = ["svs", "aaq", "sms", "sss", "tsr"];

export default function AnalyticsLandingClient() {
  const { enabled, gateways, nodes, latestByNode, lastUpdatedAt } = useTelemetrySource();
  const nowMs = lastUpdatedAt;

  const profileCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of PROFILES) c[p] = 0;
    for (const n of nodes) c[n.profile] = (c[n.profile] ?? 0) + 1;
    return c as Record<Profile, number>;
  }, [nodes]);

  const gatewayCards = useMemo(() => {
    return gateways.map((g) => {
      const s = deriveHealthForGateway({ gateway_id: g.gateway_id, nodes, latestByNode, nowMs });
      return {
        gateway_id: g.gateway_id,
        name: g.display_name,
        region: g.region,
        backhaul: g.backhaul,
        health: s.health,
        online: s.online,
        total: s.total,
        alerts: s.alerts,
      };
    });
  }, [gateways, nodes, latestByNode, nowMs]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>Analytics</h1>
        <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
          {enabled ? (
            <>Multi-gateway demo dataset. Drill into a gateway’s spatial view and raw telemetry.</>
          ) : (
            <>No data (simulation disabled). Enable it in <b>Settings → Telemetry & Fleet</b>.</>
          )}
        </div>
      </div>

      {/* High-level distribution */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12 }}>
        {PROFILES.map((p) => (
          <div key={p} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#fff" }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{p.toUpperCase()}</div>
            <div style={{ marginTop: 8, fontSize: 20, fontWeight: 900 }}>{profileCounts[p]}</div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>nodes</div>
          </div>
        ))}
      </div>

      {/* Gateway list */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
        <div style={{ padding: "10px 12px", borderBottom: "1px solid #f3f4f6", fontWeight: 900 }}>Gateways</div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {"Gateway,Region,Backhaul,Health,Nodes online,Alerts,Views".split(",").map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #f3f4f6" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gatewayCards.map((g) => (
                <tr key={g.gateway_id}>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb", fontWeight: 900 }}>{g.gateway_id}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>{g.region}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>{g.backhaul.toUpperCase()}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>{g.health}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>
                    {g.online}/{g.total}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>{g.alerts}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <Link href={`/analytics/gateway/${g.gateway_id}`} style={{ fontWeight: 900, textDecoration: "underline" }}>
                        Spatial
                      </Link>
                      <Link href={`/analytics/data?gateway=${encodeURIComponent(g.gateway_id)}`} style={{ fontWeight: 900, textDecoration: "underline" }}>
                        Raw
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {gatewayCards.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 14, color: "#6b7280" }}>
                    No gateways.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
