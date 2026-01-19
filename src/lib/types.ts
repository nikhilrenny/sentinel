export type TelemetryMessage = {
  ts: number;                // epoch ms
  topic: string;             // MQTT topic
  gatewayId: string;         // sentinel-gw01
  nodeType: "lora" | "xiao"; // forest-fire vs SHM
  nodeId: string;            // lora-001 / xiao-003
  metrics: Record<string, number | string | boolean | null>;
};
