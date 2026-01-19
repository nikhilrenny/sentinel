"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

// Leaflet components must be client-only
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((m) => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });

type Gateway = {
  gw_id: string;
  name: string;
  site: string;
  status: "online" | "offline";
  last_seen: number;
  lat: number;
  lon: number;
};

type Node = {
  node_id: string;
  status: "online" | "offline";
};

type Alert = {
  id: string;
  ack: boolean;
};

type Snapshot = {
  type: "snapshot";
  ts: number;
  gateways: Gateway[];
  nodes: Node[];
  alerts: Alert[];
  settings?: {
    lowBatteryVolts: number;
    heartbeatMissingMinutes: number;
  };
};

function age(msEpoch: number): string {
  const s = Math.floor(Math.max(0, Date.now() - msEpoch) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

export default function OverviewPage() {
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.onmessage = (ev) => {
      const msg = JSON.parse(ev.data) as Snapshot;
      if (msg?.type === "snapshot") setSnap(msg);
    };
    return () => es.close();
  }, []);

  const stats = useMemo(() => {
    const gateways = snap?.gateways ?? [];
    const nodes = snap?.nodes ?? [];
    const alerts = snap?.alerts ?? [];

    const gwTotal = gateways.length;
    const gwOnline = gateways.filter((g) => g.status === "online").length;

    const nTotal = nodes.length;
    const nOnline = nodes.filter((n) => n.status === "online").length;

    const activeAlerts = alerts.filter((a) => !a.ack).length;

    return { gwTotal, gwOnline, nTotal, nOnline, activeAlerts };
  }, [snap]);

  const mapCenter = useMemo<[number, number]>(() => {
    const g = snap?.gateways?.[0];
    return g ? [g.lat, g.lon] : [50.909, -1.404]; // fallback
  }, [snap]);

  return (
    <div>
      <h1 className="text-xl font-semibold">Overview</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Live simulation via SSE. Map shows deployed base stations (gateways).
      </p>

      {/* Metric cards */}
      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-xs text-zinc-400">Gateways online</div>
          <div className="mt-1 text-2xl font-semibold">
            {stats.gwOnline} / {stats.gwTotal}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-xs text-zinc-400">Nodes online</div>
          <div className="mt-1 text-2xl font-semibold">
            {stats.nOnline} / {stats.nTotal}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-xs text-zinc-400">Active alerts</div>
          <div className="mt-1 text-2xl font-semibold">{stats.activeAlerts}</div>
        </div>
      </div>

      {/* Overview content blocks */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Map */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Deployed base stations</div>
              <div className="mt-1 text-xs text-zinc-400">Gateway locations (click for details)</div>
            </div>
            <div className="text-xs text-zinc-500">
              {snap ? `Updated ${new Date(snap.ts).toLocaleTimeString()}` : "Connecting…"}
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800">
            <div style={{ height: 340 }}>
              <MapContainer center={mapCenter} zoom={11} style={{ height: "100%", width: "100%" }}>
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {(snap?.gateways ?? []).map((g) => (
                  <CircleMarker
                    key={g.gw_id}
                    center={[g.lat, g.lon]}
                    radius={10}
                    pathOptions={{ color: g.status === "online" ? "#22c55e" : "#ef4444" }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold">{g.name}</div>
                        <div>GW: {g.gw_id}</div>
                        <div>Site: {g.site}</div>
                        <div>Status: {g.status}</div>
                        <div>Last seen: {age(g.last_seen)} ago</div>
                        <div className="mt-2 text-xs text-zinc-500">
                          ({g.lat.toFixed(4)}, {g.lon.toFixed(4)})
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          </div>
        </div>

        {/* Quick summary / settings */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="text-sm font-semibold">Quick status</div>
          <div className="mt-2 text-xs text-zinc-400">
            Use Fleet for inventory changes, Health for diagnostics, Settings for thresholds.
          </div>

          <div className="mt-4 space-y-2 text-sm text-zinc-200">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Gateways</span>
              <span>{stats.gwTotal}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Nodes</span>
              <span>{stats.nTotal}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Active alerts</span>
              <span>{stats.activeAlerts}</span>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="text-xs font-semibold text-zinc-300">Thresholds</div>
            <div className="mt-2 space-y-1 text-sm text-zinc-200">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Low battery</span>
                <span>{snap?.settings?.lowBatteryVolts?.toFixed?.(2) ?? "—"} V</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Missing heartbeat</span>
                <span>{snap?.settings?.heartbeatMissingMinutes ?? "—"} min</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-zinc-500">Change these in Settings.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
