"use client";

import { useMemo } from "react";
import { useTelemetrySource } from "@/lib/data/useTelemetrySource";
import { isNodeOnline } from "@/lib/data/derive";

type AlertRow = {
  severity: "Critical" | "Warning" | "Info";
  title: string;
  device: string;
  time: string;
};

export default function AlertsClient() {
  const { enabled, nodes, latestByNode, lastUpdatedAt } = useTelemetrySource();
  const nowMs = lastUpdatedAt;

  const { rows, counts } = useMemo(() => {
    const rows: AlertRow[] = [];
    let critical = 0;
    let warning = 0;

    // Offline detection (stale / missing)
    for (const n of nodes) {
      const m = latestByNode[n.node_id];
      const online = isNodeOnline(m, nowMs);
      if (!online) {
        warning++;
        rows.push({
          severity: "Warning",
          title: "Node offline / stale telemetry",
          device: `${n.node_id} (${n.gateway_id})`,
          time: m?.timestamp ?? "—",
        });
      }
    }

    // Flag-based alerts (from latest message)
    for (const m of Object.values(latestByNode)) {
      if (!m) continue;
      const f = m.status_flags;
      const node = `${m.node_id} (${m.gateway_id})`;

      const add = (severity: AlertRow["severity"], title: string) => {
        if (severity === "Critical") critical++;
        else if (severity === "Warning") warning++;
        rows.push({ severity, title, device: node, time: m.timestamp });
      };

      if (f & (1 << 1)) add("Warning", "Low battery");
      if (f & (1 << 3)) add("Critical", "Sensor fault");
      if (f & (1 << 5)) add("Warning", "Tamper detected");
      if (f & (1 << 4)) add("Info", "Time unsynchronised");
      if (f & (1 << 6)) add("Info", "Link degraded");
      if (f & (1 << 7)) add("Info", "Memory low");

      // Profile-specific
      if (m.profile === "sms" && (m.payload as any)?.triggered) add("Critical", "Strong-motion trigger");
    }

    // Sort newest first
    rows.sort((a, b) => Date.parse(b.time) - Date.parse(a.time));

    return {
      rows: rows.slice(0, 200),
      counts: {
        active: critical + warning,
        critical,
        warning,
      },
    };
  }, [nodes, latestByNode, nowMs]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>Alerts</h1>
        <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
          {enabled ? (
            <>Derived in real-time from node flags and telemetry freshness.</>
          ) : (
            <>No data (simulation disabled). Enable it in <b>Settings → Telemetry & Fleet</b>.</>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        {
          [
            { label: "Active alerts", value: String(counts.active) },
            { label: "Critical", value: String(counts.critical) },
            { label: "Warnings", value: String(counts.warning) },
            { label: "Nodes", value: String(nodes.length) },
          ]
        .map((m) => (
          <div
            key={m.label}
            style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#fff" }}
          >
            <div style={{ fontSize: 12, color: "#6b7280" }}>{m.label}</div>
            <div style={{ marginTop: 8, fontSize: 20, fontWeight: 900 }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", overflow: "hidden" }}>
        <div style={{ padding: 14, borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ fontWeight: 800 }}>Alert feed</div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
            Offline = no fresh telemetry; severity is derived from status_flags and profile-specific triggers.
          </div>
        </div>

        <div style={{ padding: 14 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "0.6fr 1.2fr 1fr 1fr",
              gap: 10,
              fontSize: 12,
              color: "#6b7280",
              paddingBottom: 10,
            }}
          >
            <div>Severity</div>
            <div>Title</div>
            <div>Device</div>
            <div>Time</div>
          </div>

          {rows.length === 0 ? (
            <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 12, color: "#6b7280", fontSize: 13 }}>
              {enabled ? "No alerts right now." : "No data."}
            </div>
          ) : (
            <div style={{ borderTop: "1px solid #f3f4f6" }}>
              {rows.map((r, i) => (
                <div
                  key={`${r.device}-${r.title}-${i}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "0.6fr 1.2fr 1fr 1fr",
                    gap: 10,
                    padding: "10px 0",
                    borderBottom: "1px solid #f9fafb",
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{r.severity}</div>
                  <div>{r.title}</div>
                  <div style={{ color: "#6b7280" }}>{r.device}</div>
                  <div style={{ color: "#6b7280" }}>{r.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
