import type { TripDetail, TripSummary, TripStudioSnapshot } from "@/types/travel";

import { trips as mockTrips } from "@/data/mock-trips";
import { createTripStudioSnapshot } from "@/lib/server/trip-studio-read-model";
import { createArchiveSnapshot, createTripDetailSnapshot } from "@/lib/server/travel-sheet-read-model";
import { buildTravelSheetSeed } from "@/lib/server/travel-sheet-seed";
import { seedTravelWorkbook, readTravelWorkbook } from "@/lib/server/google-sheets";
import { signTripPhotoUrl } from "@/lib/server/r2";

export async function seedTravelSheetFromMockData(ownerEmail: string) {
  const workbook = buildTravelSheetSeed({
    trips: mockTrips,
    ownerEmail,
    seededAt: new Date().toISOString()
  });

  return seedTravelWorkbook(workbook);
}

export async function getArchiveForViewer(viewerEmail: string): Promise<TripSummary[]> {
  const workbook = await readTravelWorkbook();

  return createArchiveSnapshot({
    workbook,
    viewerEmail,
    signPhotoUrl: signTripPhotoUrl
  });
}

export async function getTripForViewer(tripId: string, viewerEmail: string): Promise<TripDetail | undefined> {
  const workbook = await readTravelWorkbook();

  return createTripDetailSnapshot({
    workbook,
    tripId,
    viewerEmail,
    signPhotoUrl: signTripPhotoUrl
  });
}

export async function getTripStudioForViewer(tripId: string, viewerEmail: string): Promise<TripStudioSnapshot | undefined> {
  const workbook = await readTravelWorkbook();

  return createTripStudioSnapshot({
    workbook,
    tripId,
    viewerEmail,
    signPhotoUrl: signTripPhotoUrl
  });
}
