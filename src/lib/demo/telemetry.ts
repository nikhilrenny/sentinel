// src/lib/demo/telemetry.ts
import type { NodeRegistryItem, TelemetryMessage, Links, SVS, AAQ, SMS, SSS, TSR } from "./types";

// Status bits (as agreed)
const BIT_SENSOR_DOMAIN_OFF = 1 << 0;
const BIT_LOW_BATTERY = 1 << 1;
const BIT_CHARGING = 1 << 2;
const BIT_SENSOR_FAULT = 1 << 3;
const BIT_TIME_UNSYNCED = 1 << 4;
const BIT_TAMPER = 1 << 5;
const BIT_LINK_DEGRADED = 1 << 6;
const BIT_MEMORY_LOW = 1 << 7;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function jitter(base: number, amt: number) {
  return base + (Math.random() * 2 - 1) * amt;
}

function nowIso() {
  return new Date().toISOString();
}

function buildLinks(n: NodeRegistryItem, health: { link: number }): Links {
  // health.link in [0..1] where 1 = great
  const l = clamp(health.link, 0, 1);

  const links: Links = {};
  if (n.networks.includes("lora")) {
    // rssi: -40 (excellent) to -120 (bad)
    const rssi = -120 + l * 80 + jitter(0, 3);
    // snr: -20 to +10 typical
    const snr = -20 + l * 30 + jitter(0, 1.5);
    links.lora = {
      rssi_dbm: Math.round(rssi),
      snr_db: Math.round(snr * 10) / 10,
      freq_mhz: 868.1,
      sf: l > 0.7 ? 7 : l > 0.45 ? 9 : 12,
      bw_khz: 125,
    };
  }
  if (n.networks.includes("mesh")) {
    const rssi = -105 + l * 55 + jitter(0, 3);
    links.mesh = {
      rssi_dbm: Math.round(rssi),
      lqi: Math.round(20 + l * 235),
      channel: 15,
    };
  }
  return links;
}

function buildPayload(n: NodeRegistryItem, t: number): TelemetryMessage["payload"] {
  // t is seconds since start (roughly)
  switch (n.profile) {
    case "svs": {
      const base = 0.02 + 0.01 * Math.sin(t / 7);
      const accel_rms_g = clamp(jitter(base, 0.01), 0, 1);
      const accel_peak_g = clamp(accel_rms_g * (2.5 + Math.random()), 0, 4);
      const dominant_freq_hz = clamp(8 + 6 * Math.sin(t / 11) + jitter(0, 1.5), 1, 80);
      const tilt_x_deg = jitter(0, 0.2);
      const tilt_y_deg = jitter(0, 0.2);
      const strain_ue = jitter(30, 10);

      const p: SVS = {
        accel_rms_g: Math.round(accel_rms_g * 1000) / 1000,
        accel_peak_g: Math.round(accel_peak_g * 1000) / 1000,
        dominant_freq_hz: Math.round(dominant_freq_hz * 10) / 10,
        tilt_x_deg: Math.round(tilt_x_deg * 100) / 100,
        tilt_y_deg: Math.round(tilt_y_deg * 100) / 100,
        strain_ue: Math.round(strain_ue),
        bandpower: {
          bp_0_10: Math.round(10 + 10 * Math.random()),
          bp_10_50: Math.round(20 + 20 * Math.random()),
          bp_50_200: Math.round(5 + 10 * Math.random()),
        },
      };
      return p;
    }

    case "aaq": {
      const voc = clamp(120 + 60 * Math.sin(t / 13) + jitter(0, 15), 0, 500);
      const pm1 = clamp(2 + 2 * Math.sin(t / 17) + jitter(0, 1), 0, 80);
      const pm25 = clamp(4 + 4 * Math.sin(t / 19) + jitter(0, 2), 0, 120);
      const pm10 = clamp(6 + 6 * Math.sin(t / 23) + jitter(0, 3), 0, 200);
      const p: AAQ = {
        voc_index: Math.round(voc),
        pm1_0_ugm3: Math.round(pm1 * 10) / 10,
        pm2_5_ugm3: Math.round(pm25 * 10) / 10,
        pm10_ugm3: Math.round(pm10 * 10) / 10,
        co2_ppm: Math.round(clamp(450 + 100 * Math.sin(t / 31) + jitter(0, 25), 350, 2000)),
        smoke_score: Math.round(clamp(10 + 20 * Math.random(), 0, 100)),
      };
      return p;
    }

    case "sms": {
      const pga = clamp(0.005 + 0.01 * Math.abs(Math.sin(t / 9)) + (Math.random() > 0.995 ? 0.4 : 0), 0, 3);
      const pgv = clamp(0.2 + 0.8 * Math.abs(Math.sin(t / 15)) + (pga > 0.2 ? 15 + Math.random() * 30 : 0), 0, 200);
      const dom = clamp(1 + 6 * Math.abs(Math.sin(t / 21)) + jitter(0, 0.5), 0.2, 40);
      const p: SMS = {
        pga_g: Math.round(pga * 1000) / 1000,
        pgv_cms: Math.round(pgv * 10) / 10,
        dominant_freq_hz: Math.round(dom * 10) / 10,
        triggered: pga > 0.15,
      };
      return p;
    }

    case "sss": {
      const isAg = (n.node_id.charCodeAt(n.node_id.length - 1) % 2) === 0;
      const vwc = clamp(0.18 + 0.06 * Math.sin(t / 40) + jitter(0, 0.01), 0, 0.7);
      const st = clamp(10 + 6 * Math.sin(t / 60) + jitter(0, 0.3), -10, 45);
      const ec = clamp(0.6 + 0.3 * Math.sin(t / 55) + jitter(0, 0.05), 0, 4);

      const spk = Array.from({ length: 8 }, () => Math.round(clamp(10 + 40 * Math.random(), 0, 100)));

      const p: SSS = {
        classifier: isAg ? "agriculture" : "geohazard",
        soil_moisture_vwc: Math.round(vwc * 1000) / 1000,
        soil_temp_c: Math.round(st * 10) / 10,
        soil_ec_ms_cm: Math.round(ec * 1000) / 1000,
        spk_levels: spk,
        tilt_deg: isAg ? undefined : Math.round(clamp(1 + 2 * Math.sin(t / 80) + jitter(0, 0.3), 0, 15) * 10) / 10,
      };
      return p;
    }

    case "tsr": {
      const p: TSR = {
        kind: "radio",
        packets_rx: Math.round(200 + 50 * Math.abs(Math.sin(t / 10)) + jitter(0, 10)),
        packets_tx: Math.round(100 + 30 * Math.abs(Math.sin(t / 13)) + jitter(0, 8)),
        rx_rate_s: Math.round(clamp(0.2 + 1.5 * Math.abs(Math.sin(t / 9)), 0, 10) * 10) / 10,
      };
      return p;
    }
  }
}

export type DemoStreamOptions = {
  tickMs?: number; // base tick, default 1000
  offlinePct?: number; // default 0.03
  degradedPct?: number; // default 0.07
};

export type DemoEmitter = {
  start(): void;
  stop(): void;
  onMessage(fn: (m: TelemetryMessage) => void): () => void;
};

export function createDemoTelemetryStream(nodes: NodeRegistryItem[], opts: DemoStreamOptions = {}): DemoEmitter {
  const tickMs = opts.tickMs ?? 1000;
  const offlinePct = opts.offlinePct ?? 0.03;
  const degradedPct = opts.degradedPct ?? 0.07;

  const listeners = new Set<(m: TelemetryMessage) => void>();
  const seq = new Map<string, number>();
  const startedAt = Date.now();
  let timer: ReturnType<typeof setInterval> | null = null;

  // Per-node “health” state
  const offline = new Set<string>();
  const degraded = new Set<string>();

  // Initialise offline/degraded sets deterministically-ish
  nodes.forEach((n) => {
    const r = Math.random();
    if (r < offlinePct) offline.add(n.node_id);
    else if (r < offlinePct + degradedPct) degraded.add(n.node_id);
  });

  function emit(m: TelemetryMessage) {
    for (const fn of listeners) fn(m);
  }

  function tick() {
    const tSec = (Date.now() - startedAt) / 1000;

    // Small chance each tick to flip some nodes between states
    if (Math.random() > 0.97) {
      const n = nodes[Math.floor(Math.random() * nodes.length)];
      if (offline.has(n.node_id)) offline.delete(n.node_id);
      else if (degraded.has(n.node_id)) degraded.delete(n.node_id);
      else if (Math.random() > 0.5) degraded.add(n.node_id);
      else offline.add(n.node_id);
    }

    for (const n of nodes) {
      // Per-node jitter to prevent synchronized updates at scale
      if (nodes.length >= 100 && Math.random() > 0.35) continue; // thin updates at high scale
      if (nodes.length >= 1000 && Math.random() > 0.15) continue;

      if (offline.has(n.node_id)) continue;

      const s = (seq.get(n.node_id) ?? 0) + 1;
      seq.set(n.node_id, s);

      // health numbers
      const linkQuality = degraded.has(n.node_id) ? 0.35 + Math.random() * 0.25 : 0.7 + Math.random() * 0.3;
      const batt = degraded.has(n.node_id)
        ? 3.55 + 0.15 * Math.sin(tSec / 200) + (Math.random() * 0.03)
        : 3.75 + 0.25 * Math.sin(tSec / 240) + (Math.random() * 0.03);

      let flags = 0;

      // battery flags
      const battery_v = clamp(batt, 3.1, 4.2);
      if (battery_v < 3.45) flags |= BIT_LOW_BATTERY;

      // occasional conditions
      if (Math.random() > 0.996) flags |= BIT_SENSOR_FAULT;
      if (Math.random() > 0.995) flags |= BIT_TAMPER;
      if (Math.random() > 0.993) flags |= BIT_TIME_UNSYNCED;
      if (Math.random() > 0.992) flags |= BIT_MEMORY_LOW;

      if (degraded.has(n.node_id)) flags |= BIT_LINK_DEGRADED;

      // very rare sensor domain off simulation
      if (Math.random() > 0.9992) flags |= BIT_SENSOR_DOMAIN_OFF;

      // temperature/humidity
      const temperature_c = clamp(18 + 4 * Math.sin(tSec / 60) + jitter(0, 0.4), -10, 55);
      const humidity_rh = clamp(55 + 10 * Math.sin(tSec / 70) + jitter(0, 1.5), 10, 99);

      const msg: TelemetryMessage = {
        node_id: n.node_id,
        gateway_id: n.gateway_id,
        timestamp: nowIso(),
        seq: s,
        profile: n.profile,
        role: n.role,
        networks: n.networks,
        battery_v: Math.round(battery_v * 1000) / 1000,
        uptime_s: Math.max(0, Math.floor(tSec)),
        status_flags: flags,
        temperature_c: Math.round(temperature_c * 10) / 10,
        humidity_rh: Math.round(humidity_rh * 10) / 10,
        links: buildLinks(n, { link: linkQuality }),
        payload: buildPayload(n, tSec),
      };

      emit(msg);
    }
  }

  return {
    start() {
      if (timer) return;
      timer = setInterval(tick, tickMs);
    },
    stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    },
    onMessage(fn: (m: TelemetryMessage) => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
