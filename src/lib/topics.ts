// Topic format we’ll use:
// sentinel/<gatewayId>/v1/<nodeType>/<nodeId>
//
// Example:
// sentinel/sentinel-gw01/v1/lora/lora-001
// sentinel/sentinel-gw02/v1/xiao/xiao-003

export function parseTopic(topic: string) {
  const parts = topic.split("/").filter(Boolean);
  // sentinel, gatewayId, v1, nodeType, nodeId
  if (parts.length < 5) return null;
  if (parts[0] !== "sentinel") return null;
  if (parts[2] !== "v1") return null;

  const gatewayId = parts[1];
  const nodeType = parts[3] as "lora" | "xiao";
  const nodeId = parts[4];

  if (nodeType !== "lora" && nodeType !== "xiao") return null;

  return { gatewayId, nodeType, nodeId };
}
