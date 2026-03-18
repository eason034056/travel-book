import { beforeEach, describe, expect, test, vi } from "vitest";

import { trips as mockTrips } from "@/data/mock-trips";
import {
  createCollaboratorInvite,
  cancelPendingInviteForTrip,
  createTripForViewer,
  deleteTripForViewer,
  revokeCollaboratorForTrip,
  updateTripOverview
} from "@/lib/server/trip-studio-service";
import { buildTravelSheetSeed } from "@/lib/server/travel-sheet-seed";

const googleSheets = vi.hoisted(() => ({
  appendInviteToken: vi.fn(),
  appendTableRows: vi.fn(),
  ensureTravelSheetStructure: vi.fn(),
  findInviteTokenByHash: vi.fn(),
  markInviteTokenExpired: vi.fn(),
  markInviteTokenUsed: vi.fn(),
  readTravelWorkbook: vi.fn(),
  replaceTableRows: vi.fn()
}));

const r2 = vi.hoisted(() => ({
  deleteTripStorageKeys: vi.fn(),
  uploadTripPhoto: vi.fn()
}));

vi.mock("@/lib/server/google-sheets", () => googleSheets);
vi.mock("@/lib/server/r2", () => r2);

describe("trip studio service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("creates a trip with a unique trip id, generated day rows, and owner membership", async () => {
    const workbook = buildTravelSheetSeed({
      seededAt: "2026-03-17T12:00:00.000Z",
      trips: mockTrips,
      ownerEmail: "owner@example.com"
    });
    workbook.trips.push({
      cover_photo_url: "",
      end_date: "2026-04-12",
      highlight_label: "",
      map_center_lat: "35.6895",
      map_center_lng: "139.6917",
      route_summary: "",
      start_date: "2026-04-12",
      summary: "",
      timezone: "Asia/Tokyo",
      title: "Kyoto in April",
      travel_companions_csv: "",
      trip_id: "kyoto-in-april-2026-04-12"
    });

    googleSheets.readTravelWorkbook.mockResolvedValue(workbook);

    const result = await createTripForViewer({
      payload: {
        coverPhotoValue: "",
        days: [
          {
            cityLabel: "Tokyo",
            date: "2026-04-12",
            heroPhotoValue: "",
            highlightMoment: "First train out",
            journal: "Notes",
            summary: "Arrival day",
            title: "Touchdown"
          }
        ],
        endDate: "2026-04-12",
        highlightLabel: "First taste of spring.",
        mapCenter: [139.6917, 35.6895],
        routeSummary: "Haneda -> Shibuya",
        startDate: "2026-04-12",
        summary: "A city break",
        timezone: "Asia/Tokyo",
        title: "Kyoto in April",
        travelCompanions: ["Wyu", "Mina"]
      },
      viewerEmail: "author@example.com"
    });

    expect(result.tripId).toBe("kyoto-in-april-2026-04-12-2");
    expect(googleSheets.appendTableRows).toHaveBeenNthCalledWith(
      1,
      "trips",
      expect.arrayContaining([
        expect.objectContaining({
          trip_id: "kyoto-in-april-2026-04-12-2",
          title: "Kyoto in April"
        })
      ])
    );
    expect(googleSheets.appendTableRows).toHaveBeenNthCalledWith(
      2,
      "tripDays",
      expect.arrayContaining([
        expect.objectContaining({
          date: "2026-04-12",
          trip_id: "kyoto-in-april-2026-04-12-2"
        })
      ])
    );
    expect(googleSheets.appendTableRows).toHaveBeenNthCalledWith(
      3,
      "tripMemberships",
      expect.arrayContaining([
        expect.objectContaining({
          email: "author@example.com",
          role: "owner",
          trip_id: "kyoto-in-april-2026-04-12-2"
        })
      ])
    );
  });

  test("requires explicit confirmation before shrinking a trip date range that would remove data", async () => {
    const workbook = buildTravelSheetSeed({
      seededAt: "2026-03-17T12:00:00.000Z",
      trips: mockTrips,
      ownerEmail: "owner@example.com"
    });
    workbook.tripStops.push({
      created_at: "2026-03-17T12:00:00.000Z",
      day_id: "kyoto-day-2",
      lat: "",
      lng: "",
      name: "Tea house",
      order_index: "9",
      original_url: "",
      source_type: "place",
      stop_id: "stop-9",
      trip_id: "kyoto-2026"
    });

    googleSheets.readTravelWorkbook.mockResolvedValue(workbook);

    await expect(
      updateTripOverview({
        payload: {
          confirmDateShrink: false,
          coverPhotoValue: workbook.trips[0].cover_photo_url,
          endDate: "2026-04-12",
          highlightLabel: workbook.trips[0].highlight_label,
          mapCenter: [135.7751, 35.0116],
          routeSummary: workbook.trips[0].route_summary,
          startDate: "2026-04-12",
          summary: workbook.trips[0].summary,
          timezone: workbook.trips[0].timezone,
          title: workbook.trips[0].title,
          travelCompanions: ["Wyu", "Mina"]
        },
        tripId: "kyoto-2026",
        viewerEmail: "owner@example.com"
      })
    ).rejects.toThrow("Date range shrink requires confirmation");
  });

  test("rejects an overview update when the end date is before the start date", async () => {
    const workbook = buildTravelSheetSeed({
      seededAt: "2026-03-17T12:00:00.000Z",
      trips: mockTrips,
      ownerEmail: "owner@example.com"
    });

    googleSheets.readTravelWorkbook.mockResolvedValue(workbook);

    await expect(
      updateTripOverview({
        payload: {
          confirmDateShrink: false,
          coverPhotoValue: workbook.trips[0].cover_photo_url,
          endDate: "2026-04-12",
          highlightLabel: workbook.trips[0].highlight_label,
          mapCenter: [135.7751, 35.0116],
          routeSummary: workbook.trips[0].route_summary,
          startDate: "2026-04-13",
          summary: workbook.trips[0].summary,
          timezone: workbook.trips[0].timezone,
          title: workbook.trips[0].title,
          travelCompanions: ["Wyu", "Mina"]
        },
        tripId: "kyoto-2026",
        viewerEmail: "owner@example.com"
      })
    ).rejects.toThrow("End date must be on or after start date");
  });

  test("shrinking a trip date range deletes removed day rows and unassigns removed-day photos", async () => {
    const workbook = buildTravelSheetSeed({
      seededAt: "2026-03-17T12:00:00.000Z",
      trips: mockTrips,
      ownerEmail: "owner@example.com"
    });

    googleSheets.readTravelWorkbook.mockResolvedValue(workbook);

    await updateTripOverview({
      payload: {
        confirmDateShrink: true,
        coverPhotoValue: workbook.trips[0].cover_photo_url,
        endDate: "2026-04-12",
        highlightLabel: workbook.trips[0].highlight_label,
        mapCenter: [135.7751, 35.0116],
        routeSummary: workbook.trips[0].route_summary,
        startDate: "2026-04-12",
        summary: workbook.trips[0].summary,
        timezone: workbook.trips[0].timezone,
        title: workbook.trips[0].title,
        travelCompanions: ["Wyu", "Mina"]
      },
      tripId: "kyoto-2026",
      viewerEmail: "owner@example.com"
    });

    expect(googleSheets.replaceTableRows).toHaveBeenCalledWith(
      "tripDays",
      expect.not.arrayContaining([expect.objectContaining({ day_id: "kyoto-day-2" })])
    );
    expect(googleSheets.replaceTableRows).toHaveBeenCalledWith(
      "tripPhotos",
      expect.arrayContaining([
        expect.objectContaining({
          day_id: "",
          photo_id: "kyoto-day-2-photo-1",
          status: "unassigned"
        })
      ])
    );
  });

  test("revokes active editors and cancels pending invites as owner-only actions", async () => {
    const workbook = buildTravelSheetSeed({
      seededAt: "2026-03-17T12:00:00.000Z",
      trips: mockTrips,
      ownerEmail: "owner@example.com"
    });
    workbook.tripMemberships.push({
      created_at: "2026-03-17T12:30:00.000Z",
      email: "editor@example.com",
      role: "editor",
      status: "active",
      trip_id: "kyoto-2026"
    });
    workbook.inviteTokens.push({
      created_at: "2026-03-17T12:40:00.000Z",
      created_by_email: "owner@example.com",
      email: "guest@example.com",
      expires_at: "2026-03-24T12:40:00.000Z",
      invite_id: "invite-1",
      role: "editor",
      status: "pending",
      token_hash: "hashed",
      trip_id: "kyoto-2026",
      used_at: ""
    });

    googleSheets.readTravelWorkbook.mockResolvedValue(workbook);

    await revokeCollaboratorForTrip({
      collaboratorEmail: "editor@example.com",
      tripId: "kyoto-2026",
      viewerEmail: "owner@example.com"
    });
    await cancelPendingInviteForTrip({
      inviteId: "invite-1",
      tripId: "kyoto-2026",
      viewerEmail: "owner@example.com"
    });

    expect(googleSheets.replaceTableRows).toHaveBeenCalledWith(
      "tripMemberships",
      expect.arrayContaining([
        expect.objectContaining({
          email: "editor@example.com",
          status: "revoked"
        })
      ])
    );
    expect(googleSheets.replaceTableRows).toHaveBeenCalledWith(
      "inviteTokens",
      expect.arrayContaining([
        expect.objectContaining({
          invite_id: "invite-1",
          status: "expired"
        })
      ])
    );
  });

  test("rejects collaborator invites for existing active members or pending invitees", async () => {
    const workbook = buildTravelSheetSeed({
      seededAt: "2026-03-17T12:00:00.000Z",
      trips: mockTrips,
      ownerEmail: "owner@example.com"
    });
    workbook.tripMemberships.push({
      created_at: "2026-03-17T12:30:00.000Z",
      email: "editor@example.com",
      role: "editor",
      status: "active",
      trip_id: "kyoto-2026"
    });
    workbook.inviteTokens.push({
      created_at: "2026-03-17T12:40:00.000Z",
      created_by_email: "owner@example.com",
      email: "guest@example.com",
      expires_at: "2026-03-24T12:40:00.000Z",
      invite_id: "invite-1",
      role: "editor",
      status: "pending",
      token_hash: "hashed",
      trip_id: "kyoto-2026",
      used_at: ""
    });

    googleSheets.readTravelWorkbook.mockResolvedValue(workbook);

    await expect(
      createCollaboratorInvite({
        inviteeEmail: "editor@example.com",
        tripId: "kyoto-2026",
        viewerEmail: "owner@example.com"
      })
    ).rejects.toThrow("That collaborator already has access");

    await expect(
      createCollaboratorInvite({
        inviteeEmail: "guest@example.com",
        tripId: "kyoto-2026",
        viewerEmail: "owner@example.com"
      })
    ).rejects.toThrow("That collaborator already has a pending invite");
  });

  test("hard delete is owner-only and clears workbook rows plus internal R2 keys", async () => {
    const workbook = buildTravelSheetSeed({
      seededAt: "2026-03-17T12:00:00.000Z",
      trips: mockTrips,
      ownerEmail: "owner@example.com"
    });
    workbook.tripMemberships.push({
      created_at: "2026-03-17T12:30:00.000Z",
      email: "editor@example.com",
      role: "editor",
      status: "active",
      trip_id: "kyoto-2026"
    });
    workbook.tripPhotos.push({
      alt: "Uploaded",
      captured_at: "",
      created_at: "2026-03-17T12:00:00.000Z",
      day_id: "kyoto-day-1",
      original_filename: "upload.jpg",
      photo_id: "upload-1",
      status: "ready",
      storage_key: "trips/kyoto-2026/upload.jpg",
      trip_id: "kyoto-2026"
    });
    workbook.trips[0].cover_photo_url = "trips/kyoto-2026/upload.jpg";

    googleSheets.readTravelWorkbook.mockResolvedValue(workbook);

    await expect(
      deleteTripForViewer({
        tripId: "kyoto-2026",
        viewerEmail: "editor@example.com"
      })
    ).rejects.toThrow("Forbidden");

    await deleteTripForViewer({
      tripId: "kyoto-2026",
      viewerEmail: "owner@example.com"
    });

    expect(googleSheets.replaceTableRows).toHaveBeenCalledWith(
      "trips",
      expect.not.arrayContaining([expect.objectContaining({ trip_id: "kyoto-2026" })])
    );
    expect(r2.deleteTripStorageKeys).toHaveBeenCalledWith(["trips/kyoto-2026/upload.jpg"]);
  });
});
