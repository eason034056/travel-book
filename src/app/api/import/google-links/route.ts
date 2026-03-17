import { NextResponse } from "next/server";
import { z } from "zod";

import { buildImportPreview } from "@/lib/import-draft";

const payloadSchema = z.object({
  tripId: z.string().min(1),
  urls: z.array(z.string())
});

export async function POST(request: Request) {
  const payload = payloadSchema.parse(await request.json());

  return NextResponse.json(buildImportPreview(payload.urls));
}

