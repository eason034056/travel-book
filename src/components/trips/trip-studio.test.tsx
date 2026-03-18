import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() })
}));
vi.mock("heic2any", () => ({
  default: vi.fn()
}));
vi.mock("@/components/trips/route-editor-map", () => ({
  RouteEditorMap: () => <div data-testid="route-editor-map" />,
  computeCentroid: () => [0, 0]
}));

import { TripStudio } from "@/components/trips/trip-studio";
import type { TripStudioSnapshot } from "@/types/travel";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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
