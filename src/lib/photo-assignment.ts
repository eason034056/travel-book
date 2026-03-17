import type { AssignedPhoto, PhotoCapture, UnassignedPhoto } from "@/types/travel";

interface TripDayDate {
  id: string;
  date: string;
}

function toTripDate(dateString: string, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  return formatter.format(new Date(dateString));
}

export function assignPhotosToDays(
  photos: PhotoCapture[],
  tripDays: TripDayDate[],
  timeZone: string
): { assigned: AssignedPhoto[]; unassigned: UnassignedPhoto[] } {
  const assigned: AssignedPhoto[] = [];
  const unassigned: UnassignedPhoto[] = [];

  for (const photo of photos) {
    if (!photo.capturedAt) {
      unassigned.push({
        photoId: photo.id,
        reason: "missing-captured-at"
      });
      continue;
    }

    const tripDate = toTripDate(photo.capturedAt, timeZone);
    const matchingDay = tripDays.find((day) => day.date === tripDate);

    if (!matchingDay) {
      unassigned.push({
        photoId: photo.id,
        reason: "no-matching-day"
      });
      continue;
    }

    assigned.push({
      photoId: photo.id,
      dayId: matchingDay.id
    });
  }

  return { assigned, unassigned };
}

