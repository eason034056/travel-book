import { NextResponse } from "next/server";
import { z } from "zod";

import { getViewerEmail } from "@/lib/server/session";
import { deletePhotoForTrip, updatePhotoForTrip } from "@/lib/server/trip-studio-service";

const photoSchema = z.object({
  alt: z.string(),
  dayId: z.string()
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ tripId: string; photoId: string }> }
) {
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { photoId, tripId } = await context.params;
    const payload = photoSchema.parse(await request.json());
    await updatePhotoForTrip({ payload, photoId, tripId, viewerEmail });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update photo";
    return NextResponse.json({ message }, { status: message === "Forbidden" ? 403 : 400 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ tripId: string; photoId: string }> }
) {
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { photoId, tripId } = await context.params;
    await deletePhotoForTrip({ photoId, tripId, viewerEmail });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete photo";
    return NextResponse.json({ message }, { status: message === "Forbidden" ? 403 : 400 });
  }
}
