import type { TripDetail, TripSummary } from "@/types/travel";

import type {
  TravelSheetWorkbook,
  TripMembershipSheetRow,
  TripPhotoSheetRow,
  TripSheetRow,
  TripStopSheetRow
} from "@/lib/server/travel-sheet-schema";

interface SnapshotOptions {
  workbook: TravelSheetWorkbook;
  viewerEmail: string;
  signPhotoUrl: (storageKey: string) => Promise<string>;
}

interface TripDetailSnapshotOptions extends SnapshotOptions {
  tripId: string;
}

function hasActiveMembership(memberships: TripMembershipSheetRow[], tripId: string, email: string) {
  return memberships.some(
    (membership) =>
      membership.trip_id === tripId &&
      membership.email.toLowerCase() === email.toLowerCase() &&
      membership.status === "active"
  );
}

function isExternalPhoto(storageKey: string) {
  return /^https?:\/\//.test(storageKey);
}

async function resolvePhotoUrl(photo: TripPhotoSheetRow, signPhotoUrl: SnapshotOptions["signPhotoUrl"]) {
  if (isExternalPhoto(photo.storage_key)) {
    return photo.storage_key;
  }

  return signPhotoUrl(photo.storage_key);
}

function buildTripSummary(row: TripSheetRow, workbook: TravelSheetWorkbook): TripSummary {
  const tripDays = workbook.tripDays.filter((day) => day.trip_id === row.trip_id);
  const tripStops = workbook.tripStops.filter((stop) => stop.trip_id === row.trip_id);

  return {
    id: row.trip_id,
    title: row.title,
    startDate: row.start_date,
    endDate: row.end_date,
    timezone: row.timezone,
    summary: row.summary,
    coverPhotoUrl: row.cover_photo_url,
    travelCompanions: row.travel_companions_csv
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    daysCount: tripDays.length,
    stopCount: tripStops.length
  };
}

function compareRowOrder(left: TripStopSheetRow, right: TripStopSheetRow) {
  return Number(left.order_index) - Number(right.order_index);
}

export async function createArchiveSnapshot({
  workbook,
  viewerEmail,
  signPhotoUrl
}: SnapshotOptions): Promise<TripSummary[]> {
  const accessibleTrips = workbook.trips.filter((trip) =>
    hasActiveMembership(workbook.tripMemberships, trip.trip_id, viewerEmail)
  );

  return Promise.all(
    accessibleTrips.map(async (trip) => {
      const summary = buildTripSummary(trip, workbook);
      const firstPhoto = workbook.tripPhotos.find(
        (photo) => photo.trip_id === trip.trip_id && photo.status === "ready"
      );

      if (firstPhoto && !summary.coverPhotoUrl) {
        summary.coverPhotoUrl = await resolvePhotoUrl(firstPhoto, signPhotoUrl);
      }

      return summary;
    })
  );
}

export async function createTripDetailSnapshot({
  workbook,
  viewerEmail,
  tripId,
  signPhotoUrl
}: TripDetailSnapshotOptions): Promise<TripDetail | undefined> {
  if (!hasActiveMembership(workbook.tripMemberships, tripId, viewerEmail)) {
    return undefined;
  }

  const trip = workbook.trips.find((row) => row.trip_id === tripId);

  if (!trip) {
    return undefined;
  }

  const summary = buildTripSummary(trip, workbook);
  const days = await Promise.all(
    workbook.tripDays
      .filter((day) => day.trip_id === trip.trip_id)
      .sort((left, right) => Number(left.day_index) - Number(right.day_index))
      .map(async (day) => {
        const stops = workbook.tripStops
          .filter((stop) => stop.trip_id === trip.trip_id && stop.day_id === day.day_id)
          .sort(compareRowOrder)
          .map((stop) => ({
            id: stop.stop_id,
            name: stop.name,
            lat: stop.lat ? Number(stop.lat) : null,
            lng: stop.lng ? Number(stop.lng) : null,
            orderIndex: Number(stop.order_index),
            sourceType: stop.source_type,
            originalUrl: stop.original_url
          }));

        const galleryRows = workbook.tripPhotos.filter(
          (photo) =>
            photo.trip_id === trip.trip_id &&
            photo.day_id === day.day_id &&
            photo.status === "ready"
        );

        const gallery = await Promise.all(
          galleryRows.map(async (photo) => ({
            id: photo.photo_id,
            url: await resolvePhotoUrl(photo, signPhotoUrl),
            alt: photo.alt,
            capturedAt: photo.captured_at || undefined
          }))
        );

        return {
          id: day.day_id,
          dayIndex: Number(day.day_index),
          date: day.date,
          cityLabel: day.city_label,
          title: day.title,
          summary: day.summary,
          highlightMoment: day.highlight_moment,
          heroPhotoUrl: day.hero_photo_url,
          journal: day.journal,
          stops,
          gallery
        };
      })
  );

  return {
    ...summary,
    highlightLabel: trip.highlight_label,
    routeSummary: trip.route_summary,
    mapCenter: [Number(trip.map_center_lng), Number(trip.map_center_lat)],
    days
  };
}
