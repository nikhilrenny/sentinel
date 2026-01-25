// src/lib/demo/types.ts
export type Profile = "svs" | "aaq" | "sms" | "sss" | "tsr";
export type Role = "sensor" | "bridge";
export type Network = "lora" | "mesh";

export type NodeRegistryItem = {
  node_id: string;
  display_name: string;

  profile: Profile;
  role: Role;
  networks: Network[];

  gateway_id: string;
  site_id: string;

  location?: { lat: number; lon: number; alt_m?: number; accuracy_m?: number };
  structure?: { structure_id: string; asset_type?: "bridge" | "building" | "slope" | "field"; note?: string };
};

export type Links = {
  lora?: { rssi_dbm: number; snr_db: number; freq_mhz?: number; sf?: number; bw_khz?: number };
  mesh?: { rssi_dbm: number; lqi?: number; channel?: number };
};

export type SVS = {
  accel_rms_g: number;
  accel_peak_g: number;
  dominant_freq_hz: number;
  tilt_x_deg: number;
  tilt_y_deg: number;
  strain_ue: number;
  bandpower?: { bp_0_10: number; bp_10_50: number; bp_50_200: number };
};

export type AAQ = {
  voc_index: number;
  pm1_0_ugm3: number;
  pm2_5_ugm3: number;
  pm10_ugm3: number;
  co2_ppm?: number;
  co_ppm?: number;
  smoke_score?: number;
};

export type SMS = {
  pga_g: number;
  pgv_cms: number;
  dominant_freq_hz: number;
  triggered?: boolean;
};

export type SSS = {
  classifier: "agriculture" | "geohazard";
  soil_moisture_vwc: number;
  soil_temp_c: number;
  soil_ec_ms_cm: number;
  spk_levels: number[];
  tilt_deg?: number;
};

export type TSR = {
  kind: "radio" | "tracking";
  packets_rx?: number;
  packets_tx?: number;
  rx_rate_s?: number;
};

export type TelemetryMessage = {
  node_id: string;
  gateway_id: string;

  timestamp: string; // ISO-8601 UTC
  seq: number;

  profile: Profile;
  role: Role;
  networks: Network[];

  battery_v: number;
  uptime_s: number;
  status_flags: number;

  temperature_c: number;
  humidity_rh: number;

  links: Links;

  payload: SVS | AAQ | SMS | SSS | TSR;
};
