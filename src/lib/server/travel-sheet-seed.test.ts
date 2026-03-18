import { describe, expect, test } from "vitest";

import { trips } from "@/data/mock-trips";
import { buildTravelSheetSeed } from "@/lib/server/travel-sheet-seed";

describe("buildTravelSheetSeed", () => {
  test("converts mock trips into sheet tabs and owner memberships", () => {
    const seededAt = "2026-03-17T12:00:00.000Z";
    const workbook = buildTravelSheetSeed({
      seededAt,
      trips,
      ownerEmail: "owner@example.com"
    });

    expect(workbook.trips).toHaveLength(2);
    expect(workbook.tripDays).toHaveLength(3);
    expect(workbook.tripStops).toHaveLength(7);
    expect(workbook.tripPhotos).toHaveLength(5);
    expect(workbook.tripMemberships).toHaveLength(2);
    expect(workbook.inviteTokens).toHaveLength(0);

    expect(workbook.trips[0]).toMatchObject({
      trip_id: "kyoto-2026",
      title: "Kyoto in April",
      timezone: "Asia/Tokyo"
    });

    expect(workbook.tripMemberships[0]).toMatchObject({
      trip_id: "kyoto-2026",
      email: "owner@example.com",
      role: "owner",
      status: "active",
      created_at: seededAt
    });

    expect(workbook.tripPhotos[0]).toMatchObject({
      trip_id: "kyoto-2026",
      day_id: "kyoto-day-1",
      status: "ready",
      storage_key: expect.stringMatching(/^https:\/\//)
    });
  });
});
