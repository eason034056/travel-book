import { describe, expect, test } from "vitest";

import { buildImportPreview } from "@/lib/import-draft";

describe("buildImportPreview", () => {
  test("merges resolved links into ordered draft stops and unresolved entries", () => {
    const preview = buildImportPreview([
      "https://www.google.com/maps/dir/Fushimi+Inari+Taisha/Gion+Shirakawa/@34.9981,135.7712,13z",
      "https://www.google.com/maps/place/Kiyomizu-dera/@34.9948561,135.7849531,17z/data=!3m1!4b1",
      "https://example.com/other"
    ]);

    expect(preview.resolvedCount).toBe(2);
    expect(preview.unresolved).toEqual([
      {
        originalUrl: "https://example.com/other",
        reason: "unsupported-host"
      }
    ]);
    expect(preview.stops.map((stop) => stop.name)).toEqual([
      "Fushimi Inari Taisha",
      "Gion Shirakawa",
      "Kiyomizu-dera"
    ]);
    expect(preview.stops.map((stop) => stop.orderIndex)).toEqual([0, 1, 2]);
  });
});

