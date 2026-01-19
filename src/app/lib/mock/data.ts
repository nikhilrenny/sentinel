export type Gateway = {
  gw_id: string;
  name: string;
  site: string;
  status: "online" | "offline";
  last_seen: number; // epoch ms
};

export type Node = {
  node_id: string;
  gw_id: string;
  net: "lora" | "thread";
  status: "online" | "offline";
  last_seen: number; // epoch ms
  rssi: number;
  snr: number;
  vbat_v: number;
};

export type Alert = {
  id: string;
  ts: number; // epoch ms
  severity: "info" | "warn" | "critical";
  gw_id: string;
  node_id: string;
  rule: string;
  text: string;
  ack: boolean;
};

const now = Date.now();

export const gateways: Gateway[] = [
  { gw_id: "BS-FOREST-01", name: "Forest Gateway 01", site: "New Forest", status: "online", last_seen: now - 15_000 },
  { gw_id: "BS-BRIDGE-01", name: "Bridge Gateway 01", site: "Test Bridge", status: "online", last_seen: now - 9_000 },
];

export const nodes: Node[] = Array.from({ length: 18 }).map((_, i) => {
  const gw_id = i < 10 ? "BS-FOREST-01" : "BS-BRIDGE-01";
  const net = i % 2 === 0 ? "lora" : "thread";
  const online = i % 7 !== 0; // some offline
  return {
    node_id: `${net.toUpperCase()}-${String(i + 1).padStart(4, "0")}`,
    gw_id,
    net,
    status: online ? "online" : "offline",
    last_seen: online ? now - (10_000 + i * 1_200) : now - (15 * 60_000 + i * 5_000),
    rssi: -55 - (i % 12) * 3,
    snr: 12 - (i % 10) * 1.1,
    vbat_v: 4.15 - (i % 20) * 0.03,
  };
});

export const alerts: Alert[] = [
  {
    id: "AL-0001",
    ts: now - 3 * 60_000,
    severity: "warn",
    gw_id: "BS-FOREST-01",
    node_id: "LORA-0007",
    rule: "LOW_BATTERY",
    text: "Battery below threshold (3.45 V).",
    ack: false,
  },
  {
    id: "AL-0002",
    ts: now - 9 * 60_000,
    severity: "critical",
    gw_id: "BS-BRIDGE-01",
    node_id: "THREAD-0014",
    rule: "MISSING_HEARTBEAT",
    text: "No heartbeat for > 10 minutes.",
    ack: false,
  },
  {
    id: "AL-0003",
    ts: now - 22 * 60_000,
    severity: "info",
    gw_id: "BS-FOREST-01",
    node_id: "THREAD-0002",
    rule: "ANOMALY_FLAG",
    text: "Node flagged anomaly event (simulated).",
    ack: true,
  },
];
