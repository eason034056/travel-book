import { NextResponse } from "next/server";
import { z } from "zod";

import { getViewerEmail } from "@/lib/server/session";
import { updateTripOverview } from "@/lib/server/trip-studio-service";

const overviewSchema = z.object({
  title: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  timezone: z.string().min(1),
  summary: z.string(),
  travelCompanions: z.array(z.string()),
  highlightLabel: z.string(),
  routeSummary: z.string(),
  mapCenter: z.tuple([z.number(), z.number()]),
  coverPhotoValue: z.string(),
  confirmDateShrink: z.boolean()
});

export async function PATCH(request: Request, context: { params: Promise<{ tripId: string }> }) {
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tripId } = await context.params;
    const payload = overviewSchema.parse(await request.json());
    return NextResponse.json(await updateTripOverview({ payload, tripId, viewerEmail }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update overview";
    const status = message === "Forbidden" ? 403 : message === "Date range shrink requires confirmation" ? 409 : 400;
    return NextResponse.json({ message }, { status });
  }
}
