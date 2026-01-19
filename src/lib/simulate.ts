import { TelemetryMessage } from "./types";

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

const gateways = ["sentinel-gw01", "sentinel-gw02"];
const loraNodes = ["lora-001", "lora-002", "lora-003", "lora-004", "lora-005"];
const xiaoNodes = ["xiao-001", "xiao-002", "xiao-003", "xiao-004", "xiao-005"];

export function generateSimMessage(): TelemetryMessage {
  const gatewayId = gateways[Math.floor(Math.random() * gateways.length)];

  const nodeType = Math.random() < 0.5 ? "lora" : "xiao";
  const nodeId =
    nodeType === "lora"
      ? loraNodes[Math.floor(Math.random() * loraNodes.length)]
      : xiaoNodes[Math.floor(Math.random() * xiaoNodes.length)];

  const topic = `sentinel/${gatewayId}/v1/${nodeType}/${nodeId}`;

  const metrics =
    nodeType === "lora"
      ? {
          temp_c: +rand(10, 45).toFixed(2),
          rh_pct: +rand(10, 95).toFixed(1),
          voc_idx: Math.floor(rand(0, 500)),
          pm25_ugm3: +rand(0, 250).toFixed(1),
          batt_v: +rand(3.4, 4.2).toFixed(2),
          rssi_dbm: Math.floor(rand(-120, -40)),
        }
      : {
          accel_rms_g: +rand(0, 0.15).toFixed(4),
          strain_ue: Math.floor(rand(-200, 200)),
          tilt_deg: +rand(-3, 3).toFixed(3),
          temp_c: +rand(-5, 35).toFixed(2),
          rh_pct: +rand(20, 90).toFixed(1),
          batt_v: +rand(3.4, 4.2).toFixed(2),
          rssi_dbm: Math.floor(rand(-120, -40)),
        };

  return {
    ts: Date.now(),
    topic,
    gatewayId,
    nodeType,
    nodeId,
    metrics,
  };
}
