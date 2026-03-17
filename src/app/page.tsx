import { trips } from "@/data/mock-trips";
import { TripsArchive } from "@/components/trips/trips-archive";

export default function HomePage() {
  return <TripsArchive trips={trips} />;
}

