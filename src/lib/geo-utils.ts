import type { PlaceStop } from "@/types/travel";

export function computeCentroid(stops: PlaceStop[]): [number, number] {
  const withCoords = stops.filter((s) => s.lat !== null && s.lng !== null);
  if (withCoords.length === 0) return [0, 0];

  const sumLng = withCoords.reduce((acc, s) => acc + (s.lng as number), 0);
  const sumLat = withCoords.reduce((acc, s) => acc + (s.lat as number), 0);
  return [sumLng / withCoords.length, sumLat / withCoords.length];
}
