"use client";

import { useEffect, useState } from "react";

type Settings = {
  lowBatteryVolts: number;
  heartbeatMissingMinutes: number;
};

type Snapshot = { type: "snapshot"; settings: Settings };

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState({ lowBatteryVolts: "3.55", heartbeatMissingMinutes: "10" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // Prefer SSE so values always match live store
    const es = new EventSource("/api/stream");
    es.onmessage = (ev) => {
      const snap = JSON.parse(ev.data) as Snapshot;
      if (snap?.type === "snapshot") {
        setSettings(snap.settings);
        setForm({
          lowBatteryVolts: String(snap.settings.lowBatteryVolts),
          heartbeatMissingMinutes: String(snap.settings.heartbeatMissingMinutes),
        });
      }
    };
    return () => es.close();
  }, []);

  async function save() {
    setMsg(null);
    setBusy(true);
    try {
      const payload = {
        lowBatteryVolts: Number(form.lowBatteryVolts),
        heartbeatMissingMinutes: Number(form.heartbeatMissingMinutes),
      };

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      setMsg("Saved.");
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to save settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Settings</h1>
      <p className="mt-2 text-sm text-zinc-400">Edit thresholds that drive alert generation and health logic.</p>

      <div className="mt-6 max-w-xl rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-xs text-zinc-400">
            Low battery threshold (V)
            <input
              className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-2 text-sm text-zinc-100"
              value={form.lowBatteryVolts}
              onChange={(e) => setForm((f) => ({ ...f, lowBatteryVolts: e.target.value }))}
            />
          </label>

          <label className="text-xs text-zinc-400">
            Missing heartbeat (minutes)
            <input
              className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-2 text-sm text-zinc-100"
              value={form.heartbeatMissingMinutes}
              onChange={(e) => setForm((f) => ({ ...f, heartbeatMissingMinutes: e.target.value }))}
            />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm hover:bg-zinc-900 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          {msg && <div className="text-sm text-zinc-300">{msg}</div>}
        </div>

        {settings && (
          <div className="mt-4 text-xs text-zinc-500">
            Live store: lowBatteryVolts={settings.lowBatteryVolts.toFixed(2)}, heartbeatMissingMinutes={settings.heartbeatMissingMinutes}
          </div>
        )}
      </div>
    </div>
  );
}
