import { NextResponse } from "next/server";
import { z } from "zod";

import { createInviteLink } from "@/lib/server/travel-service";
import { getViewerEmail } from "@/lib/server/session";

const payloadSchema = z.object({
  email: z.string().email()
});

export async function POST(request: Request, context: { params: Promise<{ tripId: string }> }) {
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = payloadSchema.parse(await request.json());
  const { tripId } = await context.params;

  try {
    const invite = await createInviteLink({
      tripId,
      inviteeEmail: payload.email,
      createdByEmail: viewerEmail
    });

    return NextResponse.json({
      message: `Invite link ready for ${payload.email}.`,
      inviteUrl: invite.inviteUrl,
      expiresAt: invite.expiresAt
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invite creation failed";
    return NextResponse.json({ message }, { status: message === "Forbidden" ? 403 : 400 });
  }
}
