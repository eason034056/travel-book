import { describe, expect, test } from "vitest";

import { parseGoogleMapsLink } from "@/lib/google-maps-parser";

describe("parseGoogleMapsLink", () => {
  test("parses a place link with coordinates", () => {
    const result = parseGoogleMapsLink(
      "https://www.google.com/maps/place/Kiyomizu-dera/@34.9948561,135.7849531,17z/data=!3m1!4b1"
    );

    expect(result.status).toBe("resolved");
    if (result.status !== "resolved") {
      throw new Error("Expected resolved link");
    }

    expect(result.kind).toBe("place");
    expect(result.stops).toEqual([
      expect.objectContaining({
        name: "Kiyomizu-dera",
        lat: 34.9948561,
        lng: 135.7849531,
        orderIndex: 0
      })
    ]);
  });

  test("parses a directions link into ordered stops", () => {
    const result = parseGoogleMapsLink(
      "https://www.google.com/maps/dir/Fushimi+Inari+Taisha/Starbucks+Coffee+Kyoto+Sannenzaka+Yasaka+Chaya/Gion+Shirakawa/@34.9981,135.7712,13z"
    );

    expect(result.status).toBe("resolved");
    if (result.status !== "resolved") {
      throw new Error("Expected resolved link");
    }

    expect(result.kind).toBe("route");
    expect(result.stops.map((stop) => stop.name)).toEqual([
      "Fushimi Inari Taisha",
      "Starbucks Coffee Kyoto Sannenzaka Yasaka Chaya",
      "Gion Shirakawa"
    ]);
    expect(result.stops.map((stop) => stop.orderIndex)).toEqual([0, 1, 2]);
  });

  test("returns unresolved for an expanded generic search link", () => {
    const result = parseGoogleMapsLink(
      "https://www.google.com/maps/search/dessert/@25.7649259,-80.1953244,17.76z/data=!4m2!2m1!6e5?entry=tts"
    );

    expect(result).toEqual({
      status: "unresolved",
      originalUrl: "https://www.google.com/maps/search/dessert/@25.7649259,-80.1953244,17.76z/data=!4m2!2m1!6e5?entry=tts",
      reason: "unsupported-path"
    });
  });

  test("parses a maps query link into a single stop", () => {
    const result = parseGoogleMapsLink(
      "https://maps.google.com/maps?q=RivaReno+Gelato+-+Brickell,+901+S+Miami+Ave+Suite+105,+Miami,+FL+33130&ftid=0x88d9b7f02d235235:0x5bde400a8a7db3a3&entry=gps&g_st=ic"
    );

    expect(result.status).toBe("resolved");
    if (result.status !== "resolved") {
      throw new Error("Expected resolved link");
    }

    expect(result.kind).toBe("place");
    expect(result.stops).toEqual([
      expect.objectContaining({
        name: "RivaReno Gelato - Brickell, 901 S Miami Ave Suite 105, Miami, FL 33130",
        lat: null,
        lng: null,
        orderIndex: 0
      })
    ]);
  });

  test("returns unresolved for a non-google url", () => {
    const result = parseGoogleMapsLink("https://example.com/travel");

    expect(result).toEqual({
      status: "unresolved",
      originalUrl: "https://example.com/travel",
      reason: "unsupported-host"
    });
  });
});
