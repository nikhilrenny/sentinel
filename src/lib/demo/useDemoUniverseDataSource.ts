// src/lib/demo/useDemoUniverseDataSource.ts
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DemoScale } from "@/lib/appSettings";
import type { TelemetryMessage } from "./types";
import { createDemoTelemetryStream } from "./telemetry";
import { buildDemoUniverse, type DemoUniverse } from "./universe";

export type DemoUniverseSnapshot = DemoUniverse & {
  latestByNode: Record<string, TelemetryMessage | undefined>;
  lastUpdatedAt: number; // ms epoch
};

function mapToRecord(map: Map<string, TelemetryMessage>): Record<string, TelemetryMessage> {
  const out: Record<string, TelemetryMessage> = {};
  for (const [k, v] of map.entries()) out[k] = v;
  return out;
}

export function useDemoUniverseDataSource(scale: DemoScale): DemoUniverseSnapshot {
  const universe = useMemo(() => buildDemoUniverse(scale), [scale]);

  // Ref-backed ingestion buffer (never read during render)
  const latestMapRef = useRef<Map<string, TelemetryMessage>>(new Map());
  const dirtyRef = useRef<boolean>(false);

  // Render-safe state
  const [latestByNode, setLatestByNode] = useState<Record<string, TelemetryMessage | undefined>>({});
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(() => Date.now());

  useEffect(() => {
    latestMapRef.current = new Map();
    dirtyRef.current = false;

    const resetTimer = setTimeout(() => {
      setLatestByNode({});
      setLastUpdatedAt(Date.now());
    }, 0);

    const stream = createDemoTelemetryStream(universe.nodes, {
      tickMs: 1000,
      offlinePct: scale === 10 ? 0.05 : scale === 100 ? 0.03 : 0.02,
      degradedPct: scale === 10 ? 0.12 : scale === 100 ? 0.08 : 0.06,
    });

    const off = stream.onMessage((m) => {
      latestMapRef.current.set(m.node_id, m);
      dirtyRef.current = true;
    });

    stream.start();

    const intervalMs = scale === 1000 ? 500 : 250;
    const uiTick = setInterval(() => {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      setLatestByNode(mapToRecord(latestMapRef.current));
      setLastUpdatedAt(Date.now());
    }, intervalMs);

    return () => {
      clearTimeout(resetTimer);
      off();
      stream.stop();
      clearInterval(uiTick);
    };
  }, [universe, scale]);

  return useMemo(
    () => ({
      ...universe,
      latestByNode,
      lastUpdatedAt,
    }),
    [universe, latestByNode, lastUpdatedAt]
  );
}
