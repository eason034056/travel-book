import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthEnv } from "@/lib/server/env";
import { getViewerEmail } from "@/lib/server/session";
import { createCollaboratorInvite } from "@/lib/server/trip-studio-service";

const collaboratorSchema = z.object({
  email: z.string().email()
});

export async function POST(request: Request, context: { params: Promise<{ tripId: string }> }) {
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tripId } = await context.params;
    const payload = collaboratorSchema.parse(await request.json());
    const invite = await createCollaboratorInvite({
      inviteeEmail: payload.email,
      tripId,
      viewerEmail
    });

    return NextResponse.json({
      email: payload.email,
      expiresAt: invite.record.expires_at,
      inviteId: invite.record.invite_id,
      message: `Invite link ready for ${payload.email}.`,
      inviteUrl: `${getAuthEnv().APP_URL}/invite/${invite.rawToken}`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to invite collaborator";
    return NextResponse.json({ message }, { status: message === "Forbidden" ? 403 : 400 });
  }
}
