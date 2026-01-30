"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTelemetrySource } from "@/lib/data/useTelemetrySource";
import { isNodeOnline } from "@/lib/data/derive";
import { useAppSettings } from "@/lib/appSettings";

export default function DataClient() {
  const params = useSearchParams();
  const gatewayFilter = params.get("gateway");

  const { enabled, nodes, latestByNode, lastUpdatedAt } = useTelemetrySource();
  const { rawTelemetry } = useAppSettings();
  const nowMs = lastUpdatedAt;

  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const out = nodes
      .filter((n) => (gatewayFilter ? n.gateway_id === gatewayFilter : true))
      .map((n) => {
        const m = latestByNode[n.node_id];
        const online = isNodeOnline(m, nowMs);
        return {
          node_id: n.node_id,
          gateway_id: n.gateway_id,
          profile: n.profile,
          networks: n.networks.join("+"),
          online,
          timestamp: m?.timestamp ?? "—",
          battery_v: m ? m.battery_v : null,
          rssi: m?.links.lora ? m.links.lora.rssi_dbm : m?.links.mesh ? m.links.mesh.rssi_dbm : null,
          snr: m?.links.lora ? m.links.lora.snr_db : null,
          status_flags: m ? m.status_flags : null,
          payload: m ? m.payload : null,
          raw: m ?? null,
        };
      });

    const filtered = out.filter((r) => {
      if (!qq) return true;
      return `${r.node_id} ${r.gateway_id} ${r.profile}`.toLowerCase().includes(qq);
    });

    filtered.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
    return filtered.slice(0, 200);
  }, [nodes, latestByNode, nowMs, q, gatewayFilter]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>Raw data</h1>
        <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
          {enabled ? (
            <>
              Latest telemetry snapshots (not historical). Showing up to <b>{rows.length}</b> rows.
              {gatewayFilter ? (
                <>
                  {" "}Filtered to <b>{gatewayFilter}</b>.
                </>
              ) : null}
            </>
          ) : (
            <>No data (simulation disabled). Enable it in <b>Settings → Telemetry & Fleet</b>.</>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search node_id / gateway / profile…"
          style={{ flex: 1, padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
        />
        <div style={{ fontSize: 12, color: "#6b7280" }}>{rawTelemetry ? "Raw JSON enabled" : "Raw JSON disabled"}</div>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
        <div style={{ padding: "10px 12px", borderBottom: "1px solid #f3f4f6", fontWeight: 900 }}>Telemetry</div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {[
                  "Timestamp",
                  "Node",
                  "Gateway",
                  "Profile",
                  "Networks",
                  "Online",
                  "Battery",
                  "RSSI",
                  "SNR",
                  "Flags",
                  rawTelemetry ? "Payload" : "",
                ]
                  .filter(Boolean)
                  .map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #f3f4f6" }}>
                      {h}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.node_id}>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb", color: "#6b7280" }}>{r.timestamp}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb", fontWeight: 900 }}>{r.node_id}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>{r.gateway_id}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>{r.profile.toUpperCase()}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>{r.networks}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>{r.online ? "yes" : "no"}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>
                    {r.battery_v == null ? "—" : `${r.battery_v.toFixed(2)} V`}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>{r.rssi == null ? "—" : r.rssi}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>{r.snr == null ? "—" : r.snr}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>{r.status_flags == null ? "—" : r.status_flags}</td>
                  {rawTelemetry ? (
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb", fontFamily: "ui-monospace, SFMono-Regular" }}>
                      {r.raw ? JSON.stringify(r.raw.payload) : "—"}
                    </td>
                  ) : null}
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={rawTelemetry ? 11 : 10} style={{ padding: 14, color: "#6b7280" }}>
                    No rows.
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
