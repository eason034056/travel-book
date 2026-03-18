import crypto from "node:crypto";

import * as exifr from "exifr";
import { NextResponse } from "next/server";

import { uploadPhotosForTrip } from "@/lib/server/travel-service";
import { getViewerEmail } from "@/lib/server/session";

interface TripDayDate {
  id: string;
  date: string;
}

export async function POST(request: Request) {
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const tripId = String(formData.get("tripId") ?? "");
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
          photoId: `${file.name}-${crypto.randomUUID()}`,
          originalFilename: file.name,
          contentType: file.type || "application/octet-stream",
          body,
          capturedAt: capturedAt instanceof Date ? capturedAt.toISOString() : undefined
        };
      })
    );

    return NextResponse.json(
      await uploadPhotosForTrip({
        tripId,
        tripDays,
        timezone,
        viewerEmail,
        uploads
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Photo upload failed";
    return NextResponse.json({ message }, { status: message === "Forbidden" ? 403 : 400 });
  }
}
