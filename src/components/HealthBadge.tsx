export function HealthBadge({ health }: { health: "green" | "amber" | "red" | "grey" }) {
  const label =
    health === "green" ? "HEALTHY" : health === "amber" ? "DEGRADED" : health === "red" ? "CRITICAL" : "HISTORICAL";

  const dot =
    health === "green" ? "#16a34a" : health === "amber" ? "#f59e0b" : health === "red" ? "#dc2626" : "#9ca3af";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        border: "1px solid #e5e5e5",
        borderRadius: 999,
        padding: "4px 10px",
        background: "white",
        fontSize: 12,
        fontWeight: 900,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: dot }} />
      {label}
    </span>
  );
}
