import crypto from "node:crypto";

import type { TripStudioPhoto } from "@/types/travel";
import type { TravelSheetWorkbook, TripDaySheetRow, TripMembershipSheetRow, TripPhotoSheetRow, TripSheetRow, TripStopSheetRow } from "@/lib/server/travel-sheet-schema";

import { assignPhotosToDays } from "@/lib/photo-assignment";
import { MAX_TRIP_PHOTO_UPLOADS } from "@/lib/trip-photo-upload-contract";
import { buildPhotoRowsForPersistence } from "@/lib/server/photo-records";
import { buildStopImportRows } from "@/lib/server/google-links-import";
import { appendTableRows, readTravelWorkbook, replaceTableRows } from "@/lib/server/google-sheets";
import { createInviteTokenRecord } from "@/lib/server/invite-token";
import { isExternalAssetUrl } from "@/lib/server/trip-media";
import { buildDateDrivenDayRows, buildTripId, planTripDayRange } from "@/lib/server/trip-studio-model";
import { createTripPhotoUploadTarget, deleteTripStorageKeys, signTripPhotoUrl, uploadTripPhoto } from "@/lib/server/r2";

interface EditableTripDayPayload {
  date: string;
  cityLabel: string;
  title: string;
  summary: string;
  highlightMoment: string;
  journal: string;
  heroPhotoValue: string;
}

interface CreateTripStopPayload {
  dayDate: string;
  name: string;
  lat: number | null;
  lng: number | null;
  orderIndex: number;
  sourceType: "place" | "route";
  originalUrl: string;
}

interface CreateTripPayload {
  title: string;
  startDate: string;
  endDate: string;
  timezone: string;
  summary: string;
  travelCompanions: string[];
  highlightLabel: string;
  routeSummary: string;
  mapCenter: [number, number];
  coverPhotoValue: string;
  endingPhotoIds: string[];
  days: EditableTripDayPayload[];
  stops?: CreateTripStopPayload[];
}

interface UpdateTripOverviewPayload {
  title: string;
  startDate: string;
  endDate: string;
  timezone: string;
  summary: string;
  travelCompanions: string[];
  highlightLabel: string;
  routeSummary: string;
  mapCenter: [number, number];
  coverPhotoValue: string;
  endingPhotoIds: string[];
  confirmDateShrink: boolean;
}

interface UpdateTripDaysPayload {
  dayId: string;
  cityLabel: string;
  title: string;
  summary: string;
  highlightMoment: string;
  journal: string;
  heroPhotoValue: string;
}

export async function createTripForViewer(options: {
  viewerEmail: string;
  payload: CreateTripPayload;
}) {
  assertValidDateRange(options.payload.startDate, options.payload.endDate);

  const workbook = await readTravelWorkbook();
  const tripId = buildTripId({
    existingTripIds: workbook.trips.map((trip) => trip.trip_id),
    startDate: options.payload.startDate,
    title: options.payload.title
  });
  const dayDraftsByDate = new Map(options.payload.days.map((day) => [day.date, day]));
  const tripDays = buildDateDrivenDayRows({
    endDate: options.payload.endDate,
    startDate: options.payload.startDate,
    tripId
  }).map((row) => mergeDayDraft(row, dayDraftsByDate.get(row.date)));
  const tripRow = buildTripRow({
    coverPhotoValue: options.payload.coverPhotoValue,
    endDate: options.payload.endDate,
    highlightLabel: options.payload.highlightLabel,
    mapCenter: options.payload.mapCenter,
      endingPhotoIds: options.payload.endingPhotoIds,
    routeSummary: options.payload.routeSummary,
    startDate: options.payload.startDate,
    summary: options.payload.summary,
    timezone: options.payload.timezone,
    title: options.payload.title,
    travelCompanions: options.payload.travelCompanions,
    tripId
  });
  const ownerMembership: TripMembershipSheetRow = {
    created_at: new Date().toISOString(),
    email: options.viewerEmail.toLowerCase(),
    role: "owner",
    status: "active",
    trip_id: tripId
  };

  await appendTableRows("trips", [tripRow]);
  await appendTableRows("tripDays", tripDays);
  await appendTableRows("tripMemberships", [ownerMembership]);

  if (options.payload.stops && options.payload.stops.length > 0) {
    const dayIdByDate = new Map(tripDays.map((day) => [day.date, day.day_id]));
    const stopRows: TripStopSheetRow[] = options.payload.stops
      .filter((stop) => dayIdByDate.has(stop.dayDate))
      .map((stop) => ({
        stop_id: crypto.randomUUID(),
        trip_id: tripId,
        day_id: dayIdByDate.get(stop.dayDate) ?? "",
        name: stop.name,
        lat: stop.lat === null ? "" : String(stop.lat),
        lng: stop.lng === null ? "" : String(stop.lng),
        order_index: String(stop.orderIndex),
        source_type: stop.sourceType,
        original_url: stop.originalUrl,
        created_at: new Date().toISOString()
      }));

    if (stopRows.length > 0) {
      await appendTableRows("tripStops", stopRows);
    }
  }

  return { tripId };
}

export async function updateTripOverview(options: {
  tripId: string;
  viewerEmail: string;
  payload: UpdateTripOverviewPayload;
}) {
  assertValidDateRange(options.payload.startDate, options.payload.endDate);

  const workbook = await readTravelWorkbook();

  assertTripEditorAccess(workbook, options.tripId, options.viewerEmail);

  const trip = workbook.trips.find((row) => row.trip_id === options.tripId);

  if (!trip) {
    throw new Error("Not found");
  }

  const existingDays = workbook.tripDays.filter((day) => day.trip_id === options.tripId);
  const plannedDays = planTripDayRange({
    endDate: options.payload.endDate,
    existingDays,
    startDate: options.payload.startDate,
    tripId: options.tripId
  });
  const removedDayIdSet = new Set(plannedDays.removedDayIds);

  if (
    !options.payload.confirmDateShrink &&
    removedDayIdSet.size > 0 &&
    removedDaysContainData(workbook, options.tripId, plannedDays.removedDayIds)
  ) {
    throw new Error("Date range shrink requires confirmation");
  }

  const updatedTrips = workbook.trips.map((row) =>
    row.trip_id === options.tripId
      ? buildTripRow({
          coverPhotoValue: options.payload.coverPhotoValue,
          endDate: options.payload.endDate,
          highlightLabel: options.payload.highlightLabel,
          mapCenter: options.payload.mapCenter,
          endingPhotoIds: options.payload.endingPhotoIds,
          routeSummary: options.payload.routeSummary,
          startDate: options.payload.startDate,
          summary: options.payload.summary,
          timezone: options.payload.timezone,
          title: options.payload.title,
          travelCompanions: options.payload.travelCompanions,
          tripId: options.tripId
        })
      : row
  );
  const updatedDays = [
    ...workbook.tripDays.filter((day) => day.trip_id !== options.tripId),
    ...plannedDays.days
  ];
  const updatedStops = workbook.tripStops.filter(
    (stop) => stop.trip_id !== options.tripId || !removedDayIdSet.has(stop.day_id)
  );
  const updatedPhotos = workbook.tripPhotos.map((photo) => {
    if (photo.trip_id !== options.tripId || !removedDayIdSet.has(photo.day_id)) {
      return photo;
    }

    return {
      ...photo,
      day_id: "",
      status: "unassigned"
    } satisfies TripPhotoSheetRow;
  });

  await replaceTableRows("trips", updatedTrips);
  await replaceTableRows("tripDays", updatedDays);
  await replaceTableRows("tripStops", updatedStops);
  await replaceTableRows("tripPhotos", updatedPhotos);

  return { tripId: options.tripId };
}

export async function revokeCollaboratorForTrip(options: {
  tripId: string;
  viewerEmail: string;
  collaboratorEmail: string;
}) {
  const workbook = await readTravelWorkbook();

  assertTripOwnerAccess(workbook, options.tripId, options.viewerEmail);

  const updatedMemberships = workbook.tripMemberships.map((membership) => {
    if (
      membership.trip_id !== options.tripId ||
      membership.email.toLowerCase() !== options.collaboratorEmail.toLowerCase() ||
      membership.role !== "editor" ||
      membership.status !== "active"
    ) {
      return membership;
    }

    return {
      ...membership,
      status: "revoked"
    } satisfies TripMembershipSheetRow;
  });

  await replaceTableRows("tripMemberships", updatedMemberships);
}

export async function cancelPendingInviteForTrip(options: {
  tripId: string;
  viewerEmail: string;
  inviteId: string;
}) {
  const workbook = await readTravelWorkbook();

  assertTripOwnerAccess(workbook, options.tripId, options.viewerEmail);

  const updatedInvites = workbook.inviteTokens.map((invite) => {
    if (invite.trip_id !== options.tripId || invite.invite_id !== options.inviteId || invite.status !== "pending") {
      return invite;
    }

    return {
      ...invite,
      status: "expired"
    };
  });

  await replaceTableRows("inviteTokens", updatedInvites);
}

export async function createCollaboratorInvite(options: {
  tripId: string;
  viewerEmail: string;
  inviteeEmail: string;
}) {
  const workbook = await readTravelWorkbook();
  const normalizedInviteeEmail = options.inviteeEmail.trim().toLowerCase();

  assertTripOwnerAccess(workbook, options.tripId, options.viewerEmail);
  assertInviteeCanBeAdded(workbook, options.tripId, options.viewerEmail, normalizedInviteeEmail);

  const invite = createInviteTokenRecord({
    createdByEmail: options.viewerEmail.toLowerCase(),
    email: normalizedInviteeEmail,
    now: new Date(),
    tripId: options.tripId,
    ttlDays: 7
  });

  await appendTableRows("inviteTokens", [invite.record]);

  return invite;
}

export async function updateTripDays(options: {
  tripId: string;
  viewerEmail: string;
  payload: {
    days: UpdateTripDaysPayload[];
  };
}) {
  const workbook = await readTravelWorkbook();

  assertTripEditorAccess(workbook, options.tripId, options.viewerEmail);

  const draftById = new Map(options.payload.days.map((day) => [day.dayId, day]));
  const updatedDays = workbook.tripDays.map((day) => {
    if (day.trip_id !== options.tripId) {
      return day;
    }

    const draft = draftById.get(day.day_id);

    if (!draft) {
      return day;
    }

    return {
      ...day,
      city_label: draft.cityLabel,
      hero_photo_url: draft.heroPhotoValue,
      highlight_moment: draft.highlightMoment,
      journal: draft.journal,
      summary: draft.summary,
      title: draft.title
    } satisfies TripDaySheetRow;
  });

  await replaceTableRows("tripDays", updatedDays);
}

export async function createStopForTrip(options: {
  tripId: string;
  viewerEmail: string;
  payload: {
    dayId: string;
    name: string;
    lat: number | null;
    lng: number | null;
  };
}) {
  const workbook = await readTravelWorkbook();

  assertTripEditorAccess(workbook, options.tripId, options.viewerEmail);

  const existingStopCount = workbook.tripStops.filter(
    (stop) => stop.trip_id === options.tripId && stop.day_id === options.payload.dayId
  ).length;

  await appendTableRows("tripStops", [
    {
      created_at: new Date().toISOString(),
      day_id: options.payload.dayId,
      lat: options.payload.lat === null ? "" : String(options.payload.lat),
      lng: options.payload.lng === null ? "" : String(options.payload.lng),
      name: options.payload.name,
      order_index: String(existingStopCount),
      original_url: "",
      source_type: "place",
      stop_id: crypto.randomUUID(),
      trip_id: options.tripId
    } satisfies TripStopSheetRow
  ]);
}

export async function importStopsForTrip(options: {
  tripId: string;
  dayId: string;
  urls: string[];
  viewerEmail: string;
}) {
  const workbook = await readTravelWorkbook();

  assertTripEditorAccess(workbook, options.tripId, options.viewerEmail);

  const existingStopCount = workbook.tripStops.filter(
    (stop) => stop.trip_id === options.tripId && stop.day_id === options.dayId
  ).length;
  const result = await buildStopImportRows({
    dayId: options.dayId,
    existingStopCount,
    importedAt: new Date().toISOString(),
    tripId: options.tripId,
    urls: options.urls
  });

  await appendTableRows("tripStops", result.rows);

  return result;
}

export async function reorderStopsForTrip(options: {
  tripId: string;
  viewerEmail: string;
  payload: {
    dayId: string;
    stopIds: string[];
  };
}) {
  const workbook = await readTravelWorkbook();

  assertTripEditorAccess(workbook, options.tripId, options.viewerEmail);

  const stopOrder = new Map(options.payload.stopIds.map((stopId, index) => [stopId, index]));
  const updatedStops = workbook.tripStops.map((stop) => {
    if (stop.trip_id !== options.tripId || stop.day_id !== options.payload.dayId || !stopOrder.has(stop.stop_id)) {
      return stop;
    }

    return {
      ...stop,
      order_index: String(stopOrder.get(stop.stop_id) ?? 0)
    } satisfies TripStopSheetRow;
  });

  await replaceTableRows("tripStops", updatedStops);
}

export async function renameStopForTrip(options: {
  tripId: string;
  viewerEmail: string;
  stopId: string;
  name: string;
}) {
  const workbook = await readTravelWorkbook();

  assertTripEditorAccess(workbook, options.tripId, options.viewerEmail);

  await replaceTableRows(
    "tripStops",
    workbook.tripStops.map((stop) =>
      stop.trip_id === options.tripId && stop.stop_id === options.stopId
        ? { ...stop, name: options.name }
        : stop
    )
  );
}

export async function deleteStopForTrip(options: {
  tripId: string;
  viewerEmail: string;
  stopId: string;
}) {
  const workbook = await readTravelWorkbook();

  assertTripEditorAccess(workbook, options.tripId, options.viewerEmail);

  await replaceTableRows(
    "tripStops",
    workbook.tripStops.filter((stop) => stop.trip_id !== options.tripId || stop.stop_id !== options.stopId)
  );
}

export async function uploadPhotosForTrip(options: {
  tripId: string;
  tripDays: Array<Pick<TripDaySheetRow, "day_id" | "date">>;
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
  const workbook = await readTravelWorkbook();

  assertTripEditorAccess(workbook, options.tripId, options.viewerEmail);

  const assignments = assignPhotosToDays(
    options.uploads.map((upload) => ({
      capturedAt: upload.capturedAt,
      id: upload.photoId
    })),
    options.tripDays.map((day) => ({ date: day.date, id: day.day_id })),
    options.timezone
  );
  const uploadedPhotos = await Promise.all(
    options.uploads.map(async (upload) => {
      const storageKey = await uploadTripPhoto({
        body: upload.body,
        contentType: upload.contentType,
        originalFilename: upload.originalFilename,
        tripId: options.tripId
      });
      const assignedDayId = assignments.assigned.find((assignment) => assignment.photoId === upload.photoId)?.dayId;

      return {
        assignedDayId,
        capturedAt: upload.capturedAt,
        originalFilename: upload.originalFilename,
        photoId: upload.photoId,
        storageKey
      };
    })
  );
  const rows = buildPhotoRowsForPersistence({
    photos: uploadedPhotos,
    tripId: options.tripId,
    uploadedAt: new Date().toISOString()
  });

  await appendTableRows("tripPhotos", rows);

  return {
    assigned: assignments.assigned,
    unassigned: assignments.unassigned,
    uploadedPhotos
  };
}

export async function preparePhotoUploadsForTrip(options: {
  tripId: string;
  viewerEmail: string;
  files: Array<{
    originalFilename: string;
    contentType: string;
  }>;
}) {
  if (options.files.length > MAX_TRIP_PHOTO_UPLOADS) {
    throw new Error("You can upload up to 10 photos at a time.");
  }

  const workbook = await readTravelWorkbook();

  assertTripEditorAccess(workbook, options.tripId, options.viewerEmail);

  return Promise.all(
    options.files.map((file) =>
      createTripPhotoUploadTarget({
        contentType: normalizeUploadContentType(file.contentType),
        originalFilename: file.originalFilename,
        tripId: options.tripId
      })
    )
  );
}

export async function completePhotoUploadsForTrip(options: {
  tripId: string;
  tripDays: Array<Pick<TripDaySheetRow, "day_id" | "date">>;
  timezone: string;
  viewerEmail: string;
  uploads: Array<{
    photoId: string;
    originalFilename: string;
    contentType: string;
    storageKey: string;
    capturedAt?: string;
  }>;
}) {
  const storageKeys = options.uploads.map((upload) => upload.storageKey);

  try {
    const workbook = await readTravelWorkbook();

    assertTripEditorAccess(workbook, options.tripId, options.viewerEmail);
    assertUploadCountWithinLimit(options.uploads.length);
    assertTripStorageKeys(options.tripId, storageKeys);

    const assignments = assignPhotosToDays(
      options.uploads.map((upload) => ({
        capturedAt: upload.capturedAt,
        id: upload.photoId
      })),
      options.tripDays.map((day) => ({ date: day.date, id: day.day_id })),
      options.timezone
    );
    const uploadedPhotos = options.uploads.map((upload) => {
      const assignedDayId = assignments.assigned.find((assignment) => assignment.photoId === upload.photoId)?.dayId;

      return {
        assignedDayId,
        capturedAt: upload.capturedAt,
        originalFilename: upload.originalFilename,
        photoId: upload.photoId,
        storageKey: upload.storageKey
      };
    });
    const rows = buildPhotoRowsForPersistence({
      photos: uploadedPhotos,
      tripId: options.tripId,
      uploadedAt: new Date().toISOString()
    });

    await appendTableRows("tripPhotos", rows);

    return {
      ...assignments,
      uploadedPhotos: await Promise.all(
        rows.map(async (row): Promise<TripStudioPhoto> => ({
          alt: row.alt,
          capturedAt: row.captured_at || undefined,
          createdAt: row.created_at,
          dayId: row.day_id,
          id: row.photo_id,
          originalFilename: row.original_filename,
          previewUrl: await signTripPhotoUrl(row.storage_key),
          status: row.status === "ready" ? "ready" : "unassigned",
          storageKey: row.storage_key
        }))
      )
    };
  } catch (error) {
    try {
      await deleteTripStorageKeys(storageKeys);
    } catch {
      // Preserve the original persistence error.
    }
    throw error;
  }
}

export async function updatePhotoForTrip(options: {
  tripId: string;
  viewerEmail: string;
  photoId: string;
  payload: {
    alt: string;
    dayId: string;
  };
}) {
  const workbook = await readTravelWorkbook();

  assertTripEditorAccess(workbook, options.tripId, options.viewerEmail);

  const updatedPhotos = workbook.tripPhotos.map((photo) => {
    if (photo.trip_id !== options.tripId || photo.photo_id !== options.photoId) {
      return photo;
    }

    return {
      ...photo,
      alt: options.payload.alt,
      day_id: options.payload.dayId,
      status: options.payload.dayId ? "ready" : "unassigned"
    } satisfies TripPhotoSheetRow;
  });

  await replaceTableRows("tripPhotos", updatedPhotos);
}

export async function deletePhotoForTrip(options: {
  tripId: string;
  viewerEmail: string;
  photoId: string;
}) {
  const workbook = await readTravelWorkbook();

  assertTripEditorAccess(workbook, options.tripId, options.viewerEmail);

  const deletedPhoto = workbook.tripPhotos.find(
    (photo) => photo.trip_id === options.tripId && photo.photo_id === options.photoId
  );

  if (!deletedPhoto) {
    throw new Error("Not found");
  }

  const updatedTrips = workbook.trips.map((trip) => {
    if (trip.trip_id !== options.tripId) {
      return trip;
    }

    const endingPhotoIds = parseCsvIds(trip.ending_photo_ids_csv).filter((photoId) => photoId !== options.photoId);

    return {
      ...trip,
      cover_photo_url: trip.cover_photo_url === deletedPhoto.storage_key ? "" : trip.cover_photo_url,
      ending_photo_ids_csv: endingPhotoIds.join(",")
    } satisfies TripSheetRow;
  });
  const updatedDays = workbook.tripDays.map((day) => {
    if (day.trip_id !== options.tripId || day.hero_photo_url !== deletedPhoto.storage_key) {
      return day;
    }

    return {
      ...day,
      hero_photo_url: ""
    } satisfies TripDaySheetRow;
  });
  const updatedPhotos = workbook.tripPhotos.filter(
    (photo) => photo.trip_id !== options.tripId || photo.photo_id !== options.photoId
  );

  await replaceTableRows("trips", updatedTrips);
  await replaceTableRows("tripDays", updatedDays);
  await replaceTableRows("tripPhotos", updatedPhotos);

  if (!isExternalAssetUrl(deletedPhoto.storage_key)) {
    await deleteTripStorageKeys([deletedPhoto.storage_key]);
  }
}

export async function deleteTripForViewer(options: {
  tripId: string;
  viewerEmail: string;
}) {
  const workbook = await readTravelWorkbook();

  assertTripOwnerAccess(workbook, options.tripId, options.viewerEmail);

  const trip = workbook.trips.find((row) => row.trip_id === options.tripId);

  if (!trip) {
    throw new Error("Not found");
  }

  const tripDays = workbook.tripDays.filter((day) => day.trip_id === options.tripId);
  const tripPhotos = workbook.tripPhotos.filter((photo) => photo.trip_id === options.tripId);
  const storageKeys = Array.from(
    new Set(
      [trip.cover_photo_url, ...tripDays.map((day) => day.hero_photo_url), ...tripPhotos.map((photo) => photo.storage_key)].filter(
        (value) => value && !isExternalAssetUrl(value)
      )
    )
  );

  await replaceTableRows(
    "trips",
    workbook.trips.filter((row) => row.trip_id !== options.tripId)
  );
  await replaceTableRows(
    "tripDays",
    workbook.tripDays.filter((row) => row.trip_id !== options.tripId)
  );
  await replaceTableRows(
    "tripStops",
    workbook.tripStops.filter((row) => row.trip_id !== options.tripId)
  );
  await replaceTableRows(
    "tripPhotos",
    workbook.tripPhotos.filter((row) => row.trip_id !== options.tripId)
  );
  await replaceTableRows(
    "tripMemberships",
    workbook.tripMemberships.filter((row) => row.trip_id !== options.tripId)
  );
  await replaceTableRows(
    "inviteTokens",
    workbook.inviteTokens.filter((row) => row.trip_id !== options.tripId)
  );
  await deleteTripStorageKeys(storageKeys);
}

function buildTripRow(options: {
  tripId: string;
  title: string;
  startDate: string;
  endDate: string;
  timezone: string;
  summary: string;
  coverPhotoValue: string;
  travelCompanions: string[];
  highlightLabel: string;
  routeSummary: string;
  mapCenter: [number, number];
  endingPhotoIds: string[];
}): TripSheetRow {
  return {
    cover_photo_url: options.coverPhotoValue,
    end_date: options.endDate,
    highlight_label: options.highlightLabel,
    map_center_lat: String(options.mapCenter[1]),
    map_center_lng: String(options.mapCenter[0]),
    route_summary: options.routeSummary,
    start_date: options.startDate,
    summary: options.summary,
    timezone: options.timezone,
    title: options.title,
    travel_companions_csv: options.travelCompanions.join(","),
    ending_photo_ids_csv: options.endingPhotoIds.join(","),
    trip_id: options.tripId
  };
}

function mergeDayDraft(row: TripDaySheetRow, draft?: EditableTripDayPayload): TripDaySheetRow {
  if (!draft) {
    return row;
  }

  return {
    ...row,
    city_label: draft.cityLabel,
    hero_photo_url: draft.heroPhotoValue,
    highlight_moment: draft.highlightMoment,
    journal: draft.journal,
    summary: draft.summary,
    title: draft.title
  };
}

function assertTripEditorAccess(workbook: TravelSheetWorkbook, tripId: string, viewerEmail: string) {
  const membership = workbook.tripMemberships.find(
    (row) =>
      row.trip_id === tripId &&
      row.email.toLowerCase() === viewerEmail.toLowerCase() &&
      row.status === "active"
  );

  if (!membership) {
    throw new Error("Forbidden");
  }

  return membership;
}

function assertUploadCountWithinLimit(count: number) {
  if (count > MAX_TRIP_PHOTO_UPLOADS) {
    throw new Error("You can upload up to 10 photos at a time.");
  }
}

function assertTripStorageKeys(tripId: string, storageKeys: string[]) {
  if (storageKeys.some((storageKey) => !storageKey.startsWith(`trips/${tripId}/`))) {
    throw new Error("Invalid storage key");
  }
}

function normalizeUploadContentType(contentType: string) {
  return contentType || "application/octet-stream";
}

function assertTripOwnerAccess(workbook: TravelSheetWorkbook, tripId: string, viewerEmail: string) {
  const membership = assertTripEditorAccess(workbook, tripId, viewerEmail);

  if (membership.role !== "owner") {
    throw new Error("Forbidden");
  }

  return membership;
}

function assertInviteeCanBeAdded(
  workbook: TravelSheetWorkbook,
  tripId: string,
  viewerEmail: string,
  inviteeEmail: string
) {
  if (!inviteeEmail) {
    throw new Error("Collaborator email is required");
  }

  if (inviteeEmail === viewerEmail.toLowerCase()) {
    throw new Error("You already have access to this trip");
  }

  const activeMembership = workbook.tripMemberships.find(
    (membership) =>
      membership.trip_id === tripId &&
      membership.email.toLowerCase() === inviteeEmail &&
      membership.status === "active"
  );

  if (activeMembership) {
    throw new Error("That collaborator already has access");
  }

  const pendingInvite = workbook.inviteTokens.find(
    (invite) =>
      invite.trip_id === tripId &&
      invite.email.toLowerCase() === inviteeEmail &&
      invite.status === "pending"
  );

  if (pendingInvite) {
    throw new Error("That collaborator already has a pending invite");
  }
}

function assertValidDateRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Trip dates must be valid calendar dates");
  }

  if (start > end) {
    throw new Error("End date must be on or after start date");
  }
}

function removedDaysContainData(workbook: TravelSheetWorkbook, tripId: string, removedDayIds: string[]) {
  const removedDayIdSet = new Set(removedDayIds);

  return workbook.tripDays.some(
    (day) =>
      day.trip_id === tripId &&
      removedDayIdSet.has(day.day_id) &&
      [day.city_label, day.title, day.summary, day.highlight_moment, day.hero_photo_url, day.journal].some(Boolean)
  ) ||
    workbook.tripStops.some((stop) => stop.trip_id === tripId && removedDayIdSet.has(stop.day_id)) ||
    workbook.tripPhotos.some((photo) => photo.trip_id === tripId && removedDayIdSet.has(photo.day_id));
}

function parseCsvIds(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
