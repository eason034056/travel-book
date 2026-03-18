import { describe, expect, test } from "vitest";

import type { TripDaySheetRow } from "@/lib/server/travel-sheet-schema";
import { buildDateDrivenDayRows, buildTripId, planTripDayRange } from "@/lib/server/trip-studio-model";

describe("trip studio model", () => {
  test("buildTripId slugifies title and appends numeric suffix on collisions", () => {
    const tripId = buildTripId({
      existingTripIds: ["kyoto-in-april-2026-04-12", "kyoto-in-april-2026-04-12-2"],
      startDate: "2026-04-12",
      title: "Kyoto in April"
    });

    expect(tripId).toBe("kyoto-in-april-2026-04-12-3");
  });

  test("buildDateDrivenDayRows creates one blank row per date in range", () => {
    const rows = buildDateDrivenDayRows({
      endDate: "2026-04-14",
      startDate: "2026-04-12",
      tripId: "kyoto-in-april-2026-04-12"
    });

    expect(rows).toEqual([
      expect.objectContaining({
        date: "2026-04-12",
        day_id: "kyoto-in-april-2026-04-12-day-2026-04-12",
        day_index: "1",
        trip_id: "kyoto-in-april-2026-04-12"
      }),
      expect.objectContaining({
        date: "2026-04-13",
        day_id: "kyoto-in-april-2026-04-12-day-2026-04-13",
        day_index: "2",
        trip_id: "kyoto-in-april-2026-04-12"
      }),
      expect.objectContaining({
        date: "2026-04-14",
        day_id: "kyoto-in-april-2026-04-12-day-2026-04-14",
        day_index: "3",
        trip_id: "kyoto-in-april-2026-04-12"
      })
    ]);
  });

  test("planTripDayRange preserves overlapping day content and adds blank days for new dates", () => {
    const existingDays: TripDaySheetRow[] = [
      makeTripDayRow({
        date: "2026-04-12",
        day_id: "kyoto-day-1",
        day_index: "1",
        title: "Shrine gates"
      }),
      makeTripDayRow({
        date: "2026-04-13",
        day_id: "kyoto-day-2",
        day_index: "2",
        title: "Temple lanes"
      })
    ];

    const result = planTripDayRange({
      endDate: "2026-04-14",
      existingDays,
      startDate: "2026-04-13",
      tripId: "kyoto-in-april-2026-04-12"
    });

    expect(result.removedDayIds).toEqual(["kyoto-day-1"]);
    expect(result.days).toEqual([
      expect.objectContaining({
        date: "2026-04-13",
        day_id: "kyoto-day-2",
        day_index: "1",
        title: "Temple lanes"
      }),
      expect.objectContaining({
        date: "2026-04-14",
        day_id: "kyoto-in-april-2026-04-12-day-2026-04-14",
        day_index: "2",
        title: ""
      })
    ]);
  });
});

function makeTripDayRow(overrides: Partial<TripDaySheetRow>): TripDaySheetRow {
  return {
    city_label: "",
    date: "2026-04-12",
    day_id: "day-1",
    day_index: "1",
    hero_photo_url: "",
    highlight_moment: "",
    journal: "",
    summary: "",
    title: "",
    trip_id: "trip-1",
    ...overrides
  };
}
