import { NextResponse } from "next/server";

import type { PrepareTripPhotoUploadsRequest } from "@/lib/trip-photo-upload-contract";
import { getViewerEmail } from "@/lib/server/session";
import { preparePhotoUploadsForTrip } from "@/lib/server/trip-studio-service";

export async function POST(request: Request, context: { params: Promise<{ tripId: string }> }) {
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = await context.params;
  const payload = (await request.json()) as PrepareTripPhotoUploadsRequest;

  try {
    return NextResponse.json({
      uploads: await preparePhotoUploadsForTrip({
        files: payload.files ?? [],
        tripId,
        viewerEmail
      })
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to prepare photo uploads";

    return NextResponse.json({ message }, { status: message === "Forbidden" ? 403 : 400 });
  }
}
