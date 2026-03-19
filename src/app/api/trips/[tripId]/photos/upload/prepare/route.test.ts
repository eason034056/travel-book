import { beforeEach, describe, expect, test, vi } from "vitest";

const session = vi.hoisted(() => ({
  getViewerEmail: vi.fn()
}));

const service = vi.hoisted(() => ({
  preparePhotoUploadsForTrip: vi.fn()
}));

vi.mock("@/lib/server/session", () => session);
vi.mock("@/lib/server/trip-studio-service", () => service);

import { POST } from "@/app/api/trips/[tripId]/photos/upload/prepare/route";

describe("POST /api/trips/[tripId]/photos/upload/prepare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns 401 when the viewer is not signed in", async () => {
    session.getViewerEmail.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/trips/kyoto-2026/photos/upload/prepare", {
        body: JSON.stringify({ files: [] }),
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

  test("returns prepared upload targets for editable trips", async () => {
    session.getViewerEmail.mockResolvedValue("owner@example.com");
    service.preparePhotoUploadsForTrip.mockResolvedValue([
      {
        contentType: "image/jpeg",
        originalFilename: "torii.jpg",
        photoId: "photo-1",
        storageKey: "trips/kyoto-2026/torii.jpg",
        uploadUrl: "https://r2.example.com/torii.jpg"
      }
    ]);

    const response = await POST(
      new Request("http://localhost/api/trips/kyoto-2026/photos/upload/prepare", {
        body: JSON.stringify({
          files: [{ contentType: "image/jpeg", originalFilename: "torii.jpg" }]
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
      uploads: [
        {
          contentType: "image/jpeg",
          originalFilename: "torii.jpg",
          photoId: "photo-1",
          storageKey: "trips/kyoto-2026/torii.jpg",
          uploadUrl: "https://r2.example.com/torii.jpg"
        }
      ]
    });
    expect(service.preparePhotoUploadsForTrip).toHaveBeenCalledWith({
      files: [{ contentType: "image/jpeg", originalFilename: "torii.jpg" }],
      tripId: "kyoto-2026",
      viewerEmail: "owner@example.com"
    });
  });
});
