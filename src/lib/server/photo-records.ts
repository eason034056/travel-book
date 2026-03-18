import type { TripPhotoSheetRow } from "@/lib/server/travel-sheet-schema";

interface PersistedPhotoInput {
  photoId: string;
  storageKey: string;
  originalFilename: string;
  capturedAt?: string;
  assignedDayId?: string;
}

interface BuildPhotoRowsForPersistenceOptions {
  tripId: string;
  uploadedAt: string;
  photos: PersistedPhotoInput[];
}

function buildPhotoAlt(originalFilename: string) {
  const [stem] = originalFilename.split(".");
  return stem.replace(/[-_]+/g, " ").trim() || "Trip photo";
}

export function buildPhotoRowsForPersistence({
  tripId,
  uploadedAt,
  photos
}: BuildPhotoRowsForPersistenceOptions): TripPhotoSheetRow[] {
  return photos.map((photo) => ({
    photo_id: photo.photoId,
    trip_id: tripId,
    day_id: photo.assignedDayId ?? "",
    storage_key: photo.storageKey,
    alt: buildPhotoAlt(photo.originalFilename),
    captured_at: photo.capturedAt ?? "",
    status: photo.assignedDayId ? "ready" : "unassigned",
    original_filename: photo.originalFilename,
    created_at: uploadedAt
  }));
}
