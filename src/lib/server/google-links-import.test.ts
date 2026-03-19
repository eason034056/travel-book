import { afterEach, describe, expect, test, vi } from "vitest";

import { buildStopImportRows } from "@/lib/server/google-links-import";

describe("buildStopImportRows", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("persists resolved stops into the selected day and reports unresolved links", async () => {
    const result = await buildStopImportRows({
      tripId: "kyoto-2026",
      dayId: "kyoto-day-2",
      existingStopCount: 3,
      importedAt: "2026-03-17T12:00:00.000Z",
      urls: [
        "https://www.google.com/maps/place/Kiyomizu-dera/@34.9948561,135.7849531,17z/data=!3m1!4b1",
        "https://www.google.com/maps/dir/Fushimi+Inari+Taisha/Gion+Shirakawa/@34.9981,135.7712,13z",
        "https://example.com/not-google"
      ]
    });

    expect(result.resolvedCount).toBe(2);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).toMatchObject({
      trip_id: "kyoto-2026",
      day_id: "kyoto-day-2",
      order_index: "3",
      name: "Kiyomizu-dera"
    });
    expect(result.rows[2]).toMatchObject({
      order_index: "5",
      name: "Gion Shirakawa"
    });
    expect(result.unresolved).toEqual([
      {
        originalUrl: "https://example.com/not-google",
        reason: "unsupported-host"
      }
    ]);
  });

  test("expands maps.app.goo.gl links and resolves generic search pages to a top place", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

      if (url === "https://maps.app.goo.gl/XK1UWoaUpfkYUeJd9") {
        return {
          url: "https://www.google.com/maps/search/dessert/@25.7649259,-80.1953244,17.76z/data=!4m2!2m1!6e5?entry=tts"
        } as Response;
      }

      if (url === "https://www.google.com/maps/search/dessert/@25.7649259,-80.1953244,17.76z/data=!4m2!2m1!6e5?entry=tts") {
        return {
          ok: true,
          text: async () =>
            '<link href="/search?tbm=map&amp;authuser=0&amp;hl=en&amp;gl=us&amp;q=dessert&amp;pb=mock-pb" rel="preload">'
        } as Response;
      }

      if (url === "https://www.google.com/search?tbm=map&authuser=0&hl=en&gl=us&q=dessert&pb=mock-pb") {
        return {
          ok: true,
          text: async () =>
            `)]}'
${JSON.stringify([
  [
    [null, [null, null, ["708 SW 1st Ct Unit 708", "Miami, FL 33130"], null, null, null, null, null, null, [null, null, 25.7669613, -80.1959656], "0x88d9b74e8cc96ff9:0xb0e0636426b04b36", "La Suiza BakeHouse Brickell"]]
  ]
])}`
        } as Response;
      }

      if (url === "https://maps.app.goo.gl/WGr1LUVTZeT1tY4N8?g_st=ic") {
        return {
          url: "https://maps.google.com/maps?q=RivaReno+Gelato+-+Brickell,+901+S+Miami+Ave+Suite+105,+Miami,+FL+33130&ftid=0x88d9b7f02d235235:0x5bde400a8a7db3a3&entry=gps&g_st=ic"
        } as Response;
      }

      if (url.startsWith("https://nominatim.openstreetmap.org/search?")) {
        return {
          ok: true,
          json: async () => [{ lat: "25.767178", lon: "-80.193362" }]
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    const result = await buildStopImportRows({
      tripId: "miami-2026",
      dayId: "miami-day-1",
      existingStopCount: 0,
      importedAt: "2026-03-19T16:00:00.000Z",
      urls: [
        "https://maps.app.goo.gl/XK1UWoaUpfkYUeJd9",
        "https://maps.app.goo.gl/WGr1LUVTZeT1tY4N8?g_st=ic"
      ]
    });

    expect(result.resolvedCount).toBe(2);
    expect(result.unresolved).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      trip_id: "miami-2026",
      day_id: "miami-day-1",
      name: "La Suiza BakeHouse Brickell",
      lat: "25.7669613",
      lng: "-80.1959656",
      order_index: "0",
      source_type: "place"
    });
    expect(result.rows[1]).toMatchObject({
      trip_id: "miami-2026",
      day_id: "miami-day-1",
      name: "RivaReno Gelato - Brickell, 901 S Miami Ave Suite 105, Miami, FL 33130",
      lat: "25.767178",
      lng: "-80.193362",
      order_index: "1",
      source_type: "place"
    });
  });
});
