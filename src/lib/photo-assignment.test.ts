import { describe, expect, test } from "vitest";

import { assignPhotosToDays } from "@/lib/photo-assignment";

const tripDays = [
  { id: "day-1", date: "2026-04-12" },
  { id: "day-2", date: "2026-04-13" }
];

describe("assignPhotosToDays", () => {
  test("assigns photos by trip timezone date", () => {
    const assignments = assignPhotosToDays(
      [
        { id: "photo-1", capturedAt: "2026-04-12T08:20:00+09:00" },
        { id: "photo-2", capturedAt: "2026-04-13T19:20:00+09:00" }
      ],
      tripDays,
      "Asia/Tokyo"
    );

    expect(assignments).toEqual({
      assigned: [
        { photoId: "photo-1", dayId: "day-1" },
        { photoId: "photo-2", dayId: "day-2" }
      ],
      unassigned: []
    });
  });

  test("keeps photos without capture time in the unassigned inbox", () => {
    const assignments = assignPhotosToDays(
      [{ id: "photo-3" }],
      tripDays,
      "Asia/Tokyo"
    );

    expect(assignments.assigned).toEqual([]);
    expect(assignments.unassigned).toEqual([{ photoId: "photo-3", reason: "missing-captured-at" }]);
  });
});

