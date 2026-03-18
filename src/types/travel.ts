export type TravelRole = "owner" | "editor";
export type StopSourceType = "place" | "route";

export interface TripSummary {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  timezone: string;
  summary: string;
  coverPhotoUrl: string;
  travelCompanions: string[];
  daysCount: number;
  stopCount: number;
}

export interface GalleryPhoto {
  id: string;
  url: string;
  alt: string;
  capturedAt?: string;
}

export interface PlaceStop {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  orderIndex: number;
  sourceType: StopSourceType;
  originalUrl: string;
}

export interface TripDay {
  id: string;
  dayIndex: number;
  date: string;
  cityLabel: string;
  title: string;
  summary: string;
  highlightMoment: string;
  heroPhotoUrl: string;
  journal: string;
  stops: PlaceStop[];
  gallery: GalleryPhoto[];
}

export interface TripDetail extends TripSummary {
  highlightLabel: string;
  routeSummary: string;
  mapCenter: [number, number];
  endingPhotoIds: string[];
  days: TripDay[];
  viewerRole?: TravelRole;
}

export interface TripStudioPhoto {
  id: string;
  storageKey: string;
  previewUrl: string;
  originalFilename: string;
  alt: string;
  capturedAt?: string;
  dayId: string;
  status: "ready" | "unassigned";
}

export interface TripStudioCollaborator {
  email: string;
  role: TravelRole;
  status: "active" | "revoked";
  createdAt: string;
}

export interface TripStudioPendingInvite {
  inviteId: string;
  email: string;
  role: Extract<TravelRole, "editor">;
  expiresAt: string;
  createdAt: string;
}

export interface TripStudioDay extends Omit<TripDay, "heroPhotoUrl"> {
  heroPhotoValue: string;
  heroPhotoPreviewUrl: string;
}

export interface TripStudioSnapshot {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  timezone: string;
  summary: string;
  travelCompanions: string[];
  highlightLabel: string;
  routeSummary: string;
  mapCenter: [number, number];
  endingPhotoIds: string[];
  coverPhotoValue: string;
  coverPhotoPreviewUrl: string;
  viewerRole: TravelRole;
  days: TripStudioDay[];
  photos: TripStudioPhoto[];
  collaborators: TripStudioCollaborator[];
  pendingInvites: TripStudioPendingInvite[];
}

export interface ParsedGoogleMapsLinkResolved {
  status: "resolved";
  kind: StopSourceType;
  originalUrl: string;
  stops: Array<{
    name: string;
    lat: number | null;
    lng: number | null;
    orderIndex: number;
  }>;
}

export interface ParsedGoogleMapsLinkUnresolved {
  status: "unresolved";
  originalUrl: string;
  reason: "unsupported-host" | "unsupported-path" | "invalid-url" | "missing-stops";
}

export type ParsedGoogleMapsLink = ParsedGoogleMapsLinkResolved | ParsedGoogleMapsLinkUnresolved;

export interface PhotoCapture {
  id: string;
  capturedAt?: string;
}

export interface AssignedPhoto {
  photoId: string;
  dayId: string;
}

export interface UnassignedPhoto {
  photoId: string;
  reason: "missing-captured-at" | "no-matching-day";
}
