import { NextResponse } from "next/server";
import { z } from "zod";

import { expandUrls } from "@/lib/server/google-links-import";
import { parseGoogleMapsLink } from "@/lib/google-maps-parser";

const schema = z.object({
  urls: z.array(z.string()).min(1).max(50)
});

export async function POST(request: Request) {
  try {
    const { urls } = schema.parse(await request.json());
    const expanded = await expandUrls(urls);

    const results = expanded.map((expandedUrl, i) => ({
      original: urls[i],
      expanded: expandedUrl,
      parsed: parseGoogleMapsLink(expandedUrl)
    }));

    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resolve links";
    return NextResponse.json({ message }, { status: 400 });
  }
}
