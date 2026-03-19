import heic2any from "heic2any";

import {
  MAX_TRIP_PHOTO_UPLOADS,
  type CompleteTripPhotoUploadsResponse,
  type TripPhotoUploadDay,
  type TripPhotoUploadProgress
} from "@/lib/trip-photo-upload-contract";

export interface DirectTripPhotoUploadResult {
  uploadedCount: number;
  failedCount: number;
  failedFiles: string[];
  totalFiles: number;
  assignments: CompleteTripPhotoUploadsResponse;
}

export function formatTripPhotoUploadProgress(progress: TripPhotoUploadProgress) {
  if (progress.phase === "uploading") {
    return `Uploading ${progress.current}/${progress.total}...`;
  }

  if (progress.phase === "finalizing") {
    return `Finalizing ${progress.total} photo${progress.total === 1 ? "" : "s"}...`;
  }

  return `Preparing ${progress.total} photo${progress.total === 1 ? "" : "s"}...`;
}

export function getTripPhotoUploadPercent(progress: TripPhotoUploadProgress) {
  if (progress.total <= 0) return 0;
  if (progress.current <= 0) return 0;

  return Math.min(100, Math.max(8, Math.round((progress.current / progress.total) * 100)));
}

function isHeic(file: File) {
  return file.type === "image/heic" || file.type === "image/heif" || /\.(heic|heif)$/i.test(file.name);
}

async function toUploadableFiles(files: File[]) {
  const converted = await Promise.all(
    files.map(async (file): Promise<File[]> => {
      if (!isHeic(file)) {
        return [file];
      }

      const result = await heic2any({ blob: file, quality: 0.92, toType: "image/jpeg" });
      const blobs = Array.isArray(result) ? result : [result];
      const base = file.name.replace(/\.(heic|heif)$/i, "");

      return blobs.map((blob, index) => {
        const filename = blobs.length > 1 ? `${base}-${index}.jpg` : `${base}.jpg`;

        return new File([blob], filename, {
          type: "image/jpeg"
        });
      });
    })
  );

  return converted.flat();
}

async function parseErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { message?: string };

    return payload.message ?? fallback;
  } catch {
    return fallback;
  }
}

function emptyAssignments(): CompleteTripPhotoUploadsResponse {
  return {
    assigned: [],
    unassigned: []
  };
}

function mergeAssignments(
  current: CompleteTripPhotoUploadsResponse,
  next: CompleteTripPhotoUploadsResponse
): CompleteTripPhotoUploadsResponse {
  const uploadedPhotos = (current.uploadedPhotos ?? []).concat(next.uploadedPhotos ?? []);

  return {
    assigned: current.assigned.concat(next.assigned),
    unassigned: current.unassigned.concat(next.unassigned),
    ...(uploadedPhotos.length > 0 ? { uploadedPhotos } : {})
  };
}

async function uploadTripPhotoViaServer(options: {
  tripId: string;
  timezone: string;
  days: TripPhotoUploadDay[];
  file: File;
  fetchImpl: typeof fetch;
}) {
  const formData = new FormData();

  formData.set("tripDays", JSON.stringify(options.days));
  formData.set("timezone", options.timezone);
  formData.append("photos", options.file);

  const response = await options.fetchImpl(`/api/trips/${options.tripId}/photos/upload`, {
    body: formData,
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Unable to upload photos"));
  }

  return (await response.json()) as CompleteTripPhotoUploadsResponse;
}

export async function uploadTripPhotosDirect(options: {
  tripId: string;
  timezone: string;
  days: TripPhotoUploadDay[];
  files: File[];
  onProgress?: (progress: TripPhotoUploadProgress) => void;
  fetchImpl?: typeof fetch;
}): Promise<DirectTripPhotoUploadResult> {
  const fetchImpl = options.fetchImpl ?? fetch;

  if (options.files.length === 0) {
    return {
      assignments: emptyAssignments(),
      failedCount: 0,
      failedFiles: [],
      totalFiles: 0,
      uploadedCount: 0
    };
  }

  if (options.files.length > MAX_TRIP_PHOTO_UPLOADS) {
    throw new Error("You can upload up to 10 photos at a time.");
  }

  const uploadableFiles = await toUploadableFiles(options.files);

  if (uploadableFiles.length > MAX_TRIP_PHOTO_UPLOADS) {
    throw new Error("You can upload up to 10 photos at a time.");
  }

  options.onProgress?.({
    current: 0,
    phase: "preparing",
    total: uploadableFiles.length
  });

  const failedFiles: string[] = [];
  let assignments = emptyAssignments();
  let uploadedCount = 0;

  for (const [index, file] of uploadableFiles.entries()) {
    options.onProgress?.({
      current: index + 1,
      phase: "uploading",
      total: uploadableFiles.length
    });

    try {
      const response = await uploadTripPhotoViaServer({
        days: options.days,
        fetchImpl,
        file,
        timezone: options.timezone,
        tripId: options.tripId
      });

      assignments = mergeAssignments(assignments, response);
      uploadedCount += response.uploadedPhotos?.length ?? 1;
    } catch {
      failedFiles.push(file.name);
    }
  }

  return {
    assignments: uploadedCount > 0 ? assignments : emptyAssignments(),
    failedCount: failedFiles.length,
    failedFiles,
    totalFiles: uploadableFiles.length,
    uploadedCount
  };
}
