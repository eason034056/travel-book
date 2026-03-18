import { NextResponse } from "next/server";

import { getViewerEmail } from "@/lib/server/session";
import { revokeCollaboratorForTrip } from "@/lib/server/trip-studio-service";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ tripId: string; email: string }> }
) {
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email, tripId } = await context.params;
    await revokeCollaboratorForTrip({
      collaboratorEmail: decodeURIComponent(email),
      tripId,
      viewerEmail
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to revoke collaborator";
    return NextResponse.json({ message }, { status: message === "Forbidden" ? 403 : 400 });
  }
}
