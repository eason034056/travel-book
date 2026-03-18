import type { TripDetail } from "@/types/travel";

import type {
  TravelSheetWorkbook,
  TripDaySheetRow,
  TripMembershipSheetRow,
  TripPhotoSheetRow,
  TripSheetRow,
  TripStopSheetRow
} from "@/lib/server/travel-sheet-schema";

interface BuildTravelSheetSeedOptions {
  trips: TripDetail[];
  ownerEmail: string;
  seededAt: string;
}

function getOriginalFilename(url: string) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.split("/").filter(Boolean);
    return pathname.at(-1) ?? "seeded-photo";
  } catch {
    return "seeded-photo";
  }
}

export function buildTravelSheetSeed({
  trips,
  ownerEmail,
  seededAt
}: BuildTravelSheetSeedOptions): TravelSheetWorkbook {
  const tripRows: TripSheetRow[] = [];
  const tripDayRows: TripDaySheetRow[] = [];
  const tripStopRows: TripStopSheetRow[] = [];
  const tripPhotoRows: TripPhotoSheetRow[] = [];
  const tripMembershipRows: TripMembershipSheetRow[] = [];

  for (const trip of trips) {
    tripRows.push({
      trip_id: trip.id,
      title: trip.title,
      start_date: trip.startDate,
      end_date: trip.endDate,
      timezone: trip.timezone,
      summary: trip.summary,
      cover_photo_url: trip.coverPhotoUrl,
      travel_companions_csv: trip.travelCompanions.join(","),
      highlight_label: trip.highlightLabel,
      route_summary: trip.routeSummary,
      map_center_lat: String(trip.mapCenter[1]),
      map_center_lng: String(trip.mapCenter[0]),
      ending_photo_ids_csv: trip.endingPhotoIds.join(",")
    });

    tripMembershipRows.push({
      trip_id: trip.id,
      email: ownerEmail,
      role: "owner",
      status: "active",
      created_at: seededAt
    });

    for (const day of trip.days) {
      tripDayRows.push({
        day_id: day.id,
        trip_id: trip.id,
        day_index: String(day.dayIndex),
        date: day.date,
        city_label: day.cityLabel,
        title: day.title,
        summary: day.summary,
        highlight_moment: day.highlightMoment,
        hero_photo_url: day.heroPhotoUrl,
        journal: day.journal
      });

      for (const stop of day.stops) {
        tripStopRows.push({
          stop_id: stop.id,
          trip_id: trip.id,
          day_id: day.id,
          name: stop.name,
          lat: stop.lat === null ? "" : String(stop.lat),
          lng: stop.lng === null ? "" : String(stop.lng),
          order_index: String(stop.orderIndex),
          source_type: stop.sourceType,
          original_url: stop.originalUrl,
          created_at: seededAt
        });
      }

      for (const photo of day.gallery) {
        tripPhotoRows.push({
          photo_id: photo.id,
          trip_id: trip.id,
          day_id: day.id,
          storage_key: photo.url,
          alt: photo.alt,
          captured_at: photo.capturedAt ?? "",
          status: "ready",
          original_filename: getOriginalFilename(photo.url),
          created_at: seededAt
        });
      }
    }
  }

  return {
    trips: tripRows,
    tripDays: tripDayRows,
    tripStops: tripStopRows,
    tripPhotos: tripPhotoRows,
    tripMemberships: tripMembershipRows,
    inviteTokens: []
  };
}
