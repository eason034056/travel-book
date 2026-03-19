import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const uploadTripPhotosDirectMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/trip-photo-upload-client", () => ({
  formatTripPhotoUploadProgress: ({ current, phase, total }: { current: number; phase: string; total: number }) => {
    if (phase === "uploading") return `Uploading ${current}/${total}...`;
    if (phase === "finalizing") return `Finalizing ${total} photo${total === 1 ? "" : "s"}...`;
    return `Preparing ${total} photo${total === 1 ? "" : "s"}...`;
  },
  uploadTripPhotosDirect: uploadTripPhotosDirectMock
}));

import { ImportPanel } from "@/components/trips/import-panel";

const days = [
  {
    id: "kyoto-day-1",
    dayIndex: 1,
    date: "2026-04-12",
    cityLabel: "Kyoto",
    title: "Day 1",
    summary: "Summary",
    highlightMoment: "Highlight",
    heroPhotoUrl: "https://example.com/hero.jpg",
    journal: "Journal",
    stops: [],
    gallery: []
  }
];

test("requires selecting a day before importing Google links", () => {
  render(<ImportPanel days={days} timezone="Asia/Tokyo" tripId="kyoto-2026" />);

  fireEvent.change(screen.getByPlaceholderText(/Paste one Google Maps link per line/i), {
    target: {
      value: "https://www.google.com/maps/place/Kiyomizu-dera/@34.9948561,135.7849531,17z/data=!3m1!4b1"
    }
  });

  expect(screen.getByRole("button", { name: /Build draft/i })).toBeDisabled();

  fireEvent.change(screen.getByLabelText(/Assign imported links to/i), {
    target: {
      value: "kyoto-day-1"
    }
  });

  expect(screen.getByRole("button", { name: /Build draft/i })).toBeEnabled();
});

test("updates photo status after direct uploads complete", async () => {
  uploadTripPhotosDirectMock.mockResolvedValue({
    assignments: {
      assigned: [{ dayId: "kyoto-day-1", photoId: "photo-1" }],
      unassigned: [{ photoId: "photo-2", reason: "missing-captured-at" }]
    },
    failedCount: 1,
    failedFiles: ["river.jpg"],
    totalFiles: 2,
    uploadedCount: 1
  });

  render(<ImportPanel days={days} timezone="Asia/Tokyo" tripId="kyoto-2026" />);

  const input = document.querySelector("input[type='file']") as HTMLInputElement;

  fireEvent.change(input, {
    target: {
      files: [
        new File(["one"], "torii.jpg", { type: "image/jpeg" }),
        new File(["two"], "river.jpg", { type: "image/jpeg" })
      ]
    }
  });
  fireEvent.click(screen.getByRole("button", { name: /Build draft/i }));

  await waitFor(() => {
    expect(uploadTripPhotosDirectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        days: [{ date: "2026-04-12", id: "kyoto-day-1" }],
        timezone: "Asia/Tokyo",
        tripId: "kyoto-2026"
      })
    );
  });

  expect(screen.getByText(/1 assigned · 1 pending review · 1 failed upload/i)).toBeInTheDocument();
});
