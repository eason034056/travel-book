import { render, screen } from "@testing-library/react";

import { TripCard } from "@/components/trips/trip-card";

test("renders trip metadata and cover summary", () => {
  render(
    <TripCard
      trip={{
        id: "kyoto-2026",
        title: "Kyoto in April",
        startDate: "2026-04-12",
        endDate: "2026-04-16",
        timezone: "Asia/Tokyo",
        summary: "Lantern alleys, shrines, and river walks",
        coverPhotoUrl:
          "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
        travelCompanions: ["Wyu", "Mina"],
        daysCount: 5,
        stopCount: 14
      }}
    />
  );

  expect(screen.getByRole("heading", { name: "Kyoto in April" })).toBeInTheDocument();
  expect(screen.getByText("Lantern alleys, shrines, and river walks")).toBeInTheDocument();
  expect(screen.getByText(/5 days/i)).toBeInTheDocument();
  expect(screen.getByText(/14 stops/i)).toBeInTheDocument();
  expect(screen.getByText(/Wyu & Mina/i)).toBeInTheDocument();
});

