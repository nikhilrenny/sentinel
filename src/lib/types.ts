export type MetricValue = string | number | boolean | null | undefined;

export type TelemetryMessage = {
  ts: number;
  topic: string;
  gatewayId: string;
  nodeType: "lora" | "xiao";
  nodeId: string;
  metrics: Record<string, MetricValue>;
};

export type NodeSummary = {
  key: string;
  gatewayId: string;
  nodeType: "lora" | "xiao";
  nodeId: string;
  lastSeenTs: number;
  lastTopic: string;
  metrics: Record<string, MetricValue>;
};
