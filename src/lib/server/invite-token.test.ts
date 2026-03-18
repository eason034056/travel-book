import { describe, expect, test } from "vitest";

import { createInviteTokenRecord, hashInviteToken, isInviteTokenExpired } from "@/lib/server/invite-token";

describe("invite token helpers", () => {
  test("creates a one-time invite token with a deterministic hash", () => {
    const now = new Date("2026-03-17T12:00:00.000Z");
    const invite = createInviteTokenRecord({
      tripId: "kyoto-2026",
      email: "editor@example.com",
      createdByEmail: "owner@example.com",
      now,
      ttlDays: 7
    });

    expect(invite.rawToken).toHaveLength(64);
    expect(invite.record).toMatchObject({
      trip_id: "kyoto-2026",
      email: "editor@example.com",
      role: "editor",
      status: "pending",
      created_by_email: "owner@example.com",
      expires_at: "2026-03-24T12:00:00.000Z"
    });
    expect(invite.record.token_hash).toBe(hashInviteToken(invite.rawToken));
  });

  test("marks tokens as expired only after the expiry instant", () => {
    expect(isInviteTokenExpired("2026-03-24T12:00:00.000Z", new Date("2026-03-24T11:59:59.000Z"))).toBe(false);
    expect(isInviteTokenExpired("2026-03-24T12:00:00.000Z", new Date("2026-03-24T12:00:01.000Z"))).toBe(true);
  });
});
