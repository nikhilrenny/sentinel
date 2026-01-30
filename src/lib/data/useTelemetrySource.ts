// src/lib/data/useTelemetrySource.ts
"use client";

import { useMemo } from "react";
import { useAppSettings } from "@/lib/appSettings";
import { useDemoUniverseDataSource } from "@/lib/demo/useDemoUniverseDataSource";
import type { GatewayRegistryItem } from "@/lib/demo/universe";
import type { NodeRegistryItem, TelemetryMessage } from "@/lib/demo/types";

export type TelemetrySnapshot = {
  enabled: boolean;
  runMode: "demo" | "live";
  demoScale: 10 | 100 | 1000;

  gateways: GatewayRegistryItem[];
  nodes: NodeRegistryItem[];
  latestByNode: Record<string, TelemetryMessage | undefined>;
  lastUpdatedAt: number;
};

export function useTelemetrySource(): TelemetrySnapshot {
  const { runMode, demoScale, simData } = useAppSettings();

  const demo = useDemoUniverseDataSource(demoScale);

  const enabled = runMode === "demo" && simData;

  return useMemo(
    () =>
      enabled
        ? {
            enabled,
            runMode,
            demoScale,
            gateways: demo.gateways,
            nodes: demo.nodes,
            latestByNode: demo.latestByNode,
            lastUpdatedAt: demo.lastUpdatedAt,
          }
        : {
            enabled,
            runMode,
            demoScale,
            gateways: [],
            nodes: [],
            latestByNode: {},
            lastUpdatedAt: Date.now(),
          },
    [enabled, runMode, demoScale, demo.gateways, demo.nodes, demo.latestByNode, demo.lastUpdatedAt]
  );
}
