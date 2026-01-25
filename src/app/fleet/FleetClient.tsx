"use client";

import { useMemo, useState } from "react";

type Role = "gateway" | "node";
type Network = "lora" | "mesh";
type Status = "online" | "offline";
type Profile = "svs" | "aaq" | "sms" | "sss" | "tsr";

type Backhaul = "ethernet" | "wifi" | "4g" | "sat" | "unknown";

type DeviceRow = {
  id: string;
  name?: string;
  role: Role;

  profile?: Profile;        // optional (esp. gateways)
  networks?: Network[];     // optional until you wire data
  status?: Status;          // optional until you wire data
  lastSeen?: string;        // optional until you wire data

  // node-only
  gatewayId?: string;

  // gateway-only
  backhaul?: Backhaul;
};

// Typed options (no `any`)
const ROLE_OPTIONS = ["All", "gateway", "node"] as const;
const PROFILE_OPTIONS = ["All", "svs", "aaq", "sms", "sss", "tsr"] as const;
const NETWORK_OPTIONS = ["All", "lora", "mesh"] as const;
const STATUS_OPTIONS = ["All", "online", "offline"] as const;
const BACKHAUL_OPTIONS = ["All", "ethernet", "wifi", "4g", "sat", "unknown"] as const;

type RoleFilter = (typeof ROLE_OPTIONS)[number];
type ProfileFilter = (typeof PROFILE_OPTIONS)[number];
type NetworkFilter = (typeof NETWORK_OPTIONS)[number];
type StatusFilter = (typeof STATUS_OPTIONS)[number];
type BackhaulFilter = (typeof BACKHAUL_OPTIONS)[number];
type GatewayFilter = "All" | string;

function asOneOf<T extends readonly string[]>(value: string, allowed: T): T[number] {
  return (allowed as readonly string[]).includes(value) ? (value as T[number]) : allowed[0];
}

function pillStyle(bg: string) {
  return {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "2px 10px",
    fontSize: 12,
    fontWeight: 700,
    background: bg,
    border: "1px solid #e5e7eb",
    color: "#111827",
    whiteSpace: "nowrap" as const,
  };
}
const EMPTY_DEVICES: DeviceRow[] = [];
export default function FleetClient() {
  // No demo data: start empty. Replace later with store/API data.
  const devices = EMPTY_DEVICES;
  // Filters
  const [q, setQ] = useState("");
  const [role, setRole] = useState<RoleFilter>("All");
  const [profile, setProfile] = useState<ProfileFilter>("All");
  const [network, setNetwork] = useState<NetworkFilter>("All");
  const [status, setStatus] = useState<StatusFilter>("All");
  const [gateway, setGateway] = useState<GatewayFilter>("All");
  const [backhaul, setBackhaul] = useState<BackhaulFilter>("All");

  // Dynamic gateway options (derived from data; empty-safe)
  const gatewayOptions = useMemo(() => {
    const gws = devices.filter((d) => d.role === "gateway").map((d) => d.id);
    return ["All", ...Array.from(new Set(gws))];
  }, [devices]);

  // Filtered rows
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();

    return devices.filter((d) => {
      const dName = d.name ?? d.id;
      const dProfile = d.profile;
      const dNetworks = d.networks ?? [];
      const dStatus = d.status ?? "offline";
      const dBackhaul: Backhaul = d.backhaul ?? "unknown";

      // Search
      if (needle) {
        const hay = `${d.id} ${dName} ${d.gatewayId ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }

      // Role
      if (role !== "All" && d.role !== role) return false;

      // Profile
      if (profile !== "All" && dProfile !== profile) return false;

      // Network
      if (network !== "All" && !dNetworks.includes(network as Network)) return false;

      // Status
      if (status !== "All" && dStatus !== status) return false;

      // Gateway filter:
      // - selecting a gateway shows that gateway AND its nodes
      if (gateway !== "All") {
        if (d.role === "gateway" && d.id !== gateway) return false;
        if (d.role === "node" && d.gatewayId !== gateway) return false;
      }

      // Backhaul filter:
      // - applies to gateways; hides nodes (by design) when backhaul filter is active
      if (backhaul !== "All") {
        if (d.role !== "gateway") return false;
        if (dBackhaul !== backhaul) return false;
      }

      return true;
    });
  }, [devices, q, role, profile, network, status, gateway, backhaul]);

  // Metrics (empty-safe)
  const total = devices.length;
  const onlineCount = devices.filter((d) => (d.status ?? "offline") === "online").length;
  const offlineCount = devices.filter((d) => (d.status ?? "offline") === "offline").length;
  const gatewaysCount = devices.filter((d) => d.role === "gateway").length;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Top metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        {[
          { label: "Total devices", value: String(total) },
          { label: "Online", value: String(onlineCount) },
          { label: "Offline", value: String(offlineCount) },
          { label: "Gateways", value: String(gatewaysCount) },
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

      {/* Unified Devices card */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          background: "#fff",
          overflow: "hidden",
        }}
      >
        {/* Header + filters */}
        <div style={{ padding: 14, borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 900 }}>Devices</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
                Unified view for gateways and nodes. Use filters to narrow scope.
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setQ("");
                setRole("All");
                setProfile("All");
                setNetwork("All");
                setStatus("All");
                setGateway("All");
                setBackhaul("All");
              }}
              style={{
                border: "1px solid #e5e7eb",
                background: "#fff",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr",
              gap: 10,
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search device id/name or gateway id"
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 13,
                outline: "none",
              }}
            />

            <select
              value={role}
              onChange={(e) => setRole(asOneOf(e.target.value, ROLE_OPTIONS))}
              style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", fontSize: 13 }}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  Role: {opt}
                </option>
              ))}
            </select>

            <select
              value={profile}
              onChange={(e) => setProfile(asOneOf(e.target.value, PROFILE_OPTIONS))}
              style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", fontSize: 13 }}
            >
              {PROFILE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  Profile: {opt}
                </option>
              ))}
            </select>

            <select
              value={network}
              onChange={(e) => setNetwork(asOneOf(e.target.value, NETWORK_OPTIONS))}
              style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", fontSize: 13 }}
            >
              {NETWORK_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  Network: {opt}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(asOneOf(e.target.value, STATUS_OPTIONS))}
              style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", fontSize: 13 }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  Status: {opt}
                </option>
              ))}
            </select>

            <select
              value={gateway}
              onChange={(e) => setGateway(e.target.value)}
              style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", fontSize: 13 }}
            >
              {gatewayOptions.map((opt) => (
                <option key={opt} value={opt}>
                  Gateway: {opt}
                </option>
              ))}
            </select>

            <select
              value={backhaul}
              onChange={(e) => setBackhaul(asOneOf(e.target.value, BACKHAUL_OPTIONS))}
              style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", fontSize: 13 }}
            >
              {BACKHAUL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  Backhaul: {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
            Showing <span style={{ fontWeight: 800, color: "#111827" }}>{filtered.length}</span> of{" "}
            <span style={{ fontWeight: 800, color: "#111827" }}>{devices.length}</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.35fr 0.7fr 0.7fr 0.8fr 0.8fr 0.8fr 0.9fr 0.7fr",
              gap: 10,
              fontSize: 12,
              color: "#6b7280",
              paddingBottom: 10,
            }}
          >
            <div>Device</div>
            <div>Role</div>
            <div>Status</div>
            <div>Profile</div>
            <div>Network</div>
            <div>Gateway</div>
            <div>Backhaul</div>
            <div>Manage</div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 12, color: "#6b7280", fontSize: 13 }}>
              No devices yet.
            </div>
          ) : (
            <div style={{ borderTop: "1px solid #f3f4f6" }}>
              {filtered.map((d) => {
                const isGateway = d.role === "gateway";

                const dName = d.name ?? d.id;
                const dStatus: Status = d.status ?? "offline";
                const dNetworks = d.networks ?? [];
                const dBackhaul: Backhaul = d.backhaul ?? "unknown";

                return (
                  <div
                    key={d.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.35fr 0.7fr 0.7fr 0.8fr 0.8fr 0.8fr 0.9fr 0.7fr",
                      gap: 10,
                      padding: "12px 0",
                      borderBottom: "1px solid #f3f4f6",
                      alignItems: "center",
                      fontSize: 13,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 900 }}>{dName}</div>
                      <div style={{ marginTop: 3, fontSize: 12, color: "#6b7280" }}>{d.id}</div>
                    </div>

                    <div>{isGateway ? "gateway" : "node"}</div>

                    <div>
                      <span style={pillStyle(dStatus === "online" ? "#ecfdf5" : "#fef2f2")}>{dStatus}</span>
                    </div>

                    <div style={{ color: d.profile ? "#111827" : "#6b7280" }}>{d.profile ?? "—"}</div>

                    <div style={{ color: dNetworks.length ? "#111827" : "#6b7280" }}>
                      {dNetworks.length ? dNetworks.join(", ") : "—"}
                    </div>

                    <div style={{ color: isGateway ? "#6b7280" : "#111827" }}>
                      {isGateway ? "—" : d.gatewayId ?? "—"}
                    </div>

                    <div style={{ color: isGateway ? "#111827" : "#6b7280" }}>{isGateway ? dBackhaul : "—"}</div>

                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          // Placeholder action; wire routing later
                          console.log("Manage", d.role, d.id);
                        }}
                        style={{
                          width: "100%",
                          border: "1px solid #e5e7eb",
                          background: "#fff",
                          borderRadius: 10,
                          padding: "8px 10px",
                          fontSize: 13,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
