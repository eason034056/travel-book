import { TripsArchive } from "@/components/trips/trips-archive";
import { getArchiveForViewer } from "@/lib/server/travel-service";
import { getViewerEmail } from "@/lib/server/session";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    redirect("/sign-in?next=/");
  }

  const trips = await getArchiveForViewer(viewerEmail);

  return <TripsArchive trips={trips} />;
}
