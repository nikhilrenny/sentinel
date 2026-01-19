"use client";

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

type SortKey =
  | "last_seen_desc"
  | "last_seen_asc"
  | "name_asc"
  | "name_desc"
  | "site_asc"
  | "site_desc";

export default function FleetGatewaysPage() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"ALL" | "online" | "offline">("ALL");
  const [site, setSite] = useState<string>("ALL");
  const [sort, setSort] = useState<SortKey>("last_seen_desc");

  // selection
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // modal
  const [editOpen, setEditOpen] = useState(false);
  const [editGw, setEditGw] = useState<Gateway | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    site: "",
    status: "online" as "online" | "offline",
    lat: "",
    lon: "",
  });

  // delete behavior
  const [forceDelete, setForceDelete] = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.onmessage = (ev) => {
      const snap = JSON.parse(ev.data) as Snapshot;
      if (snap?.type === "snapshot") {
        setGateways(snap.gateways);
        setNodes(snap.nodes);

        // prune selection for removed gateways
        setSelected((prev) => {
          const ids = new Set(snap.gateways.map((g) => g.gw_id));
          const next: Record<string, boolean> = {};
          for (const [k, v] of Object.entries(prev)) {
            if (v && ids.has(k)) next[k] = true;
          }
          return next;
        });
      }
    };
    return () => es.close();
  }, []);

  const siteOptions = useMemo(() => {
    return Array.from(new Set(gateways.map((g) => g.site))).sort();
  }, [gateways]);

  const nodeCountByGw = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of nodes) map.set(n.gw_id, (map.get(n.gw_id) ?? 0) + 1);
    return map;
  }, [nodes]);

  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();

    const byText = (g: Gateway) => {
      if (!qn) return true;
      return [g.gw_id, g.name, g.site].some((x) => x.toLowerCase().includes(qn));
    };

    const byStatus = (g: Gateway) => (status === "ALL" ? true : g.status === status);
    const bySite = (g: Gateway) => (site === "ALL" ? true : g.site === site);

    const out = gateways.filter((g) => byText(g) && byStatus(g) && bySite(g));

    out.sort((a, b) => {
      switch (sort) {
        case "last_seen_desc":
          return b.last_seen - a.last_seen;
        case "last_seen_asc":
          return a.last_seen - b.last_seen;
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "site_asc":
          return a.site.localeCompare(b.site);
        case "site_desc":
          return b.site.localeCompare(a.site);
        default:
          return 0;
      }
    });

    return out;
  }, [gateways, q, status, site, sort]);

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((k) => selected[k]),
    [selected]
  );

  const allFilteredSelected = useMemo(() => {
    if (!filtered.length) return false;
    return filtered.every((g) => selected[g.gw_id]);
  }, [filtered, selected]);

  function toggleSelectAllFiltered() {
    setSelected((prev) => {
      const next = { ...prev };
      const target = !allFilteredSelected;
      for (const g of filtered) next[g.gw_id] = target;
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

  async function patchGateway(gw_id: string, patch: any) {
    const res = await fetch("/api/fleet/gateways", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gw_id, ...patch }),
    });
    if (!res.ok) throw new Error(await res.text());
  }

  async function deleteGateway(gw_id: string, force: boolean) {
    const res = await fetch(
      `/api/fleet/gateways?gw_id=${encodeURIComponent(gw_id)}&force=${force ? "true" : "false"}`,
      { method: "DELETE" }
    );
    if (!res.ok) throw new Error(await res.text());
  }

  async function rebootGateway(gw_id: string) {
  setBusy(true);
  setMsg(null);
  try {
    const res = await fetch("/api/fleet/gateways", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reboot", gw_id }),
    });
    if (!res.ok) throw new Error(await res.text());
    setMsg(`Gateway ${gw_id} rebooting…`);
  } catch (e: any) {
    setMsg(e?.message ?? "Reboot failed.");
  } finally {
    setBusy(false);
  }
}

  async function bulkSetStatus(nextStatus: "online" | "offline") {
    if (!selectedIds.length) {
      setMsg("Select at least one gateway.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      for (const id of selectedIds) {
        await patchGateway(id, { status: nextStatus });
      }
      setMsg(`Set ${selectedIds.length} gateway(s) to ${nextStatus}.`);
    } catch (e: any) {
      setMsg(e?.message ?? "Bulk update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function bulkDelete() {
    if (!selectedIds.length) {
      setMsg("Select at least one gateway.");
      return;
    }
    const ok = window.confirm(
      `Delete ${selectedIds.length} gateway(s)?${forceDelete ? " (force enabled)" : ""}`
    );
    if (!ok) return;

    setBusy(true);
    setMsg(null);
    try {
      for (const id of selectedIds) {
        await deleteGateway(id, forceDelete);
      }
      setMsg(`Deleted ${selectedIds.length} gateway(s).`);
      setSelected({});
    } catch (e: any) {
      setMsg(e?.message ?? "Bulk delete failed.");
    } finally {
      setBusy(false);
    }
  }

  function openEdit(g: Gateway) {
    setEditGw(g);
    setEditForm({
      name: g.name,
      site: g.site,
      status: g.status,
      lat: String(g.lat),
      lon: String(g.lon),
    });
    setEditOpen(true);
    setMsg(null);
  }

  async function saveEdit() {
    if (!editGw) return;
    setBusy(true);
    setMsg(null);
    try {
      const payload = {
        gw_id: editGw.gw_id,
        name: editForm.name.trim(),
        site: editForm.site.trim(),
        status: editForm.status,
        lat: Number(editForm.lat),
        lon: Number(editForm.lon),
      };

      const res = await fetch("/api/fleet/gateways", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      setEditOpen(false);
      setEditGw(null);
      setMsg("Gateway updated.");
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to update gateway.");
    } finally {
      setBusy(false);
    }
  }

  async function rowSetStatus(gw_id: string, nextStatus: "online" | "offline") {
    setBusy(true);
    setMsg(null);
    try {
      await patchGateway(gw_id, { status: nextStatus });
      setMsg(`Gateway ${gw_id} set to ${nextStatus}.`);
    } catch (e: any) {
      setMsg(e?.message ?? "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function rowDelete(gw_id: string) {
    const count = nodeCountByGw.get(gw_id) ?? 0;
    const ok = window.confirm(
      `Delete gateway ${gw_id}? It has ${count} node(s).${forceDelete ? " (force enabled)" : ""}`
    );
    if (!ok) return;

    setBusy(true);
    setMsg(null);
    try {
      await deleteGateway(gw_id, forceDelete);
      setMsg("Gateway deleted.");
      setSelected((prev) => {
        const next = { ...prev };
        delete next[gw_id];
        return next;
      });
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to delete gateway.");
    } finally {
      setBusy(false);
    }
  }

  const gwOnline = gateways.filter((g) => g.status === "online").length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Fleet: Gateways</h1>
          <p className="mt-2 text-sm text-zinc-400">
            {gwOnline} online / {gateways.length} total • filters + bulk actions + edit/delete.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search gw_id, name, site…"
            className="w-72 max-w-full rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
          />

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
            value={site}
            onChange={(e) => setSite(e.target.value)}
            className="rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-2 text-sm text-zinc-100"
          >
            <option value="ALL">All sites</option>
            {siteOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-2 text-sm text-zinc-100"
          >
            <option value="last_seen_desc">Last seen (newest)</option>
            <option value="last_seen_asc">Last seen (oldest)</option>
            <option value="name_asc">Name (A→Z)</option>
            <option value="name_desc">Name (Z→A)</option>
            <option value="site_asc">Site (A→Z)</option>
            <option value="site_desc">Site (Z→A)</option>
          </select>
        </div>
      </div>

      {/* Bulk action bar */}
      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/20 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-zinc-300">
            Selected: <span className="font-semibold">{selectedIds.length}</span> • Showing{" "}
            <span className="font-semibold">{filtered.length}</span> filtered gateways
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
              onClick={() => bulkSetStatus("online")}
              className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm hover:bg-zinc-900 disabled:opacity-60"
            >
              Set Online
            </button>

            <button
              disabled={busy}
              onClick={() => bulkSetStatus("offline")}
              className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm hover:bg-zinc-900 disabled:opacity-60"
            >
              Set Offline
            </button>

            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={forceDelete}
                onChange={(e) => setForceDelete(e.target.checked)}
              />
              Force delete
            </label>

            <button
              disabled={busy}
              onClick={bulkDelete}
              className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm hover:bg-zinc-900 disabled:opacity-60"
            >
              Delete
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
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAllFiltered}
                />
              </th>
              <th className="px-3 py-2 text-left">GW</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Site</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Nodes</th>
              <th className="px-3 py-2 text-left">Last seen</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-800">
            {filtered.map((g) => (
              <tr key={g.gw_id} className="hover:bg-zinc-900/20">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={!!selected[g.gw_id]}
                    onChange={() => toggleOne(g.gw_id)}
                  />
                </td>

                <td className="px-3 py-2 font-medium">{g.gw_id}</td>
                <td className="px-3 py-2 text-zinc-300">{g.name}</td>
                <td className="px-3 py-2 text-zinc-300">{g.site}</td>

                <td className="px-3 py-2">
                  <StatusPill status={g.status} />
                </td>

                <td className="px-3 py-2 text-zinc-300">{nodeCountByGw.get(g.gw_id) ?? 0}</td>

                <td className="px-3 py-2 text-zinc-300">{age(g.last_seen)} ago</td>

                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={busy}
                      onClick={() =>
                        rowSetStatus(g.gw_id, g.status === "online" ? "offline" : "online")
                      }
                      className="rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-1 text-xs hover:bg-zinc-900 disabled:opacity-60"
                    >
                      {g.status === "online" ? "Set Offline" : "Set Online"}
                    </button>

                    <button
                      disabled={busy}
                      onClick={() => rebootGateway(g.gw_id)}
                      className="rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-1 text-xs hover:bg-zinc-900 disabled:opacity-60"
                    >
                      Reboot
                    </button>

                    <button
                      disabled={busy}
                      onClick={() => openEdit(g)}
                      className="rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-1 text-xs hover:bg-zinc-900 disabled:opacity-60"
                    >
                      Edit
                    </button>

                    <button
                      disabled={busy}
                      onClick={() => rowDelete(g.gw_id)}
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
                <td className="px-3 py-3 text-zinc-400" colSpan={8}>
                  No gateways match current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editOpen && editGw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Edit gateway</div>
              <button
                onClick={() => {
                  setEditOpen(false);
                  setEditGw(null);
                }}
                className="text-zinc-400 hover:text-zinc-200"
              >
                Close
              </button>
            </div>

            <div className="mt-1 text-xs text-zinc-500">GW: {editGw.gw_id}</div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-xs text-zinc-400">
                Name
                <input
                  className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-2 text-sm text-zinc-100"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>

              <label className="text-xs text-zinc-400">
                Site
                <input
                  className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-2 text-sm text-zinc-100"
                  value={editForm.site}
                  onChange={(e) => setEditForm((f) => ({ ...f, site: e.target.value }))}
                />
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
                  setEditGw(null);
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
