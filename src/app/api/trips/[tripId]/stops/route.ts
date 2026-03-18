import { NextResponse } from "next/server";
import { z } from "zod";

import { getViewerEmail } from "@/lib/server/session";
import { createStopForTrip } from "@/lib/server/trip-studio-service";

const stopSchema = z.object({
  dayId: z.string().min(1),
  name: z.string().min(1),
  lat: z.number().nullable(),
  lng: z.number().nullable()
});

export async function POST(request: Request, context: { params: Promise<{ tripId: string }> }) {
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tripId } = await context.params;
    const payload = stopSchema.parse(await request.json());
    await createStopForTrip({ payload, tripId, viewerEmail });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add stop";
    return NextResponse.json({ message }, { status: message === "Forbidden" ? 403 : 400 });
  }
}
