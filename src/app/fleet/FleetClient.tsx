"use client";

import { useMemo, useState } from "react";
import { useTelemetrySource } from "@/lib/data/useTelemetrySource";
import { isNodeOnline } from "@/lib/data/derive";
import type { Profile, Network } from "@/lib/demo/types";

const PROFILES: Profile[] = ["svs", "aaq", "sms", "sss", "tsr"];

export default function FleetClient() {
  const { enabled, gateways, nodes, latestByNode, lastUpdatedAt } = useTelemetrySource();
  const nowMs = lastUpdatedAt;

  const [q, setQ] = useState("");
  const [profile, setProfile] = useState<Profile | "all">("all");
  const [network, setNetwork] = useState<Network | "all">("all");
  const [gateway, setGateway] = useState<string | "all">("all");

  const gatewayIds = useMemo(() => gateways.map((g) => g.gateway_id), [gateways]);

  const rows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return nodes
      .filter((n) => (profile === "all" ? true : n.profile === profile))
      .filter((n) => (network === "all" ? true : n.networks.includes(network)))
      .filter((n) => (gateway === "all" ? true : n.gateway_id === gateway))
      .filter((n) => (!qq ? true : `${n.node_id} ${n.display_name} ${n.gateway_id}`.toLowerCase().includes(qq)))
      .map((n) => {
        const m = latestByNode[n.node_id];
        const online = isNodeOnline(m, nowMs);
        const battery = m ? `${m.battery_v.toFixed(2)} V` : "—";
        const links = m
          ? [
              m.links.lora ? `LoRa ${m.links.lora.rssi_dbm} dBm / ${m.links.lora.snr_db} dB` : null,
              m.links.mesh ? `Mesh ${m.links.mesh.rssi_dbm} dBm / LQI ${m.links.mesh.lqi}` : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : "—";
        return {
          node_id: n.node_id,
          name: n.display_name,
          gateway_id: n.gateway_id,
          profile: n.profile,
          role: n.role,
          networks: n.networks.join("+"),
          online,
          last: m?.timestamp ?? "—",
          battery,
          links,
        };
      });
  }, [nodes, latestByNode, nowMs, q, profile, network, gateway]);

  const onlineCount = rows.filter((r) => r.online).length;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>Fleet</h1>
        <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
          {enabled ? (
            <>
              Showing <b>{rows.length}</b> nodes ({onlineCount} online) across <b>{gateways.length}</b> gateways.
            </>
          ) : (
            <>No data (simulation disabled). Enable it in <b>Settings → Telemetry & Fleet</b>.</>
          )}
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: 12,
          background: "#fff",
          display: "grid",
          gridTemplateColumns: "1.2fr 0.7fr 0.7fr 0.8fr",
          gap: 10,
          alignItems: "center",
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search node_id, name, gateway…"
          style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
        />

        <select
          value={profile}
          onChange={(e) => setProfile(e.target.value as any)}
          style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
        >
          <option value="all">All profiles</option>
          {PROFILES.map((p) => (
            <option key={p} value={p}>
              {p.toUpperCase()}
            </option>
          ))}
        </select>

        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value as any)}
          style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
        >
          <option value="all">All networks</option>
          <option value="mesh">Mesh</option>
          <option value="lora">LoRa</option>
        </select>

        <select
          value={gateway}
          onChange={(e) => setGateway(e.target.value)}
          style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}
        >
          <option value="all">All gateways</option>
          {gatewayIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
        <div style={{ padding: "10px 12px", borderBottom: "1px solid #f3f4f6", fontWeight: 900 }}>
          Nodes
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {[
                  "Node",
                  "Profile",
                  "Role",
                  "Networks",
                  "Gateway",
                  "Online",
                  "Battery",
                  "Link",
                  "Last seen",
                ].map((h) => (
                  <th
                    key={h}
                    style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #f3f4f6" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.node_id}>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb", fontWeight: 900 }}>
                    {r.node_id}
                    <div style={{ fontWeight: 400, color: "#6b7280", fontSize: 12 }}>{r.name}</div>
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>{r.profile.toUpperCase()}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>{r.role}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>{r.networks}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>{r.gateway_id}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>
                    <span style={{ fontWeight: 900 }}>{r.online ? "yes" : "no"}</span>
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>{r.battery}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb" }}>{r.links}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #f9fafb", color: "#6b7280" }}>{r.last}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 14, color: "#6b7280" }}>
                    No matching nodes.
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
