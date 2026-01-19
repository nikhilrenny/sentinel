"use client";

import { useEffect, useMemo, useRef } from "react";
import maplibregl, { Map } from "maplibre-gl";

type Health = "green" | "amber" | "red" | "grey";

export type GatewayMapPoint = {
  id: string;
  label: string;
  name: string;
  lat: number;
  lon: number;
  health: Health;
};

function color(h: Health) {
  return h === "green"
    ? "#16a34a"
    : h === "amber"
    ? "#f59e0b"
    : h === "red"
    ? "#dc2626"
    : "#9ca3af";
}

export function GatewayLiveMap({ points }: { points: GatewayMapPoint[] }) {
  const mapRef = useRef<Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Choose a style:
  // Option A (recommended): MapTiler - set NEXT_PUBLIC_MAPTILER_KEY
  // Option B: OSM raster style (no key, but usage-limits apply)
  const styleUrl = useMemo(() => {
    const k = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    if (k) return `https://api.maptiler.com/maps/streets/style.json?key=${k}`;

    // Basic OSM raster style (fallback)
    return {
      version: 8,
      sources: {
        osm: {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors",
        },
      },
      layers: [{ id: "osm", type: "raster", source: "osm" }],
    } as any;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    // Default view: global, but slightly biased to Europe/UK
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl as any,
      center: [-10, 35],
      zoom: 2.2,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }));

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [styleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers (simple approach)
    // We store them on the map instance
    const anyMap = map as any;
    if (anyMap.__sentinelMarkers) {
      for (const m of anyMap.__sentinelMarkers) m.remove();
    }
    anyMap.__sentinelMarkers = [];

    // Add markers
    for (const p of points) {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue;

      const el = document.createElement("div");
      el.style.width = "14px";
      el.style.height = "14px";
      el.style.borderRadius = "999px";
      el.style.background = color(p.health);
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 1px 6px rgba(0,0,0,0.18)";

      const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
        `<div style="font-family: system-ui; min-width: 220px;">
           <div style="font-weight: 900; margin-bottom: 4px;">${p.id}</div>
           <div style="opacity: 0.8; font-size: 13px;">${p.name}</div>
           <div style="margin-top: 8px; font-size: 12px; opacity: 0.75;">${p.label}</div>
         </div>`
      );

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([p.lon, p.lat])
        .setPopup(popup)
        .addTo(map);

      anyMap.__sentinelMarkers.push(marker);
    }
  }, [points]);

  return (
    <div
      style={{
        height: 380,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #eee",
        background: "white",
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
