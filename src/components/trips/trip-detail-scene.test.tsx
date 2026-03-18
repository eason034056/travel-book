import { render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/components/trips/overview-map", () => ({
  OverviewMap: () => <div data-testid="overview-map" />
}));

import { TripDetailScene } from "@/components/trips/trip-detail-scene";
import { trips } from "@/data/mock-trips";

test("renders the trip detail hero, import panel, and day cards", () => {
  render(<TripDetailScene trip={{ ...trips[0], viewerRole: "editor" }} />);

  expect(screen.getByRole("heading", { name: "Kyoto in April" })).toBeInTheDocument();
  expect(screen.getByText(/Lantern alleys, river pauses, and slow shrine mornings/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /edit trip/i })).toHaveAttribute("href", "/trips/kyoto-2026/edit");
  expect(screen.getByRole("heading", { name: /Day 1/i })).toBeInTheDocument();
});

test("renders the overview map alongside the trip hero content", () => {
  render(<TripDetailScene trip={{ ...trips[0], viewerRole: "editor" }} />);

  expect(screen.getByTestId("overview-map")).toBeInTheDocument();
});

test("renders configured ending photos when endingPhotoIds are set", () => {
  render(
    <TripDetailScene
      trip={{
        ...trips[0],
        endingPhotoIds: ["kyoto-day-2-photo-1"]
      }}
    />
  );

  const endingHeading = screen.getByRole("heading", { name: /last frames worth keeping/i });
  const endingSection = endingHeading.closest("section");

  expect(endingSection).toBeInTheDocument();
  expect(within(endingSection as HTMLElement).getByAltText("Temple lane in Kyoto")).toBeInTheDocument();
  expect(within(endingSection as HTMLElement).queryByAltText("Coffee by the station")).not.toBeInTheDocument();
});
