import { NextResponse } from "next/server";
import { z } from "zod";

import { importStopsForTrip } from "@/lib/server/travel-service";
import { getViewerEmail } from "@/lib/server/session";

const payloadSchema = z.object({
  tripId: z.string().min(1),
  dayId: z.string().min(1),
  urls: z.array(z.string())
});

export async function POST(request: Request) {
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = payloadSchema.parse(await request.json());

  try {
    return NextResponse.json(
      await importStopsForTrip({
        tripId: payload.tripId,
        dayId: payload.dayId,
        urls: payload.urls,
        viewerEmail
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ message }, { status: message === "Forbidden" ? 403 : 400 });
  }
}
