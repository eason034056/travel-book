import { notFound, redirect } from "next/navigation";

import { TripStudio } from "@/components/trips/trip-studio";
import { getViewerEmail } from "@/lib/server/session";
import { getTripStudioForViewer } from "@/lib/server/travel-query-service";

interface EditTripPageProps {
  params: Promise<{
    tripId: string;
  }>;
}

export default async function EditTripPage({ params }: EditTripPageProps) {
  const { tripId } = await params;
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    redirect(`/sign-in?next=/trips/${tripId}/edit` as never);
  }

  const trip = await getTripStudioForViewer(tripId, viewerEmail);

  if (!trip) {
    notFound();
  }

  return <TripStudio initialSnapshot={trip} mode="edit" />;
}
