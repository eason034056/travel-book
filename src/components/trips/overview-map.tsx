"use client";

import { useEffect, useId, useRef } from "react";

import type { PlaceStop } from "@/types/travel";

interface OverviewMapProps {
  center: [number, number];
  stops: PlaceStop[];
  className?: string;
}

export function OverviewMap({ center, stops, className }: OverviewMapProps) {
  const mapId = useId().replace(/:/g, "");
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "test" || !ref.current || stops.length === 0) {
      return;
    }

    let disposed = false;

    async function renderMap() {
      const maplibregl = (await import("maplibre-gl")).default;
      if (disposed || !ref.current) return;

      const map = new maplibregl.Map({
        container: ref.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "&copy; OpenStreetMap contributors"
            }
          },
          layers: [
            {
              id: "osm",
              type: "raster",
              source: "osm"
            }
          ]
        },
        center,
        zoom: 11.5,
        interactive: true,
        attributionControl: false
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

      map.on("load", () => {
        const coordinates = stops
          .filter((stop) => stop.lat !== null && stop.lng !== null)
          .map((stop) => [stop.lng as number, stop.lat as number]);

        if (coordinates.length === 0) return;

        map.addSource(`route-${mapId}`, {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates
            },
            properties: {}
          }
        });

        map.addLayer({
          id: `route-line-${mapId}`,
          type: "line",
          source: `route-${mapId}`,
          paint: {
            "line-color": "#66735A",
            "line-width": 3,
            "line-opacity": 0.9
          }
        });

        const features = stops
          .filter((stop) => stop.lat !== null && stop.lng !== null)
          .map((stop, index) => ({
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [stop.lng as number, stop.lat as number]
            },
            properties: {
              order: index + 1,
              name: stop.name
            }
          }));

        map.addSource(`stops-${mapId}`, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features
          }
        });

        map.addLayer({
          id: `stops-fill-${mapId}`,
          type: "circle",
          source: `stops-${mapId}`,
          paint: {
            "circle-radius": 7,
            "circle-color": "#BF6C4D",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#F6F1E7"
          }
        });

        map.addLayer({
          id: `stops-label-${mapId}`,
          type: "symbol",
          source: `stops-${mapId}`,
          layout: {
            "text-field": ["get", "order"],
            "text-size": 10,
            "text-offset": [0, -1.6],
            "text-allow-overlap": true
          },
          paint: {
            "text-color": "#1f2a3a",
            "text-halo-color": "#F6F1E7",
            "text-halo-width": 1.5
          }
        });

        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 12
        });

        map.on("mouseenter", `stops-fill-${mapId}`, (e) => {
          map.getCanvas().style.cursor = "pointer";
          const feature = e.features?.[0];
          if (!feature || feature.geometry.type !== "Point") return;

          const coords = feature.geometry.coordinates.slice() as [number, number];
          const name = feature.properties?.name ?? "";
          const order = feature.properties?.order ?? "";

          popup
            .setLngLat(coords)
            .setHTML(`<div style="font-family:var(--font-body);font-size:13px;padding:2px 6px"><strong>${order}.</strong> ${name}</div>`)
            .addTo(map);
        });

        map.on("mouseleave", `stops-fill-${mapId}`, () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });

        if (coordinates.length >= 2) {
          const bounds = new maplibregl.LngLatBounds();
          for (const coord of coordinates) {
            bounds.extend(coord as [number, number]);
          }
          map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
        }
      });

      return () => map.remove();
    }

    const cleanupPromise = renderMap();

    return () => {
      disposed = true;
      cleanupPromise.then((cleanup) => cleanup?.()).catch(() => undefined);
    };
  }, [center, mapId, stops]);

  const hasCoordinates = stops.some((stop) => stop.lat !== null && stop.lng !== null);

  return (
    <div className={`flex min-h-0 flex-col ${className ?? ""}`}>
      <div
        ref={ref}
        className="relative min-h-[18rem] flex-1 overflow-hidden rounded-[1.8rem] border border-olive/15 bg-[radial-gradient(circle_at_top,rgba(191,108,77,0.12),transparent_35%),linear-gradient(180deg,rgba(246,241,231,0.95),rgba(221,209,191,0.5))]"
      >
        {!hasCoordinates && (
          <div className="absolute inset-0 flex items-center justify-center text-sm uppercase tracking-[0.25em] text-ink/45">
            Map preview pending coordinates
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {stops.map((stop) => (
          <span
            key={stop.id}
            className="rounded-full border border-olive/20 bg-paper px-3 py-1 text-[0.7rem] uppercase tracking-[0.18em] text-ink/70"
          >
            {stop.orderIndex + 1}. {stop.name}
          </span>
        ))}
      </div>
    </div>
  );
}
