"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import type { NodeSummary, TelemetryMessage, MetricValue } from "./types";

export type Alert = {
  id: string;
  ts: number;
  gatewayId: string;
  nodeId?: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  isActive: boolean;
};

type Store = {
  messages: TelemetryMessage[];
  nodes: NodeSummary[];
  alerts: Alert[];
  pushMessage: (m: TelemetryMessage) => void;
  clear: () => void;
};

const Ctx = createContext<Store | null>(null);

function nodeKey(m: TelemetryMessage) {
  return `${m.gatewayId}:${m.nodeType}:${m.nodeId}`;
}

function deriveAlerts(nodes: NodeSummary[]): Alert[] {
  // Minimal starter rules (tune later)
  const out: Alert[] = [];
  const now = Date.now();

  for (const n of nodes) {
    const batt = n.metrics["batt_v"] as MetricValue;
    const pm25 = n.metrics["pm25_ugm3"] as MetricValue;
    const voc = n.metrics["voc_idx"] as MetricValue;
    const accel = n.metrics["accel_rms_g"] as MetricValue;

    // Low battery
    if (typeof batt === "number" && batt < 3.55) {
      out.push({
        id: `batt:${n.key}`,
        ts: now,
        gatewayId: n.gatewayId,
        nodeId: n.nodeId,
        severity: batt < 3.45 ? "critical" : "warning",
        title: "Low battery",
        message: `Battery is ${batt.toFixed(2)} V`,
        isActive: true,
      });
    }

    // Forest fire indicators (LoRa profile)
    if (typeof pm25 === "number" && pm25 > 80) {
      out.push({
        id: `pm25:${n.key}`,
        ts: now,
        gatewayId: n.gatewayId,
        nodeId: n.nodeId,
        severity: pm25 > 150 ? "critical" : "warning",
        title: "Smoke particulate elevated",
        message: `PM2.5 is ${pm25.toFixed(1)} µg/m³`,
        isActive: true,
      });
    }

    if (typeof voc === "number" && voc > 350) {
      out.push({
        id: `voc:${n.key}`,
        ts: now,
        gatewayId: n.gatewayId,
        nodeId: n.nodeId,
        severity: voc > 450 ? "critical" : "warning",
        title: "VOC index elevated",
        message: `VOC index is ${voc}`,
        isActive: true,
      });
    }

    // SHM vibration anomaly (Mesh profile)
    if (typeof accel === "number" && accel > 0.08) {
      out.push({
        id: `vib:${n.key}`,
        ts: now,
        gatewayId: n.gatewayId,
        nodeId: n.nodeId,
        severity: accel > 0.12 ? "critical" : "warning",
        title: "Vibration anomaly",
        message: `accel_rms_g is ${accel}`,
        isActive: true,
      });
    }
  }

  // Sort newest first
  return out.sort((a, b) => b.ts - a.ts);
}

export function SentinelProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<TelemetryMessage[]>([]);

  const pushMessage = (m: TelemetryMessage) => {
    setMessages((prev) => [m, ...prev].slice(0, 2000));
  };

  const nodes: NodeSummary[] = useMemo(() => {
    const map = new Map<string, NodeSummary>();
    for (const m of messages) {
      const k = nodeKey(m);
      if (!map.has(k)) {
        map.set(k, {
          key: k,
          gatewayId: m.gatewayId,
          nodeType: m.nodeType as any,
          nodeId: m.nodeId,
          lastSeenTs: m.ts,
          lastTopic: m.topic,
          metrics: m.metrics,
        });
      }
    }
    return Array.from(map.values());
  }, [messages]);

  const alerts = useMemo(() => deriveAlerts(nodes), [nodes]);

  const clear = () => setMessages([]);

  const value: Store = { messages, nodes, alerts, pushMessage, clear };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSentinel() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSentinel must be used within SentinelProvider");
  return v;
}
