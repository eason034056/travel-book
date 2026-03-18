import { NextResponse } from "next/server";

import { getViewerEmail } from "@/lib/server/session";
import { cancelPendingInviteForTrip } from "@/lib/server/trip-studio-service";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ tripId: string; inviteId: string }> }
) {
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { inviteId, tripId } = await context.params;
    await cancelPendingInviteForTrip({
      inviteId,
      tripId,
      viewerEmail
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to cancel invite";
    return NextResponse.json({ message }, { status: message === "Forbidden" ? 403 : 400 });
  }
}
