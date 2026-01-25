import GatewaySpatialClient from "./GatewaySpatialClient";

export default function GatewayAnalyticsPage({ params }: { params: { gatewayId: string } }) {
  return <GatewaySpatialClient gatewayId={decodeURIComponent(params.gatewayId)} />;
}
