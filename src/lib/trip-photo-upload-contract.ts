import type { AssignedPhoto, TripStudioPhoto, UnassignedPhoto } from "@/types/travel";

export const MAX_TRIP_PHOTO_UPLOADS = 10;

export interface TripPhotoUploadDay {
  id: string;
  date: string;
}

export interface PrepareTripPhotoUploadsRequest {
  files: Array<{
    originalFilename: string;
    contentType: string;
  }>;
}

export interface PreparedTripPhotoUpload {
  photoId: string;
  storageKey: string;
  uploadUrl: string;
  contentType: string;
  originalFilename: string;
}

export interface PrepareTripPhotoUploadsResponse {
  uploads: PreparedTripPhotoUpload[];
}

export interface CompletedTripPhotoUpload {
  photoId: string;
  storageKey: string;
  originalFilename: string;
  contentType: string;
  capturedAt?: string;
}

export interface CompleteTripPhotoUploadsRequest {
  timezone: string;
  tripDays: TripPhotoUploadDay[];
  uploads: CompletedTripPhotoUpload[];
}

export interface CompleteTripPhotoUploadsResponse {
  assigned: AssignedPhoto[];
  unassigned: UnassignedPhoto[];
  uploadedPhotos?: TripStudioPhoto[];
}

export interface TripPhotoUploadProgress {
  phase: "preparing" | "uploading" | "finalizing";
  current: number;
  total: number;
}
