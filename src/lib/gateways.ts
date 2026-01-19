export const GATEWAYS = [
  {
    id: "sentinel-gw01",
    mode: "live",
    label: "Real Demo (Portsmouth)",
    location: { name: "Portsmouth, UK", lat: 50.8198, lon: -1.0880 },
    nodes: { lora: 5, mesh: 5 },
  },
  {
    id: "sentinel-gw02",
    mode: "historical",
    label: "Forest Fire (California)",
    location: { name: "Northern California, USA", lat: 40.2, lon: -122.3 },
    nodes: { lora: 180, mesh: 0 },
  },
  {
    id: "sentinel-gw03",
    mode: "historical",
    label: "SHM – The Shard (London)",
    location: { name: "London, UK", lat: 51.5045, lon: -0.0865 },
    nodes: { lora: 0, mesh: 288 },
  },
  {
    id: "sentinel-gw04",
    mode: "historical",
    label: "Agriculture (Elveden)",
    location: { name: "Elveden, UK", lat: 52.409, lon: 0.676 },
    nodes: { lora: 0, mesh: 256 },
  },
  {
    id: "sentinel-gw05",
    mode: "historical",
    label: "Seismic Mapping (Türkiye)",
    location: { name: "SE Türkiye", lat: 37.0, lon: 37.2 },
    nodes: { lora: 120, mesh: 0 },
  },
] as const;
