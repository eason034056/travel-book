import { NextResponse } from "next/server";

import type { CompleteTripPhotoUploadsRequest } from "@/lib/trip-photo-upload-contract";
import { getViewerEmail } from "@/lib/server/session";
import { completePhotoUploadsForTrip } from "@/lib/server/trip-studio-service";

interface TripDayDate {
  id: string;
  date: string;
}

export async function POST(request: Request, context: { params: Promise<{ tripId: string }> }) {
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = await context.params;
  const payload = (await request.json()) as CompleteTripPhotoUploadsRequest;
  const tripDays = (payload.tripDays ?? []) as TripDayDate[];

  try {
    return NextResponse.json(
      await completePhotoUploadsForTrip({
        timezone: payload.timezone,
        tripDays: tripDays.map((day) => ({ date: day.date, day_id: day.id })),
        tripId,
        uploads: payload.uploads ?? [],
        viewerEmail
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to finalize photo uploads";

    return NextResponse.json({ message }, { status: message === "Forbidden" ? 403 : 400 });
  }
}
