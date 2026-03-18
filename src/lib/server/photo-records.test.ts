import { describe, expect, test } from "vitest";

import { buildPhotoRowsForPersistence } from "@/lib/server/photo-records";

describe("buildPhotoRowsForPersistence", () => {
  test("creates assigned and unassigned photo rows for storage persistence", () => {
    const rows = buildPhotoRowsForPersistence({
      tripId: "kyoto-2026",
      uploadedAt: "2026-03-17T12:00:00.000Z",
      photos: [
        {
          photoId: "photo-1",
          storageKey: "trips/kyoto-2026/photo-1.jpg",
          originalFilename: "photo-1.jpg",
          capturedAt: "2026-04-12T08:00:00+09:00",
          assignedDayId: "kyoto-day-1"
        },
        {
          photoId: "photo-2",
          storageKey: "trips/kyoto-2026/photo-2.jpg",
          originalFilename: "photo-2.jpg",
          capturedAt: undefined,
          assignedDayId: undefined
        }
      ]
    });

    expect(rows).toEqual([
      expect.objectContaining({
        trip_id: "kyoto-2026",
        day_id: "kyoto-day-1",
        storage_key: "trips/kyoto-2026/photo-1.jpg",
        status: "ready"
      }),
      expect.objectContaining({
        trip_id: "kyoto-2026",
        day_id: "",
        storage_key: "trips/kyoto-2026/photo-2.jpg",
        status: "unassigned"
      })
    ]);
  });
});
