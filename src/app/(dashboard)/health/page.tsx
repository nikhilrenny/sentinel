"use client";

import { useEffect, useMemo, useState } from "react";

type Node = {
  node_id: string;
  gw_id: string;
  status: "online" | "offline";
  last_seen: number;
  rssi: number;
  snr: number;
  vbat_v: number;
};

type Gateway = { gw_id: string; status: "online" | "offline" };

type Settings = { lowBatteryVolts: number; heartbeatMissingMinutes: number };

type Snapshot = { type: "snapshot"; nodes: Node[]; gateways: Gateway[]; settings: Settings };

function bandLastSeen(ms: number) {
  if (ms <= 60_000) return "≤1m";
  if (ms <= 5 * 60_000) return "1–5m";
  if (ms <= 15 * 60_000) return "5–15m";
  return ">15m";
}

function bandBattery(v: number) {
  if (v >= 4.0) return "≥4.0V";
  if (v >= 3.8) return "3.8–4.0V";
  if (v >= 3.6) return "3.6–3.8V";
  return "<3.6V";
}

function bandRssi(r: number) {
  if (r > -70) return ">-70 dBm";
  if (r > -90) return "-70 to -90 dBm";
  return "<-90 dBm";
}

export default function HealthPage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.onmessage = (ev) => {
      const msg = JSON.parse(ev.data) as Snapshot;
      if (msg?.type === "snapshot") {
        setNodes(msg.nodes);
        setGateways(msg.gateways);
        setSettings(msg.settings);
      }
    };
    return () => es.close();
  }, []);

  const now = Date.now();

  const summary = useMemo(() => {
    const online = nodes.filter((n) => n.status === "online");
    const offline = nodes.filter((n) => n.status !== "online");
    return { online: online.length, offline: offline.length, total: nodes.length };
  }, [nodes]);

  const lastSeenBands = useMemo(() => {
    const out: Record<string, number> = {};
    for (const n of nodes) {
      const age = Math.max(0, now - n.last_seen);
      const b = bandLastSeen(age);
      out[b] = (out[b] ?? 0) + 1;
    }
    return out;
  }, [nodes, now]);

  const batteryBands = useMemo(() => {
    const out: Record<string, number> = {};
    for (const n of nodes) {
      const b = bandBattery(n.vbat_v);
      out[b] = (out[b] ?? 0) + 1;
    }
    return out;
  }, [nodes]);

  const rssiBands = useMemo(() => {
    const out: Record<string, number> = {};
    for (const n of nodes) {
      const b = bandRssi(n.rssi);
      out[b] = (out[b] ?? 0) + 1;
    }
    return out;
  }, [nodes]);

  const perGateway = useMemo(() => {
    const map = new Map<string, { gw_id: string; total: number; offline: number; worstRssi: number; minBat: number }>();
    for (const n of nodes) {
      const cur = map.get(n.gw_id) ?? { gw_id: n.gw_id, total: 0, offline: 0, worstRssi: -999, minBat: 999 };
      cur.total += 1;
      if (n.status === "offline") cur.offline += 1;
      cur.worstRssi = Math.max(cur.worstRssi, -n.rssi) === -n.rssi ? n.rssi : cur.worstRssi; // keep “more negative” as worse
      cur.minBat = Math.min(cur.minBat, n.vbat_v);
      map.set(n.gw_id, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.offline - a.offline);
  }, [nodes]);

  const lowBatThreshold = settings?.lowBatteryVolts ?? 3.55;

  const lowBatNodes = useMemo(() => {
    return nodes
      .filter((n) => n.status === "online" && n.vbat_v < lowBatThreshold)
      .sort((a, b) => a.vbat_v - b.vbat_v)
      .slice(0, 10);
  }, [nodes, lowBatThreshold]);

  return (
    <div>
      <h1 className="text-xl font-semibold">Health</h1>
      <p className="mt-2 text-sm text-zinc-400">Diagnostics computed from live telemetry (simulation).</p>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-xs text-zinc-400">Nodes online</div>
          <div className="mt-1 text-2xl font-semibold">{summary.online} / {summary.total}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-xs text-zinc-400">Nodes offline</div>
          <div className="mt-1 text-2xl font-semibold">{summary.offline}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-xs text-zinc-400">Low battery threshold</div>
          <div className="mt-1 text-2xl font-semibold">{lowBatThreshold.toFixed(2)} V</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
          <div className="text-sm font-semibold">Last seen bands</div>
          <div className="mt-3 space-y-2 text-sm text-zinc-300">
            {Object.entries(lastSeenBands).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-zinc-400">{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
          <div className="text-sm font-semibold">Battery bands</div>
          <div className="mt-3 space-y-2 text-sm text-zinc-300">
            {Object.entries(batteryBands).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-zinc-400">{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
          <div className="text-sm font-semibold">RSSI bands</div>
          <div className="mt-3 space-y-2 text-sm text-zinc-300">
            {Object.entries(rssiBands).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-zinc-400">{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
          <div className="text-sm font-semibold">Per-gateway health</div>
          <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-800">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-900/40 text-zinc-300">
                <tr>
                  <th className="px-3 py-2 text-left">GW</th>
                  <th className="px-3 py-2 text-left">Nodes</th>
                  <th className="px-3 py-2 text-left">Offline</th>
                  <th className="px-3 py-2 text-left">Min VBAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {perGateway.map((g) => (
                  <tr key={g.gw_id} className="hover:bg-zinc-900/20">
                    <td className="px-3 py-2 font-medium">{g.gw_id}</td>
                    <td className="px-3 py-2 text-zinc-300">{g.total}</td>
                    <td className="px-3 py-2 text-zinc-300">{g.offline}</td>
                    <td className="px-3 py-2 text-zinc-300">{g.minBat.toFixed(2)} V</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
          <div className="text-sm font-semibold">Low battery (online)</div>
          <div className="mt-2 text-xs text-zinc-400">Top 10 lowest VBAT below threshold</div>

          <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-800">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-900/40 text-zinc-300">
                <tr>
                  <th className="px-3 py-2 text-left">Node</th>
                  <th className="px-3 py-2 text-left">GW</th>
                  <th className="px-3 py-2 text-left">VBAT</th>
                  <th className="px-3 py-2 text-left">RSSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {lowBatNodes.map((n) => (
                  <tr key={n.node_id} className="hover:bg-zinc-900/20">
                    <td className="px-3 py-2 font-medium">{n.node_id}</td>
                    <td className="px-3 py-2 text-zinc-300">{n.gw_id}</td>
                    <td className="px-3 py-2 text-zinc-300">{n.vbat_v.toFixed(2)} V</td>
                    <td className="px-3 py-2 text-zinc-300">{n.rssi} dBm</td>
                  </tr>
                ))}
                {!lowBatNodes.length && (
                  <tr>
                    <td className="px-3 py-3 text-zinc-400" colSpan={4}>
                      No online nodes currently below the threshold.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-zinc-500">
            Threshold is configured in Settings. Gateways count: {gateways.length}.
          </div>
        </div>
      </div>
    </div>
  );
}
