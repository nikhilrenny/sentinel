"use client";

import { useEffect, useMemo, useRef } from "react";
import maplibregl, { Map, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type Health = "green" | "amber" | "red" | "grey";

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

// Attach markers to map without `any`
type MapWithSentinelMarkers = Map & { __sentinelMarkers?: maplibregl.Marker[] };

export function GatewayLiveMap({ points }: { points: GatewayMapPoint[] }) {
  const mapRef = useRef<MapWithSentinelMarkers | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const styleSpec: StyleSpecification = useMemo(() => {
    const k = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    if (k) {
      // MapLibre accepts a URL string for style; we handle that at init time.
      // This function returns a fallback styleSpec when no key is present.
    }

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
    } as StyleSpecification;
  }, []);

  const styleUrlOrSpec = useMemo(() => {
    const k = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    if (k) return `https://api.maptiler.com/maps/streets/style.json?key=${k}`;
    return styleSpec;
  }, [styleSpec]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrlOrSpec,
      center: [-10, 35],
      zoom: 2.2,
    }) as MapWithSentinelMarkers;

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }));

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [styleUrlOrSpec]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers
    if (map.__sentinelMarkers) {
      for (const m of map.__sentinelMarkers) m.remove();
    }
    map.__sentinelMarkers = [];

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

      map.__sentinelMarkers.push(marker);
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
