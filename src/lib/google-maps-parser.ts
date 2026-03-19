import type { ParsedGoogleMapsLink } from "@/types/travel";

function decodeMapSegment(value: string) {
  return decodeURIComponent(value.replace(/\+/g, " ")).trim();
}

function parseCoordinatePair(value: string) {
  const [latString, lngString] = value.split(",");
  const lat = Number(latString);
  const lng = Number(lngString);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return { lat: null, lng: null };
  }

  return { lat, lng };
}

function parseCoordinatesFromPath(path: string) {
  const coordinateMatch = path.match(/\/@(-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?)/);

  if (!coordinateMatch) {
    return { lat: null, lng: null };
  }

  return parseCoordinatePair(coordinateMatch[1]);
}

function buildResolvedPlace(rawUrl: string, name: string, coordinates: { lat: number | null; lng: number | null }): ParsedGoogleMapsLink {
  return {
    status: "resolved",
    kind: "place",
    originalUrl: rawUrl,
    stops: [
      {
        name,
        lat: coordinates.lat,
        lng: coordinates.lng,
        orderIndex: 0
      }
    ]
  };
}

function isMapsPath(path: string) {
  return path === "/maps" || path.startsWith("/maps/");
}

function hasPlaceIdentifier(url: URL) {
  return ["ftid", "cid", "query_place_id"].some((key) => {
    const value = url.searchParams.get(key);
    return Boolean(value && value.trim());
  });
}

function parseQueryStopName(url: URL) {
  const queryValue = url.searchParams.get("q") ?? url.searchParams.get("query");
  return queryValue ? decodeMapSegment(queryValue) : null;
}

export function isGoogleMapsShortLink(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.toLowerCase();
    return hostname === "maps.app.goo.gl" || hostname === "goo.gl";
  } catch {
    return false;
  }
}

function isSupportedGoogleHost(hostname: string) {
  const normalizedHostname = hostname.toLowerCase();
  return normalizedHostname.includes("google.") || normalizedHostname === "maps.google.com" || normalizedHostname.endsWith("goo.gl");
}

export function parseGoogleMapsLink(rawUrl: string): ParsedGoogleMapsLink {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return {
      status: "unresolved",
      originalUrl: rawUrl,
      reason: "invalid-url"
    };
  }

  if (!isSupportedGoogleHost(url.hostname)) {
    return {
      status: "unresolved",
      originalUrl: rawUrl,
      reason: "unsupported-host"
    };
  }

  const path = decodeURIComponent(url.pathname);

  if (path.includes("/maps/place/")) {
    const [, tail = ""] = path.split("/maps/place/");
    const [nameSegment = "", coordinateSegment = ""] = tail.split("/@");
    const coordinates = parseCoordinatePair(coordinateSegment);

    if (!nameSegment) {
      return {
        status: "unresolved",
        originalUrl: rawUrl,
        reason: "unsupported-path"
      };
    }

    return buildResolvedPlace(rawUrl, decodeMapSegment(nameSegment), coordinates);
  }

  if (path.includes("/maps/dir/")) {
    const [, tail = ""] = path.split("/maps/dir/");
    const segments = tail
      .split("/")
      .filter(Boolean)
      .filter((segment) => !segment.startsWith("@"));

    if (segments.length === 0) {
      return {
        status: "unresolved",
        originalUrl: rawUrl,
        reason: "missing-stops"
      };
    }

    return {
      status: "resolved",
      kind: "route",
      originalUrl: rawUrl,
      stops: segments.map((segment, index) => ({
        name: decodeMapSegment(segment),
        lat: null,
        lng: null,
        orderIndex: index
      }))
    };
  }

  const singleStopName = isMapsPath(path) && hasPlaceIdentifier(url) ? parseQueryStopName(url) : null;

  if (singleStopName) {
    return buildResolvedPlace(rawUrl, singleStopName, parseCoordinatesFromPath(path));
  }

  return {
    status: "unresolved",
    originalUrl: rawUrl,
    reason: "unsupported-path"
  };
}
