"use client";

import { useEffect, useMemo, useState } from "react";
import type { NodeSummary, TelemetryMessage } from "@/lib/types";
import { generateSimMessage } from "@/lib/simulate";

function makeKey(gatewayId: string, nodeType: string, nodeId: string) {
  return `${gatewayId}:${nodeType}:${nodeId}`;
}

function fmtTs(ts: number) {
  return new Date(ts).toLocaleString();
}

function isOnline(lastSeenTs: number, now: number, windowMs = 30_000) {
  return now - lastSeenTs <= windowMs;
}

export default function Page() {
  // UI controls
  const [mode, setMode] = useState<"sim" | "off">("sim");
  const [rateMs, setRateMs] = useState(1000);

  // data buffer
  const [messages, setMessages] = useState<TelemetryMessage[]>([]);

  // simulator loop
  useEffect(() => {
    if (mode !== "sim") return;

    const t = setInterval(() => {
      setMessages((prev) => {
        const next = [generateSimMessage(), ...prev];
        return next.slice(0, 500);
      });
    }, rateMs);

    return () => clearInterval(t);
  }, [mode, rateMs]);

  const now = Date.now();

  const nodes: NodeSummary[] = useMemo(() => {
    const map = new Map<string, NodeSummary>();

    for (const m of messages) {
      const k = makeKey(m.gatewayId, m.nodeType, m.nodeId);
      if (!map.has(k)) {
        map.set(k, {
          key: k,
          gatewayId: m.gatewayId,
          nodeType: m.nodeType,
          nodeId: m.nodeId,
          lastSeenTs: m.ts,
          lastTopic: m.topic,
          metrics: m.metrics,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.key.localeCompare(b.key)
    );
  }, [messages]);

  const summary = useMemo(() => {
    const gateways = new Set(nodes.map((n) => n.gatewayId));
    const onlineNodes = nodes.filter((n) => isOnline(n.lastSeenTs, now)).length;
    return {
      gateways: gateways.size,
      nodes: nodes.length,
      onlineNodes,
      messages: messages.length,
      lastUpdate: messages[0]?.ts ?? null,
    };
  }, [nodes, messages, now]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "white",
        color: "#111",
        padding: 24,
        fontFamily: "system-ui",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>
            Sentinel Dashboard
          </h1>
          <div style={{ opacity: 0.7, marginTop: 6 }}>
            Mode: <b>{mode === "sim" ? "Simulator" : "Off"}</b>
            {summary.lastUpdate ? (
              <>
                {" "}
                · Last update: <b>{fmtTs(summary.lastUpdate)}</b>
              </>
            ) : null}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setMode((m) => (m === "sim" ? "off" : "sim"))}
            style={{
              border: "1px solid #ddd",
              background: "white",
              padding: "8px 12px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {mode === "sim" ? "Pause feed" : "Resume feed"}
          </button>

          <button
            onClick={() => setMessages([])}
            style={{
              border: "1px solid #ddd",
              background: "white",
              padding: "8px 12px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Clear
          </button>

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ opacity: 0.75, fontSize: 13 }}>Rate</span>
            <select
              value={rateMs}
              onChange={(e) => setRateMs(Number(e.target.value))}
              style={{
                border: "1px solid #ddd",
                borderRadius: 10,
                padding: "8px 10px",
                background: "white",
              }}
            >
              <option value={250}>250ms</option>
              <option value={500}>500ms</option>
              <option value={1000}>1s</option>
              <option value={2000}>2s</option>
            </select>
          </label>
        </div>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {[
          { label: "Gateways", value: summary.gateways },
          { label: "Nodes", value: summary.nodes },
          { label: "Nodes online (30s)", value: summary.onlineNodes },
          { label: "Messages buffered", value: summary.messages },
        ].map((c) => (
          <div
            key={c.label}
            style={{
              border: "1px solid #e5e5e5",
              borderRadius: 14,
              padding: 14,
              background: "white",
            }}
          >
            <div style={{ opacity: 0.7, fontSize: 13 }}>{c.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      {/* Nodes table */}
      <div
        style={{
          border: "1px solid #e5e5e5",
          borderRadius: 14,
          overflow: "hidden",
          background: "white",
        }}
      >
        <div
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid #eee",
            fontWeight: 700,
          }}
        >
          Nodes
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa", textAlign: "left" }}>
                {["Status", "Gateway", "Type", "Node", "Last seen", "Metrics"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 14px",
                        fontSize: 13,
                        borderBottom: "1px solid #eee",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {nodes.map((n) => {
                const online = isOnline(n.lastSeenTs, now);
                return (
                  <tr key={n.key} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "4px 10px",
                          borderRadius: 999,
                          border: "1px solid #e5e5e5",
                          background: "white",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: online ? "#16a34a" : "#9ca3af",
                            display: "inline-block",
                          }}
                        />
                        {online ? "ONLINE" : "OFFLINE"}
                      </span>
                    </td>

                    <td style={{ padding: "10px 14px" }}>{n.gatewayId}</td>
                    <td style={{ padding: "10px 14px" }}>{n.nodeType}</td>
                    <td style={{ padding: "10px 14px" }}>{n.nodeId}</td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      {fmtTs(n.lastSeenTs)}
                      <div style={{ opacity: 0.6, fontSize: 12, marginTop: 4 }}>
                        {n.lastTopic}
                      </div>
                    </td>

                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {Object.entries(n.metrics)
                          .filter(([, v]) => v !== undefined)
                          .map(([k, v]) => (
                            <span
                              key={k}
                              style={{
                                border: "1px solid #e5e5e5",
                                borderRadius: 999,
                                padding: "4px 10px",
                                fontSize: 12,
                                background: "white",
                              }}
                            >
                              {k}: <b>{String(v)}</b>
                            </span>
                          ))}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {nodes.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 14, opacity: 0.7 }}>
                    No data yet. If simulator is on, wait 1–2 seconds.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw feed */}
      <div
        style={{
          marginTop: 16,
          border: "1px solid #e5e5e5",
          borderRadius: 14,
          overflow: "hidden",
          background: "white",
        }}
      >
        <div
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid #eee",
            fontWeight: 700,
          }}
        >
          Raw messages (latest first)
        </div>
        <div style={{ maxHeight: 320, overflow: "auto", padding: 14 }}>
          <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>
            {messages.map((m) => JSON.stringify(m)).join("\n")}
          </pre>
        </div>
      </div>
    </main>
  );
}
