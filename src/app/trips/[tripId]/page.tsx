import { notFound } from "next/navigation";

import { TripDetailScene } from "@/components/trips/trip-detail-scene";
import { getTripById } from "@/data/mock-trips";

interface TripPageProps {
  params: Promise<{
    tripId: string;
  }>;
}

export default async function TripPage({ params }: TripPageProps) {
  const { tripId } = await params;
  const trip = getTripById(tripId);

  if (!trip) {
    notFound();
  }

  return <TripDetailScene trip={trip} />;
}

