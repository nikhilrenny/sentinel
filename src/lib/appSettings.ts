// src/lib/appSettings.ts
"use client";

import { useCallback, useEffect, useState } from "react";

export type RunMode = "demo" | "live";

const KEY_MODE = "sentinel:runMode";
const KEY_RAW = "sentinel:rawTelemetry";

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function getRunMode(): RunMode {
  const v = safeGet(KEY_MODE);
  return v === "live" ? "live" : "demo";
}

export function setRunMode(mode: RunMode) {
  safeSet(KEY_MODE, mode);
}

export function getRawTelemetryEnabled(): boolean {
  return safeGet(KEY_RAW) === "1";
}

export function setRawTelemetryEnabled(v: boolean) {
  safeSet(KEY_RAW, v ? "1" : "0");
}

/**
 * Persisted settings hook:
 * - No setState-in-effect initialisation (avoids the error you saw)
 * - Writes through to localStorage
 * - Optional: sync across tabs via the 'storage' event
 */
export function useAppSettings() {
  const [runMode, _setRunMode] = useState<RunMode>(() => getRunMode());
  const [rawTelemetry, _setRawTelemetry] = useState<boolean>(() => getRawTelemetryEnabled());
  const [demoScale, _setDemoScale] = useState<DemoScale>(() => getDemoScale());

  const updateDemoScale = useCallback((v: DemoScale) => {
  _setDemoScale(v);
  setDemoScale(v);
  }, []);

  const updateRunMode = useCallback((mode: RunMode) => {
    _setRunMode(mode);
    setRunMode(mode);
  }, []);

  const updateRawTelemetry = useCallback((v: boolean) => {
    _setRawTelemetry(v);
    setRawTelemetryEnabled(v);
  }, []);

  // Keep multiple tabs in sync (optional but useful)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY_MODE) _setRunMode(getRunMode());
      if (e.key === KEY_RAW) _setRawTelemetry(getRawTelemetryEnabled());
      if (e.key === KEY_DEMO_SCALE) _setDemoScale(getDemoScale());

    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return {
    runMode,
    setRunMode: updateRunMode,
    rawTelemetry,
    setRawTelemetry: updateRawTelemetry,
    demoScale,
    setDemoScale: updateDemoScale,
  };
}

// --- Demo scale preset (Step 2) ---
export type DemoScale = 10 | 100 | 1000;

const KEY_DEMO_SCALE = "sentinel:demoScale";

export function getDemoScale(): DemoScale {
  const v = safeGet(KEY_DEMO_SCALE);
  if (v === "1000") return 1000;
  if (v === "100") return 100;
  return 10;
}

export function setDemoScale(v: DemoScale) {
  safeSet(KEY_DEMO_SCALE, String(v));
}
