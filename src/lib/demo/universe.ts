// src/lib/demo/universe.ts

import type { DemoScale } from "@/lib/appSettings";
import type { NodeRegistryItem, Profile, Role, Network } from "./types";

export type GatewayRegistryItem = {
  gateway_id: string;
  display_name: string;
  region: string;
  backhaul: "ethernet" | "wifi" | "4g" | "sat";
  location: { lat: number; lon: number; alt_m?: number };
};

// deterministic PRNG (same as registry.ts, duplicated to keep this file standalone)
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

function jitter(rnd: () => number, base: number, amt: number) {
  return base + (rnd() * 2 - 1) * amt;
}

type RegionSeed = {
  // display
  region: string;
  scenario:
    | "wildfire"
    | "earthquake"
    | "landslide"
    | "volcano"
    | "agriculture"
    | "shm"
    | "urban_air"
    | "remote_connectivity";

  // geography
  centre: { lat: number; lon: number };
  backhaulPool: GatewayRegistryItem["backhaul"][];

  // bias which profiles appear at this site
  profileBias: Partial<Record<Profile, number>>;
  siteHints: NodeRegistryItem["structure"];

  // deployment realism
  income: "high" | "mid" | "low";   // cost constraint proxy
  area_km2?: number;                // size of monitored region / corridor
  spacing_km?: number;              // effective spacing between nodes
  base_nodes?: number;              // explicit node count override
  min_nodes?: number;               // minimum nodes for demo realism

  // spatial pattern (how nodes are laid out around the gateway)
  layout?: "cluster" | "grid" | "corridor" | "ring";
};


const REGION_SEEDS: RegionSeed[] = [
  // =========================
  // WILDFIRE SCENARIOS
  // =========================
  {
    region: "USA — California (Wildfire Early Detection Perimeter)",
    scenario: "wildfire",
    centre: { lat: 39.20, lon: -121.10 },
    backhaulPool: ["sat", "4g"],
    profileBias: { aaq: 0.55, tsr: 0.20, sss: 0.20, sms: 0.03, svs: 0.02 },
    siteHints: { structure_id: "asset-wildfire-ca-01", asset_type: "slope", note: "wildfire perimeter / smoke corridors" },
    income: "high",
    area_km2: 165000,
    spacing_km: 5.0,
    min_nodes: 180,
    layout: "corridor",
  },
  {
    region: "Australia — NSW/VIC Bushfire Belt",
    scenario: "wildfire",
    centre: { lat: -36.50, lon: 146.00 },
    backhaulPool: ["sat", "4g"],
    profileBias: { aaq: 0.60, tsr: 0.18, sss: 0.18, sms: 0.02, svs: 0.02 },
    siteHints: { structure_id: "asset-wildfire-au-01", asset_type: "slope", note: "bushfire detection + smoke transport" },
    income: "high",
    area_km2: 120000,
    spacing_km: 6.0,
    min_nodes: 140,
    layout: "corridor",
  },
  {
    region: "Greece — Attica/Wildland-Urban Interface",
    scenario: "wildfire",
    centre: { lat: 38.20, lon: 23.85 },
    backhaulPool: ["4g", "sat"],
    profileBias: { aaq: 0.55, tsr: 0.20, sss: 0.20, sms: 0.03, svs: 0.02 },
    siteHints: { structure_id: "asset-wildfire-gr-01", asset_type: "slope", note: "WUI fire detection" },
    income: "mid",
    area_km2: 15000,
    spacing_km: 4.0,
    min_nodes: 80,
    layout: "corridor",
  },

  // =========================
  // EARTHQUAKE / TECTONIC SCENARIOS
  // =========================
  {
    region: "Japan — Tectonic Corridor (Kanto)",
    scenario: "earthquake",
    centre: { lat: 35.68, lon: 139.76 },
    backhaulPool: ["4g", "ethernet"],
    profileBias: { sms: 0.55, tsr: 0.20, svs: 0.20, aaq: 0.03, sss: 0.02 },
    siteHints: { structure_id: "asset-seismic-jp-01", asset_type: "slope", note: "dense EEW array + timing" },
    income: "high",
    area_km2: 32000,
    spacing_km: 8.0,
    min_nodes: 120,
    layout: "grid",
  },
  {
    region: "Turkey — North Anatolian Fault Zone",
    scenario: "earthquake",
    centre: { lat: 40.75, lon: 31.60 },
    backhaulPool: ["4g", "sat"],
    profileBias: { sms: 0.60, tsr: 0.20, svs: 0.15, sss: 0.03, aaq: 0.02 },
    siteHints: { structure_id: "asset-seismic-tr-01", asset_type: "slope", note: "fault corridor monitoring" },
    income: "mid",
    area_km2: 50000,
    spacing_km: 12.0,
    min_nodes: 70,
    layout: "corridor",
  },
  {
    region: "Nepal — Himalayan Seismic Belt (Low-resource)",
    scenario: "earthquake",
    centre: { lat: 27.70, lon: 85.32 },
    backhaulPool: ["sat", "4g"],
    profileBias: { sms: 0.55, tsr: 0.25, sss: 0.10, svs: 0.08, aaq: 0.02 },
    siteHints: { structure_id: "asset-seismic-np-01", asset_type: "slope", note: "low-cost EEW + landslide co-risk" },
    income: "low",
    area_km2: 80000,
    spacing_km: 18.0,      // sparser due to budget
    min_nodes: 45,
    layout: "corridor",
  },
  {
    region: "Haiti — Seismic Urban Risk (Low-resource)",
    scenario: "earthquake",
    centre: { lat: 18.54, lon: -72.34 },
    backhaulPool: ["4g", "sat"],
    profileBias: { sms: 0.50, svs: 0.20, tsr: 0.25, aaq: 0.03, sss: 0.02 },
    siteHints: { structure_id: "asset-seismic-ht-01", asset_type: "building", note: "urban seismic + building health" },
    income: "low",
    area_km2: 3000,
    spacing_km: 6.0,
    min_nodes: 35,
    layout: "cluster",
  },

  // =========================
  // LANDSLIDE / AVALANCHE SCENARIOS
  // =========================
  {
    region: "India — Himalayan Landslide Corridor (Uttarakhand)",
    scenario: "landslide",
    centre: { lat: 30.30, lon: 78.05 },
    backhaulPool: ["4g", "sat"],
    profileBias: { sss: 0.45, sms: 0.35, tsr: 0.10, svs: 0.07, aaq: 0.03 },
    siteHints: { structure_id: "asset-landslide-in-01", asset_type: "slope", note: "monsoon-triggered landslides" },
    income: "mid",
    area_km2: 12000,
    spacing_km: 4.0,
    min_nodes: 90,
    layout: "corridor",
  },
  {
    region: "Philippines — Typhoon Landslide Risk (Benguet)",
    scenario: "landslide",
    centre: { lat: 16.41, lon: 120.60 },
    backhaulPool: ["4g", "sat"],
    profileBias: { sss: 0.50, sms: 0.25, aaq: 0.05, svs: 0.05, tsr: 0.15 },
    siteHints: { structure_id: "asset-landslide-ph-01", asset_type: "slope", note: "typhoon rainfall + slope saturation" },
    income: "low",
    area_km2: 7000,
    spacing_km: 5.5,   // sparser (low budget)
    min_nodes: 60,
    layout: "corridor",
  },
  {
    region: "Norway — Avalanche Monitoring (Mountain Pass)",
    scenario: "landslide",
    centre: { lat: 60.65, lon: 7.30 },
    backhaulPool: ["sat", "4g"],
    profileBias: { sms: 0.35, sss: 0.35, tsr: 0.20, svs: 0.08, aaq: 0.02 },
    siteHints: { structure_id: "asset-avalanche-no-01", asset_type: "slope", note: "freeze–thaw + snowpack risk" },
    income: "high",
    area_km2: 1200,
    spacing_km: 2.5,
    min_nodes: 70,
    layout: "corridor",
  },

  // =========================
  // VOLCANO SCENARIOS (Pacific Ring of Fire)
  // =========================
  {
    region: "Indonesia — Volcanic Island (Eruption Precursors)",
    scenario: "volcano",
    centre: { lat: -8.34, lon: 116.47 },
    backhaulPool: ["sat", "4g"],
    profileBias: { sms: 0.40, aaq: 0.30, tsr: 0.15, svs: 0.10, sss: 0.05 },
    siteHints: { structure_id: "asset-volcano-id-01", asset_type: "slope", note: "tremor + gas + thermal context" },
    income: "mid",
    area_km2: 2500,
    spacing_km: 3.0,
    min_nodes: 85,
    layout: "ring",
  },
  {
    region: "Papua New Guinea — Remote Volcano (Low-resource)",
    scenario: "volcano",
    centre: { lat: -4.20, lon: 152.20 },
    backhaulPool: ["sat"],
    profileBias: { sms: 0.45, aaq: 0.25, tsr: 0.20, svs: 0.05, sss: 0.05 },
    siteHints: { structure_id: "asset-volcano-pg-01", asset_type: "slope", note: "remote volcano, sparse nodes" },
    income: "low",
    area_km2: 4000,
    spacing_km: 6.0,
    min_nodes: 45,
    layout: "ring",
  },

  // =========================
  // AGRICULTURE SCENARIOS
  // =========================
  {
    region: "UK — Hampshire Agriculture (Precision Farming)",
    scenario: "agriculture",
    centre: { lat: 51.057, lon: -1.308 },
    backhaulPool: ["4g", "wifi"],
    profileBias: { sss: 0.70, aaq: 0.10, tsr: 0.15, svs: 0.03, sms: 0.02 },
    siteHints: { structure_id: "asset-field-uk-01", asset_type: "field", note: "soil + microclimate + irrigation" },
    income: "high",
    area_km2: 600,
    spacing_km: 1.5,
    min_nodes: 80,
    layout: "grid",
  },
  {
    region: "Kenya — Smallholder Agriculture (Low-resource)",
    scenario: "agriculture",
    centre: { lat: -0.30, lon: 36.10 },
    backhaulPool: ["4g"],
    profileBias: { sss: 0.80, tsr: 0.15, aaq: 0.05 },
    siteHints: { structure_id: "asset-field-ke-01", asset_type: "field", note: "low-cost soil + climate sensing" },
    income: "low",
    area_km2: 1800,
    spacing_km: 3.5,
    min_nodes: 55,
    layout: "grid",
  },

  // =========================
  // SHM (Buildings / Bridges)
  // =========================
  {
    region: "Singapore — High-Rise Structural Health Monitoring",
    scenario: "shm",
    centre: { lat: 1.352, lon: 103.82 },
    backhaulPool: ["ethernet", "wifi", "4g"],
    profileBias: { svs: 0.65, tsr: 0.20, aaq: 0.10, sss: 0.03, sms: 0.02 },
    siteHints: { structure_id: "asset-building-sg-01", asset_type: "building", note: "modal monitoring / drift / strain" },
    income: "high",
    base_nodes: 160,  // multi-building cluster
    min_nodes: 120,
    layout: "cluster",
  },
  {
    region: "Bangladesh — Bridge SHM (Low-resource)",
    scenario: "shm",
    centre: { lat: 23.81, lon: 90.41 },
    backhaulPool: ["4g"],
    profileBias: { svs: 0.55, tsr: 0.30, aaq: 0.10, sms: 0.03, sss: 0.02 },
    siteHints: { structure_id: "asset-bridge-bd-01", asset_type: "bridge", note: "low-cost SHM priority asset" },
    income: "low",
    base_nodes: 70,
    min_nodes: 50,
    layout: "corridor",
  },

  // =========================
  // URBAN AIR + CONNECTIVITY
  // =========================
  {
    region: "UK — London (Urban Air Quality)",
    scenario: "urban_air",
    centre: { lat: 51.507, lon: -0.128 },
    backhaulPool: ["ethernet", "4g"],
    profileBias: { aaq: 0.70, tsr: 0.15, svs: 0.10, sss: 0.03, sms: 0.02 },
    siteHints: { structure_id: "asset-city-uk-aaq-01", asset_type: "building", note: "dense AQ / traffic emissions" },
    income: "high",
    area_km2: 1600,
    spacing_km: 1.2,
    min_nodes: 140,
    layout: "grid",
  },
  {
    region: "Nigeria — Urban AQ + Connectivity (Low-resource)",
    scenario: "urban_air",
    centre: { lat: 6.46, lon: 3.40 },
    backhaulPool: ["4g"],
    profileBias: { aaq: 0.65, tsr: 0.25, sss: 0.05, svs: 0.03, sms: 0.02 },
    siteHints: { structure_id: "asset-city-ng-aaq-01", asset_type: "building", note: "low-cost AQ + backhaul hubs" },
    income: "low",
    area_km2: 1200,
    spacing_km: 2.5,
    min_nodes: 75,
    layout: "grid",
  },
];



function weightedPick(rnd: () => number, weights: Array<[Profile, number]>): Profile {
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let x = rnd() * total;
  for (const [p, w] of weights) {
    x -= w;
    if (x <= 0) return p;
  }
  return weights[0][0];
}

// src/lib/demo/universe.ts
// Drop-in: add spatial layouts (cluster/grid/corridor/ring) while keeping your existing logic.
//
// HOW TO APPLY:
// 1) Ensure your RegionSeed has: layout?: "cluster" | "grid" | "corridor" | "ring"
// 2) In your node creation loop (inside for i < perGw[g]) REPLACE the block that computes r/a/lat/lon
//    with the call to `placeNode(...)` shown at the end of this snippet.
//
// Notes:
// - Uses simple lat/lon offsets (fine for demo visuals).
// - corridor = elongated band (fault line / fire perimeter road / mountain pass)
// - ring = around a center (volcano rim / exclusion zone)
// - grid = roughly uniform coverage (agriculture / urban AQ)
// - cluster = multiple sub-clusters (buildings / campuses)

type Layout = "cluster" | "grid" | "corridor" | "ring";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function kmToDegLat(km: number) {
  return km / 111; // ~111 km per degree latitude
}

function kmToDegLon(km: number, atLatDeg: number) {
  const c = Math.cos((atLatDeg * Math.PI) / 180);
  return km / (111 * Math.max(0.2, c)); // protect near poles
}

function sampleGaussian(rnd: () => number) {
  // Box–Muller
  let u = 0, v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function rotate2D(x: number, y: number, theta: number) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return { x: x * c - y * s, y: x * s + y * c };
}

function estimateCoverageRadiusKm(n: number) {
  // a visual-only proxy: more nodes -> wider spread
  // tuned so 50..500 nodes look meaningfully spread without jumping continents
  return clamp(0.8 + Math.sqrt(n) * 0.35, 1.0, 45.0); // 1km .. 45km
}

function placeCluster(rnd: () => number, centre: { lat: number; lon: number }, n: number) {
  const radiusKm = estimateCoverageRadiusKm(n);
  // 3–7 subclusters
  const k = Math.floor(3 + rnd() * 5);
  // pick a subcluster, each has its own centroid offset
  const pickIdx = Math.floor(rnd() * k);

  // cluster centroids within ~radiusKm * 0.6
  const a0 = rnd() * Math.PI * 2;
  const r0 = (rnd() ** 0.7) * radiusKm * 0.6;
  const dx0 = r0 * Math.cos(a0);
  const dy0 = r0 * Math.sin(a0);

  // move different clusters around by "index" for determinism
  const aShift = (pickIdx / k) * Math.PI * 2;
  const rot = rotate2D(dx0, dy0, aShift);

  // node spread within subcluster (gaussian)
  const sigmaKm = clamp(radiusKm / 10, 0.15, 2.0);
  const dx = rot.x + sampleGaussian(rnd) * sigmaKm;
  const dy = rot.y + sampleGaussian(rnd) * sigmaKm;

  const dLat = kmToDegLat(dy);
  const dLon = kmToDegLon(dx, centre.lat);
  return { lat: centre.lat + dLat, lon: centre.lon + dLon };
}

function placeGrid(rnd: () => number, centre: { lat: number; lon: number }, n: number) {
  // grid around centre, jitter each cell
  const radiusKm = estimateCoverageRadiusKm(n);
  const side = Math.ceil(Math.sqrt(n)); // grid dimension
  const spacingKm = clamp((2 * radiusKm) / Math.max(1, side - 1), 0.25, 8.0);

  // choose a grid cell index based on rnd
  const idx = Math.floor(rnd() * n);
  const gx = idx % side;
  const gy = Math.floor(idx / side);

  const xKm = (gx - (side - 1) / 2) * spacingKm;
  const yKm = (gy - (side - 1) / 2) * spacingKm;

  // jitter within cell
  const j = spacingKm * 0.35;
  const dx = xKm + (rnd() * 2 - 1) * j;
  const dy = yKm + (rnd() * 2 - 1) * j;

  // random grid rotation (so it doesn't look perfectly axis-aligned)
  const theta = rnd() * Math.PI;
  const rot = rotate2D(dx, dy, theta);

  const dLat = kmToDegLat(rot.y);
  const dLon = kmToDegLon(rot.x, centre.lat);
  return { lat: centre.lat + dLat, lon: centre.lon + dLon };
}

function placeCorridor(rnd: () => number, centre: { lat: number; lon: number }, n: number) {
  // elongated band with a main axis (fault line / fire perimeter road / mountain pass)
  const radiusKm = estimateCoverageRadiusKm(n);
  const lengthKm = clamp(radiusKm * 2.2, 4, 120);   // along corridor
  const widthKm  = clamp(radiusKm * 0.35, 0.4, 12); // across corridor

  const theta = rnd() * Math.PI; // corridor orientation

  // along-axis: uniform + mild clustering
  const t = (rnd() * 2 - 1) * (lengthKm / 2);
  // across-axis: gaussian
  const u = sampleGaussian(rnd) * (widthKm / 3);

  const rot = rotate2D(t, u, theta);
  const dLat = kmToDegLat(rot.y);
  const dLon = kmToDegLon(rot.x, centre.lat);
  return { lat: centre.lat + dLat, lon: centre.lon + dLon };
}

function placeRing(rnd: () => number, centre: { lat: number; lon: number }, n: number) {
  // volcano rim / exclusion zone: points around a ring, with thickness
  const radiusKm = estimateCoverageRadiusKm(n);
  const ringKm = clamp(radiusKm * 0.8, 1.5, 35.0);
  const thicknessKm = clamp(ringKm * 0.18, 0.2, 4.0);

  const a = rnd() * Math.PI * 2;
  const r = ringKm + sampleGaussian(rnd) * (thicknessKm / 2);

  const dx = r * Math.cos(a);
  const dy = r * Math.sin(a);

  const dLat = kmToDegLat(dy);
  const dLon = kmToDegLon(dx, centre.lat);
  return { lat: centre.lat + dLat, lon: centre.lon + dLon };
}

function placeNode(
  rnd: () => number,
  centre: { lat: number; lon: number },
  layout: Layout,
  nForGateway: number
) {
  switch (layout) {
    case "grid":
      return placeGrid(rnd, centre, nForGateway);
    case "corridor":
      return placeCorridor(rnd, centre, nForGateway);
    case "ring":
      return placeRing(rnd, centre, nForGateway);
    case "cluster":
    default:
      return placeCluster(rnd, centre, nForGateway);
  }
}


function countGateways(scale: DemoScale) {
  return scale === 1000 ? 7 : scale === 100 ? 9 : 14;
}

export type DemoUniverse = {
  gateways: GatewayRegistryItem[];
  nodes: NodeRegistryItem[];
};

export function buildDemoUniverse(scale: DemoScale): DemoUniverse {
  const rnd = mulberry32(1000 + scale * 17);
  const gwCount = countGateways(scale);

  // Pick unique regions first, then cycle if we need more gateways than seeds.
  const chosen: RegionSeed[] = [];
  const pool = [...REGION_SEEDS];
  while (chosen.length < gwCount) {
    if (pool.length === 0) pool.push(...REGION_SEEDS);
    chosen.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  }

  const gateways: GatewayRegistryItem[] = chosen.map((r, idx) => {
    const id = `sentinel-gw${String(idx + 1).padStart(2, "0")}`;
    const backhaul = pick(rnd, r.backhaulPool);
    const lat = jitter(rnd, r.centre.lat, 0.02);
    const lon = jitter(rnd, r.centre.lon, 0.02);
    return {
      gateway_id: id,
      display_name: `Gateway ${idx + 1}`,
      region: r.region,
      backhaul,
      location: { lat, lon, alt_m: 8 + rnd() * 30 },
    };
  });

  // Split total nodes across gateways (realistic: a few big, many small)
    // Per-gateway node sizing:
  // - Scenario-derived base nodes (area/spacing or explicit base_nodes)
  // - DemoScale acts as a density multiplier
  // - Caps keep the UI fast while still “looking real”

  function scaleMultiplier(s: DemoScale) {
    // 10 = light demo, 100 = normal, 1000 = stress
    return s === 10 ? 0.08 : s === 100 ? 0.25 : 1.0;
  }

  function capForScale(s: DemoScale) {
    // Prevent runaway counts (wildfire can explode to thousands)
    return s === 10 ? 220 : s === 100 ? 900 : 6000;
  }

  function scenarioBaseNodes(seed: RegionSeed) {
    if (typeof seed.base_nodes === "number") return seed.base_nodes;

    // If area + spacing provided, estimate nodes by coverage cell:
    // Approx cell area ≈ (spacing_km^2). This is a simple proxy model.
    // You can tune spacing_km per scenario.
    const area = seed.area_km2 ?? 150;
    const spacing = seed.spacing_km ?? 3.0;
    const est = Math.ceil(area / (spacing * spacing));
    return est;
  }

  const mult = scaleMultiplier(scale);
  const cap = capForScale(scale);

  const perGw = gateways.map((_, i) => {
    const seed = chosen[i];
    const base = scenarioBaseNodes(seed);

    // Small random factor so gateways aren’t too uniform
    const jitterFactor = 0.85 + rnd() * 0.35;

    const minNodes = seed.min_nodes ?? (scale === 10 ? 10 : 25);
    const n = Math.round(base * mult * jitterFactor);

    return Math.max(minNodes, Math.min(cap, n));
  });


  const nodes: NodeRegistryItem[] = [];
  let nodeIdx = 0;

  const roles: Role[] = ["sensor", "bridge"];

  for (let g = 0; g < gateways.length; g++) {
    const gw = gateways[g];
    const region = chosen[g];
    const gwRnd = mulberry32(5000 + scale * 31 + g * 97);

    const biasWeights: Array<[Profile, number]> = (Object.entries(region.profileBias) as Array<[Profile, number]>).filter(
      ([, w]) => w > 0
    );
    // Ensure all profiles remain possible even if bias is extreme.
    const defaultWeights: Array<[Profile, number]> = [
      ["svs", 0.1],
      ["aaq", 0.1],
      ["sms", 0.1],
      ["sss", 0.1],
      ["tsr", 0.05],
    ];
    const weightsFinal = [...biasWeights];
    for (const [p, w] of defaultWeights) {
      if (!weightsFinal.find(([pp]) => pp === p)) weightsFinal.push([p, w]);
    }

    for (let i = 0; i < perGw[g]; i++) {
      nodeIdx++;
      const profile = weightedPick(gwRnd, weightsFinal);
      const role: Role = profile === "tsr" ? "bridge" : pick(gwRnd, roles);

      // Networks: mesh dominates for dense deployments; LoRa dominates for remote.
      const meshBias = gw.backhaul === "sat" ? 0.35 : gw.backhaul === "4g" ? 0.5 : 0.65;
      const primary: Network = gwRnd() < meshBias ? "mesh" : "lora";
      const dual = gwRnd() > 0.94;
      const networks: Network[] = dual ? ["lora", "mesh"] : [primary];

      const site_id = `site-${gw.gateway_id}`;

      // spread around the gateway (hundreds of meters to a few km)
      const layout = region.layout ?? "cluster";
      const pos = placeNode(gwRnd, { lat: gw.location.lat, lon: gw.location.lon }, layout, perGw[g]);
      const lat = pos.lat;
      const lon = pos.lon;

      const node_id = `node-${String(nodeIdx).padStart(4, "0")}`;
      const display_name = `${profile.toUpperCase()} ${nodeIdx}`;

      const structure: NodeRegistryItem["structure"] =
        profile === "svs" || profile === "sms" || profile === "sss" ? { ...region.siteHints } : undefined;

      nodes.push({
        node_id,
        display_name,
        profile,
        role,
        networks,
        gateway_id: gw.gateway_id,
        site_id,
        location: { lat, lon, alt_m: 8 + gwRnd() * 40, accuracy_m: 5 + gwRnd() * 20 },
        ...(structure ? { structure } : {}),
      });
    }
  }

  return { gateways, nodes };
}
