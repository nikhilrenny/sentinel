// src/app/settings/SettingsClient.tsx
"use client";

import { useMemo, useState } from "react";
import { useAppSettings } from "@/lib/appSettings";

type SectionKey = "connection" | "telemetry" | "developer";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 56,
        height: 32,
        borderRadius: 999,
        border: "1px solid #e5e7eb",
        background: checked ? "#111827" : "#f3f4f6",
        padding: 3,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: checked ? "flex-end" : "flex-start",
      }}
      aria-label="Toggle"
    >
      <div style={{ width: 26, height: 26, borderRadius: 999, background: "#fff" }} />
    </button>
  );
}

function ReadonlyInput({ value }: { value: string }) {
  return (
    <input
      value={value}
      readOnly
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        background: "#fff",
        fontSize: 13,
      }}
    />
  );
}

export default function SettingsClient() {
  const sections = useMemo(
    () => [
      { key: "connection" as const, label: "Connection" },
      { key: "telemetry" as const, label: "Telemetry & Fleet" },
      { key: "developer" as const, label: "Developer" },
    ],
    []
  );

  const [active, setActive] = useState<SectionKey>("connection");

  const { runMode, setRunMode, rawTelemetry, setRawTelemetry, simData, setSimData, demoScale, setDemoScale } = useAppSettings();
  const modeLive = runMode === "live";

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>Settings</h1>
        <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
          Configure live connectivity and topic settings (placeholders only).
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 18, alignItems: "start" }}>
        {/* Sidebar */}
        <aside
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            background: "#fff",
            padding: 16,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 12 }}>Sections</div>
          <div style={{ display: "grid", gap: 10 }}>
            {sections.map((s) => {
              const isActive = active === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setActive(s.key)}
                  style={{
                    textAlign: "left",
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid " + (isActive ? "#111827" : "#e5e7eb"),
                    background: isActive ? "#f3f4f6" : "#fff",
                    fontWeight: 900,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main */}
        <main>
          {/* Connection panel (this is the UI you want to keep) */}
          {active === "connection" ? (
            <section
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                background: "#fff",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: 18, borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ fontSize: 18, fontWeight: 900 }}>Connection</div>
                <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
                  Configure live connectivity and topic settings (placeholders only).
                </div>
              </div>

              <div style={{ padding: 18 }}>
                <div style={{ display: "grid", gap: 16 }}>
                  {/* Mode */}
                  <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 16 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 13 }}>Mode</div>
                      <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                        Demo is local-only. Live will connect to your backend later.
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Toggle checked={modeLive} onChange={(v) => setRunMode(v ? "live" : "demo")} />
                      <div style={{ fontWeight: 900 }}>{modeLive ? "Live" : "Demo"}</div>
                    </div>
                  </div>

                  <div style={{ height: 1, background: "#f3f4f6" }} />

                  {/* Gateway ID */}
                  <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 16 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 13 }}>Gateway ID</div>
                      <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                        Used to scope subscriptions and display.
                      </div>
                    </div>
                    <ReadonlyInput value="sentinel-gw01 (placeholder)" />
                  </div>

                  {/* Topic pattern */}
                  <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 16 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 13 }}>Topic pattern</div>
                      <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>Read-only for now.</div>
                    </div>
                    <ReadonlyInput value="sentinel/<gatewayId>/v1/telemetry/<nodeId>" />
                  </div>

                  {/* Endpoint / Region */}
                  <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 16 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 13 }}>Endpoint / Region</div>
                      <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                        Wired later when AWS auth is added.
                      </div>
                    </div>
                    <ReadonlyInput value="(placeholder)" />
                  </div>

                  {/* Connect / Disconnect */}
                  <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 16 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 13 }}>Connect / Disconnect</div>
                      <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>Disabled in Level 1.</div>
                    </div>
                    <button
                      type="button"
                      disabled
                      style={{
                        width: 220,
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        background: "#f3f4f6",
                        fontWeight: 900,
                        color: "#9ca3af",
                        cursor: "not-allowed",
                      }}
                    >
                      Connect (placeholder)
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {/* Telemetry & Fleet placeholder */}
          {active === "telemetry" ? (
            <section
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                background: "#fff",
                padding: 18,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 900 }}>Telemetry & Fleet</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
                Controls for the local simulation dataset (Demo mode) and what the UI renders.
              </div>

              <div style={{ height: 14 }} />

              {/* Sim dataset */}
              <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 16, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 13 }}>Simulation dataset</div>
                  <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                    When enabled (and Mode=Demo), all pages render realistic gateway + node telemetry.
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Toggle checked={simData} onChange={setSimData} />
                  <div style={{ fontWeight: 900 }}>{simData ? "Enabled" : "Disabled"}</div>
                </div>
              </div>

              <div style={{ height: 12 }} />

              {/* Scale */}
              <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 16, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 13 }}>Fleet size (demo)</div>
                  <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                    Controls how many nodes are simulated across multiple gateways.
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {[10, 100, 1000].map((n) => {
                    const isActive = demoScale === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setDemoScale(n as any)}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "1px solid " + (isActive ? "#111827" : "#e5e7eb"),
                          background: isActive ? "#111827" : "#fff",
                          color: isActive ? "#fff" : "#111827",
                          fontWeight: 900,
                          cursor: "pointer",
                          minWidth: 72,
                        }}
                      >
                        {n}
                      </button>
                    );
                  })}
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {modeLive ? "(ignored in Live)" : "(applies in Demo)"}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {/* Developer placeholder (rawTelemetry persisted) */}
          {active === "developer" ? (
            <section
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                background: "#fff",
                padding: 18,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 900 }}>Developer</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
                Diagnostic toggles. Raw Telemetry is persisted.
              </div>

              <div style={{ height: 12 }} />

              <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 16, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 13 }}>Raw Telemetry</div>
                  <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                    If enabled, UI can show raw payload JSON where supported.
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Toggle checked={rawTelemetry} onChange={setRawTelemetry} />
                  <div style={{ fontWeight: 900 }}>{rawTelemetry ? "Enabled" : "Disabled"}</div>
                </div>
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
