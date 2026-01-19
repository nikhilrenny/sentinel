export type Gateway = {
  gw_id: string;
  name: string;
  site: string;
  status: "online" | "offline";
  last_seen: number; // epoch ms
  lat: number;
  lon: number;
};

export type Node = {
  node_id: string;
  gw_id: string;
  net: "lora" | "thread";
  status: "online" | "offline";
  last_seen: number; // epoch ms

  // link metrics
  rssi: number; // dBm
  snr: number;  // dB

  // power
  vbat_v: number; // volts

  // simulated environment (useful for charts later)
  temp_c: number;
  hum_rh: number;

  // position
  lat: number;
  lon: number;
};

export type Alert = {
  id: string;
  ts: number; // epoch ms
  severity: "info" | "warn" | "critical";
  gw_id: string;
  node_id: string;
  rule: "LOW_BATTERY" | "MISSING_HEARTBEAT" | "ANOMALY_FLAG";
  text: string;
  ack: boolean;
};

export type Settings = {
  lowBatteryVolts: number;         // e.g. 3.55
  heartbeatMissingMinutes: number; // e.g. 10
};

const now = Date.now();

// Southampton / New Forest-ish demo coordinates (adjust later)
export const gateways: Gateway[] = [
  {
    gw_id: "BS-FOREST-01",
    name: "Forest Gateway 01",
    site: "New Forest",
    status: "online",
    last_seen: now - 15_000,
    lat: 50.872,
    lon: -1.576,
  },
  {
    gw_id: "BS-BRIDGE-01",
    name: "Bridge Gateway 01",
    site: "Southampton Test Bridge",
    status: "online",
    last_seen: now - 9_000,
    lat: 50.909,
    lon: -1.404,
  },
];

function jitterDeg(maxDeg = 0.006) {
  // ~0.006 deg is a few hundred meters; tune to your liking
  return (Math.random() - 0.5) * maxDeg;
}

export const nodes: Node[] = Array.from({ length: 18 }).map((_, i) => {
  const gw = i < 10 ? gateways[0] : gateways[1];
  const net: Node["net"] = i % 2 === 0 ? "lora" : "thread";
  const online = i % 7 !== 0;

  return {
    node_id: `${net.toUpperCase()}-${String(i + 1).padStart(4, "0")}`,
    gw_id: gw.gw_id,
    net,
    status: online ? "online" : "offline",
    last_seen: online ? now - (8_000 + i * 1_200) : now - (18 * 60_000 + i * 5_000),

    rssi: -55 - (i % 12) * 3,
    snr: 12 - (i % 10) * 1.1,
    vbat_v: 4.15 - (i % 20) * 0.03,

    temp_c: 20 + (i % 5) * 0.8,
    hum_rh: 42 + (i % 7) * 1.4,

    lat: gw.lat + jitterDeg(),
    lon: gw.lon + jitterDeg(),
  };
});

export const alerts: Alert[] = [
  {
    id: "AL-0001",
    ts: now - 3 * 60_000,
    severity: "warn",
    gw_id: "BS-FOREST-01",
    node_id: nodes.find((n) => n.gw_id === "BS-FOREST-01")?.node_id ?? "LORA-0001",
    rule: "LOW_BATTERY",
    text: "Battery below threshold (simulated).",
    ack: false,
  },
  {
    id: "AL-0002",
    ts: now - 9 * 60_000,
    severity: "critical",
    gw_id: "BS-BRIDGE-01",
    node_id: nodes.find((n) => n.gw_id === "BS-BRIDGE-01")?.node_id ?? "THREAD-0012",
    rule: "MISSING_HEARTBEAT",
    text: "No heartbeat for > 10 minutes (simulated).",
    ack: false,
  },
  {
    id: "AL-0003",
    ts: now - 22 * 60_000,
    severity: "info",
    gw_id: "BS-FOREST-01",
    node_id: nodes[1]?.node_id ?? "THREAD-0002",
    rule: "ANOMALY_FLAG",
    text: "Node flagged anomaly event (simulated).",
    ack: true,
  },
];

export const settings: Settings = {
  lowBatteryVolts: 3.55,
  heartbeatMissingMinutes: 10,
};
