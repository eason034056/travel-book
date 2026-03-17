import { fireEvent, render, screen } from "@testing-library/react";

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
