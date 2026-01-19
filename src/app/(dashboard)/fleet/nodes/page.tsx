"use client";

import { useEffect, useMemo, useState } from "react";

type Gateway = {
  gw_id: string;
  name: string;
  site?: string;
  status: "online" | "offline";
  lat?: number;
  lon?: number;
  last_seen?: number;
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
  lat: number;
  lon: number;
};

type Snapshot = { type: "snapshot"; gateways: Gateway[]; nodes: Node[] };

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

function BatteryPill({ v }: { v: number }) {
  // simple bands (tune later)
  const band =
    v >= 4.0 ? "good" : v >= 3.8 ? "ok" : v >= 3.6 ? "low" : "critical";

  const cls =
    band === "good"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : band === "ok"
      ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
      : band === "low"
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : "bg-rose-500/15 text-rose-300 border-rose-500/30";

  return (
    <span className={["inline-flex items-center rounded-full px-2 py-0.5 text-xs border", cls].join(" ")}>
      {v.toFixed(2)} V
    </span>
  );
}

type SortKey = "last_seen_desc" | "last_seen_asc" | "vbat_asc" | "vbat_desc" | "rssi_desc" | "rssi_asc";

export default function FleetNodesPage() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // filters
  const [q, setQ] = useState("");
  const [gw, setGw] = useState<string>("ALL");
  const [net, setNet] = useState<"ALL" | "lora" | "thread">("ALL");
  const [status, setStatus] = useState<"ALL" | "online" | "offline">("ALL");
  const [bat, setBat] = useState<"ALL" | ">=4.0" | "3.8-4.0" | "3.6-3.8" | "<3.6">("ALL");
  const [sort, setSort] = useState<SortKey>("last_seen_desc");

  // selection
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // modals
  const [editOpen, setEditOpen] = useState(false);
  const [editNode, setEditNode] = useState<Node | null>(null);
  const [editForm, setEditForm] = useState({
    gw_id: "",
    net: "lora" as "lora" | "thread",
    status: "online" as "online" | "offline",
    lat: "",
    lon: "",
  });

  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.onmessage = (ev) => {
      const snap = JSON.parse(ev.data) as Snapshot;
      if (snap?.type === "snapshot") {
        setGateways(snap.gateways);
        setNodes(snap.nodes);

        // Keep selection stable: remove selections that no longer exist
        setSelected((prev) => {
          const next: Record<string, boolean> = {};
          const ids = new Set(snap.nodes.map((n) => n.node_id));
          for (const [k, v] of Object.entries(prev)) {
            if (ids.has(k) && v) next[k] = true;
          }
          return next;
        });
      }
    };
    return () => es.close();
  }, []);

  const gatewayIds = useMemo(() => {
    const ids = gateways.map((g) => g.gw_id);
    // include "UNASSIGNED" if nodes have it
    if (nodes.some((n) => n.gw_id === "UNASSIGNED")) ids.unshift("UNASSIGNED");
    return Array.from(new Set(ids));
  }, [gateways, nodes]);

  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();

    const byText = (n: Node) => {
      if (!qn) return true;
      return [n.node_id, n.gw_id, n.net, n.status].some((x) =>
        String(x).toLowerCase().includes(qn)
      );
    };

    const byGw = (n: Node) => (gw === "ALL" ? true : n.gw_id === gw);
    const byNet = (n: Node) => (net === "ALL" ? true : n.net === net);
    const byStatus = (n: Node) => (status === "ALL" ? true : n.status === status);

    const byBat = (n: Node) => {
      if (bat === "ALL") return true;
      if (bat === ">=4.0") return n.vbat_v >= 4.0;
      if (bat === "3.8-4.0") return n.vbat_v >= 3.8 && n.vbat_v < 4.0;
      if (bat === "3.6-3.8") return n.vbat_v >= 3.6 && n.vbat_v < 3.8;
      return n.vbat_v < 3.6;
    };

    const out = nodes.filter((n) => byText(n) && byGw(n) && byNet(n) && byStatus(n) && byBat(n));

    out.sort((a, b) => {
      switch (sort) {
        case "last_seen_desc":
          return b.last_seen - a.last_seen;
        case "last_seen_asc":
          return a.last_seen - b.last_seen;
        case "vbat_asc":
          return a.vbat_v - b.vbat_v;
        case "vbat_desc":
          return b.vbat_v - a.vbat_v;
        case "rssi_desc":
          // less negative is better; desc means show stronger first
          return b.rssi - a.rssi;
        case "rssi_asc":
          return a.rssi - b.rssi;
        default:
          return 0;
      }
    });

    return out;
  }, [nodes, q, gw, net, status, bat, sort]);

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((k) => selected[k]),
    [selected]
  );

  const allFilteredSelected = useMemo(() => {
    if (!filtered.length) return false;
    return filtered.every((n) => selected[n.node_id]);
  }, [filtered, selected]);

  function toggleSelectAllFiltered() {
    setSelected((prev) => {
      const next = { ...prev };
      const target = !allFilteredSelected;
      for (const n of filtered) next[n.node_id] = target;
      // remove false keys to keep object small
      for (const k of Object.keys(next)) if (!next[k]) delete next[k];
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (!next[id]) delete next[id];
      return next;
    });
  }

  async function control(action: "enable" | "disable" | "reboot" | "assign_gateway", extra?: any) {
    if (!selectedIds.length) {
      setMsg("Select at least one node.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const payload: any = { action, node_ids: selectedIds, ...extra };
      const res = await fetch("/api/fleet/nodes/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json().catch(() => ({}));
      setMsg(`Action '${action}' applied to ${j.changed ?? "some"} node(s).`);
    } catch (e: any) {
      setMsg(e?.message ?? "Control action failed.");
    } finally {
      setBusy(false);
    }
  }

  function openEdit(n: Node) {
    setEditNode(n);
    setEditForm({
      gw_id: n.gw_id,
      net: n.net,
      status: n.status,
      lat: String(n.lat),
      lon: String(n.lon),
    });
    setEditOpen(true);
    setMsg(null);
  }

  async function saveEdit() {
    if (!editNode) return;
    setBusy(true);
    setMsg(null);
    try {
      const payload = {
        node_id: editNode.node_id,
        gw_id: editForm.gw_id.trim(),
        net: editForm.net,
        status: editForm.status,
        lat: Number(editForm.lat),
        lon: Number(editForm.lon),
      };
      const res = await fetch("/api/fleet/nodes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setEditOpen(false);
      setEditNode(null);
      setMsg("Node updated.");
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to update node.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteNode(node_id: string) {
    const ok = window.confirm(`Delete node ${node_id}?`);
    if (!ok) return;

    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/fleet/nodes?node_id=${encodeURIComponent(node_id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg("Node deleted.");
      setSelected((prev) => {
        const next = { ...prev };
        delete next[node_id];
        return next;
      });
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to delete node.");
    } finally {
      setBusy(false);
    }
  }

  async function rowEnable(node_id: string, enabled: boolean) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/fleet/nodes/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: enabled ? "enable" : "disable",
          node_ids: [node_id],
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg(enabled ? "Node enabled." : "Node disabled.");
    } catch (e: any) {
      setMsg(e?.message ?? "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function rowReboot(node_id: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/fleet/nodes/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reboot", node_ids: [node_id] }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg("Reboot triggered.");
    } catch (e: any) {
      setMsg(e?.message ?? "Reboot failed.");
    } finally {
      setBusy(false);
    }
  }

  // bulk assign gateway prompt (simple)
  async function bulkAssignGateway() {
    if (!selectedIds.length) {
      setMsg("Select at least one node.");
      return;
    }
    const gw_id = window.prompt("Assign selected nodes to gateway ID:", gatewayIds[0] ?? "");
    if (!gw_id) return;
    await control("assign_gateway", { gw_id });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Fleet: Nodes</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Filters + bulk actions + per-node controls (live simulation).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search node_id, gw_id, net, status…"
            className="w-72 max-w-full rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
          />

          <select
            value={gw}
            onChange={(e) => setGw(e.target.value)}
            className="rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-2 text-sm text-zinc-100"
          >
            <option value="ALL">All gateways</option>
            {gatewayIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>

          <select
            value={net}
            onChange={(e) => setNet(e.target.value as any)}
            className="rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-2 text-sm text-zinc-100"
          >
            <option value="ALL">All nets</option>
            <option value="lora">LoRa</option>
            <option value="thread">Thread</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-2 text-sm text-zinc-100"
          >
            <option value="ALL">All status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>

          <select
            value={bat}
            onChange={(e) => setBat(e.target.value as any)}
            className="rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-2 text-sm text-zinc-100"
          >
            <option value="ALL">All battery</option>
            <option value=">=4.0">≥ 4.0V</option>
            <option value="3.8-4.0">3.8–4.0V</option>
            <option value="3.6-3.8">3.6–3.8V</option>
            <option value="<3.6">&lt; 3.6V</option>
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-2 text-sm text-zinc-100"
          >
            <option value="last_seen_desc">Last seen (newest)</option>
            <option value="last_seen_asc">Last seen (oldest)</option>
            <option value="vbat_asc">VBAT (low → high)</option>
            <option value="vbat_desc">VBAT (high → low)</option>
            <option value="rssi_desc">RSSI (strong → weak)</option>
            <option value="rssi_asc">RSSI (weak → strong)</option>
          </select>
        </div>
      </div>

      {/* Bulk action bar */}
      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/20 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-zinc-300">
            Selected: <span className="font-semibold">{selectedIds.length}</span> • Showing{" "}
            <span className="font-semibold">{filtered.length}</span> filtered nodes
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={toggleSelectAllFiltered}
              className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm hover:bg-zinc-900"
            >
              {allFilteredSelected ? "Unselect filtered" : "Select filtered"}
            </button>

            <button
              disabled={busy}
              onClick={() => control("enable")}
              className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm hover:bg-zinc-900 disabled:opacity-60"
            >
              Enable
            </button>
            <button
              disabled={busy}
              onClick={() => control("disable")}
              className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm hover:bg-zinc-900 disabled:opacity-60"
            >
              Disable
            </button>
            <button
              disabled={busy}
              onClick={() => control("reboot")}
              className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm hover:bg-zinc-900 disabled:opacity-60"
            >
              Reboot
            </button>
            <button
              disabled={busy}
              onClick={bulkAssignGateway}
              className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm hover:bg-zinc-900 disabled:opacity-60"
            >
              Assign Gateway
            </button>
          </div>
        </div>

        {msg && <div className="mt-2 text-sm text-zinc-300">{msg}</div>}
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900/40 text-zinc-300">
            <tr>
              <th className="px-3 py-2 text-left">
                <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAllFiltered} />
              </th>
              <th className="px-3 py-2 text-left">Node</th>
              <th className="px-3 py-2 text-left">GW</th>
              <th className="px-3 py-2 text-left">Net</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Last seen</th>
              <th className="px-3 py-2 text-left">VBAT</th>
              <th className="px-3 py-2 text-left">RSSI</th>
              <th className="px-3 py-2 text-left">SNR</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-800">
            {filtered.map((n) => (
              <tr key={n.node_id} className="hover:bg-zinc-900/20">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={!!selected[n.node_id]}
                    onChange={() => toggleOne(n.node_id)}
                  />
                </td>

                <td className="px-3 py-2 font-medium">{n.node_id}</td>
                <td className="px-3 py-2 text-zinc-300">{n.gw_id}</td>
                <td className="px-3 py-2 text-zinc-300">{n.net}</td>

                <td className="px-3 py-2">
                  <StatusPill status={n.status} />
                </td>

                <td className="px-3 py-2 text-zinc-300">{age(n.last_seen)} ago</td>

                <td className="px-3 py-2">
                  <BatteryPill v={n.vbat_v} />
                </td>

                <td className="px-3 py-2 text-zinc-300">{n.rssi} dBm</td>
                <td className="px-3 py-2 text-zinc-300">{n.snr.toFixed(1)} dB</td>

                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={busy}
                      onClick={() => rowEnable(n.node_id, n.status !== "online")}
                      className="rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-1 text-xs hover:bg-zinc-900 disabled:opacity-60"
                    >
                      {n.status === "online" ? "Disable" : "Enable"}
                    </button>

                    <button
                      disabled={busy}
                      onClick={() => rowReboot(n.node_id)}
                      className="rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-1 text-xs hover:bg-zinc-900 disabled:opacity-60"
                    >
                      Reboot
                    </button>

                    <button
                      disabled={busy}
                      onClick={() => openEdit(n)}
                      className="rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-1 text-xs hover:bg-zinc-900 disabled:opacity-60"
                    >
                      Edit
                    </button>

                    <button
                      disabled={busy}
                      onClick={() => deleteNode(n.node_id)}
                      className="rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-1 text-xs hover:bg-zinc-900 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!filtered.length && (
              <tr>
                <td className="px-3 py-3 text-zinc-400" colSpan={10}>
                  No nodes match current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editOpen && editNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Edit node</div>
              <button
                onClick={() => {
                  setEditOpen(false);
                  setEditNode(null);
                }}
                className="text-zinc-400 hover:text-zinc-200"
              >
                Close
              </button>
            </div>

            <div className="mt-1 text-xs text-zinc-500">Node: {editNode.node_id}</div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-xs text-zinc-400">
                Gateway ID
                <select
                  className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-2 text-sm text-zinc-100"
                  value={editForm.gw_id}
                  onChange={(e) => setEditForm((f) => ({ ...f, gw_id: e.target.value }))}
                >
                  {gatewayIds.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-zinc-400">
                Net
                <select
                  className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-2 text-sm text-zinc-100"
                  value={editForm.net}
                  onChange={(e) => setEditForm((f) => ({ ...f, net: e.target.value as any }))}
                >
                  <option value="lora">lora</option>
                  <option value="thread">thread</option>
                </select>
              </label>

              <label className="text-xs text-zinc-400">
                Status
                <select
                  className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-2 text-sm text-zinc-100"
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as any }))}
                >
                  <option value="online">online</option>
                  <option value="offline">offline</option>
                </select>
              </label>

              <label className="text-xs text-zinc-400">
                Latitude
                <input
                  className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-2 text-sm text-zinc-100"
                  value={editForm.lat}
                  onChange={(e) => setEditForm((f) => ({ ...f, lat: e.target.value }))}
                />
              </label>

              <label className="text-xs text-zinc-400">
                Longitude
                <input
                  className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-2 text-sm text-zinc-100"
                  value={editForm.lon}
                  onChange={(e) => setEditForm((f) => ({ ...f, lon: e.target.value }))}
                />
              </label>
            </div>

            {msg && <div className="mt-3 text-sm text-zinc-300">{msg}</div>}

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditOpen(false);
                  setEditNode(null);
                }}
                className="rounded-md border border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={saveEdit}
                className="rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm hover:bg-zinc-900 disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
