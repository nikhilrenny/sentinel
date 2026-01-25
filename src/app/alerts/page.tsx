export default function AlertsPage() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/*<div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Alerts</h1>
        <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
          Active issues and recent events (placeholder)
        </div>
      </div>*/}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        {[
          { label: "Active alerts", value: "—" },
          { label: "Critical", value: "—" },
          { label: "Warnings", value: "—" },
          { label: "Last 24h", value: "—" },
        ].map((m) => (
          <div
            key={m.label}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 14,
              background: "#fff",
            }}
          >
            <div style={{ fontSize: 12, color: "#6b7280" }}>{m.label}</div>
            <div style={{ marginTop: 8, fontSize: 20, fontWeight: 900 }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          background: "#fff",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 14, borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ fontWeight: 800 }}>Alert feed</div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
            Rules + severity will be wired after live telemetry is connected.
          </div>
        </div>

        <div style={{ padding: 14 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "0.6fr 1.2fr 1fr 1fr",
              gap: 10,
              fontSize: 12,
              color: "#6b7280",
              paddingBottom: 10,
            }}
          >
            <div>Severity</div>
            <div>Title</div>
            <div>Device</div>
            <div>Time</div>
          </div>

          <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 12, color: "#6b7280", fontSize: 13 }}>
            No alerts yet.
          </div>
        </div>
      </div>
    </div>
  );
}
