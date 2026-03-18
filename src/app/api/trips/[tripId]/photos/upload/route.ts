import crypto from "node:crypto";

import * as exifr from "exifr";
import { NextResponse } from "next/server";

import { getViewerEmail } from "@/lib/server/session";
import { uploadPhotosForTrip } from "@/lib/server/trip-studio-service";

interface TripDayDate {
  id: string;
  date: string;
}

export async function POST(request: Request, context: { params: Promise<{ tripId: string }> }) {
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const { tripId } = await context.params;
  const tripDays = JSON.parse(String(formData.get("tripDays") ?? "[]")) as TripDayDate[];
  const timezone = String(formData.get("timezone") ?? "UTC");
  const files = formData.getAll("photos").filter((value): value is File => value instanceof File);

  try {
    const uploads = await Promise.all(
      files.map(async (file) => {
        const body = new Uint8Array(await file.arrayBuffer());
        const metadata = await exifr.parse(body, {
          pick: ["DateTimeOriginal", "CreateDate"]
        });
        const capturedAt = metadata?.DateTimeOriginal ?? metadata?.CreateDate;

        return {
          body,
          contentType: file.type || "application/octet-stream",
          capturedAt: capturedAt instanceof Date ? capturedAt.toISOString() : undefined,
          originalFilename: file.name,
          photoId: `${file.name}-${crypto.randomUUID()}`
        };
      })
    );

    return NextResponse.json(
      await uploadPhotosForTrip({
        tripDays: tripDays.map((day) => ({ date: day.date, day_id: day.id })),
        tripId,
        timezone,
        uploads,
        viewerEmail
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload photos";
    return NextResponse.json({ message }, { status: message === "Forbidden" ? 403 : 400 });
  }
}
