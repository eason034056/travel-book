import crypto from "node:crypto";

import { parseGoogleMapsLink } from "@/lib/google-maps-parser";
import type { TripStopSheetRow } from "@/lib/server/travel-sheet-schema";

interface BuildStopImportRowsOptions {
  tripId: string;
  dayId: string;
  existingStopCount: number;
  importedAt: string;
  urls: string[];
}

export function buildStopImportRows({
  tripId,
  dayId,
  existingStopCount,
  importedAt,
  urls
}: BuildStopImportRowsOptions): {
  resolvedCount: number;
  unresolved: Array<{ originalUrl: string; reason: string }>;
  rows: TripStopSheetRow[];
} {
  const rows: TripStopSheetRow[] = [];
  const unresolved: Array<{ originalUrl: string; reason: string }> = [];
  let resolvedCount = 0;

  for (const url of urls.map((value) => value.trim()).filter(Boolean)) {
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
      rows.push({
        stop_id: crypto.randomUUID(),
        trip_id: tripId,
        day_id: dayId,
        name: stop.name,
        lat: stop.lat === null ? "" : String(stop.lat),
        lng: stop.lng === null ? "" : String(stop.lng),
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
