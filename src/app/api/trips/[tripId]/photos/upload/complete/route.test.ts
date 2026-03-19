import { beforeEach, describe, expect, test, vi } from "vitest";

const session = vi.hoisted(() => ({
  getViewerEmail: vi.fn()
}));

const service = vi.hoisted(() => ({
  completePhotoUploadsForTrip: vi.fn()
}));

vi.mock("@/lib/server/session", () => session);
vi.mock("@/lib/server/trip-studio-service", () => service);

import { POST } from "@/app/api/trips/[tripId]/photos/upload/complete/route";

describe("POST /api/trips/[tripId]/photos/upload/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns 401 when the viewer is not signed in", async () => {
    session.getViewerEmail.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/trips/kyoto-2026/photos/upload/complete", {
        body: JSON.stringify({
          timezone: "Asia/Tokyo",
          tripDays: [],
          uploads: []
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      }),
      { params: Promise.resolve({ tripId: "kyoto-2026" }) }
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "Unauthorized" });
  });

  test("finalizes uploaded photos and returns assignment details", async () => {
    session.getViewerEmail.mockResolvedValue("owner@example.com");
    service.completePhotoUploadsForTrip.mockResolvedValue({
      assigned: [{ dayId: "kyoto-day-1", photoId: "photo-1" }],
      unassigned: []
    });

    const response = await POST(
      new Request("http://localhost/api/trips/kyoto-2026/photos/upload/complete", {
        body: JSON.stringify({
          timezone: "Asia/Tokyo",
          tripDays: [{ date: "2026-04-12", id: "kyoto-day-1" }],
          uploads: [
            {
              contentType: "image/jpeg",
              originalFilename: "torii.jpg",
              photoId: "photo-1",
              storageKey: "trips/kyoto-2026/torii.jpg"
            }
          ]
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      }),
      { params: Promise.resolve({ tripId: "kyoto-2026" }) }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      assigned: [{ dayId: "kyoto-day-1", photoId: "photo-1" }],
      unassigned: []
    });
    expect(service.completePhotoUploadsForTrip).toHaveBeenCalledWith({
      timezone: "Asia/Tokyo",
      tripDays: [{ date: "2026-04-12", day_id: "kyoto-day-1" }],
      tripId: "kyoto-2026",
      uploads: [
        {
          contentType: "image/jpeg",
          originalFilename: "torii.jpg",
          photoId: "photo-1",
          storageKey: "trips/kyoto-2026/torii.jpg"
        }
      ],
      viewerEmail: "owner@example.com"
    });
  });
});
