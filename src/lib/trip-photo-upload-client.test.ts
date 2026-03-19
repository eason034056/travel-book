import { afterEach, describe, expect, test, vi } from "vitest";

const heic2anyMock = vi.hoisted(() => vi.fn());

vi.mock("exifr", () => ({
  parse: vi.fn()
}));

vi.mock("heic2any", () => ({
  default: heic2anyMock
}));

import { MAX_TRIP_PHOTO_UPLOADS, type CompleteTripPhotoUploadsResponse } from "@/lib/trip-photo-upload-contract";
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
    vi.unstubAllGlobals();
  });

  test("uploads photos one by one through the trip upload route", async () => {
    const files = [
      new File(["one"], "torii.jpg", { type: "image/jpeg" }),
      new File(["two"], "river.jpg", { type: "image/jpeg" })
    ];
    const progressUpdates: Array<{ current: number; phase: string; total: number }> = [];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
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
        } satisfies CompleteTripPhotoUploadsResponse)
      )
      .mockResolvedValueOnce(
        jsonResponse({
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
        } satisfies CompleteTripPhotoUploadsResponse)
      );

    const result = await uploadTripPhotosDirect({
      days: [{ date: "2026-04-12", id: "kyoto-day-1" }],
      fetchImpl: fetchMock,
      files,
      onProgress: (progress) => progressUpdates.push(progress),
      timezone: "Asia/Tokyo",
      tripId: "kyoto-2026"
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/trips/kyoto-2026/photos/upload",
      expect.objectContaining({
        body: expect.any(FormData),
        method: "POST"
      })
    );
    expect(progressUpdates).toEqual([
      { current: 0, phase: "preparing", total: 2 },
      { current: 1, phase: "uploading", total: 2 },
      { current: 2, phase: "uploading", total: 2 }
    ]);
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

  test("continues uploading later files when one single-file request fails", async () => {
    const files = [
      new File(["one"], "torii.jpg", { type: "image/jpeg" }),
      new File(["two"], "river.jpg", { type: "image/jpeg" }),
      new File(["three"], "lantern.jpg", { type: "image/jpeg" })
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
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
        } satisfies CompleteTripPhotoUploadsResponse)
      )
      .mockResolvedValueOnce(jsonResponse({ message: "Temporary upload failure" }, 500))
      .mockResolvedValueOnce(
        jsonResponse({
          assigned: [],
          unassigned: [{ photoId: "photo-3", reason: "missing-captured-at" }],
          uploadedPhotos: [
            {
              alt: "",
              dayId: "",
              id: "photo-3",
              originalFilename: "lantern.jpg",
              previewUrl: "https://example.com/lantern.jpg",
              status: "unassigned",
              storageKey: "trips/kyoto-2026/lantern.jpg"
            }
          ]
        } satisfies CompleteTripPhotoUploadsResponse)
      );

    const result = await uploadTripPhotosDirect({
      days: [{ date: "2026-04-12", id: "kyoto-day-1" }],
      fetchImpl: fetchMock,
      files,
      timezone: "Asia/Tokyo",
      tripId: "kyoto-2026"
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result).toEqual({
      assignments: {
        assigned: [{ dayId: "kyoto-day-1", photoId: "photo-1" }],
        unassigned: [{ photoId: "photo-3", reason: "missing-captured-at" }],
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
            id: "photo-3",
            originalFilename: "lantern.jpg",
            previewUrl: "https://example.com/lantern.jpg",
            status: "unassigned",
            storageKey: "trips/kyoto-2026/lantern.jpg"
          }
        ]
      },
      failedCount: 1,
      failedFiles: ["river.jpg"],
      totalFiles: 3,
      uploadedCount: 2
    });
  });

  test("throws a readable error when every HEIC file fails conversion", async () => {
    const heicFile = new File(["heic-data"], "iphone.heic", { type: "image/heic" });
    const fetchMock = vi.fn();

    heic2anyMock.mockRejectedValueOnce(new Error("conversion failed"));

    await expect(
      uploadTripPhotosDirect({
        days: [{ date: "2026-04-12", id: "kyoto-day-1" }],
        fetchImpl: fetchMock,
        files: [heicFile],
        timezone: "Asia/Tokyo",
        tripId: "kyoto-2026"
      })
    ).rejects.toThrow("Some HEIC photos could not be converted. Please try JPG or iPhone Most Compatible format.");

    expect(heic2anyMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
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

  test("calls browser fetch with the proper Window binding when no fetchImpl is provided", async () => {
    const strictFetch = vi.fn(function (this: typeof globalThis) {
      if (this !== globalThis) {
        throw new Error("Can only call Window.fetch on instances of Window");
      }

      return Promise.resolve(
        jsonResponse({
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
        } satisfies CompleteTripPhotoUploadsResponse)
      );
    });

    vi.stubGlobal("fetch", strictFetch);

    const result = await uploadTripPhotosDirect({
      days: [{ date: "2026-04-12", id: "kyoto-day-1" }],
      files: [new File(["one"], "torii.jpg", { type: "image/jpeg" })],
      timezone: "Asia/Tokyo",
      tripId: "kyoto-2026"
    });

    expect(strictFetch).toHaveBeenCalledTimes(1);
    expect(result.uploadedCount).toBe(1);
  });
});
