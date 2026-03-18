import { parseGoogleMapsLink } from "@/lib/google-maps-parser";

export function buildImportPreview(urls: string[]) {
  const unresolved: Array<{ originalUrl: string; reason: string }> = [];
  const stops: Array<{ name: string; lat: number | null; lng: number | null; orderIndex: number }> = [];
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
      stops.push({
        ...stop,
        orderIndex: stops.length
      });
    }
  }

  return {
    resolvedCount,
    unresolved,
    stops
  };
}

