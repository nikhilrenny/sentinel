import type { Alert, Gateway, Node, Settings } from "@/lib/mock/data";
import { alerts as seedAlerts, gateways as seedGateways, nodes as seedNodes, settings as seedSettings } from "@/lib/mock/data";

type Subscriber = (msg: unknown) => void;

export type Snapshot = {
  type: "snapshot";
  ts: number;
  gateways: Gateway[];
  nodes: Node[];
  alerts: Alert[];
  settings: Settings;
};

function clone<T>(x: T): T {
  // safer than structuredClone across environments
  return JSON.parse(JSON.stringify(x)) as T;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function jitterDeg(maxDeg = 0.0015) {
  return (Math.random() - 0.5) * maxDeg;
}

class InMemoryStore {
  gateways: Gateway[] = clone(seedGateways);
  nodes: Node[] = clone(seedNodes);
  alerts: Alert[] = clone(seedAlerts);
  settings: Settings = clone(seedSettings);

  private subs = new Set<Subscriber>();
  private started = false;
  private tickHandle: NodeJS.Timeout | null = null;

  subscribe(fn: Subscriber) {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }

  emit(msg: unknown) {
    for (const fn of Array.from(this.subs)) {
      try {
        fn(msg);
      } catch {
        // remove dead subscribers (disconnected SSE clients, etc.)
        this.subs.delete(fn);
      }
    }
  }

  pushSnapshot() {
    const snap: Snapshot = {
      type: "snapshot",
      ts: Date.now(),
      gateways: this.gateways,
      nodes: this.nodes,
      alerts: this.alerts,
      settings: this.settings,
    };
    this.emit(snap);
  }

  startSimulator() {
    if (this.started) return;
    this.started = true;

    // main simulation tick
    this.tickHandle = setInterval(() => {
      const now = Date.now();

      // Gateways: keep them mostly online with a realistic last_seen
      this.gateways = this.gateways.map((g) => ({
        ...g,
        status: "online",
        last_seen: now - Math.floor(Math.random() * 15_000),
      }));

      // Nodes: random walk + occasional offline
      this.nodes = this.nodes.map((n, idx) => {
        const occasionallyOffline = idx % 11 === 0 && Math.random() < 0.12;

        if (occasionallyOffline) {
          return {
            ...n,
            status: "offline",
            // keep last_seen older to look “stale”
            last_seen: Math.min(n.last_seen, now - (this.settings.heartbeatMissingMinutes + 2) * 60_000),
          };
        }

        const gw = this.gateways.find((g) => g.gw_id === n.gw_id);

        const temp2 = n.temp_c + (Math.random() - 0.5) * 0.25;
        const hum2 = n.hum_rh + (Math.random() - 0.5) * 0.7;

        const v2 = clamp(n.vbat_v - Math.random() * 0.0022, 3.20, 4.20);
        const rssi2 = clamp(n.rssi + Math.round((Math.random() - 0.5) * 2), -120, -35);
        const snr2 = clamp(n.snr + (Math.random() - 0.5) * 0.35, -20, 20);

        // keep node near gateway (slight drift)
        const baseLat = Number.isFinite(n.lat) ? n.lat : (gw?.lat ?? 50.909);
        const baseLon = Number.isFinite(n.lon) ? n.lon : (gw?.lon ?? -1.404);

        return {
          ...n,
          status: "online",
          last_seen: now,
          temp_c: temp2,
          hum_rh: hum2,
          vbat_v: v2,
          rssi: rssi2,
          snr: snr2,
          lat: baseLat + jitterDeg(),
          lon: baseLon + jitterDeg(),
        };
      });

      // Alerts: generate a few realistic ones
      this.generateAlerts(now);

      // Broadcast to dashboards
      this.pushSnapshot();
    }, 2000);
  }

  private generateAlerts(now: number) {
    // LOW_BATTERY
    const lowBat = this.nodes.find((n) => n.status === "online" && n.vbat_v < this.settings.lowBatteryVolts);
    if (lowBat && Math.random() < 0.25) {
      this.prependAlert({
        id: this.newAlertId(),
        ts: now,
        severity: "warn",
        gw_id: lowBat.gw_id,
        node_id: lowBat.node_id,
        rule: "LOW_BATTERY",
        text: `Battery low (${lowBat.vbat_v.toFixed(2)} V) below ${this.settings.lowBatteryVolts.toFixed(2)} V.`,
        ack: false,
      });
    }

    // MISSING_HEARTBEAT (offline or stale)
    const heartbeatMs = this.settings.heartbeatMissingMinutes * 60_000;
    const stale = this.nodes.find((n) => (now - n.last_seen) > heartbeatMs);
    if (stale && Math.random() < 0.18) {
      this.prependAlert({
        id: this.newAlertId(),
        ts: now,
        severity: "critical",
        gw_id: stale.gw_id,
        node_id: stale.node_id,
        rule: "MISSING_HEARTBEAT",
        text: `No heartbeat for > ${this.settings.heartbeatMissingMinutes} minutes.`,
        ack: false,
      });
    }

    // ANOMALY_FLAG (rare)
    if (Math.random() < 0.06) {
      const any = this.nodes[Math.floor(Math.random() * this.nodes.length)];
      this.prependAlert({
        id: this.newAlertId(),
        ts: now,
        severity: "info",
        gw_id: any.gw_id,
        node_id: any.node_id,
        rule: "ANOMALY_FLAG",
        text: "Anomaly flag event (simulated).",
        ack: false,
      });
    }
  }

  private prependAlert(a: Alert) {
    // avoid spamming duplicates back-to-back of same rule/node
    const top = this.alerts[0];
    if (top && top.rule === a.rule && top.node_id === a.node_id && (a.ts - top.ts) < 30_000) return;

    this.alerts = [a, ...this.alerts].slice(0, 80);
  }

  private newAlertId(): string {
    const n = Math.floor(Math.random() * 9000) + 1000;
    return `AL-${n}`;
  }

  // Convenience helpers you can use from APIs:
  ackAlert(id: string): boolean {
    const idx = this.alerts.findIndex((a) => a.id === id);
    if (idx === -1) return false;
    this.alerts[idx] = { ...this.alerts[idx], ack: true };
    this.pushSnapshot();
    return true;
  }

  updateSettings(patch: Partial<Settings>) {
    this.settings = {
      ...this.settings,
      ...patch,
    };
    this.pushSnapshot();
  }

  addGateway(g: Gateway): boolean {
    if (this.gateways.some((x) => x.gw_id === g.gw_id)) return false;
    this.gateways = [...this.gateways, g];
    this.pushSnapshot();
    return true;
  }

  addNode(n: Node): boolean {
    if (this.nodes.some((x) => x.node_id === n.node_id)) return false;
    if (!this.gateways.some((g) => g.gw_id === n.gw_id)) return false;
    this.nodes = [...this.nodes, n];
    this.pushSnapshot();
    return true;
  }
  updateGateway(gw_id: string, patch: Partial<Gateway>): boolean {
  const i = this.gateways.findIndex((g) => g.gw_id === gw_id);
  if (i === -1) return false;
  this.gateways[i] = { ...this.gateways[i], ...patch, gw_id: this.gateways[i].gw_id };
  this.pushSnapshot();
  return true;
}

deleteGateway(gw_id: string, opts?: { force?: boolean }): { ok: boolean; error?: string } {
  const hasNodes = this.nodes.some((n) => n.gw_id === gw_id);
  if (hasNodes && !opts?.force) return { ok: false, error: "Gateway has nodes; delete refused (use force)" };

  // If force: detach nodes (or delete them—your choice; here we detach to "UNASSIGNED")
  if (opts?.force) {
    this.nodes = this.nodes.map((n) => (n.gw_id === gw_id ? { ...n, gw_id: "UNASSIGNED" as any } : n));
  }

  const before = this.gateways.length;
  this.gateways = this.gateways.filter((g) => g.gw_id !== gw_id);
  if (this.gateways.length === before) return { ok: false, error: "Gateway not found" };

  this.pushSnapshot();
  return { ok: true };
}

updateNode(node_id: string, patch: Partial<Node>): boolean {
  const i = this.nodes.findIndex((n) => n.node_id === node_id);
  if (i === -1) return false;
  this.nodes[i] = { ...this.nodes[i], ...patch, node_id: this.nodes[i].node_id };
  this.pushSnapshot();
  return true;
}

deleteNode(node_id: string): boolean {
  const before = this.nodes.length;
  this.nodes = this.nodes.filter((n) => n.node_id !== node_id);
  if (this.nodes.length === before) return false;
  this.pushSnapshot();
  return true;
}

// “Controls” (simulated ops)
setNodeEnabled(node_id: string, enabled: boolean): boolean {
  return this.updateNode(node_id, { status: enabled ? "online" : "offline", last_seen: enabled ? Date.now() : this.nodes.find(n=>n.node_id===node_id)?.last_seen ?? Date.now() } as any);
}

rebootGateway(gw_id: string): boolean {
  const g = this.gateways.find((x) => x.gw_id === gw_id);
  if (!g) return false;

  // simulate reboot
  g.status = "offline";
  g.last_seen = Date.now();

  // bring back online shortly (simulated)
  setTimeout(() => {
    const gw = this.gateways.find((x) => x.gw_id === gw_id);
    if (gw) {
      gw.status = "online";
      gw.last_seen = Date.now();
      this.pushSnapshot();
    }
  }, 1500);

  this.pushSnapshot();
  return true;
}

rebootNode(node_id: string): boolean {
  // simulate reboot: offline briefly then back online on next ticks; here we just mark "last_seen" now and nudge link metrics
  const n = this.nodes.find((x) => x.node_id === node_id);
  if (!n) return false;
  return this.updateNode(node_id, {
    status: "online",
    last_seen: Date.now(),
    rssi: Math.min(-35, n.rssi + 2),
    snr: Math.min(20, n.snr + 0.5),
  } as any);
}

bulkUpdateNodes(node_ids: string[], patch: Partial<Node>): number {
  let count = 0;
  for (const id of node_ids) {
    const ok = this.updateNode(id, patch);
    if (ok) count++;
  }
  return count;
}

bulkEnableNodes(node_ids: string[], enabled: boolean): number {
  let count = 0;
  for (const id of node_ids) {
    const ok = this.setNodeEnabled(id, enabled);
    if (ok) count++;
  }
  return count;
}

bulkRebootNodes(node_ids: string[]): number {
  let count = 0;
  for (const id of node_ids) {
    const ok = this.rebootNode(id);
    if (ok) count++;
  }
  return count;
}

}

export const store = new InMemoryStore();
