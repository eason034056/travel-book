import { NextResponse } from "next/server";
import { z } from "zod";

import { getViewerEmail } from "@/lib/server/session";
import { deleteStopForTrip, renameStopForTrip } from "@/lib/server/trip-studio-service";

const patchSchema = z.object({
  name: z.string().min(1)
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ tripId: string; stopId: string }> }
) {
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { stopId, tripId } = await context.params;
    const payload = patchSchema.parse(await request.json());
    await renameStopForTrip({ stopId, tripId, viewerEmail, name: payload.name });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to rename stop";
    return NextResponse.json({ message }, { status: message === "Forbidden" ? 403 : 400 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ tripId: string; stopId: string }> }
) {
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { stopId, tripId } = await context.params;
    await deleteStopForTrip({ stopId, tripId, viewerEmail });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete stop";
    return NextResponse.json({ message }, { status: message === "Forbidden" ? 403 : 400 });
  }
}
