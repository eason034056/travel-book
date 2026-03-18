import crypto from "node:crypto";

import { parseGoogleMapsLink } from "@/lib/google-maps-parser";
import type { TripStopSheetRow } from "@/lib/server/travel-sheet-schema";

function isShortGoogleUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.hostname === "maps.app.goo.gl" || url.hostname === "goo.gl";
  } catch {
    return false;
  }
}

export async function expandShortUrl(rawUrl: string): Promise<string> {
  if (!isShortGoogleUrl(rawUrl)) return rawUrl;

  try {
    const response = await fetch(rawUrl, { method: "HEAD", redirect: "follow" });
    return response.url || rawUrl;
  } catch {
    try {
      const response = await fetch(rawUrl, { redirect: "follow" });
      return response.url || rawUrl;
    } catch {
      return rawUrl;
    }
  }
}

export async function expandUrls(urls: string[]): Promise<string[]> {
  return Promise.all(urls.map((url) => expandShortUrl(url.trim())));
}

interface BuildStopImportRowsOptions {
  tripId: string;
  dayId: string;
  existingStopCount: number;
  importedAt: string;
  urls: string[];
}

async function geocodeStopName(name: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encodedName = encodeURIComponent(name);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedName}&format=json&limit=1`,
      { headers: { "User-Agent": "TravelBook/1.0" } }
    );

    if (!response.ok) return null;

    const results = (await response.json()) as Array<{ lat: string; lon: string }>;
    if (results.length === 0) return null;

    const lat = Number(results[0].lat);
    const lng = Number(results[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    return { lat, lng };
  } catch {
    return null;
  }
}

export async function buildStopImportRows({
  tripId,
  dayId,
  existingStopCount,
  importedAt,
  urls
}: BuildStopImportRowsOptions): Promise<{
  resolvedCount: number;
  unresolved: Array<{ originalUrl: string; reason: string }>;
  rows: TripStopSheetRow[];
}> {
  const rows: TripStopSheetRow[] = [];
  const unresolved: Array<{ originalUrl: string; reason: string }> = [];
  let resolvedCount = 0;

  const expandedUrls = await expandUrls(urls);

  for (const url of expandedUrls.filter(Boolean)) {
    const result = parseGoogleMapsLink(url);

    if (result.status === "unresolved") {
      unresolved.push({
        originalUrl: result.originalUrl,
        reason: result.reason
      });
      continue;
    }

    resolvedCount += 1;

    for (const stop of result.stops) {
      let { lat, lng } = stop;

      if (lat === null || lng === null) {
        const geocoded = await geocodeStopName(stop.name);
        if (geocoded) {
          lat = geocoded.lat;
          lng = geocoded.lng;
        }
      }

      rows.push({
        stop_id: crypto.randomUUID(),
        trip_id: tripId,
        day_id: dayId,
        name: stop.name,
        lat: lat === null ? "" : String(lat),
        lng: lng === null ? "" : String(lng),
        order_index: String(existingStopCount + rows.length),
        source_type: result.kind,
        original_url: result.originalUrl,
        created_at: importedAt
      });
    }
  }

  return {
    resolvedCount,
    unresolved,
    rows
  };
}
