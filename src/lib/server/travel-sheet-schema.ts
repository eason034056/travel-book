import type { StopSourceType, TravelRole } from "@/types/travel";

export const travelSheetHeaders = {
  trips: [
    "trip_id",
    "title",
    "start_date",
    "end_date",
    "timezone",
    "summary",
    "cover_photo_url",
    "travel_companions_csv",
    "highlight_label",
    "route_summary",
    "map_center_lat",
    "map_center_lng",
    "ending_photo_ids_csv"
  ],
  tripDays: [
    "day_id",
    "trip_id",
    "day_index",
    "date",
    "city_label",
    "title",
    "summary",
    "highlight_moment",
    "hero_photo_url",
    "journal"
  ],
  tripStops: [
    "stop_id",
    "trip_id",
    "day_id",
    "name",
    "lat",
    "lng",
    "order_index",
    "source_type",
    "original_url",
    "created_at"
  ],
  tripPhotos: [
    "photo_id",
    "trip_id",
    "day_id",
    "storage_key",
    "alt",
    "captured_at",
    "status",
    "original_filename",
    "created_at"
  ],
  tripMemberships: ["trip_id", "email", "role", "status", "created_at"],
  inviteTokens: [
    "invite_id",
    "trip_id",
    "email",
    "role",
    "token_hash",
    "status",
    "expires_at",
    "created_at",
    "created_by_email",
    "used_at"
  ]
} as const;

export const travelSheetTabs = {
  trips: "trips",
  tripDays: "trip_days",
  tripStops: "trip_stops",
  tripPhotos: "trip_photos",
  tripMemberships: "trip_memberships",
  inviteTokens: "invite_tokens"
} as const;

export interface TripSheetRow {
  trip_id: string;
  title: string;
  start_date: string;
  end_date: string;
  timezone: string;
  summary: string;
  cover_photo_url: string;
  travel_companions_csv: string;
  highlight_label: string;
  route_summary: string;
  map_center_lat: string;
  map_center_lng: string;
  ending_photo_ids_csv: string;
}

export interface TripDaySheetRow {
  day_id: string;
  trip_id: string;
  day_index: string;
  date: string;
  city_label: string;
  title: string;
  summary: string;
  highlight_moment: string;
  hero_photo_url: string;
  journal: string;
}

export interface TripStopSheetRow {
  stop_id: string;
  trip_id: string;
  day_id: string;
  name: string;
  lat: string;
  lng: string;
  order_index: string;
  source_type: StopSourceType;
  original_url: string;
  created_at: string;
}

export type TripPhotoStatus = "ready" | "unassigned";

export interface TripPhotoSheetRow {
  photo_id: string;
  trip_id: string;
  day_id: string;
  storage_key: string;
  alt: string;
  captured_at: string;
  status: TripPhotoStatus;
  original_filename: string;
  created_at: string;
}

export interface TripMembershipSheetRow {
  trip_id: string;
  email: string;
  role: TravelRole;
  status: "active" | "revoked";
  created_at: string;
}

export interface InviteTokenSheetRow {
  invite_id: string;
  trip_id: string;
  email: string;
  role: Extract<TravelRole, "editor">;
  token_hash: string;
  status: "pending" | "used" | "expired";
  expires_at: string;
  created_at: string;
  created_by_email: string;
  used_at: string;
}

export interface TravelSheetWorkbook {
  trips: TripSheetRow[];
  tripDays: TripDaySheetRow[];
  tripStops: TripStopSheetRow[];
  tripPhotos: TripPhotoSheetRow[];
  tripMemberships: TripMembershipSheetRow[];
  inviteTokens: InviteTokenSheetRow[];
}
