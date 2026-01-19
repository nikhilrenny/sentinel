"use client";

import dynamic from "next/dynamic";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((m) => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });

type Gateway = {
  gw_id: string;
  name: string;
  site: string;
  status: "online" | "offline";
  lat: number;
  lon: number;
  last_seen: number;
};

function age(msEpoch: number): string {
  const s = Math.floor(Math.max(0, Date.now() - msEpoch) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

export default function GatewaysMiniMap({ gateways }: { gateways: Gateway[] }) {
  const first = gateways[0];
  const center: [number, number] = first ? [first.lat, first.lon] : [50.909, -1.404];

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800">
      <div style={{ height: 320 }}>
        <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }}>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {gateways.map((g) => (
            <CircleMarker
              key={g.gw_id}
              center={[g.lat, g.lon]}
              radius={10}
              pathOptions={{ color: g.status === "online" ? "#22c55e" : "#ef4444" }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{g.name}</div>
                  <div>GW: {g.gw_id}</div>
                  <div>Site: {g.site}</div>
                  <div>Status: {g.status}</div>
                  <div>Last seen: {age(g.last_seen)} ago</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
