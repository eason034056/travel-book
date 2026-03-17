"use client";

import { startTransition, useState } from "react";

interface InviteDialogProps {
  tripId: string;
}

export function InviteDialog({ tripId }: InviteDialogProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("Owner + editor roles only in v1");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  async function handleInvite() {
    const response = await fetch(`/api/trips/${tripId}/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email
      })
    });

    const payload = (await response.json()) as { message: string; inviteUrl?: string; expiresAt?: string };
    setMessage(payload.message);
    setInviteUrl(payload.inviteUrl ?? null);
    setExpiresAt(payload.expiresAt ?? null);
    setEmail("");
  }

  async function handleCopyLink() {
    if (!inviteUrl || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(inviteUrl);
    setMessage("Invite link copied.");
  }

  return (
    <section className="rounded-[2rem] border border-ink/10 bg-paper p-5 shadow-card md:p-6">
      <p className="font-mono text-[0.72rem] uppercase tracking-[0.3em] text-olive">Collaboration</p>
      <h2 className="mt-3 font-display text-3xl leading-none text-ink">Invite your co-editor</h2>
      <p className="mt-3 text-sm leading-7 text-ink/72">
        Generate a one-time editor link, share it manually, and let the invited account finish sign-in from that
        invite page.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          className="h-12 flex-1 rounded-full border border-ink/10 bg-sand/35 px-4 text-sm text-ink outline-none transition focus:border-olive/45 focus:bg-paper"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="co-editor@email.com"
          value={email}
        />
        <button
          className="h-12 rounded-full bg-terracotta px-5 text-sm uppercase tracking-[0.22em] text-paper transition hover:bg-[#a95a3d]"
          onClick={() => startTransition(handleInvite)}
          type="button"
        >
          Send invite
        </button>
      </div>
      <p className="mt-4 text-sm text-ink/65">{message}</p>
      {inviteUrl && (
        <div className="mt-4 rounded-[1.4rem] border border-ink/10 bg-sand/35 p-4">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-olive">One-time invite link</p>
          <p className="mt-3 break-all text-sm leading-7 text-ink/75">{inviteUrl}</p>
          {expiresAt && <p className="mt-2 text-xs text-ink/55">Expires {new Date(expiresAt).toLocaleString()}</p>}
          <button
            className="mt-4 rounded-full border border-ink/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-ink"
            onClick={() => startTransition(handleCopyLink)}
            type="button"
          >
            Copy link
          </button>
        </div>
      )}
    </section>
  );
}
