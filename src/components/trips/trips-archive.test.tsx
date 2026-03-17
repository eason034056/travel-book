import { render, screen } from "@testing-library/react";

import { TripsArchive } from "@/components/trips/trips-archive";
import { trips } from "@/data/mock-trips";

test("renders the archive hero and trip cards", () => {
  render(<TripsArchive trips={trips} />);

  expect(screen.getByRole("heading", { name: /Journeys worth reopening/i })).toBeInTheDocument();
  expect(screen.getByText(/Mobile capture, desktop nostalgia/i)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Kyoto in April" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Lisbon in October" })).toBeInTheDocument();
});

