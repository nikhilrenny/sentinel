// src/lib/demo/useDemoDataSource.ts
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DemoScale } from "@/lib/appSettings";
import { buildDemoRegistry } from "./registry";
import { createDemoTelemetryStream } from "./telemetry";
import type { NodeRegistryItem, TelemetryMessage } from "./types";

export type DemoSnapshot = {
  registry: NodeRegistryItem[];
  latestByNode: Record<string, TelemetryMessage | undefined>;
  lastUpdatedAt: number; // ms epoch
};

function mapToRecord(map: Map<string, TelemetryMessage>): Record<string, TelemetryMessage> {
  const out: Record<string, TelemetryMessage> = {};
  for (const [k, v] of map.entries()) out[k] = v;
  return out;
}

export function useDemoDataSource(scale: DemoScale, gatewayId = "sentinel-gw01"): DemoSnapshot {
  const registry = useMemo(() => buildDemoRegistry(scale, gatewayId), [scale, gatewayId]);

  // Ref-backed ingestion buffer (never read during render)
  const latestMapRef = useRef<Map<string, TelemetryMessage>>(new Map());
  const dirtyRef = useRef<boolean>(false);

  // Render-safe state
  const [latestByNode, setLatestByNode] = useState<Record<string, TelemetryMessage | undefined>>({});
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(() => Date.now());

  useEffect(() => {
    // Reset buffers when scale/gateway changes
    latestMapRef.current = new Map();
    dirtyRef.current = false;

    // Reset render state without doing it "synchronously on mount" in a way your rule hates
    // (scheduled to next macrotask)
    const resetTimer = setTimeout(() => {
      setLatestByNode({});
      setLastUpdatedAt(Date.now());
    }, 0);

    const stream = createDemoTelemetryStream(registry, {
      tickMs: 1000,
      offlinePct: scale === 10 ? 0.05 : scale === 100 ? 0.03 : 0.02,
      degradedPct: scale === 10 ? 0.12 : scale === 100 ? 0.08 : 0.06,
    });

    const off = stream.onMessage((m) => {
      latestMapRef.current.set(m.node_id, m);
      dirtyRef.current = true;
    });

    stream.start();

    // Throttle UI refresh: copy ref buffer -> state
    const intervalMs = scale === 1000 ? 500 : 250; // 2 Hz for 1000 nodes, 4 Hz otherwise
    const uiTick = setInterval(() => {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;

      // SAFE: reading refs inside an effect callback is allowed
      setLatestByNode(mapToRecord(latestMapRef.current));
      setLastUpdatedAt(Date.now());
    }, intervalMs);

    return () => {
      clearTimeout(resetTimer);
      off();
      stream.stop();
      clearInterval(uiTick);
    };
  }, [registry, scale]);

  return useMemo(
    () => ({
      registry,
      latestByNode,
      lastUpdatedAt,
    }),
    [registry, latestByNode, lastUpdatedAt]
  );
}
