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

function isSupportedGoogleHost(hostname: string) {
  return hostname.includes("google.") || hostname === "maps.google.com" || hostname.endsWith("goo.gl");
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

    return {
      status: "resolved",
      kind: "place",
      originalUrl: rawUrl,
      stops: [
        {
          name: decodeMapSegment(nameSegment),
          lat: coordinates.lat,
          lng: coordinates.lng,
          orderIndex: 0
        }
      ]
    };
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

  return {
    status: "unresolved",
    originalUrl: rawUrl,
    reason: "unsupported-path"
  };
}

