import { redirect } from "next/navigation";

import { TripStudio } from "@/components/trips/trip-studio";
import { getViewerEmail } from "@/lib/server/session";

export default async function NewTripPage() {
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    redirect("/sign-in?next=/trips/new");
  }

  return <TripStudio mode="create" />;
}
