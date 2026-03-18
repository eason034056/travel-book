import { NextResponse } from "next/server";
import { z } from "zod";

import { getViewerEmail } from "@/lib/server/session";
import { importStopsForTrip } from "@/lib/server/trip-studio-service";

const importSchema = z.object({
  dayId: z.string().min(1),
  urls: z.array(z.string())
});

export async function POST(request: Request, context: { params: Promise<{ tripId: string }> }) {
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tripId } = await context.params;
    const payload = importSchema.parse(await request.json());
    return NextResponse.json(
      await importStopsForTrip({
        dayId: payload.dayId,
        tripId,
        urls: payload.urls,
        viewerEmail
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to import stops";
    return NextResponse.json({ message }, { status: message === "Forbidden" ? 403 : 400 });
  }
}
