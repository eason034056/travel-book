import crypto from "node:crypto";

import { isGoogleMapsShortLink, parseGoogleMapsLink } from "@/lib/google-maps-parser";
import type { TripStopSheetRow } from "@/lib/server/travel-sheet-schema";

interface TopSearchPlace {
  name: string;
  lat: number;
  lng: number;
  ftid: string;
}

function hasPlaceIdentifier(url: URL) {
  return ["ftid", "cid", "query_place_id"].some((key) => {
    const value = url.searchParams.get(key);
    return Boolean(value && value.trim());
  });
}

function isGenericSearchMapsUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const path = decodeURIComponent(url.pathname);
    return path.includes("/maps/search/") && !hasPlaceIdentifier(url);
  } catch {
    return false;
  }
}

function extractMapSearchPathFromHtml(html: string) {
  const pathMatch = html.match(/\/search\?tbm=map[^"'\s]+/);
  if (!pathMatch) return null;

  return pathMatch[0].replace(/&amp;/g, "&");
}

function parseTopPlaceFromSearchPayload(payload: string): TopSearchPlace | null {
  const normalizedPayload = payload.replace(/^\)\]\}'\s*\n?/, "");
  let data: unknown;

  try {
    data = JSON.parse(normalizedPayload);
  } catch {
    return null;
  }

  if (!Array.isArray(data)) return null;

  for (const section of data) {
    if (!Array.isArray(section)) continue;

    for (const entry of section) {
      if (!Array.isArray(entry) || entry.length < 2 || !Array.isArray(entry[1])) continue;

      const details = entry[1];
      const name = typeof details[11] === "string" ? details[11].trim() : "";
      const ftid = typeof details[10] === "string" ? details[10].trim() : "";
      const coordinates = Array.isArray(details[9]) ? details[9] : null;
      const lat = Number(coordinates?.[2]);
      const lng = Number(coordinates?.[3]);

      if (!name || !ftid || Number.isNaN(lat) || Number.isNaN(lng)) continue;

      return {
        name,
        lat,
        lng,
        ftid
      };
    }
  }

  return null;
}

async function resolveGenericSearchUrl(rawUrl: string): Promise<string | null> {
  if (!isGenericSearchMapsUrl(rawUrl)) return null;

  try {
    const mapsPageResponse = await fetch(rawUrl, { redirect: "follow" });
    if (!mapsPageResponse.ok) return null;

    const mapsPageHtml = await mapsPageResponse.text();
    const searchPath = extractMapSearchPathFromHtml(mapsPageHtml);
    if (!searchPath) return null;

    const searchResponse = await fetch(`https://www.google.com${searchPath}`, { redirect: "follow" });
    if (!searchResponse.ok) return null;

    const searchPayload = await searchResponse.text();
    const topPlace = parseTopPlaceFromSearchPayload(searchPayload);
    if (!topPlace) return null;

    const encodedName = encodeURIComponent(topPlace.name);
    const encodedFtid = encodeURIComponent(topPlace.ftid);
    return `https://www.google.com/maps/place/${encodedName}/@${topPlace.lat},${topPlace.lng},17z?ftid=${encodedFtid}`;
  } catch {
    return null;
  }
}

export async function expandShortUrl(rawUrl: string): Promise<string> {
  if (!isGoogleMapsShortLink(rawUrl)) return rawUrl;

  try {
    const response = await fetch(rawUrl, { method: "HEAD", redirect: "follow" });
    const expandedUrl = response.url || rawUrl;
    const resolvedUrl = await resolveGenericSearchUrl(expandedUrl);
    return resolvedUrl ?? expandedUrl;
  } catch {
    try {
      const response = await fetch(rawUrl, { redirect: "follow" });
      const expandedUrl = response.url || rawUrl;
      const resolvedUrl = await resolveGenericSearchUrl(expandedUrl);
      return resolvedUrl ?? expandedUrl;
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
