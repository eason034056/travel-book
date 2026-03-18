import { render, screen } from "@testing-library/react";

import { TripDetailScene } from "@/components/trips/trip-detail-scene";
import { trips } from "@/data/mock-trips";

test("renders the trip detail hero, import panel, and day cards", () => {
  render(<TripDetailScene trip={{ ...trips[0], viewerRole: "editor" }} />);

  expect(screen.getByRole("heading", { name: "Kyoto in April" })).toBeInTheDocument();
  expect(screen.getByText(/Lantern alleys, river pauses, and slow shrine mornings/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /edit trip/i })).toHaveAttribute("href", "/trips/kyoto-2026/edit");
  expect(screen.getByRole("heading", { name: /Day 1/i })).toBeInTheDocument();
});
