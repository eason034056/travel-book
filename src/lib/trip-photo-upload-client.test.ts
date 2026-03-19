import { afterEach, describe, expect, test, vi } from "vitest";

const exifrParseMock = vi.hoisted(() => vi.fn());

vi.mock("exifr", () => ({
  parse: exifrParseMock
}));

vi.mock("heic2any", () => ({
  default: vi.fn()
}));

import {
  MAX_TRIP_PHOTO_UPLOADS,
  type CompleteTripPhotoUploadsResponse,
  type PrepareTripPhotoUploadsResponse
} from "@/lib/trip-photo-upload-contract";
import { uploadTripPhotosDirect } from "@/lib/trip-photo-upload-client";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json"
    },
    status
  });
}

describe("uploadTripPhotosDirect", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("uploads photos via prepare, direct PUTs, and complete", async () => {
    const files = [
      new File(["one"], "torii.jpg", { type: "image/jpeg" }),
      new File(["two"], "river.jpg", { type: "image/jpeg" })
    ];
    const preparePayload: PrepareTripPhotoUploadsResponse = {
      uploads: [
        {
          contentType: "image/jpeg",
          originalFilename: "torii.jpg",
          photoId: "photo-1",
          storageKey: "trips/kyoto-2026/torii.jpg",
          uploadUrl: "https://r2.example.com/torii.jpg"
        },
        {
          contentType: "image/jpeg",
          originalFilename: "river.jpg",
          photoId: "photo-2",
          storageKey: "trips/kyoto-2026/river.jpg",
          uploadUrl: "https://r2.example.com/river.jpg"
        }
      ]
    };
    const completePayload: CompleteTripPhotoUploadsResponse = {
      assigned: [{ dayId: "kyoto-day-1", photoId: "photo-1" }],
      unassigned: [{ photoId: "photo-2", reason: "missing-captured-at" }]
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(preparePayload))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(jsonResponse(completePayload));

    exifrParseMock
      .mockResolvedValueOnce({ DateTimeOriginal: new Date("2026-04-12T08:00:00.000Z") })
      .mockResolvedValueOnce(undefined);

    const result = await uploadTripPhotosDirect({
      days: [{ date: "2026-04-12", id: "kyoto-day-1" }],
      fetchImpl: fetchMock,
      files,
      timezone: "Asia/Tokyo",
      tripId: "kyoto-2026"
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/trips/kyoto-2026/photos/upload/prepare",
      expect.objectContaining({
        body: JSON.stringify({
          files: [
            {
              contentType: "image/jpeg",
              originalFilename: "torii.jpg"
            },
            {
              contentType: "image/jpeg",
              originalFilename: "river.jpg"
            }
          ]
        }),
        method: "POST"
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://r2.example.com/torii.jpg",
      expect.objectContaining({
        body: files[0],
        headers: {
          "Content-Type": "image/jpeg"
        },
        method: "PUT"
      })
    );

    const completeRequest = JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body));
    expect(completeRequest).toEqual({
      timezone: "Asia/Tokyo",
      tripDays: [{ date: "2026-04-12", id: "kyoto-day-1" }],
      uploads: [
        {
          capturedAt: "2026-04-12T08:00:00.000Z",
          contentType: "image/jpeg",
          originalFilename: "torii.jpg",
          photoId: "photo-1",
          storageKey: "trips/kyoto-2026/torii.jpg"
        },
        {
          contentType: "image/jpeg",
          originalFilename: "river.jpg",
          photoId: "photo-2",
          storageKey: "trips/kyoto-2026/river.jpg"
        }
      ]
    });
    expect(result).toEqual({
      assignments: completePayload,
      failedCount: 0,
      failedFiles: [],
      totalFiles: 2,
      uploadedCount: 2
    });
  });

  test("continues when one direct upload fails and finalizes successful uploads", async () => {
    const files = [
      new File(["one"], "torii.jpg", { type: "image/jpeg" }),
      new File(["two"], "river.jpg", { type: "image/jpeg" })
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          uploads: [
            {
              contentType: "image/jpeg",
              originalFilename: "torii.jpg",
              photoId: "photo-1",
              storageKey: "trips/kyoto-2026/torii.jpg",
              uploadUrl: "https://r2.example.com/torii.jpg"
            },
            {
              contentType: "image/jpeg",
              originalFilename: "river.jpg",
              photoId: "photo-2",
              storageKey: "trips/kyoto-2026/river.jpg",
              uploadUrl: "https://r2.example.com/river.jpg"
            }
          ]
        } satisfies PrepareTripPhotoUploadsResponse)
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(
        jsonResponse({
          assigned: [{ dayId: "kyoto-day-1", photoId: "photo-1" }],
          unassigned: []
        } satisfies CompleteTripPhotoUploadsResponse)
      );

    exifrParseMock.mockResolvedValue(undefined);

    const result = await uploadTripPhotosDirect({
      days: [{ date: "2026-04-12", id: "kyoto-day-1" }],
      fetchImpl: fetchMock,
      files,
      timezone: "Asia/Tokyo",
      tripId: "kyoto-2026"
    });

    const completeRequest = JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body));

    expect(completeRequest.uploads).toEqual([
      {
        contentType: "image/jpeg",
        originalFilename: "torii.jpg",
        photoId: "photo-1",
        storageKey: "trips/kyoto-2026/torii.jpg"
      }
    ]);
    expect(result).toEqual({
      assignments: {
        assigned: [{ dayId: "kyoto-day-1", photoId: "photo-1" }],
        unassigned: []
      },
      failedCount: 1,
      failedFiles: ["river.jpg"],
      totalFiles: 2,
      uploadedCount: 1
    });
  });

  test("falls back to single-file server uploads when direct PUT is blocked", async () => {
    const files = [
      new File(["one"], "torii.jpg", { type: "image/jpeg" }),
      new File(["two"], "river.jpg", { type: "image/jpeg" })
    ];
    const preparePayload: PrepareTripPhotoUploadsResponse = {
      uploads: [
        {
          contentType: "image/jpeg",
          originalFilename: "torii.jpg",
          photoId: "photo-1",
          storageKey: "trips/kyoto-2026/torii.jpg",
          uploadUrl: "https://r2.example.com/torii.jpg"
        },
        {
          contentType: "image/jpeg",
          originalFilename: "river.jpg",
          photoId: "photo-2",
          storageKey: "trips/kyoto-2026/river.jpg",
          uploadUrl: "https://r2.example.com/river.jpg"
        }
      ]
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/trips/kyoto-2026/photos/upload/prepare") {
        return jsonResponse(preparePayload);
      }

      if (url === "https://r2.example.com/torii.jpg") {
        return new Response(null, { status: 200 });
      }

      if (url === "https://r2.example.com/river.jpg") {
        throw new TypeError("Failed to fetch");
      }

      if (url === "/api/trips/kyoto-2026/photos/upload/complete") {
        return jsonResponse({
          assigned: [{ dayId: "kyoto-day-1", photoId: "photo-1" }],
          unassigned: [],
          uploadedPhotos: [
            {
              alt: "",
              dayId: "kyoto-day-1",
              id: "photo-1",
              originalFilename: "torii.jpg",
              previewUrl: "https://example.com/torii.jpg",
              status: "ready",
              storageKey: "trips/kyoto-2026/torii.jpg"
            }
          ]
        } satisfies CompleteTripPhotoUploadsResponse);
      }

      if (url === "/api/trips/kyoto-2026/photos/upload") {
        return jsonResponse({
          assigned: [],
          unassigned: [{ photoId: "photo-2", reason: "missing-captured-at" }],
          uploadedPhotos: [
            {
              alt: "",
              dayId: "",
              id: "photo-2",
              originalFilename: "river.jpg",
              previewUrl: "https://example.com/river.jpg",
              status: "unassigned",
              storageKey: "trips/kyoto-2026/river.jpg"
            }
          ]
        } satisfies CompleteTripPhotoUploadsResponse);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    exifrParseMock.mockResolvedValue(undefined);

    const result = await uploadTripPhotosDirect({
      days: [{ date: "2026-04-12", id: "kyoto-day-1" }],
      fetchImpl: fetchMock,
      files,
      timezone: "Asia/Tokyo",
      tripId: "kyoto-2026"
    });

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(result).toEqual({
      assignments: {
        assigned: [{ dayId: "kyoto-day-1", photoId: "photo-1" }],
        unassigned: [{ photoId: "photo-2", reason: "missing-captured-at" }],
        uploadedPhotos: [
          {
            alt: "",
            dayId: "kyoto-day-1",
            id: "photo-1",
            originalFilename: "torii.jpg",
            previewUrl: "https://example.com/torii.jpg",
            status: "ready",
            storageKey: "trips/kyoto-2026/torii.jpg"
          },
          {
            alt: "",
            dayId: "",
            id: "photo-2",
            originalFilename: "river.jpg",
            previewUrl: "https://example.com/river.jpg",
            status: "unassigned",
            storageKey: "trips/kyoto-2026/river.jpg"
          }
        ]
      },
      failedCount: 0,
      failedFiles: [],
      totalFiles: 2,
      uploadedCount: 2
    });
  });

  test("rejects batches larger than the supported upload limit", async () => {
    const files = Array.from({ length: MAX_TRIP_PHOTO_UPLOADS + 1 }, (_, index) =>
      new File([String(index)], `photo-${index + 1}.jpg`, { type: "image/jpeg" })
    );
    const fetchMock = vi.fn();

    await expect(
      uploadTripPhotosDirect({
        days: [{ date: "2026-04-12", id: "kyoto-day-1" }],
        fetchImpl: fetchMock,
        files,
        timezone: "Asia/Tokyo",
        tripId: "kyoto-2026"
      })
    ).rejects.toThrow("You can upload up to 10 photos at a time.");

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
