import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export async function getViewerEmail() {
  const session = await getServerSession(authOptions);

  return session?.user?.email?.toLowerCase() ?? null;
}
