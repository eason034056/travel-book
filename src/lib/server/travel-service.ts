import type { TripDetail, TripDay, TripSummary } from "@/types/travel";

import { trips as mockTrips } from "@/data/mock-trips";
import { assignPhotosToDays } from "@/lib/photo-assignment";
import { buildStopImportRows } from "@/lib/server/google-links-import";
import {
  appendInviteToken,
  appendTripMembership,
  appendTripPhotos,
  appendTripStops,
  findActiveMembership,
  findInviteTokenByHash,
  markInviteTokenExpired,
  markInviteTokenUsed,
  readTravelWorkbook,
  seedTravelWorkbook
} from "@/lib/server/google-sheets";
import { createInviteTokenRecord, hashInviteToken, isInviteTokenExpired } from "@/lib/server/invite-token";
import { buildPhotoRowsForPersistence } from "@/lib/server/photo-records";
import { signTripPhotoUrl, uploadTripPhoto } from "@/lib/server/r2";
import { createArchiveSnapshot, createTripDetailSnapshot } from "@/lib/server/travel-sheet-read-model";
import { buildTravelSheetSeed } from "@/lib/server/travel-sheet-seed";
import type { InviteTokenSheetRow } from "@/lib/server/travel-sheet-schema";
import { getAuthEnv } from "@/lib/server/env";

async function assertTripAccess(tripId: string, viewerEmail: string) {
  const membership = await findActiveMembership(tripId, viewerEmail);

  if (!membership) {
    throw new Error("Forbidden");
  }
}

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

export async function createInviteLink(options: {
  tripId: string;
  inviteeEmail: string;
  createdByEmail: string;
}) {
  await assertTripAccess(options.tripId, options.createdByEmail);

  const invite = createInviteTokenRecord({
    tripId: options.tripId,
    email: options.inviteeEmail.toLowerCase(),
    createdByEmail: options.createdByEmail.toLowerCase(),
    now: new Date(),
    ttlDays: 7
  });

  await appendInviteToken(invite.record);

  return {
    inviteUrl: `${getAuthEnv().APP_URL}/invite/${invite.rawToken}`,
    expiresAt: invite.record.expires_at
  };
}

function inviteOutcome(status: "invalid" | "expired" | "wrong-email" | "accepted", invite?: InviteTokenSheetRow) {
  return {
    status,
    tripId: invite?.trip_id,
    invitedEmail: invite?.email
  };
}

export async function acceptInviteLink(rawToken: string, viewerEmail: string) {
  const matchingInvite = await findInviteTokenByHash(hashInviteToken(rawToken));

  if (!matchingInvite) {
    return inviteOutcome("invalid");
  }

  const invite = matchingInvite.row;

  if (invite.status !== "pending") {
    return invite.status === "expired" ? inviteOutcome("expired", invite) : inviteOutcome("invalid", invite);
  }

  if (isInviteTokenExpired(invite.expires_at, new Date())) {
    await markInviteTokenExpired(invite.invite_id);
    return inviteOutcome("expired", invite);
  }

  if (invite.email.toLowerCase() !== viewerEmail.toLowerCase()) {
    return inviteOutcome("wrong-email", invite);
  }

  const existingMembership = await findActiveMembership(invite.trip_id, viewerEmail);

  if (!existingMembership) {
    await appendTripMembership({
      trip_id: invite.trip_id,
      email: viewerEmail.toLowerCase(),
      role: invite.role,
      status: "active",
      created_at: new Date().toISOString()
    });
  }

  await markInviteTokenUsed(invite.invite_id, {
    usedAt: new Date().toISOString()
  });

  return inviteOutcome("accepted", invite);
}

export async function importStopsForTrip(options: {
  tripId: string;
  dayId: string;
  urls: string[];
  viewerEmail: string;
}) {
  await assertTripAccess(options.tripId, options.viewerEmail);
  const workbook = await readTravelWorkbook();
  const day = workbook.tripDays.find((tripDay) => tripDay.trip_id === options.tripId && tripDay.day_id === options.dayId);

  if (!day) {
    throw new Error("Unknown trip day");
  }

  const existingStopCount = workbook.tripStops.filter(
    (stop) => stop.trip_id === options.tripId && stop.day_id === options.dayId
  ).length;

  const result = await buildStopImportRows({
    tripId: options.tripId,
    dayId: options.dayId,
    existingStopCount,
    importedAt: new Date().toISOString(),
    urls: options.urls
  });

  await appendTripStops(result.rows);

  return {
    resolvedCount: result.resolvedCount,
    unresolved: result.unresolved,
    savedCount: result.rows.length,
    stops: result.rows.map((row) => ({
      name: row.name,
      orderIndex: Number(row.order_index)
    }))
  };
}

export async function uploadPhotosForTrip(options: {
  tripId: string;
  tripDays: Pick<TripDay, "id" | "date">[];
  timezone: string;
  viewerEmail: string;
  uploads: Array<{
    photoId: string;
    originalFilename: string;
    contentType: string;
    body: Uint8Array;
    capturedAt?: string;
  }>;
}) {
  await assertTripAccess(options.tripId, options.viewerEmail);

  const assignments = assignPhotosToDays(
    options.uploads.map((upload) => ({
      id: upload.photoId,
      capturedAt: upload.capturedAt
    })),
    options.tripDays,
    options.timezone
  );

  const uploaded = await Promise.all(
    options.uploads.map(async (upload) => {
      const storageKey = await uploadTripPhoto({
        tripId: options.tripId,
        originalFilename: upload.originalFilename,
        contentType: upload.contentType,
        body: upload.body
      });

      const assignedDayId = assignments.assigned.find((assignment) => assignment.photoId === upload.photoId)?.dayId;

      return {
        photoId: upload.photoId,
        storageKey,
        originalFilename: upload.originalFilename,
        capturedAt: upload.capturedAt,
        assignedDayId
      };
    })
  );

  const rows = buildPhotoRowsForPersistence({
    tripId: options.tripId,
    uploadedAt: new Date().toISOString(),
    photos: uploaded
  });

  await appendTripPhotos(rows);

  return {
    assigned: assignments.assigned,
    unassigned: assignments.unassigned
  };
}
