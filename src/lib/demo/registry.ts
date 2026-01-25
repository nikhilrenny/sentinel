// src/lib/demo/registry.ts
import type { DemoScale } from "@/lib/appSettings";
import type { NodeRegistryItem, Network, Profile, Role } from "./types";

// tiny deterministic PRNG
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rnd: () => number, arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

export function buildDemoRegistry(scale: DemoScale, gatewayId = "sentinel-gw01"): NodeRegistryItem[] {
  const rnd = mulberry32(scale * 1337);

  const profiles: Profile[] = ["svs", "aaq", "sms", "sss", "tsr"];
  const roles: Role[] = ["sensor", "bridge"];

  // Southampton-ish centre (stable demo seed)
  const baseLat = 50.907;
  const baseLon = -1.404;

  const items: NodeRegistryItem[] = [];

  for (let i = 0; i < scale; i++) {
    const profile = pick(rnd, profiles);
    const role: Role = profile === "tsr" ? "bridge" : pick(rnd, roles);

    // Networks: mostly single-network, some dual
    const primary: Network = rnd() > 0.55 ? "mesh" : "lora";
    const networks: Network[] = rnd() > 0.92 ? ["lora", "mesh"] : [primary];

    const site_id =
      scale === 10 ? "site-demo" : rnd() > 0.7 ? "site-west" : rnd() > 0.4 ? "site-central" : "site-east";

    // spread around ~1–3 km radius
    const r = (0.002 + rnd() * 0.02) * (rnd() > 0.85 ? 2 : 1);
    const a = rnd() * Math.PI * 2;
    const lat = baseLat + r * Math.cos(a);
    const lon = baseLon + r * Math.sin(a);

    const node_id = `node-${String(i + 1).padStart(4, "0")}`;
    const display_name = `${profile.toUpperCase()} ${i + 1}`;

    // IMPORTANT: type the optional structure using NodeRegistryItem["structure"]
    const structure: NodeRegistryItem["structure"] =
      profile === "svs"
        ? {
            structure_id: rnd() > 0.5 ? "asset-bridge-01" : "asset-building-02",
            asset_type: rnd() > 0.5 ? "bridge" : "building",
            note: "demo attachment",
          }
        : profile === "sss"
          ? {
              structure_id: "asset-field-01",
              asset_type: "field",
              note: "demo attachment",
            }
          : undefined;

    items.push({
      node_id,
      display_name,
      profile,
      role,
      networks,
      gateway_id: gatewayId,
      site_id,
      location: { lat, lon, alt_m: 8 + rnd() * 20, accuracy_m: 5 + rnd() * 15 },
      ...(structure ? { structure } : {}),
    });
  }

  return items;
}
