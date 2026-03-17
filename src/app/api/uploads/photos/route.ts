import * as exifr from "exifr";
import { NextResponse } from "next/server";

import { assignPhotosToDays } from "@/lib/photo-assignment";

interface TripDayDate {
  id: string;
  date: string;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const tripDays = JSON.parse(String(formData.get("tripDays") ?? "[]")) as TripDayDate[];
  const timezone = String(formData.get("timezone") ?? "UTC");
  const files = formData.getAll("photos").filter((value): value is File => value instanceof File);

  const captures = await Promise.all(
    files.map(async (file) => {
      const metadata = await exifr.parse(await file.arrayBuffer(), {
        pick: ["DateTimeOriginal", "CreateDate", "GPSLatitude", "GPSLongitude"]
      });

      const capturedAt = metadata?.DateTimeOriginal ?? metadata?.CreateDate;

      return {
        id: file.name,
        capturedAt: capturedAt instanceof Date ? capturedAt.toISOString() : undefined
      };
    })
  );

  return NextResponse.json(assignPhotosToDays(captures, tripDays, timezone));
}

