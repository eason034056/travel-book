import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, vi } from "vitest";

const router = vi.hoisted(() => ({
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn()
}));

const toast = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn()
}));

const uploadTripPhotosDirectMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => router
}));
vi.mock("heic2any", () => ({
  default: vi.fn()
}));
vi.mock("sonner", () => ({
  toast
}));
vi.mock("@/lib/trip-photo-upload-client", () => ({
  formatTripPhotoUploadProgress: ({ current, phase, total }: { current: number; phase: string; total: number }) => {
    if (phase === "uploading") return `Uploading ${current}/${total}...`;
    if (phase === "finalizing") return `Finalizing ${total} photo${total === 1 ? "" : "s"}...`;
    return `Preparing ${total} photo${total === 1 ? "" : "s"}...`;
  },
  getTripPhotoUploadPercent: ({ current, total }: { current: number; total: number }) =>
    total === 0 ? 0 : Math.min(100, Math.round((current / total) * 100)),
  uploadTripPhotosDirect: uploadTripPhotosDirectMock
}));
vi.mock("@/components/trips/route-editor-map", () => ({
  RouteEditorMap: () => <div data-testid="route-editor-map" />,
  computeCentroid: () => [0, 0]
}));

import { TripStudio } from "@/components/trips/trip-studio";
import type { TripStudioSnapshot } from "@/types/travel";

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
});

const ownerSnapshot: TripStudioSnapshot = {
  collaborators: [
    {
      createdAt: "2026-03-17T12:00:00.000Z",
      email: "owner@example.com",
      role: "owner",
      status: "active"
    }
  ],
  coverPhotoPreviewUrl: "",
  coverPhotoValue: "",
  days: [
    {
      cityLabel: "Kyoto",
      date: "2026-04-12",
      dayIndex: 1,
      gallery: [],
      heroPhotoPreviewUrl: "",
      heroPhotoValue: "",
      highlightMoment: "",
      id: "kyoto-day-1",
      journal: "",
      stops: [],
      summary: "",
      title: ""
    }
  ],
  endDate: "2026-04-12",
  highlightLabel: "",
  id: "kyoto-2026",
  mapCenter: [135.7751, 35.0116],
  endingPhotoIds: [],
  pendingInvites: [],
  photos: [],
  routeSummary: "",
  startDate: "2026-04-12",
  summary: "",
  timezone: "Asia/Tokyo",
  title: "Kyoto in April",
  travelCompanions: ["Wyu", "Mina"],
  viewerRole: "owner"
};

const richerSnapshot: TripStudioSnapshot = {
  ...ownerSnapshot,
  days: [
    {
      cityLabel: "Kyoto",
      date: "2026-04-12",
      dayIndex: 1,
      gallery: [
        {
          alt: "Torii gates",
          id: "photo-1",
          url: "https://example.com/torii.jpg"
        }
      ],
      heroPhotoPreviewUrl: "https://example.com/day-one.jpg",
      heroPhotoValue: "photos/day-one.jpg",
      highlightMoment: "Sunrise at the shrine",
      id: "kyoto-day-1",
      journal: "A quiet morning walk through the gates.",
      stops: [
        {
          id: "stop-1",
          lat: 35.0116,
          lng: 135.7681,
          name: "Fushimi Inari",
          orderIndex: 0,
          originalUrl: "https://maps.google.com/?q=Fushimi+Inari",
          sourceType: "place"
        }
      ],
      summary: "Lantern light and temple trails.",
      title: "Gates before breakfast"
    },
    {
      cityLabel: "Arashiyama",
      date: "2026-04-13",
      dayIndex: 2,
      gallery: [],
      heroPhotoPreviewUrl: "",
      heroPhotoValue: "",
      highlightMoment: "",
      id: "kyoto-day-2",
      journal: "",
      stops: [],
      summary: "",
      title: ""
    }
  ],
  endDate: "2026-04-13",
  endingPhotoIds: ["photo-1"],
  highlightLabel: "Slow spring mornings",
  photos: [
    {
      alt: "Torii gates",
      dayId: "kyoto-day-1",
      id: "photo-1",
      originalFilename: "torii.jpg",
      previewUrl: "https://example.com/torii.jpg",
      status: "ready",
      storageKey: "photos/torii.jpg"
    },
    {
      alt: "River walk",
      dayId: "kyoto-day-2",
      id: "photo-2",
      originalFilename: "river.jpg",
      previewUrl: "https://example.com/river.jpg",
      status: "ready",
      storageKey: "photos/river.jpg"
    }
  ],
  routeSummary: "Kyoto Station to Arashiyama",
  summary: "Temples, riverside walks, and quiet cafes."
};

function stubMobileViewport() {
  vi.stubGlobal("matchMedia", vi.fn().mockImplementation(() => ({
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches: true,
    media: "(max-width: 1023px)",
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn()
  })));
}

test("renders create mode with hero and day story sections", () => {
  render(<TripStudio mode="create" />);

  expect(screen.getByRole("heading", { name: /build the trip page/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /^hero$/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /day stories/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /create trip/i })).toBeInTheDocument();
});

test("renders owner edit mode with public-facing sections and support areas", () => {
  render(<TripStudio initialSnapshot={ownerSnapshot} mode="edit" />);

  expect(screen.getByRole("heading", { name: /route map & stops/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /photo library/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /sharing/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /danger zone/i })).toBeInTheDocument();
});

test("hides owner-only management sections for editors", () => {
  render(
    <TripStudio
      initialSnapshot={{
        ...ownerSnapshot,
        collaborators: [
          ...ownerSnapshot.collaborators,
          {
            createdAt: "2026-03-17T12:10:00.000Z",
            email: "editor@example.com",
            role: "editor",
            status: "active"
          }
        ],
        viewerRole: "editor"
      }}
      mode="edit"
    />
  );

  expect(screen.queryByRole("heading", { name: /sharing/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /danger zone/i })).not.toBeInTheDocument();
});

test("uses public-facing section names and shows a mobile section navigator", () => {
  render(<TripStudio initialSnapshot={richerSnapshot} mode="edit" />);

  expect(screen.getByRole("heading", { name: /^hero$/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /trip facts/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /route map & stops/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /day stories/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /last frames worth keeping/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /sections/i })).toBeInTheDocument();

  expect(screen.queryByRole("heading", { name: /^overview$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /^days$/i })).not.toBeInTheDocument();
});

test("opens the section navigator with statuses and helper summaries", () => {
  render(<TripStudio initialSnapshot={richerSnapshot} mode="edit" />);

  fireEvent.click(screen.getByRole("button", { name: /sections/i }));

  const dialog = screen.getByRole("dialog", { name: /trip sections/i });

  expect(dialog).toBeInTheDocument();
  expect(within(dialog).getByText(/^hero$/i)).toBeInTheDocument();
  expect(within(dialog).getByText(/trip facts/i)).toBeInTheDocument();
  expect(within(dialog).getAllByText(/day stories/i).length).toBeGreaterThan(0);
  expect(within(dialog).getByText(/last frames worth keeping/i)).toBeInTheDocument();
  expect(within(dialog).getAllByText(/title, summary, cover/i).length).toBeGreaterThan(0);
  expect(within(dialog).getByText(/photo library/i)).toBeInTheDocument();
});

test("renders a day switcher and focuses one day story at a time", () => {
  render(<TripStudio initialSnapshot={richerSnapshot} mode="edit" />);

  fireEvent.click(screen.getByRole("button", { name: /edit day stories/i }));

  expect(screen.getByRole("button", { name: /day 1/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /day 2/i })).toBeInTheDocument();
  expect(screen.getAllByText(/shown on trip page: day cards/i).length).toBeGreaterThan(0);

  fireEvent.click(screen.getByRole("button", { name: /day 2/i }));

  expect(screen.getByDisplayValue("Arashiyama")).toBeInTheDocument();
  expect(screen.queryByDisplayValue("Kyoto")).not.toBeInTheDocument();
});

test("starts sections collapsed and expands a section on demand", () => {
  render(<TripStudio initialSnapshot={richerSnapshot} mode="edit" />);

  expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  expect(screen.queryByText(/upload trip photos/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /edit hero/i }));

  expect(screen.getByText(/choose from photo library/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /collapse hero/i })).toBeInTheDocument();
});

test("uses a compact photo browser with one selected photo editor", () => {
  render(<TripStudio initialSnapshot={richerSnapshot} mode="edit" />);

  fireEvent.click(screen.getByRole("button", { name: /edit photo library/i }));

  expect(screen.getByText(/2 photos in library/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /open photo torii\.jpg/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /open photo river\.jpg/i })).toBeInTheDocument();
  expect(screen.getAllByLabelText(/alt text/i)).toHaveLength(1);

  fireEvent.click(screen.getByRole("button", { name: /open photo river\.jpg/i }));

  expect(screen.getByDisplayValue("River walk")).toBeInTheDocument();
  expect(screen.queryByDisplayValue("Torii gates")).not.toBeInTheDocument();
});

test("renders a mobile task workspace that defaults to the photos tab", () => {
  stubMobileViewport();

  render(<TripStudio initialSnapshot={richerSnapshot} mode="edit" />);

  expect(screen.getByRole("tab", { name: /^photos$/i })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tab", { name: /^places$/i })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /^stories$/i })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /^more$/i })).toBeInTheDocument();
  expect(screen.getByText(/upload photos to today's field notes/i)).toBeInTheDocument();
});

test("hydrates the mobile workspace from tab and day query params", () => {
  stubMobileViewport();
  window.history.replaceState({}, "", "/trips/kyoto-2026/edit?tab=places&day=kyoto-day-2");

  render(<TripStudio initialSnapshot={richerSnapshot} mode="edit" />);

  expect(screen.getByRole("tab", { name: /^places$/i })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("button", { name: /^organize$/i })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText(/drag stops by the grip handle to reorder this day/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^day 2$/i })).toHaveAttribute("aria-pressed", "true");
});

test("switches mobile places between organize and add modes from the top toggle", () => {
  stubMobileViewport();

  render(<TripStudio initialSnapshot={richerSnapshot} mode="edit" />);

  fireEvent.click(screen.getByRole("tab", { name: /^places$/i }));

  expect(screen.getByText(/drag stops by the grip handle to reorder this day/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /reorder fushimi inari/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

  expect(screen.getByRole("button", { name: /^add$/i })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("combobox", { name: /add places to day/i })).toBeInTheDocument();
  expect(screen.queryByText(/drag stops by the grip handle to reorder this day/i)).not.toBeInTheDocument();
});

test("opens stories on the last edited day in the mobile workspace", () => {
  stubMobileViewport();
  window.localStorage.setItem("trip-studio:kyoto-2026:last-edited-day-id", "kyoto-day-2");

  render(<TripStudio initialSnapshot={richerSnapshot} mode="edit" />);

  fireEvent.click(screen.getByRole("tab", { name: /^stories$/i }));

  expect(screen.getByDisplayValue("Arashiyama")).toBeInTheDocument();
  expect(screen.queryByDisplayValue("Kyoto")).not.toBeInTheDocument();
});

test("moves newly uploaded photos into the mobile assign queue", async () => {
  stubMobileViewport();
  uploadTripPhotosDirectMock.mockResolvedValueOnce({
    assignments: {
      assigned: [],
      unassigned: [{ photoId: "photo-new", reason: "missing-captured-at" }],
      uploadedPhotos: [
        {
          alt: "",
          dayId: "",
          id: "photo-new",
          originalFilename: "new-memory.jpg",
          previewUrl: "https://example.com/new-memory.jpg",
          status: "unassigned",
          storageKey: "photos/new-memory.jpg"
        }
      ]
    },
    failedCount: 0,
    failedFiles: [],
    totalFiles: 1,
    uploadedCount: 1
  });

  render(<TripStudio initialSnapshot={ownerSnapshot} mode="edit" />);

  fireEvent.change(screen.getByLabelText(/from library/i), {
    target: {
      files: [new File(["image"], "new-memory.jpg", { type: "image/jpeg" })]
    }
  });

  await waitFor(() => {
    expect(screen.getByText(/assign queue/i)).toBeInTheDocument();
  });

  const assignQueueCard = screen.getByText(/assign queue/i).closest("div")?.parentElement?.parentElement;

  expect(assignQueueCard).not.toBeNull();
  expect(within(assignQueueCard as HTMLElement).getByText(/new-memory\.jpg/i)).toBeInTheDocument();
  expect(within(assignQueueCard as HTMLElement).getByRole("combobox", { name: /assign photo to day/i })).toBeInTheDocument();
});

test("keeps the generated invite link visible in edit mode after inviting a collaborator", async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    json: async () => ({
      inviteUrl: "https://travel.example.com/invite/token-123",
      expiresAt: "2026-03-24T12:00:00.000Z",
      message: "Invite link ready"
    }),
    ok: true
  });

  vi.stubGlobal("fetch", fetchMock);

  render(<TripStudio initialSnapshot={ownerSnapshot} mode="edit" />);

  fireEvent.click(screen.getByRole("button", { name: /edit sharing/i }));

  fireEvent.change(screen.getByPlaceholderText(/co-editor@email.com/i), {
    target: {
      value: "editor@example.com"
    }
  });
  fireEvent.click(screen.getByRole("button", { name: /^invite editor$/i }));

  await waitFor(() => {
    expect(screen.getByText(/https:\/\/travel\.example\.com\/invite\/token-123/i)).toBeInTheDocument();
  });

  expect(screen.getByRole("button", { name: /copy link/i })).toBeInTheDocument();
});

test("uploads photos through the direct R2 flow and refreshes the route", async () => {
  uploadTripPhotosDirectMock.mockResolvedValue({
    assignments: {
      assigned: [{ dayId: "kyoto-day-1", photoId: "photo-1" }],
      unassigned: []
    },
    failedCount: 1,
    failedFiles: ["river.jpg"],
    totalFiles: 3,
    uploadedCount: 2
  });

  render(<TripStudio initialSnapshot={ownerSnapshot} mode="edit" />);

  fireEvent.click(screen.getByRole("button", { name: /edit photo library/i }));

  const input = document.querySelector("#photo-library input[type='file']") as HTMLInputElement;

  fireEvent.change(input, {
    target: {
      files: [
        new File(["one"], "torii.jpg", { type: "image/jpeg" }),
        new File(["two"], "river.jpg", { type: "image/jpeg" }),
        new File(["three"], "lantern.jpg", { type: "image/jpeg" })
      ]
    }
  });

  await waitFor(() => {
    expect(uploadTripPhotosDirectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        days: [{ date: "2026-04-12", id: "kyoto-day-1" }],
        tripId: "kyoto-2026"
      })
    );
  });

  expect(router.refresh).toHaveBeenCalled();
  expect(toast.success).toHaveBeenCalledWith("2 photos uploaded");
  expect(toast.error).toHaveBeenCalledWith("1 photo failed to upload");
});

test("shows a photo upload progress bar while files upload", async () => {
  let resolveUpload: ((value: {
    assignments: { assigned: []; unassigned: [] };
    failedCount: number;
    failedFiles: string[];
    totalFiles: number;
    uploadedCount: number;
  }) => void) | null = null;

  uploadTripPhotosDirectMock.mockImplementationOnce(
    ({ onProgress }: { onProgress?: (progress: { current: number; phase: string; total: number }) => void }) => {
      onProgress?.({ current: 0, phase: "preparing", total: 3 });
      onProgress?.({ current: 1, phase: "uploading", total: 3 });

      return new Promise((resolve) => {
        resolveUpload = resolve;
      });
    }
  );

  render(<TripStudio initialSnapshot={ownerSnapshot} mode="edit" />);

  fireEvent.click(screen.getByRole("button", { name: /edit photo library/i }));

  const input = document.querySelector("#photo-library input[type='file']") as HTMLInputElement;

  fireEvent.change(input, {
    target: {
      files: [
        new File(["one"], "torii.jpg", { type: "image/jpeg" }),
        new File(["two"], "river.jpg", { type: "image/jpeg" }),
        new File(["three"], "lantern.jpg", { type: "image/jpeg" })
      ]
    }
  });

  await waitFor(() => {
    expect(screen.getAllByText(/uploading 1\/3/i).length).toBeGreaterThan(0);
  });

  expect(screen.getByRole("progressbar", { name: /photo upload progress/i })).toBeInTheDocument();

  await act(async () => {
    resolveUpload?.({
      assignments: { assigned: [], unassigned: [] },
      failedCount: 0,
      failedFiles: [],
      totalFiles: 3,
      uploadedCount: 0
    });
  });
});

test("shows upload helper errors in the photo library", async () => {
  uploadTripPhotosDirectMock.mockRejectedValue(new Error("You can upload up to 10 photos at a time."));

  render(<TripStudio initialSnapshot={ownerSnapshot} mode="edit" />);

  fireEvent.click(screen.getByRole("button", { name: /edit photo library/i }));

  const input = document.querySelector("#photo-library input[type='file']") as HTMLInputElement;

  fireEvent.change(input, {
    target: {
      files: [new File(["one"], "too-many.jpg", { type: "image/jpeg" })]
    }
  });

  await waitFor(() => {
    expect(toast.error).toHaveBeenCalledWith("You can upload up to 10 photos at a time.");
  });

  expect(router.refresh).not.toHaveBeenCalled();
});
