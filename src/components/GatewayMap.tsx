type Health = "green" | "amber" | "red" | "grey";

export function GatewayMap({
  points,
}: {
  points: { id: string; label: string; name: string; lat: number; lon: number; health: Health }[];
}) {
  const W = 900;
  const H = 360;

  function xy(lat: number, lon: number) {
    // Equirectangular projection: lon [-180..180] → x [0..W], lat [90..-90] → y [0..H]
    const x = ((lon + 180) / 360) * W;
    const y = ((90 - lat) / 180) * H;
    return { x, y };
  }

  function color(h: Health) {
    return h === "green" ? "#16a34a" : h === "amber" ? "#f59e0b" : h === "red" ? "#dc2626" : "#9ca3af";
  }

  return (
    <div style={{ padding: 12 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" style={{ border: "1px solid #eee", borderRadius: 12 }}>
        {/* Background */}
        <rect x="0" y="0" width={W} height={H} fill="#ffffff" />
        {/* Light grid */}
        {Array.from({ length: 9 }).map((_, i) => {
          const y = (i * H) / 8;
          return <line key={`gy-${i}`} x1="0" y1={y} x2={W} y2={y} stroke="#f2f2f2" />;
        })}
        {Array.from({ length: 13 }).map((_, i) => {
          const x = (i * W) / 12;
          return <line key={`gx-${i}`} x1={x} y1="0" x2={x} y2={H} stroke="#f2f2f2" />;
        })}

        {/* Points */}
        {points.map((p) => {
          const { x, y } = xy(p.lat, p.lon);
          return (
            <g key={p.id}>
              <circle cx={x} cy={y} r="6" fill={color(p.health)} />
              <circle cx={x} cy={y} r="10" fill="transparent" stroke={color(p.health)} strokeOpacity="0.25" />
              <text x={x + 10} y={y - 8} fontSize="12" fill="#111" fontWeight="700">
                {p.id}
              </text>
              <text x={x + 10} y={y + 8} fontSize="11" fill="#555">
                {p.name}
              </text>
            </g>
          );
        })}
      </svg>

      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, opacity: 0.75 }}>
        <LegendItem label="Healthy" color="#16a34a" />
        <LegendItem label="Degraded" color="#f59e0b" />
        <LegendItem label="Critical" color="#dc2626" />
        <LegendItem label="Historical" color="#9ca3af" />
      </div>
    </div>
  );
}

function LegendItem({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 999, background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}
