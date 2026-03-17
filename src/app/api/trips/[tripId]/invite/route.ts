import { NextResponse } from "next/server";
import { z } from "zod";

const payloadSchema = z.object({
  email: z.string().email()
});

export async function POST(request: Request, context: { params: Promise<{ tripId: string }> }) {
  const payload = payloadSchema.parse(await request.json());
  const { tripId } = await context.params;

  return NextResponse.json({
    message: `Invite drafted for ${payload.email} on trip ${tripId}.`
  });
}
