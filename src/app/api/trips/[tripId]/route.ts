import { NextResponse } from "next/server";

import { getViewerEmail } from "@/lib/server/session";
import { deleteTripForViewer } from "@/lib/server/trip-studio-service";

export async function DELETE(_request: Request, context: { params: Promise<{ tripId: string }> }) {
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tripId } = await context.params;
    await deleteTripForViewer({ tripId, viewerEmail });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete trip";
    return NextResponse.json({ message }, { status: message === "Forbidden" ? 403 : 400 });
  }
}
