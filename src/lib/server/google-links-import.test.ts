import { describe, expect, test } from "vitest";

import { buildStopImportRows } from "@/lib/server/google-links-import";

describe("buildStopImportRows", () => {
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
});
