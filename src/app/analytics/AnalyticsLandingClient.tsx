"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type GatewayStatus = "online" | "degraded" | "offline";
type Severity = "info" | "warn" | "crit";

type GatewaySummary = {
  gatewayId: string;
  profile: "svs" | "aaq" | "sms" | "sss" | "tsr";
  status: GatewayStatus;
  lastSeenTs?: string; // ISO; undefined if never seen
  nodeCount: number;

  packetRatePpm?: number; // packets per minute
  lossRatePct?: number; // 0..100
  batteryMedianV?: number;
  rssiMedian?: number;
  snrMedian?: number;
  alertsCount?: number;
};

type EventItem = {
  ts: string; // ISO
  severity: Severity;
  gatewayId: string;
  nodeId?: string;
  type: string;
  summary: string;
};

type Kpis = {
  gatewaysOnline: string; // e.g. "1/3"
  nodesOnline: string; // e.g. "9"
  packetsPerMin: string; // e.g. "133"
  lossRate: string; // e.g. "35.7%"
  activeAlerts: string; // e.g. "3"
  medianBattery: string; // e.g. "3.78 V"
};

function fmtAgo(iso?: string) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(0, Math.floor((now - t) / 1000));

  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function badgeForProfile(p: GatewaySummary["profile"]) {
  return p.toUpperCase();
}

function statusLabel(s: GatewayStatus) {
  if (s === "online") return "Online";
  if (s === "degraded") return "Degraded";
  return "Offline";
}

function severityLabel(sev: Severity) {
  if (sev === "crit") return "Critical";
  if (sev === "warn") return "Warning";
  return "Info";
}

function fmtNum(v?: number) {
  if (v == null || Number.isNaN(v)) return "—";
  return `${Math.round(v)}`;
}

export default function AnalyticsLandingClient() {
  // UI-only: no aggregation/math here. Wire these from your store/API later.
  const gateways: GatewaySummary[] = [];
  const events: EventItem[] = [];

  const kpis: Kpis = {
    gatewaysOnline: "0",
    nodesOnline: "0",
    packetsPerMin: "0",
    lossRate: "0",
    activeAlerts: "0",
    medianBattery: "0",
  };

  // NEW: move search into Gateways header
  const [query, setQuery] = useState("");

  const filteredGateways = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return gateways;
    return gateways.filter((g) => g.gatewayId.toLowerCase().includes(q));
  }, [gateways, query]);

  return (
    // Font parity with Dashboard: explicitly inherit the shell font + color.
    <div
      style={{
        display: "grid",
        gap: 16,
        fontFamily: "inherit",
        color: "inherit",
      }}
    >
      {/* Fleet KPIs (UI only) */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
        <KpiCard label="Gateways online" value={kpis.gatewaysOnline} />
        <KpiCard label="Nodes online" value={kpis.nodesOnline} />
        <KpiCard label="Packets/min" value={kpis.packetsPerMin} />
        <KpiCard label="Loss rate" value={kpis.lossRate} />
        <KpiCard label="Active alerts" value={kpis.activeAlerts} />
        <KpiCard label="Median battery" value={kpis.medianBattery} />
      </div>

      {/* Main body */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, alignItems: "start" }}>
        {/* Gateways table */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", overflow: "hidden" }}>
          {/* Header now contains Search */}
          <div
            style={{
              padding: 14,
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ fontWeight: 900 }}>Gateways</div>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search gatewayId / nodeId"
              style={{
                width: 280,
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "8px 10px",
                outline: "none",
                background: "#fff",
                fontSize: 13,
                fontFamily: "inherit",
                color: "inherit",
              }}
            />
          </div>

          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2.2fr 0.8fr 0.9fr 0.9fr 1fr 1fr 0.8fr 0.8fr",
              gap: 10,
              padding: "10px 14px",
              borderBottom: "1px solid #f3f4f6",
              background: "#fafafa",
              fontSize: 12,
              color: "#6b7280",
              fontWeight: 500,
            }}
          >
            <div>Gateway</div>
            <div>Profile</div>
            <div>Status</div>
            <div>Last seen</div>
            <div>RSSI / SNR</div>
            <div>Battery</div>
            <div>Loss</div>
            <div>Alerts</div>
          </div>

          {/* Rows */}
          <div style={{ display: "grid" }}>
            {filteredGateways.map((g) => (
              <GatewayRow key={g.gatewayId} g={g} />
            ))}

            {filteredGateways.length === 0 ? (
              <div style={{ padding: 14, color: "#6b7280", fontSize: 13 }}>No gateways yet.</div>
            ) : null}
          </div>
        </div>

        {/* Events */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", overflow: "hidden" }}>
          <div
            style={{
              padding: 14,
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              fontWeight: 900,
            }}
          >
            <span>Recent events</span>
            <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>{events.length}</span>
          </div>

          <div style={{ padding: 8 }}>
            {events.length === 0 ? (
              <div style={{ padding: 10, color: "#6b7280", fontSize: 13 }}>No events.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {events.map((e, idx) => (
                  <EventRow key={idx} e={e} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard(props: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        background: "#fff",
        padding: 14,
        minHeight: 72,
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>{props.label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: "#111827" }}>{props.value}</div>
    </div>
  );
}

function GatewayRow({ g }: { g: GatewaySummary }) {
  const pillBg = g.status === "online" ? "#ecfdf5" : g.status === "degraded" ? "#fffbeb" : "#f3f4f6";
  const pillText = g.status === "online" ? "#065f46" : g.status === "degraded" ? "#92400e" : "#374151";

  const rssiSnr =
    g.rssiMedian != null && g.snrMedian != null ? `${g.rssiMedian} dBm · ${g.snrMedian.toFixed(1)} dB` : "—";

  const battery = g.batteryMedianV != null ? `${g.batteryMedianV.toFixed(2)} V` : "—";
  const loss = g.lossRatePct != null ? `${g.lossRatePct.toFixed(1)}%` : "—";
  const alerts = g.alertsCount != null ? String(g.alertsCount) : "—";

  return (
    <Link href={`/analytics/gateway/${encodeURIComponent(g.gatewayId)}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2.2fr 0.8fr 0.9fr 0.9fr 1fr 1fr 0.8fr 0.8fr",
          gap: 10,
          padding: "12px 14px",
          borderBottom: "1px solid #f3f4f6",
          cursor: "pointer",
          alignItems: "center",
          background: "#fff",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = "#fafafa";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = "#fff";
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 900, color: "#111827" }}>{g.gatewayId}</div>
          <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>
            {g.nodeCount} nodes · {fmtNum(g.packetRatePpm)} pkt/min
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 900, color: "#111827" }}>{badgeForProfile(g.profile)}</div>

        <div
          style={{
            justifySelf: "start",
            fontSize: 12,
            fontWeight: 900,
            padding: "4px 10px",
            borderRadius: 999,
            background: pillBg,
            color: pillText,
            border: "1px solid #e5e7eb",
            width: "fit-content",
          }}
        >
          {statusLabel(g.status)}
        </div>

        <div style={{ fontSize: 12, color: "#111827", fontWeight: 800 }}>{fmtAgo(g.lastSeenTs)}</div>
        <div style={{ fontSize: 12, color: "#111827", fontWeight: 800 }}>{rssiSnr}</div>
        <div style={{ fontSize: 12, color: "#111827", fontWeight: 800 }}>{battery}</div>
        <div style={{ fontSize: 12, color: "#111827", fontWeight: 800 }}>{loss}</div>
        <div style={{ fontSize: 12, color: "#111827", fontWeight: 900 }}>{alerts}</div>
      </div>
    </Link>
  );
}

function EventRow({ e }: { e: EventItem }) {
  const dot = e.severity === "crit" ? "#ef4444" : e.severity === "warn" ? "#f59e0b" : "#3b82f6";

  return (
    <Link
      href={`/analytics/gateway/${encodeURIComponent(e.gatewayId)}`}
      style={{ textDecoration: "none", color: "inherit" }}
      title="Open gateway analytics"
    >
      <div
        style={{
          border: "1px solid #f3f4f6",
          borderRadius: 12,
          padding: 10,
          display: "grid",
          gap: 6,
          background: "#fff",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: dot, display: "inline-block" }} />
            <div style={{ fontSize: 12, fontWeight: 900, color: "#111827" }}>{e.type}</div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>{severityLabel(e.severity)}</div>
          </div>

          <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>{fmtAgo(e.ts)}</div>
        </div>

        <div style={{ fontSize: 12, color: "#111827", fontWeight: 800 }}>
          {e.gatewayId}
          {e.nodeId ? <span style={{ color: "#6b7280", fontWeight: 800 }}> · {e.nodeId}</span> : null}
        </div>

        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, lineHeight: 1.3 }}>{e.summary}</div>
      </div>
    </Link>
  );
}
