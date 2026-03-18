import { render, screen } from "@testing-library/react";

import { DayCard } from "@/components/trips/day-card";

test("renders day summary, stops, and highlight moment", () => {
  render(
    <DayCard
      day={{
        id: "day-3",
        dayIndex: 3,
        date: "2026-04-14",
        cityLabel: "Kyoto",
        title: "Sannenzaka to Gion",
        summary: "A long downhill walk through temple lanes into the evening lights of Gion.",
        highlightMoment: "The quiet pause before sunset over tiled roofs.",
        heroPhotoUrl:
          "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=1200&q=80",
        journal:
          "We slowed down on purpose, stopped for matcha soft serve, and let the alleys decide the route.",
        stops: [
          {
            id: "stop-1",
            name: "Kiyomizu-dera",
            lat: 34.9948,
            lng: 135.785,
            orderIndex: 0,
            sourceType: "place",
            originalUrl: "https://maps.google.com"
          },
          {
            id: "stop-2",
            name: "Gion Shirakawa",
            lat: 35.0046,
            lng: 135.7751,
            orderIndex: 1,
            sourceType: "place",
            originalUrl: "https://maps.google.com"
          }
        ],
        gallery: [
          {
            id: "photo-1",
            url: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
            alt: "Kyoto street",
            capturedAt: "2026-04-14T12:00:00+09:00"
          }
        ]
      }}
    />
  );

  expect(screen.getByRole("heading", { name: /Day 3/i })).toBeInTheDocument();
  expect(screen.getByText(/Sannenzaka to Gion/i)).toBeInTheDocument();
  expect(screen.getByText(/The quiet pause before sunset over tiled roofs/i)).toBeInTheDocument();
  expect(screen.getByText("Kiyomizu-dera")).toBeInTheDocument();
  expect(screen.getByText("Gion Shirakawa")).toBeInTheDocument();
});
