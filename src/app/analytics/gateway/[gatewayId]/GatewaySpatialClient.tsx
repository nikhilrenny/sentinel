"use client";

import Link from "next/link";
import { useMemo } from "react";
import { GatewayLiveMap, type GatewayMapPoint } from "@/components/maps/GatewayLiveMap";
import { useTelemetrySource } from "@/lib/data/useTelemetrySource";
import { isNodeOnline } from "@/lib/data/derive";

export default function GatewaySpatialClient({ gatewayId }: { gatewayId: string }) {
  const { enabled, gateways, nodes, latestByNode, lastUpdatedAt } = useTelemetrySource();
  const nowMs = lastUpdatedAt;

  const gw = gateways.find((g) => g.gateway_id === gatewayId);

  const { points, rows } = useMemo(() => {
    const mine = nodes.filter((n) => n.gateway_id === gatewayId);
    const points: GatewayMapPoint[] = mine
      .map((n) => {
        const m = latestByNode[n.node_id];
        const online = isNodeOnline(m, nowMs);
        const alert = m ? (m.status_flags & ((1 << 1) | (1 << 3) | (1 << 5))) !== 0 : false;
        const degraded = m ? (m.status_flags & (1 << 6)) !== 0 : false;
        const health = !online ? "grey" : alert ? "red" : degraded ? "amber" : "green";
        return {
          id: n.node_id,
          name: n.display_name,
          label: `${n.profile.toUpperCase()} · ${n.networks.join("+")}`,
          lat: n.location?.lat ?? 0,
          lon: n.location?.lon ?? 0,
          health,
        } as GatewayMapPoint;
      })
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));

    const rows = mine.map((n) => {
      const m = latestByNode[n.node_id];
      const online = isNodeOnline(m, nowMs);
      return {
        node_id: n.node_id,
        profile: n.profile,
        networks: n.networks.join("+"),
        online,
        battery: m ? `${m.battery_v.toFixed(2)} V` : "—",
        last: m?.timestamp ?? "—",
      };
    });
    rows.sort((a, b) => (a.online === b.online ? 0 : a.online ? -1 : 1));

    return { points, rows };
  }, [nodes, latestByNode, gatewayId, nowMs]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>{gatewayId}</h1>
        <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
          {gw ? (
            <>
              {gw.region} · backhaul {gw.backhaul.toUpperCase()} · {rows.length} nodes
            </>
          ) : (
            <>Gateway not found.</>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Link href="/analytics" style={{ fontWeight: 900, textDecoration: "underline" }}>
          ← Analytics
        </Link>
        <Link href={`/analytics/data?gateway=${encodeURIComponent(gatewayId)}`} style={{ fontWeight: 900, textDecoration: "underline" }}>
          Raw data
        </Link>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", overflow: "hidden" }}>
        <div style={{ padding: "10px 12px", borderBottom: "1px solid #eee", fontWeight: 900 }}>
          Spatial view
        </div>
        <GatewayLiveMap points={points} />
        {!enabled ? (
          <div style={{ padding: 12, fontSize: 13, color: "#6b7280", borderTop: "1px solid #f3f4f6" }}>
            Simulation is off. Enable it in <b>Settings → Telemetry & Fleet</b>.
          </div>
        ) : null}
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
        <div style={{ padding: "10px 12px", borderBottom: "1px solid #f3f4f6", fontWeight: 900 }}>Nodes</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {"Node,Profile,Networks,Online,Battery,Last seen".split(",").map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #f3f4f6" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.node_id}>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb", fontWeight: 900 }}>{r.node_id}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>{r.profile.toUpperCase()}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>{r.networks}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>{r.online ? "yes" : "no"}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>{r.battery}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb", color: "#6b7280" }}>{r.last}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 14, color: "#6b7280" }}>
                    No nodes.
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
