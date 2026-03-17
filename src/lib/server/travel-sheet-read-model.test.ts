import { describe, expect, test } from "vitest";

import { trips as mockTrips } from "@/data/mock-trips";
import { buildTravelSheetSeed } from "@/lib/server/travel-sheet-seed";
import { createArchiveSnapshot, createTripDetailSnapshot } from "@/lib/server/travel-sheet-read-model";

describe("travel sheet read model", () => {
  test("filters archive trips by active membership", async () => {
    const workbook = buildTravelSheetSeed({
      seededAt: "2026-03-17T12:00:00.000Z",
      trips: mockTrips,
      ownerEmail: "owner@example.com"
    });

    workbook.tripMemberships.push({
      trip_id: "lisbon-2025",
      email: "editor@example.com",
      role: "editor",
      status: "active",
      created_at: "2026-03-17T12:00:00.000Z"
    });

    const archive = await createArchiveSnapshot({
      workbook,
      viewerEmail: "editor@example.com",
      signPhotoUrl: async (key) => `signed:${key}`
    });

    expect(archive.map((trip) => trip.id)).toEqual(["lisbon-2025"]);
  });

  test("materializes trip detail and signs only R2-backed gallery photos", async () => {
    const workbook = buildTravelSheetSeed({
      seededAt: "2026-03-17T12:00:00.000Z",
      trips: mockTrips,
      ownerEmail: "owner@example.com"
    });

    workbook.tripPhotos.push({
      photo_id: "r2-photo-1",
      trip_id: "kyoto-2026",
      day_id: "kyoto-day-1",
      storage_key: "trips/kyoto-2026/kyoto-day-1/r2-photo-1.jpg",
      alt: "Signed upload",
      captured_at: "2026-04-12T10:45:00+09:00",
      status: "ready",
      original_filename: "signed-upload.jpg",
      created_at: "2026-03-17T12:00:00.000Z"
    });

    const trip = await createTripDetailSnapshot({
      workbook,
      tripId: "kyoto-2026",
      viewerEmail: "owner@example.com",
      signPhotoUrl: async (key) => `signed:${key}`
    });

    expect(trip?.id).toBe("kyoto-2026");
    expect(trip?.days[0].gallery.some((photo) => photo.url.startsWith("signed:"))).toBe(true);
    expect(trip?.days[0].gallery.some((photo) => photo.url.startsWith("https://"))).toBe(true);
  });
});
