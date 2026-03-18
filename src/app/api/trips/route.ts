import { NextResponse } from "next/server";
import { z } from "zod";

import { getViewerEmail } from "@/lib/server/session";
import { createTripForViewer } from "@/lib/server/trip-studio-service";

const createTripSchema = z.object({
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
  days: z.array(
    z.object({
      date: z.string().min(1),
      cityLabel: z.string(),
      title: z.string(),
      summary: z.string(),
      highlightMoment: z.string(),
      journal: z.string(),
      heroPhotoValue: z.string()
    })
  ),
  stops: z.array(
    z.object({
      dayDate: z.string().min(1),
      name: z.string().min(1),
      lat: z.number().nullable(),
      lng: z.number().nullable(),
      orderIndex: z.number(),
      sourceType: z.enum(["place", "route"]),
      originalUrl: z.string()
    })
  ).optional()
});

export async function POST(request: Request) {
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = createTripSchema.parse(await request.json());
    return NextResponse.json(await createTripForViewer({ payload, viewerEmail }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create trip";
    return NextResponse.json({ message }, { status: 400 });
  }
}
