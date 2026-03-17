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
  days: TripDay[];
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

