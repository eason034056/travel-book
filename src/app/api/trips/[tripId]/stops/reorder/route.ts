import { NextResponse } from "next/server";
import { z } from "zod";

import { getViewerEmail } from "@/lib/server/session";
import { reorderStopsForTrip } from "@/lib/server/trip-studio-service";

const reorderSchema = z.object({
  dayId: z.string().min(1),
  stopIds: z.array(z.string().min(1))
});

export async function PATCH(request: Request, context: { params: Promise<{ tripId: string }> }) {
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tripId } = await context.params;
    const payload = reorderSchema.parse(await request.json());
    await reorderStopsForTrip({ payload, tripId, viewerEmail });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reorder stops";
    return NextResponse.json({ message }, { status: message === "Forbidden" ? 403 : 400 });
  }
}
