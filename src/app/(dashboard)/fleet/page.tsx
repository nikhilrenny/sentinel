"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  gw_id: string;
  net: "lora" | "thread";
  status: "online" | "offline";
  last_seen: number;
  rssi: number;
  snr: number;
  vbat_v: number;
};

type Snapshot = {
  type: "snapshot";
  gateways: Gateway[];
  nodes: Node[];
};

function age(msEpoch: number): string {
  const s = Math.floor(Math.max(0, Date.now() - msEpoch) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

function StatusPill({ status }: { status: "online" | "offline" }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs border",
        status === "online"
          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
          : "bg-rose-500/15 text-rose-300 border-rose-500/30",
      ].join(" ")}
    >
      {status}
    </span>
  );
}

export default function FleetPage() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.onmessage = (ev) => {
      const msg = JSON.parse(ev.data) as Snapshot;
      if (msg?.type === "snapshot") {
        setGateways(msg.gateways);
        setNodes(msg.nodes);
      }
    };
    return () => es.close();
  }, []);

  const qNorm = q.trim().toLowerCase();

  const gatewaysFiltered = useMemo(() => {
    if (!qNorm) return gateways;
    return gateways.filter((g) =>
      [g.gw_id, g.name, g.site].some((x) =>
        x.toLowerCase().includes(qNorm)
      )
    );
  }, [gateways, qNorm]);

  const nodesFiltered = useMemo(() => {
    if (!qNorm) return nodes;
    return nodes.filter((n) =>
      [n.node_id, n.gw_id, n.net, n.status].some((x) =>
        String(x).toLowerCase().includes(qNorm)
      )
    );
  }, [nodes, qNorm]);

  const gwOnline = gateways.filter((g) => g.status === "online").length;
  const nOnline = nodes.filter((n) => n.status === "online").length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Fleet</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Gateways: {gwOnline}/{gateways.length} online • Nodes: {nOnline}/{nodes.length} online
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search gateways or nodes…"
            className="w-72 max-w-full rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
          />
          <Link
            href="/fleet/gateways"
            className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm hover:bg-zinc-900"
          >
            Manage gateways
          </Link>
          <Link
            href="/fleet/nodes"
            className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm hover:bg-zinc-900"
          >
            Manage nodes
          </Link>
        </div>
      </div>

      {/* Tables */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Gateways */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
          <div className="text-sm font-semibold">Gateways</div>
          <div className="mt-1 text-xs text-zinc-400">Base stations deployed in the field</div>

          <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-800">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-900/40 text-zinc-300">
                <tr>
                  <th className="px-3 py-2 text-left">GW</th>
                  <th className="px-3 py-2 text-left">Site</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {gatewaysFiltered.map((g) => (
                  <tr key={g.gw_id} className="hover:bg-zinc-900/20">
                    <td className="px-3 py-2 font-medium">{g.gw_id}</td>
                    <td className="px-3 py-2 text-zinc-300">{g.site}</td>
                    <td className="px-3 py-2">
                      <StatusPill status={g.status} />
                    </td>
                    <td className="px-3 py-2 text-zinc-300">
                      {age(g.last_seen)} ago
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Nodes */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
          <div className="text-sm font-semibold">Nodes</div>
          <div className="mt-1 text-xs text-zinc-400">Sensor nodes associated with gateways</div>

          <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-800">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-900/40 text-zinc-300">
                <tr>
                  <th className="px-3 py-2 text-left">Node</th>
                  <th className="px-3 py-2 text-left">GW</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">VBAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {nodesFiltered.slice(0, 20).map((n) => (
                  <tr key={n.node_id} className="hover:bg-zinc-900/20">
                    <td className="px-3 py-2 font-medium">{n.node_id}</td>
                    <td className="px-3 py-2 text-zinc-300">{n.gw_id}</td>
                    <td className="px-3 py-2">
                      <StatusPill status={n.status} />
                    </td>
                    <td className="px-3 py-2 text-zinc-300">
                      {n.vbat_v.toFixed(2)} V
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-2 text-xs text-zinc-500">
            Showing up to 20 nodes. Use “Manage nodes” for full controls.
          </div>
        </div>
      </div>
    </div>
  );
}
