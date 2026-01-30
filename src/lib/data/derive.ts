// src/lib/data/derive.ts

import type { GatewayRegistryItem } from "@/lib/demo/universe";
import type { NodeRegistryItem, TelemetryMessage } from "@/lib/demo/types";
import type { Health, GatewayMapPoint } from "@/components/maps/GatewayLiveMap";

function parseTs(iso?: string): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

export function isNodeOnline(m: TelemetryMessage | undefined, nowMs: number, ttlMs = 12_000): boolean {
  if (!m) return false;
  return nowMs - parseTs(m.timestamp) <= ttlMs;
}

export function deriveHealthForGateway(args: {
  gateway_id: string;
  nodes: NodeRegistryItem[];
  latestByNode: Record<string, TelemetryMessage | undefined>;
  nowMs: number;
}): { health: Health; online: number; total: number; alerts: number } {
  const { gateway_id, nodes, latestByNode, nowMs } = args;
  const mine = nodes.filter((n) => n.gateway_id === gateway_id);
  const total = mine.length;
  let online = 0;
  let degraded = 0;
  let alerts = 0;

  for (const n of mine) {
    const m = latestByNode[n.node_id];
    if (isNodeOnline(m, nowMs)) online++;
    if (m) {
      // degraded link flag
      if ((m.status_flags & (1 << 6)) !== 0) degraded++;
      // any "alarm-ish" flags count towards alert pressure
      if ((m.status_flags & ((1 << 1) | (1 << 3) | (1 << 5))) !== 0) alerts++;
      // seismic trigger also counts
      if (m.profile === "sms" && (m.payload as any)?.triggered) alerts++;
    }
  }

  if (total === 0) return { health: "grey", online: 0, total: 0, alerts: 0 };
  const onlinePct = online / total;
  const degradedPct = degraded / total;

  let health: Health = "green";
  if (onlinePct < 0.6) health = "red";
  else if (onlinePct < 0.85) health = "amber";
  else if (degradedPct > 0.2) health = "amber";

  return { health, online, total, alerts };
}

export function buildGatewayMapPoints(args: {
  gateways: GatewayRegistryItem[];
  nodes: NodeRegistryItem[];
  latestByNode: Record<string, TelemetryMessage | undefined>;
  nowMs: number;
}): GatewayMapPoint[] {
  const { gateways, nodes, latestByNode, nowMs } = args;
  return gateways.map((g) => {
    const s = deriveHealthForGateway({ gateway_id: g.gateway_id, nodes, latestByNode, nowMs });
    const label = `${g.region} · ${g.backhaul.toUpperCase()} · ${s.online}/${s.total} nodes online`;
    return {
      id: g.gateway_id,
      name: g.display_name,
      label,
      lat: g.location.lat,
      lon: g.location.lon,
      health: s.total === 0 ? "grey" : s.health,
    };
  });
}

export function countRegions(gateways: GatewayRegistryItem[]): number {
  return new Set(gateways.map((g) => g.region)).size;
}