import { describe, expect, test } from "vitest";

import { trips as mockTrips } from "@/data/mock-trips";
import { createTripStudioSnapshot } from "@/lib/server/trip-studio-read-model";
import { buildTravelSheetSeed } from "@/lib/server/travel-sheet-seed";

describe("trip studio read model", () => {
  test("materializes an editor-facing studio snapshot with collaborators and pending invites", async () => {
    const workbook = buildTravelSheetSeed({
      seededAt: "2026-03-17T12:00:00.000Z",
      trips: mockTrips,
      ownerEmail: "owner@example.com"
    });

    workbook.tripMemberships.push({
      created_at: "2026-03-17T13:00:00.000Z",
      email: "editor@example.com",
      role: "editor",
      status: "active",
      trip_id: "kyoto-2026"
    });
    workbook.inviteTokens.push({
      created_at: "2026-03-17T12:30:00.000Z",
      created_by_email: "owner@example.com",
      email: "guest@example.com",
      expires_at: "2026-03-24T12:30:00.000Z",
      invite_id: "invite-1",
      role: "editor",
      status: "pending",
      token_hash: "hashed",
      trip_id: "kyoto-2026",
      used_at: ""
    });
    workbook.tripPhotos.push({
      alt: "R2 cover photo",
      captured_at: "2026-04-12T07:15:00+09:00",
      created_at: "2026-03-17T12:00:00.000Z",
      day_id: "kyoto-day-1",
      original_filename: "cover.jpg",
      photo_id: "photo-1",
      status: "ready",
      storage_key: "trips/kyoto-2026/cover.jpg",
      trip_id: "kyoto-2026"
    });
    workbook.trips[0].cover_photo_url = "trips/kyoto-2026/cover.jpg";
    workbook.trips[0].ending_photo_ids_csv = "photo-1,kyoto-day-2-photo-1";
    workbook.tripDays[0].hero_photo_url = "trips/kyoto-2026/cover.jpg";

    const snapshot = await createTripStudioSnapshot({
      signPhotoUrl: async (key) => `signed:${key}`,
      tripId: "kyoto-2026",
      viewerEmail: "editor@example.com",
      workbook
    });

    expect(snapshot?.viewerRole).toBe("editor");
    expect(snapshot?.collaborators).toEqual([
      expect.objectContaining({ email: "owner@example.com", role: "owner" }),
      expect.objectContaining({ email: "editor@example.com", role: "editor" })
    ]);
    expect(snapshot?.pendingInvites).toEqual([
      expect.objectContaining({ email: "guest@example.com", inviteId: "invite-1" })
    ]);
    expect(snapshot?.coverPhotoPreviewUrl).toBe("signed:trips/kyoto-2026/cover.jpg");
    expect(snapshot?.endingPhotoIds).toEqual(["photo-1", "kyoto-day-2-photo-1"]);
    expect(snapshot?.days[0].heroPhotoPreviewUrl).toBe("signed:trips/kyoto-2026/cover.jpg");
    expect(snapshot?.photos).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "photo-1",
        previewUrl: "signed:trips/kyoto-2026/cover.jpg"
      })
    ]));
  });
});
