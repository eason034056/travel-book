import crypto from "node:crypto";

import type { InviteTokenSheetRow } from "@/lib/server/travel-sheet-schema";

interface CreateInviteTokenRecordOptions {
  tripId: string;
  email: string;
  createdByEmail: string;
  now: Date;
  ttlDays: number;
}

export function hashInviteToken(rawToken: string) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function isInviteTokenExpired(expiresAt: string, now: Date) {
  return now.getTime() > new Date(expiresAt).getTime();
}

export function createInviteTokenRecord({
  tripId,
  email,
  createdByEmail,
  now,
  ttlDays
}: CreateInviteTokenRecordOptions): { rawToken: string; record: InviteTokenSheetRow } {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

  return {
    rawToken,
    record: {
      invite_id: crypto.randomUUID(),
      trip_id: tripId,
      email,
      role: "editor",
      token_hash: hashInviteToken(rawToken),
      status: "pending",
      expires_at: expiresAt,
      created_at: now.toISOString(),
      created_by_email: createdByEmail,
      used_at: ""
    }
  };
}
