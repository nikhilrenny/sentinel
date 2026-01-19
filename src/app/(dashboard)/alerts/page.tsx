type AlertsResp = {
  alerts: Array<{
    id: string;
    ts: number;
    severity: "info" | "warn" | "critical";
    gw_id: string;
    node_id: string;
    rule: string;
    text: string;
    ack: boolean;
  }>;
};

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`http://localhost:3000${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return res.json();
}

function fmtTime(msEpoch: number): string {
  return new Date(msEpoch).toLocaleString();
}

function sevPill(sev: "info" | "warn" | "critical") {
  switch (sev) {
    case "info":
      return "bg-sky-500/15 text-sky-300 border border-sky-500/30";
    case "warn":
      return "bg-amber-500/15 text-amber-300 border border-amber-500/30";
    case "critical":
      return "bg-rose-500/15 text-rose-300 border border-rose-500/30";
  }
}

export default async function AlertsPage() {
  const data = await getJSON<AlertsResp>("/api/alerts");
  const active = data.alerts.filter((a) => !a.ack).length;

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Alerts</h1>
          <p className="mt-2 text-sm text-zinc-400">
            {active} active / {data.alerts.length} total
          </p>
        </div>
        <div className="text-xs text-zinc-400">Mock source (rules engine later)</div>
      </div>

      <div className="mt-5 space-y-3">
        {data.alerts
          .slice()
          .sort((a, b) => b.ts - a.ts)
          .map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${sevPill(a.severity)}`}>
                    {a.severity}
                  </span>
                  <span className="text-sm font-semibold">{a.rule}</span>
                  {a.ack ? (
                    <span className="text-xs text-zinc-400">(acknowledged)</span>
                  ) : (
                    <span className="text-xs text-zinc-300">(active)</span>
                  )}
                </div>
                <div className="text-xs text-zinc-400">{fmtTime(a.ts)}</div>
              </div>

              <div className="mt-2 text-sm text-zinc-200">{a.text}</div>

              <div className="mt-3 text-xs text-zinc-400">
                GW: <span className="text-zinc-300">{a.gw_id}</span> • Node:{" "}
                <span className="text-zinc-300">{a.node_id}</span> • Alert ID:{" "}
                <span className="text-zinc-300">{a.id}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
