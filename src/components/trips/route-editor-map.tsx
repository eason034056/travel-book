"use client";

import { useEffect, useId, useRef } from "react";

import type { PlaceStop } from "@/types/travel";

interface RouteEditorMapProps {
  stops: PlaceStop[];
  activeStopId?: string | null;
  onMarkerClick?: (stopId: string) => void;
  className?: string;
}

export function RouteEditorMap({ stops, activeStopId, onMarkerClick, className }: RouteEditorMapProps) {
  const mapId = useId().replace(/:/g, "");
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !ref.current) {
      return;
    }

    let disposed = false;

    async function renderMap() {
      const maplibregl = (await import("maplibre-gl")).default;
      if (disposed || !ref.current) return;

      const mappableStops = stops.filter((s) => s.lat !== null && s.lng !== null);

      const defaultCenter: [number, number] = mappableStops.length > 0
        ? computeCentroid(mappableStops)
        : [139.6917, 35.6895];

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
          layers: [{ id: "osm", type: "raster", source: "osm" }]
        },
        center: defaultCenter,
        zoom: mappableStops.length > 0 ? 12 : 3,
        interactive: true,
        attributionControl: false
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

      map.on("load", () => {
        updateMapData(map, mappableStops, mapId);

        if (mappableStops.length >= 2) {
          fitBoundsToStops(map, mappableStops, maplibregl);
        }

        map.on("click", `stops-fill-${mapId}`, (event) => {
          const feature = event.features?.[0];
          if (feature && onMarkerClick) {
            onMarkerClick(feature.properties?.stopId as string);
          }
        });

        map.on("mouseenter", `stops-fill-${mapId}`, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", `stops-fill-${mapId}`, () => {
          map.getCanvas().style.cursor = "";
        });
      });

      mapRef.current = map as unknown as MapLike;
      return () => map.remove();
    }

    const cleanupPromise = renderMap();

    return () => {
      disposed = true;
      cleanupPromise.then((cleanup) => cleanup?.()).catch(() => undefined);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current as MapLike | null;
    if (!map || !map.isStyleLoaded?.()) return;

    const mappableStops = stops.filter((s) => s.lat !== null && s.lng !== null);
    updateMapData(map, mappableStops, mapId);

    if (mappableStops.length >= 2) {
      import("maplibre-gl").then((mod) => {
        fitBoundsToStops(map, mappableStops, mod.default);
      });
    }
  }, [stops, mapId]);

  const hasCoordinates = stops.some((s) => s.lat !== null && s.lng !== null);

  return (
    <div className={className}>
      <div
        ref={ref}
        className="relative min-h-[22rem] overflow-hidden rounded-[1.8rem] border border-olive/15 bg-sand/30"
      >
        {!hasCoordinates && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm uppercase tracking-[0.25em] text-ink/45">
              Map preview
            </p>
            <p className="text-xs text-ink/35">
              Add stops with coordinates to see them on the map
            </p>
          </div>
        )}
      </div>
      {hasCoordinates && (
        <div className="mt-3 flex flex-wrap gap-2">
          {stops.filter((s) => s.lat !== null).map((stop) => (
            <button
              key={stop.id}
              className={`rounded-full border px-3 py-1 text-[0.7rem] uppercase tracking-[0.18em] transition ${
                activeStopId === stop.id
                  ? "border-terracotta/40 bg-terracotta/10 text-terracotta"
                  : "border-olive/20 bg-paper text-ink/70 hover:border-olive/40"
              }`}
              onClick={() => onMarkerClick?.(stop.id)}
              type="button"
            >
              {stop.orderIndex + 1}. {stop.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface MapLike {
  getSource: (id: string) => any;
  addSource: (id: string, source: any) => void;
  addLayer: (layer: any) => void;
  isStyleLoaded?: () => boolean | void;
  fitBounds: (bounds: any, options?: any) => void;
  getCanvas: () => HTMLCanvasElement;
  on: (event: string, layerOrCallback: any, callback?: (event: any) => void) => void;
}

function computeCentroid(stops: PlaceStop[]): [number, number] {
  const withCoords = stops.filter((s) => s.lat !== null && s.lng !== null);
  if (withCoords.length === 0) return [0, 0];

  const sumLng = withCoords.reduce((acc, s) => acc + (s.lng as number), 0);
  const sumLat = withCoords.reduce((acc, s) => acc + (s.lat as number), 0);
  return [sumLng / withCoords.length, sumLat / withCoords.length];
}

function updateMapData(map: MapLike, mappableStops: PlaceStop[], mapId: string) {
  const coordinates = mappableStops.map((s) => [s.lng as number, s.lat as number]);

  const routeData = {
    type: "Feature" as const,
    geometry: { type: "LineString" as const, coordinates },
    properties: {}
  };

  const stopsData = {
    type: "FeatureCollection" as const,
    features: mappableStops.map((stop, index) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [stop.lng as number, stop.lat as number] },
      properties: { order: index + 1, stopId: stop.id, name: stop.name }
    }))
  };

  const routeSource = map.getSource(`route-${mapId}`) as { setData?: (data: unknown) => void } | undefined;
  const stopsSource = map.getSource(`stops-${mapId}`) as { setData?: (data: unknown) => void } | undefined;

  if (routeSource?.setData) {
    routeSource.setData(routeData);
  } else {
    try {
      map.addSource(`route-${mapId}`, { type: "geojson", data: routeData });
      map.addLayer({
        id: `route-line-${mapId}`,
        type: "line",
        source: `route-${mapId}`,
        paint: { "line-color": "#66735A", "line-width": 3, "line-opacity": 0.9 }
      });
    } catch { /* source already exists */ }
  }

  if (stopsSource?.setData) {
    stopsSource.setData(stopsData);
  } else {
    try {
      map.addSource(`stops-${mapId}`, { type: "geojson", data: stopsData });
      map.addLayer({
        id: `stops-fill-${mapId}`,
        type: "circle",
        source: `stops-${mapId}`,
        paint: {
          "circle-radius": 8,
          "circle-color": "#BF6C4D",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#F6F1E7"
        }
      });
      map.addLayer({
        id: `stops-label-${mapId}`,
        type: "symbol",
        source: `stops-${mapId}`,
        layout: {
          "text-field": ["get", "order"],
          "text-size": 11,
          "text-offset": [0, -1.8],
          "text-allow-overlap": true
        },
        paint: { "text-color": "#1f2a3a", "text-halo-color": "#F6F1E7", "text-halo-width": 1.5 }
      });
    } catch { /* source already exists */ }
  }
}

function fitBoundsToStops(map: MapLike, stops: PlaceStop[], maplibregl: { LngLatBounds: new () => unknown }) {
  const BoundsClass = maplibregl.LngLatBounds;
  const bounds = new BoundsClass() as { extend: (coord: [number, number]) => void };
  for (const stop of stops) {
    bounds.extend([stop.lng as number, stop.lat as number]);
  }
  map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
}

export { computeCentroid };
