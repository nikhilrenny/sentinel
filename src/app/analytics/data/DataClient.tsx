"use client";

type Row = {
  ts: string;          // timestamp ISO
  gatewayId: string;
  nodeId: string;
  profile: string;
  role: string;
  networks: string;    // e.g. "lora, mesh"
  summary: string;     // short message preview
};

export default function DataClient() {
  // Placeholder rows (we’ll wire real data next)
  const rows: Row[] = [];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Header */}
      {/* <div> 
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Data</h1>
        <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
          Browse telemetry from gateways and nodes
        </div>
      </div> */}

      {/* Filters (placeholder UI) */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: 14,
          background: "#fff",
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: 12,
        }}
      >
        <input
          placeholder="Search gatewayId / nodeId"
          style={{
            width: "100%",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: "10px 12px",
            outline: "none",
          }}
        />
        <select style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px" }}>
          <option>Last 15 min</option>
          <option>Last 1 hour</option>
          <option>Last 24 hours</option>
          <option>Custom (later)</option>
        </select>
        <select style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px" }}>
          <option>All profiles</option>
          <option>svs</option>
          <option>aaq</option>
          <option>sms</option>
          <option>sss</option>
          <option>tsr</option>
        </select>
        <select style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px" }}>
          <option>All networks</option>
          <option>lora</option>
          <option>mesh</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", overflow: "hidden" }}>
        <div style={{ padding: 14, borderBottom: "1px solid #e5e7eb", fontWeight: 800 }}>Telemetry</div>

        {rows.length === 0 ? (
          <div style={{ padding: 14, color: "#6b7280", fontSize: 13 }}>No data yet.</div>
        ) : (
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left" }}>
                  {["Time", "Gateway", "Node", "Profile", "Role", "Networks", "Summary"].map((h) => (
                    <th
                      key={h}
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        fontWeight: 700,
                        padding: "10px 14px",
                        borderBottom: "1px solid #e5e7eb",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid #f3f4f6", whiteSpace: "nowrap" }}>
                      {r.ts}
                    </td>
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid #f3f4f6" }}>{r.gatewayId}</td>
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid #f3f4f6" }}>{r.nodeId}</td>
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid #f3f4f6" }}>{r.profile}</td>
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid #f3f4f6" }}>{r.role}</td>
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid #f3f4f6" }}>{r.networks}</td>
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid #f3f4f6" }}>{r.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
