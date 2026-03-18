import type { TripStudioSnapshot } from "@/types/travel";

import { resolveStoredAssetUrl } from "@/lib/server/trip-media";
import type { TravelSheetWorkbook } from "@/lib/server/travel-sheet-schema";

interface TripStudioSnapshotOptions {
  workbook: TravelSheetWorkbook;
  tripId: string;
  viewerEmail: string;
  signPhotoUrl: (storageKey: string) => Promise<string>;
}

export async function createTripStudioSnapshot({
  workbook,
  tripId,
  viewerEmail,
  signPhotoUrl
}: TripStudioSnapshotOptions): Promise<TripStudioSnapshot | undefined> {
  const viewerMembership = workbook.tripMemberships.find(
    (membership) =>
      membership.trip_id === tripId &&
      membership.email.toLowerCase() === viewerEmail.toLowerCase() &&
      membership.status === "active"
  );

  if (!viewerMembership) {
    return undefined;
  }

  const trip = workbook.trips.find((row) => row.trip_id === tripId);

  if (!trip) {
    return undefined;
  }

  const tripStops = workbook.tripStops
    .filter((stop) => stop.trip_id === tripId)
    .sort((left, right) => Number(left.order_index) - Number(right.order_index));
  const tripPhotos = workbook.tripPhotos.filter((photo) => photo.trip_id === tripId);
  const days = await Promise.all(
    workbook.tripDays
      .filter((day) => day.trip_id === tripId)
      .sort((left, right) => Number(left.day_index) - Number(right.day_index))
      .map(async (day) => ({
        cityLabel: day.city_label,
        date: day.date,
        dayIndex: Number(day.day_index),
        gallery: await Promise.all(
          tripPhotos
            .filter((photo) => photo.day_id === day.day_id && photo.status === "ready")
            .map(async (photo) => ({
              alt: photo.alt,
              capturedAt: photo.captured_at || undefined,
              id: photo.photo_id,
              url: await resolveStoredAssetUrl(photo.storage_key, signPhotoUrl)
            }))
        ),
        heroPhotoPreviewUrl: await resolveStoredAssetUrl(day.hero_photo_url, signPhotoUrl),
        heroPhotoValue: day.hero_photo_url,
        highlightMoment: day.highlight_moment,
        id: day.day_id,
        journal: day.journal,
        stops: tripStops
          .filter((stop) => stop.day_id === day.day_id)
          .map((stop) => ({
            id: stop.stop_id,
            lat: stop.lat ? Number(stop.lat) : null,
            lng: stop.lng ? Number(stop.lng) : null,
            name: stop.name,
            orderIndex: Number(stop.order_index),
            originalUrl: stop.original_url,
            sourceType: stop.source_type
          })),
        summary: day.summary,
        title: day.title
      }))
  );

  return {
    collaborators: workbook.tripMemberships
      .filter((membership) => membership.trip_id === tripId && membership.status === "active")
      .map((membership) => ({
        createdAt: membership.created_at,
        email: membership.email,
        role: membership.role,
        status: membership.status
      })),
    coverPhotoPreviewUrl: await resolveStoredAssetUrl(trip.cover_photo_url, signPhotoUrl),
    coverPhotoValue: trip.cover_photo_url,
    days,
    endDate: trip.end_date,
    highlightLabel: trip.highlight_label,
    id: trip.trip_id,
    mapCenter: [Number(trip.map_center_lng), Number(trip.map_center_lat)],
    pendingInvites: workbook.inviteTokens
      .filter((invite) => invite.trip_id === tripId && invite.status === "pending")
      .map((invite) => ({
        createdAt: invite.created_at,
        email: invite.email,
        expiresAt: invite.expires_at,
        inviteId: invite.invite_id,
        role: invite.role
      })),
    photos: await Promise.all(
      tripPhotos.map(async (photo) => ({
        alt: photo.alt,
        capturedAt: photo.captured_at || undefined,
        dayId: photo.day_id,
        id: photo.photo_id,
        originalFilename: photo.original_filename,
        previewUrl: await resolveStoredAssetUrl(photo.storage_key, signPhotoUrl),
        status: photo.status,
        storageKey: photo.storage_key
      }))
    ),
    routeSummary: trip.route_summary,
    startDate: trip.start_date,
    summary: trip.summary,
    timezone: trip.timezone,
    title: trip.title,
    travelCompanions: trip.travel_companions_csv
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    viewerRole: viewerMembership.role
  };
}
