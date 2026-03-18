import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

test("renders create mode with overview and day drafting sections", () => {
  render(<TripStudio mode="create" />);

  expect(screen.getByRole("heading", { name: /trip studio/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /overview/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /days/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /create trip/i })).toBeInTheDocument();
});

test("renders owner edit mode with management sections including danger zone", () => {
  render(<TripStudio initialSnapshot={ownerSnapshot} mode="edit" />);

  expect(screen.getByRole("heading", { name: /stops/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /photos/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /collaborators/i })).toBeInTheDocument();
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

  expect(screen.queryByRole("heading", { name: /collaborators/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /danger zone/i })).not.toBeInTheDocument();
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

  fireEvent.change(screen.getByPlaceholderText(/co-editor@email.com/i), {
    target: {
      value: "editor@example.com"
    }
  });
  fireEvent.click(screen.getByRole("button", { name: /invite editor/i }));

  await waitFor(() => {
    expect(screen.getByText(/https:\/\/travel\.example\.com\/invite\/token-123/i)).toBeInTheDocument();
  });

  expect(screen.getByRole("button", { name: /copy link/i })).toBeInTheDocument();
});
