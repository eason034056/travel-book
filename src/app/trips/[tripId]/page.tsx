import { notFound, redirect } from "next/navigation";

import { TripDetailScene } from "@/components/trips/trip-detail-scene";
import { getTripForViewer } from "@/lib/server/travel-query-service";
import { getViewerEmail } from "@/lib/server/session";

interface TripPageProps {
  params: Promise<{
    tripId: string;
  }>;
}

export default async function TripPage({ params }: TripPageProps) {
  const { tripId } = await params;
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    redirect(`/sign-in?next=/trips/${tripId}` as never);
  }

  const trip = await getTripForViewer(tripId, viewerEmail);

  if (!trip) {
    notFound();
  }

  return <TripDetailScene trip={trip} />;
}
