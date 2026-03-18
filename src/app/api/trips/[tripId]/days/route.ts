import { NextResponse } from "next/server";
import { z } from "zod";

import { getViewerEmail } from "@/lib/server/session";
import { updateTripDays } from "@/lib/server/trip-studio-service";

const daysSchema = z.object({
  days: z.array(
    z.object({
      dayId: z.string().min(1),
      cityLabel: z.string(),
      title: z.string(),
      summary: z.string(),
      highlightMoment: z.string(),
      journal: z.string(),
      heroPhotoValue: z.string()
    })
  )
});

export async function PATCH(request: Request, context: { params: Promise<{ tripId: string }> }) {
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tripId } = await context.params;
    const payload = daysSchema.parse(await request.json());
    await updateTripDays({ payload, tripId, viewerEmail });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update days";
    return NextResponse.json({ message }, { status: message === "Forbidden" ? 403 : 400 });
  }
}
