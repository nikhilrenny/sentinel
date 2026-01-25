"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Profile = "svs" | "aaq" | "sms" | "sss" | "tsr";
type Network = "lora" | "mesh";
type NodeStatus = "ok" | "degraded" | "offline";

type Node = {
  nodeId: string;
  profile: Profile;
  networks: Network[];
  status: NodeStatus;

  // Normalized 0..1 for scene plotting
  x: number;
  y: number;

  lastSeenTs?: string; // ISO
  batteryV?: number;
  rssi?: number;
  snr?: number;
  statusFlags?: string[];

  metrics: Record<string, number | undefined>;
};

type LayerToggles = {
  markers: boolean;
  heatmap: boolean;
  links: boolean;
  alerts: boolean;
};

type AggPoint = { t: number; p10: number; p50: number; p90: number; count: number };
type LineSeries = { nodeId: string; points: { t: number; v: number }[] };

const METRIC_PRESETS: Record<Profile, { label: string; key: string }[]> = {
  svs: [
    { label: "accel_rms_g", key: "accel_rms_g" },
    { label: "accel_peak_g", key: "accel_peak_g" },
    { label: "dominant_freq_hz", key: "dominant_freq_hz" },
    { label: "strain_ue", key: "strain_ue" },
    { label: "crack_signal", key: "crack_signal" },
  ],
  aaq: [
    { label: "pm2_5_ugm3", key: "pm2_5_ugm3" },
    { label: "pm10_ugm3", key: "pm10_ugm3" },
    { label: "voc_index", key: "voc_index" },
    { label: "smoke_score", key: "smoke_score" },
    { label: "co2_ppm", key: "co2_ppm" },
  ],
  sms: [
    { label: "pga_g", key: "pga_g" },
    { label: "pqv_mps", key: "pqv_mps" },
    { label: "sa_0_3s_g", key: "sa_0_3s_g" },
    { label: "sa_1_0s_g", key: "sa_1_0s_g" },
    { label: "event_energy_jkg", key: "event_energy_jkg" },
  ],
  sss: [
    { label: "soil_moisture_vwc", key: "soil_moisture_vwc" },
    { label: "soil_temp_c", key: "soil_temp_c" },
    { label: "soil_ec_dsm", key: "soil_ec_dsm" },
    { label: "pore_pressure_kpa", key: "pore_pressure_kpa" },
    { label: "spk_levels", key: "spk_levels" },
  ],
  tsr: [
    { label: "sat_count", key: "sat_count" },
    { label: "gnss_fix_type", key: "gnss_fix_type" },
    { label: "time_uncertainty_ns", key: "time_uncertainty_ns" },
    { label: "clock_offset_ns", key: "clock_offset_ns" },
  ],
};

const NODES: Node[] = [
  {
    nodeId: "svs-01",
    profile: "svs",
    networks: ["mesh"],
    status: "ok",
    x: 0.22,
    y: 0.35,
    lastSeenTs: "2026-01-22T20:10:00.000Z",
    batteryV: 3.92,
    rssi: -78,
    snr: 8.5,
    statusFlags: ["sensor_ok", "calibration_ok"],
    metrics: {
      accel_rms_g: 0.014,
      accel_peak_g: 0.11,
      dominant_freq_hz: 18.2,
      strain_ue: 42,
      crack_signal: 0.02,
    },
  },
  {
    nodeId: "svs-02",
    profile: "svs",
    networks: ["mesh"],
    status: "degraded",
    x: 0.52,
    y: 0.44,
    lastSeenTs: "2026-01-22T20:09:00.000Z",
    batteryV: 3.71,
    rssi: -91,
    snr: 3.2,
    statusFlags: ["sensor_ok", "calibration_ok"],
    metrics: {
      accel_rms_g: 0.026,
      accel_peak_g: 0.22,
      dominant_freq_hz: 16.9,
      strain_ue: 58,
      crack_signal: 0.10,
    },
  },
  {
    nodeId: "svs-03",
    profile: "svs",
    networks: ["mesh"],
    status: "offline",
    x: 0.78,
    y: 0.26,
    lastSeenTs: "2026-01-22T18:40:00.000Z",
    batteryV: 3.64,
    rssi: -110,
    snr: -1.4,
    statusFlags: ["tamper"],
    metrics: {
      accel_rms_g: undefined,
      accel_peak_g: undefined,
      dominant_freq_hz: undefined,
      strain_ue: undefined,
      crack_signal: undefined,
    },
  },
  {
    nodeId: "svs-04",
    profile: "svs",
    networks: ["mesh"],
    status: "ok",
    x: 0.40,
    y: 0.70,
    lastSeenTs: "2026-01-22T20:11:00.000Z",
    batteryV: 3.88,
    rssi: -84,
    snr: 6.0,
    statusFlags: ["sensor_ok"],
    metrics: {
      accel_rms_g: 0.012,
      accel_peak_g: 0.09,
      dominant_freq_hz: 18.6,
      strain_ue: 39,
      crack_signal: 0.01,
    },
  },
];

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function fmtNum(v?: number, digits = 2) {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toFixed(digits);
}

function statusPill(status: NodeStatus) {
  if (status === "ok") return { bg: "#ecfdf5", fg: "#065f46", label: "OK" };
  if (status === "degraded") return { bg: "#fffbeb", fg: "#92400e", label: "Degraded" };
  return { bg: "#f3f4f6", fg: "#374151", label: "Offline" };
}

// Deterministic pseudo-noise in [0,1)
function noise01(key: string, i: number) {
  let h = 2166136261;
  for (let k = 0; k < key.length; k++) {
    h ^= key.charCodeAt(k);
    h = Math.imul(h, 16777619);
  }
  h ^= i + 0x9e3779b9;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return NaN;
  const idx = (sorted.length - 1) * clamp01(p);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const w = idx - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

function buildAggregateSeries(nodes: Node[], metricKey: string): AggPoint[] {
  const N_BUCKETS = 60;
  const baseVals = nodes
    .map((n) => ({ id: n.nodeId, v: n.metrics[metricKey] }))
    .filter((x): x is { id: string; v: number } => typeof x.v === "number" && !Number.isNaN(x.v));

  if (baseVals.length === 0) return [];

  const series: AggPoint[] = [];
  for (let i = 0; i < N_BUCKETS; i++) {
    const valsAtT: number[] = [];
    for (const n of baseVals) {
      const u = noise01(n.id + ":" + metricKey, i);
      const wave = Math.sin((i / N_BUCKETS) * Math.PI * 2 + u * 2.0);
      const jitter = (u - 0.5) * 0.04;
      const scale = 1 + wave * 0.06 + jitter;
      valsAtT.push(n.v * scale);
    }
    valsAtT.sort((a, b) => a - b);
    series.push({
      t: i,
      p10: percentile(valsAtT, 0.10),
      p50: percentile(valsAtT, 0.50),
      p90: percentile(valsAtT, 0.90),
      count: valsAtT.length,
    });
  }
  return series;
}

function buildNodeLine(node: Node, metricKey: string): LineSeries | null {
  const base = node.metrics[metricKey];
  if (typeof base !== "number" || Number.isNaN(base)) return null;

  const N_BUCKETS = 60;
  const pts: { t: number; v: number }[] = [];
  for (let i = 0; i < N_BUCKETS; i++) {
    const u = noise01(node.nodeId + ":" + metricKey, i);
    const wave = Math.sin((i / N_BUCKETS) * Math.PI * 2 + u * 2.0);
    const jitter = (u - 0.5) * 0.03;
    const scale = 1 + wave * 0.05 + jitter;
    pts.push({ t: i, v: base * scale });
  }
  return { nodeId: node.nodeId, points: pts };
}

export default function GatewaySpatialClient({ gatewayId }: { gatewayId: string }) {
  const profile: Profile = "svs";

  const [selectedMetricKey, setSelectedMetricKey] = useState<string>(METRIC_PRESETS[profile][0]?.key ?? "accel_rms_g");
  const [toggles, setToggles] = useState<LayerToggles>({ markers: true, heatmap: false, links: false, alerts: true });

  const [query, setQuery] = useState("");

  // Multi-select set (Mode B overlays)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  // Active node for details view (last clicked)
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  const nodes = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = NODES.filter((n) => n.profile === profile);
    if (!q) return base;
    return base.filter((n) => n.nodeId.toLowerCase().includes(q));
  }, [profile, query]);

  const activeNode = useMemo(() => nodes.find((n) => n.nodeId === activeNodeId) ?? null, [nodes, activeNodeId]);

  const sceneLegend = useMemo(() => {
    const preset = METRIC_PRESETS[profile].find((p) => p.key === selectedMetricKey);
    return preset ? preset.label : selectedMetricKey;
  }, [profile, selectedMetricKey]);

  const agg = useMemo(() => buildAggregateSeries(nodes, selectedMetricKey), [nodes, selectedMetricKey]);

  const overlayLines = useMemo(() => {
    // cap overlay lines to keep it readable (and later, performant)
    const MAX = 8;
    const picked = selectedNodeIds.slice(0, MAX);
    const lines: LineSeries[] = [];
    for (const id of picked) {
      const n = nodes.find((x) => x.nodeId === id);
      if (!n) continue;
      const line = buildNodeLine(n, selectedMetricKey);
      if (line) lines.push(line);
    }
    return lines;
  }, [selectedNodeIds, nodes, selectedMetricKey]);

  function toggleSelectNode(nodeId: string) {
    setActiveNodeId(nodeId);
    setSelectedNodeIds((prev) => {
      if (prev.includes(nodeId)) return prev.filter((x) => x !== nodeId);
      return [nodeId, ...prev]; // newest first
    });
  }

  function clearSelection() {
    setSelectedNodeIds([]);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{gatewayId}</h1>
          <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
            Spatial analytics · Profile <span style={{ fontWeight: 900 }}>{profile.toUpperCase()}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link
            href="/analytics"
            style={{
              textDecoration: "none",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: "9px 12px",
              fontSize: 13,
              fontWeight: 800,
              color: "#111827",
              background: "#fff",
            }}
          >
            Back
          </Link>

          <Link
            href="/analytics/data"
            style={{
              textDecoration: "none",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: "9px 12px",
              fontSize: 13,
              fontWeight: 800,
              color: "#111827",
              background: "#fff",
              whiteSpace: "nowrap",
            }}
          >
            Open raw data
          </Link>
        </div>
      </div>

      {/* Controls row */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: 14,
          background: "#fff",
          display: "grid",
          gridTemplateColumns: "1fr 220px 360px",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Toggle label="Markers" on={toggles.markers} onToggle={() => setToggles((t) => ({ ...t, markers: !t.markers }))} />
          <Toggle label="Heatmap" on={toggles.heatmap} onToggle={() => setToggles((t) => ({ ...t, heatmap: !t.heatmap }))} />
          <Toggle label="Links" on={toggles.links} onToggle={() => setToggles((t) => ({ ...t, links: !t.links }))} />
          <Toggle label="Alerts" on={toggles.alerts} onToggle={() => setToggles((t) => ({ ...t, alerts: !t.alerts }))} />

          <div style={{ marginLeft: 6, fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
            Visualizing: <span style={{ color: "#111827", fontWeight: 900 }}>{sceneLegend}</span>
          </div>
        </div>

        <select
          value={selectedMetricKey}
          onChange={(e) => setSelectedMetricKey(e.target.value)}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: "9px 12px",
            background: "#fff",
            fontSize: 13,
          }}
        >
          {METRIC_PRESETS[profile].map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search nodeId (within this gateway)"
          style={{
            width: "100%",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: "9px 12px",
            outline: "none",
            fontSize: 13,
            background: "#fff",
          }}
        />
      </div>

      {/* Main: left and right */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, alignItems: "start" }}>
        {/* LEFT */}
        <div style={{ display: "grid", gap: 16 }}>
          {/* Scene */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", overflow: "hidden" }}>
            <div style={{ padding: 14, borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 900 }}>Scene</div>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                Placeholder for Topographic Map / 3D Model
              </div>
            </div>

            <div style={{ padding: 14 }}>
              <div
                style={{
                  position: "relative",
                  height: 420,
                  borderRadius: 14,
                  border: "1px solid #f3f4f6",
                  background: "linear-gradient(0deg, rgba(249,250,251,1), rgba(255,255,255,1))",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage:
                      "linear-gradient(to right, rgba(229,231,235,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(229,231,235,0.6) 1px, transparent 1px)",
                    backgroundSize: "48px 48px",
                    pointerEvents: "none",
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    left: 14,
                    top: 14,
                    padding: "8px 10px",
                    borderRadius: 12,
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                    color: "#6b7280",
                    fontWeight: 800,
                  }}
                >
                  Click nodes to select (multi-select). Selection overlays on Aggregate.
                </div>

                {toggles.markers &&
                  nodes.map((n) => (
                    <NodeMarker
                      key={n.nodeId}
                      node={n}
                      metricKey={selectedMetricKey}
                      showAlertRing={toggles.alerts}
                      selected={selectedNodeIds.includes(n.nodeId)}
                      active={activeNodeId === n.nodeId}
                      onClick={() => toggleSelectNode(n.nodeId)}
                    />
                  ))}

                {toggles.heatmap && <LayerBanner text="Heatmap layer (coming soon)" y={60} />}
                {toggles.links && <LayerBanner text="Mesh links layer (coming soon)" y={92} />}
              </div>
            </div>
          </div>

          {/* Aggregate (Mode B) */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", overflow: "hidden" }}>
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
              <div style={{ fontWeight: 900 }}>Aggregate</div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                  {selectedMetricKey} · {agg.length ? `${agg[0].count} nodes` : "no data"} · overlay {overlayLines.length}
                </div>

                <button
                  type="button"
                  onClick={clearSelection}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: "7px 10px",
                    background: "#fff",
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: "pointer",
                    color: "#111827",
                  }}
                  disabled={selectedNodeIds.length === 0}
                  title="Clear selected nodes"
                >
                  Clear selection
                </button>
              </div>
            </div>

            <div style={{ padding: 14 }}>
              {agg.length === 0 ? (
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  No values for <span style={{ fontWeight: 900 }}>{selectedMetricKey}</span> yet.
                </div>
              ) : (
                <AggregateSvg series={agg} overlays={overlayLines} />
              )}

              <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
                Band = P10–P90; line = median. Selected nodes overlay as thin lines (capped to 8).
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: "grid", gap: 16 }}>
          {/* Region summary */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", overflow: "hidden" }}>
            <div style={{ padding: 14, borderBottom: "1px solid #e5e7eb", fontWeight: 900 }}>Region summary</div>
            <div style={{ padding: 14, display: "grid", gap: 10 }}>
              <SmallRow label="Nodes in view" value={`${nodes.length}`} />
              <SmallRow label="Selected metric" value={sceneLegend} />
              <SmallRow label="Selected nodes" value={`${selectedNodeIds.length}`} />
              <SmallRow label="Events" value="Markers + timeline (next)" />
            </div>
          </div>

          {/* Node list */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", overflow: "hidden" }}>
            <div style={{ padding: 14, borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 900 }}>Nodes</span>
              <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>{nodes.length}</span>
            </div>

            <div style={{ padding: 10, display: "grid", gap: 8 }}>
              {nodes.length === 0 ? (
                <div style={{ padding: 10, color: "#6b7280", fontSize: 13 }}>No nodes match your search.</div>
              ) : (
                nodes.map((n) => (
                  <NodeRow
                    key={n.nodeId}
                    node={n}
                    metricKey={selectedMetricKey}
                    selected={selectedNodeIds.includes(n.nodeId)}
                    active={activeNodeId === n.nodeId}
                    onClick={() => toggleSelectNode(n.nodeId)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Node details */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", overflow: "hidden" }}>
            <div style={{ padding: 14, borderBottom: "1px solid #e5e7eb", fontWeight: 900 }}>Node details</div>

            {activeNode ? (
              <div style={{ padding: 14, display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 14, color: "#111827" }}>{activeNode.nodeId}</div>
                    <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
                      Profile {activeNode.profile.toUpperCase()} · Networks {activeNode.networks.join(", ")}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280", fontWeight: 700 }}>
                      Last seen: {activeNode.lastSeenTs ?? "—"}
                    </div>
                  </div>
                  <StatusPill status={activeNode.status} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <MiniStat label="battery_v" value={activeNode.batteryV != null ? `${fmtNum(activeNode.batteryV, 2)} V` : "—"} />
                  <MiniStat
                    label="rssi / snr"
                    value={activeNode.rssi != null && activeNode.snr != null ? `${activeNode.rssi} dBm · ${fmtNum(activeNode.snr, 1)} dB` : "—"}
                  />
                </div>

                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 12 }}>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 900 }}>Selected metric</div>
                  <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900, color: "#111827" }}>
                    {activeNode.metrics[selectedMetricKey] == null ? "—" : String(activeNode.metrics[selectedMetricKey])}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                    This node’s overlay line is shown if selected.
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 12 }}>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 900 }}>Status flags</div>
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {(activeNode.statusFlags?.length ? activeNode.statusFlags : ["—"]).map((f) => (
                      <span
                        key={f}
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          padding: "4px 10px",
                          borderRadius: 999,
                          border: "1px solid #e5e7eb",
                          background: "#f9fafb",
                          color: "#111827",
                        }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: 14, color: "#6b7280", fontSize: 13 }}>
                Click a node to set it active. Click again to add/remove from the selected overlay set.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------
   UI helpers
--------------------------- */

function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 999,
        padding: "7px 10px",
        background: on ? "#111827" : "#fff",
        color: on ? "#fff" : "#111827",
        fontSize: 12,
        fontWeight: 900,
        cursor: "pointer",
      }}
      aria-pressed={on}
    >
      {label}
    </button>
  );
}

function LayerBanner({ text, y }: { text: string; y: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 14,
        top: y,
        padding: "8px 10px",
        borderRadius: 12,
        background: "#fff",
        border: "1px solid #e5e7eb",
        fontSize: 12,
        color: "#6b7280",
        fontWeight: 800,
      }}
    >
      {text}
    </div>
  );
}

function NodeMarker({
  node,
  metricKey,
  showAlertRing,
  selected,
  active,
  onClick,
}: {
  node: Node;
  metricKey: string;
  showAlertRing: boolean;
  selected: boolean;
  active: boolean;
  onClick: () => void;
}) {
  const pill = statusPill(node.status);
  const v = node.metrics[metricKey];

  const fill = node.status === "ok" ? "#10b981" : node.status === "degraded" ? "#f59e0b" : "#9ca3af";
  const left = `${clamp01(node.x) * 100}%`;
  const top = `${clamp01(node.y) * 100}%`;

  const hasAlert = (node.statusFlags ?? []).includes("tamper") || node.status === "degraded";

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${node.nodeId} · ${pill.label} · ${metricKey}: ${v == null ? "—" : String(v)}`}
      style={{
        position: "absolute",
        left,
        top,
        transform: "translate(-50%, -50%)",
        width: active ? 20 : selected ? 18 : 14,
        height: active ? 20 : selected ? 18 : 14,
        borderRadius: 999,
        border: active ? "3px solid #111827" : selected ? "2px solid #111827" : "1px solid rgba(17,24,39,0.25)",
        background: fill,
        cursor: "pointer",
        padding: 0,
      }}
    >
      {showAlertRing && hasAlert ? (
        <span
          style={{
            position: "absolute",
            inset: -8,
            borderRadius: 999,
            border: "2px solid rgba(239,68,68,0.55)",
          }}
        />
      ) : null}
    </button>
  );
}

function NodeRow({
  node,
  metricKey,
  selected,
  active,
  onClick,
}: {
  node: Node;
  metricKey: string;
  selected: boolean;
  active: boolean;
  onClick: () => void;
}) {
  const pill = statusPill(node.status);
  const v = node.metrics[metricKey];

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        border: active ? "2px solid #111827" : "1px solid #f3f4f6",
        borderRadius: 12,
        padding: 10,
        background: selected ? "#f9fafb" : "#fff",
        cursor: "pointer",
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ fontWeight: 900, color: "#111827" }}>
          {node.nodeId} {selected ? <span style={{ color: "#6b7280", fontWeight: 800 }}>(selected)</span> : null}
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 900,
            padding: "4px 10px",
            borderRadius: 999,
            background: pill.bg,
            color: pill.fg,
            border: "1px solid #e5e7eb",
          }}
        >
          {pill.label}
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>
          {node.profile.toUpperCase()} · {node.networks.join(", ")}
        </div>
        <div style={{ fontSize: 12, color: "#111827", fontWeight: 900 }}>
          {metricKey}: {v == null ? "—" : String(v)}
        </div>
      </div>

      <div style={{ fontSize: 12, color: "#6b7280" }}>Last seen: {node.lastSeenTs ?? "—"}</div>
    </button>
  );
}

function StatusPill({ status }: { status: NodeStatus }) {
  const pill = statusPill(status);
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 900,
        padding: "6px 10px",
        borderRadius: 999,
        background: pill.bg,
        color: pill.fg,
        border: "1px solid #e5e7eb",
        whiteSpace: "nowrap",
      }}
    >
      {pill.label}
    </span>
  );
}

function SmallRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 12, color: "#111827", fontWeight: 900, textAlign: "right" }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid #f3f4f6", borderRadius: 12, padding: 10, background: "#fafafa" }}>
      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 900, color: "#111827", marginTop: 4 }}>{value}</div>
    </div>
  );
}

/* ---------------------------
   Mode B Chart (SVG) with overlays
--------------------------- */

function AggregateSvg({ series, overlays }: { series: AggPoint[]; overlays: LineSeries[] }) {
  const W = 820;
  const H = 240;
  const PAD = 14;

  const xs = series.map((d) => d.t);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  const overlayYs = overlays.flatMap((l) => l.points.map((p) => p.v));
  const ys = [...series.flatMap((d) => [d.p10, d.p50, d.p90]), ...overlayYs].filter((v) => Number.isFinite(v));
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanY = maxY - minY || 1;

  const x = (t: number) => PAD + ((t - minX) / (maxX - minX || 1)) * (W - PAD * 2);
  const y = (v: number) => PAD + (1 - (v - minY) / spanY) * (H - PAD * 2);

  const bandPath = (() => {
    const top = series.map((d, i) => `${i === 0 ? "M" : "L"} ${x(d.t)} ${y(d.p90)}`).join(" ");
    const bot = [...series].reverse().map((d) => `L ${x(d.t)} ${y(d.p10)}`).join(" ");
    return `${top} ${bot} Z`;
  })();

  const medianPath = series.map((d, i) => `${i === 0 ? "M" : "L"} ${x(d.t)} ${y(d.p50)}`).join(" ");

  // Deterministic overlay strokes: vary dash pattern per node (no colors needed)
  const overlayPaths = overlays.map((l) => ({
    nodeId: l.nodeId,
    d: l.points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.t)} ${y(p.v)}`).join(" "),
    dash: dashForId(l.nodeId),
  }));

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        <rect x="0" y="0" width={W} height={H} rx="14" fill="#fff" stroke="#e5e7eb" />

        {Array.from({ length: 5 }).map((_, i) => {
          const yy = PAD + (i / 4) * (H - PAD * 2);
          return <line key={i} x1={PAD} y1={yy} x2={W - PAD} y2={yy} stroke="#f3f4f6" />;
        })}

        {/* band */}
        <path d={bandPath} fill="rgba(17,24,39,0.06)" stroke="none" />

        {/* median */}
        <path d={medianPath} fill="none" stroke="#111827" strokeWidth="2.2" />

        {/* overlays */}
        {overlayPaths.map((p) => (
          <path
            key={p.nodeId}
            d={p.d}
            fill="none"
            stroke="#111827"
            strokeWidth="1.4"
            strokeDasharray={p.dash}
            opacity="0.85"
          />
        ))}

        {/* labels */}
        <text x={PAD} y={H - 8} fontSize="11" fill="#6b7280" fontWeight="700">
          time →
        </text>
        <text x={PAD} y={14} fontSize="11" fill="#6b7280" fontWeight="700">
          value
        </text>

        {/* legend */}
        {overlays.length ? (
          <g>
            <text x={W - PAD} y={16} fontSize="11" fill="#6b7280" fontWeight="700" textAnchor="end">
              overlays (selected)
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}

function dashForId(id: string) {
  // Stable dash patterns for distinction without relying on colors
  const u = Math.floor(noise01("dash:" + id, 1) * 4);
  if (u === 0) return "4 3";
  if (u === 1) return "8 3";
  if (u === 2) return "2 2";
  return "10 4 2 4";
}
